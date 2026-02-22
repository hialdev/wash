package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RawMaterialPurchaseHandler struct {
	DB *gorm.DB
}

func NewRawMaterialPurchaseHandler(db *gorm.DB) *RawMaterialPurchaseHandler {
	return &RawMaterialPurchaseHandler{DB: db}
}

type RawMaterialPurchaseInput struct {
	PurchaseDate  *time.Time `json:"purchase_date" validate:"required"`
	RawMaterialID *uuid.UUID `json:"raw_material_id" validate:"required"`
	PricePurchase *float64   `json:"price_purchase" validate:"required,gt=0"`
	Qty           *float64   `json:"qty" validate:"required,gt=0"`
	Notes         *string    `json:"notes"`
}

func (h *RawMaterialPurchaseHandler) GetAllRawMaterialPurchases(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	rawMaterialID := c.Query("raw_material_id", "")
	fromDate := c.Query("from_date", "")
	toDate := c.Query("to_date", "")
	sort := c.Query("sort", "created_at")
	order := c.Query("order", "desc")

	offset := (page - 1) * limit

	db := h.DB.Model(&models.RawMaterialPurchase{}).Preload("RawMaterial")

	if rawMaterialID != "" {
		db = db.Where("raw_material_id = ?", rawMaterialID)
	}
	if fromDate != "" {
		if parsed, err := time.Parse("2006-01-02", fromDate); err == nil {
			db = db.Where("purchase_date >= ?", parsed)
		}
	}
	if toDate != "" {
		if parsed, err := time.Parse("2006-01-02", toDate); err == nil {
			db = db.Where("purchase_date < ?", parsed.Add(24*time.Hour))
		}
	}

	var total int64
	db.Count(&total)

	validSortFields := map[string]string{
		"id": "id", "purchase_date": "purchase_date", "created_at": "created_at",
	}
	sortBy, ok := validSortFields[sort]
	if !ok {
		sortBy = "created_at"
	}
	db = db.Order(fmt.Sprintf("%s %s", sortBy, order))

	var purchases []models.RawMaterialPurchase
	if err := db.Offset(offset).Limit(limit).Find(&purchases).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal ambil data", err.Error())
	}

	totalPages := (total + int64(limit) - 1) / int64(limit)
	return utils.RespApi(c, "ok", "Berhasil mendapatkan data", fiber.Map{
		"raw_material_purchases": purchases,
		"pagination": fiber.Map{
			"total": total, "page": page, "limit": limit, "totalPages": totalPages,
		},
	})
}

func (h *RawMaterialPurchaseHandler) GetRawMaterialPurchase(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Id tidak valid", nil)
	}

	var purchase models.RawMaterialPurchase
	if err := h.DB.Preload("RawMaterial").First(&purchase, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Data tidak ditemukan", err.Error())
	}
	return utils.RespApi(c, "ok", "Berhasil mendapatkan data", purchase)
}

func (h *RawMaterialPurchaseHandler) AddRawMaterialPurchase(c *fiber.Ctx) error {
	var input RawMaterialPurchaseInput

	contentType := c.Get("Content-Type")
	if strings.Contains(contentType, "application/json") {
		if err := c.BodyParser(&input); err != nil {
			return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
		}
	} else {
		// form-data fallback
		purchaseDateStr := c.FormValue("purchase_date")
		rawMatIDStr := c.FormValue("raw_material_id")
		priceStr := c.FormValue("price_purchase")
		qtyStr := c.FormValue("qty")
		notes := c.FormValue("notes")

		purchaseDate, err := time.Parse("2006-01-02", purchaseDateStr)
		if err != nil {
			return utils.RespApi(c, "bad", "Format tanggal tidak valid", err.Error())
		}
		rawMatID, err := uuid.Parse(rawMatIDStr)
		if err != nil {
			return utils.RespApi(c, "bad", "raw_material_id tidak valid", err.Error())
		}
		price, _ := strconv.ParseFloat(priceStr, 64)
		qty, _ := strconv.ParseFloat(qtyStr, 64)
		input = RawMaterialPurchaseInput{
			PurchaseDate:  &purchaseDate,
			RawMaterialID: &rawMatID,
			PricePurchase: &price,
			Qty:           &qty,
			Notes:         &notes,
		}
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	// Get creator from JWT
	var createdBy *uuid.UUID
	if uid := c.Locals("user_id"); uid != nil {
		if u, ok := uid.(uuid.UUID); ok {
			createdBy = &u
		}
	}

	// Transaction: create purchase + update stock + create movement
	tx := h.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	purchase := models.RawMaterialPurchase{
		PurchaseDate:  input.PurchaseDate,
		RawMaterialID: input.RawMaterialID,
		PricePurchase: input.PricePurchase,
		Qty:           input.Qty,
		Notes:         input.Notes,
		CreatedBy:     createdBy,
	}
	if err := tx.Create(&purchase).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal membuat pembelian", err.Error())
	}

	// Update current_stock raw material
	if err := tx.Exec(
		"UPDATE raw_materials SET current_stock = COALESCE(current_stock, 0) + ?, updated_at = NOW() WHERE id = ?",
		*input.Qty, input.RawMaterialID,
	).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal update stok", err.Error())
	}

	// Create movement
	issuerType := "purchase"
	isSystem := true
	isIncrement := true
	notes := fmt.Sprintf("Pembelian bahan baku (qty: %.3f)", *input.Qty)
	movement := models.RawMaterialMovement{
		RawMaterialID: input.RawMaterialID,
		IssuerType:    &issuerType,
		IssuerID:      &purchase.ID,
		IsBySystem:    &isSystem,
		IsIncrement:   &isIncrement,
		Qty:           input.Qty,
		Notes:         &notes,
		CreatedBy:     createdBy,
	}
	if err := tx.Create(&movement).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal membuat movement", err.Error())
	}

	if err := tx.Commit().Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal commit transaksi", err.Error())
	}

	h.DB.Preload("RawMaterial").First(&purchase, "id = ?", purchase.ID)
	return utils.RespApi(c, "ok", "Berhasil membuat pembelian dan stok diperbarui", purchase)
}

func (h *RawMaterialPurchaseHandler) DeleteRawMaterialPurchase(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Id tidak valid", nil)
	}

	var purchase models.RawMaterialPurchase
	if err := h.DB.First(&purchase, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Data tidak ditemukan", err.Error())
	}

	tx := h.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Rollback stock
	if err := tx.Exec(
		"UPDATE raw_materials SET current_stock = COALESCE(current_stock, 0) - ?, updated_at = NOW() WHERE id = ?",
		*purchase.Qty, purchase.RawMaterialID,
	).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal rollback stok", err.Error())
	}

	// Delete movements related to this purchase
	if err := tx.Where("issuer_type = ? AND issuer_id = ?", "purchase", id).Delete(&models.RawMaterialMovement{}).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal hapus movement", err.Error())
	}

	if err := tx.Delete(&purchase).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal hapus pembelian", err.Error())
	}

	if err := tx.Commit().Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal commit transaksi", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil menghapus pembelian dan stok dikembalikan", nil)
}
