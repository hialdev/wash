package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RawMaterialMovementHandler struct {
	DB *gorm.DB
}

func NewRawMaterialMovementHandler(db *gorm.DB) *RawMaterialMovementHandler {
	return &RawMaterialMovementHandler{DB: db}
}

type RawMaterialUsageItem struct {
	RawMaterialID *uuid.UUID `json:"raw_material_id"`
	Qty           *float64   `json:"qty"`
	Notes         *string    `json:"notes"`
}

type SubmitOrderUsageInput struct {
	Items []RawMaterialUsageItem `json:"items"`
}

func (h *RawMaterialMovementHandler) GetAllRawMaterialMovements(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	rawMaterialID := c.Query("raw_material_id", "")
	issuerType := c.Query("issuer_type", "")
	issuerID := c.Query("issuer_id", "")
	sort := c.Query("sort", "created_at")
	order := c.Query("order", "desc")

	offset := (page - 1) * limit

	db := h.DB.Model(&models.RawMaterialMovement{}).Preload("RawMaterial")

	if rawMaterialID != "" {
		db = db.Where("raw_material_id = ?", rawMaterialID)
	}
	if issuerType != "" {
		db = db.Where("issuer_type = ?", issuerType)
	}
	if issuerID != "" {
		db = db.Where("issuer_id = ?", issuerID)
	}

	var total int64
	db.Count(&total)

	validSortFields := map[string]string{
		"id": "id", "created_at": "created_at",
	}
	sortBy, ok := validSortFields[sort]
	if !ok {
		sortBy = "created_at"
	}
	db = db.Order(fmt.Sprintf("%s %s", sortBy, order))

	var movements []models.RawMaterialMovement
	if err := db.Offset(offset).Limit(limit).Find(&movements).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal ambil data", err.Error())
	}

	totalPages := (total + int64(limit) - 1) / int64(limit)
	return utils.RespApi(c, "ok", "Berhasil mendapatkan data", fiber.Map{
		"raw_material_movements": movements,
		"pagination": fiber.Map{
			"total": total, "page": page, "limit": limit, "totalPages": totalPages,
		},
	})
}

func (h *RawMaterialMovementHandler) SubmitOrderUsage(c *fiber.Ctx) error {
	orderIDStr := c.Params("id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Order ID tidak valid", nil)
	}

	var input SubmitOrderUsageInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	if len(input.Items) == 0 {
		return utils.RespApi(c, "bad", "Minimal satu bahan baku harus diisi", nil)
	}

	// Get creator from JWT
	var createdBy *uuid.UUID
	if uid := c.Locals("user_id"); uid != nil {
		if u, ok := uid.(uuid.UUID); ok {
			createdBy = &u
		}
	}

	// Pre-validate stok cukup untuk semua item
	for _, item := range input.Items {
		if item.RawMaterialID == nil || item.Qty == nil || *item.Qty <= 0 {
			return utils.RespApi(c, "bad", "Data bahan baku tidak valid (raw_material_id dan qty wajib diisi)", nil)
		}
		var rawMat models.RawMaterial
		if err := h.DB.First(&rawMat, "id = ?", item.RawMaterialID).Error; err != nil {
			return utils.RespApi(c, "bad", fmt.Sprintf("Bahan baku tidak ditemukan: %s", item.RawMaterialID), nil)
		}
		currentStock := 0.0
		if rawMat.CurrentStock != nil {
			currentStock = *rawMat.CurrentStock
		}
		if currentStock < *item.Qty {
			title := ""
			if rawMat.Title != nil {
				title = *rawMat.Title
			}
			return utils.RespApi(c, "bad",
				fmt.Sprintf("Stok %s tidak mencukupi. Stok saat ini: %.3f, dibutuhkan: %.3f", title, currentStock, *item.Qty),
				nil,
			)
		}
	}

	// Transaction
	tx := h.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	issuerType := "order"
	isSystem := false
	isIncrement := false

	for _, item := range input.Items {
		movement := models.RawMaterialMovement{
			RawMaterialID: item.RawMaterialID,
			IssuerType:    &issuerType,
			IssuerID:      &orderID,
			IsBySystem:    &isSystem,
			IsIncrement:   &isIncrement,
			Qty:           item.Qty,
			Notes:         item.Notes,
			CreatedBy:     createdBy,
		}
		if err := tx.Create(&movement).Error; err != nil {
			tx.Rollback()
			return utils.RespApi(c, "ise", "Gagal membuat movement", err.Error())
		}

		// Kurangi current_stock
		if err := tx.Exec(
			"UPDATE raw_materials SET current_stock = COALESCE(current_stock, 0) - ?, updated_at = NOW() WHERE id = ?",
			*item.Qty, item.RawMaterialID,
		).Error; err != nil {
			tx.Rollback()
			return utils.RespApi(c, "ise", "Gagal update stok", err.Error())
		}
	}

	if err := tx.Commit().Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal commit transaksi", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mencatat pemakaian bahan baku dan stok diperbarui", nil)
}

// AdjustmentItem for manual stock adjustments
type AdjustmentItem struct {
	RawMaterialID *uuid.UUID `json:"raw_material_id"`
	Qty           *float64   `json:"qty"`
	IsIncrement   *bool      `json:"is_increment"`
	Notes         *string    `json:"notes"`
}

type SubmitAdjustmentInput struct {
	Items []AdjustmentItem `json:"items"`
}

func (h *RawMaterialMovementHandler) SubmitAdjustment(c *fiber.Ctx) error {
	var input SubmitAdjustmentInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}
	if len(input.Items) == 0 {
		return utils.RespApi(c, "bad", "Minimal satu item harus diisi", nil)
	}

	var createdBy *uuid.UUID
	if uid := c.Locals("user_id"); uid != nil {
		if u, ok := uid.(uuid.UUID); ok {
			createdBy = &u
		}
	}

	for _, item := range input.Items {
		if item.RawMaterialID == nil || item.Qty == nil || *item.Qty <= 0 || item.IsIncrement == nil {
			return utils.RespApi(c, "bad", "raw_material_id, qty, dan is_increment wajib diisi", nil)
		}
		if !*item.IsIncrement {
			var rawMat models.RawMaterial
			if err := h.DB.First(&rawMat, "id = ?", item.RawMaterialID).Error; err != nil {
				return utils.RespApi(c, "bad", fmt.Sprintf("Bahan baku tidak ditemukan: %s", item.RawMaterialID), nil)
			}
			currentStock := 0.0
			if rawMat.CurrentStock != nil {
				currentStock = *rawMat.CurrentStock
			}
			if currentStock < *item.Qty {
				title := ""
				if rawMat.Title != nil {
					title = *rawMat.Title
				}
				return utils.RespApi(c, "bad",
fmt.Sprintf("Stok %s tidak mencukupi. Stok: %.3f, pengurangan: %.3f", title, currentStock, *item.Qty),
nil,
)
			}
		}
	}

	issuerType := "adjustment"
	isSystem := false

	tx := h.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, item := range input.Items {
		movement := models.RawMaterialMovement{
			RawMaterialID: item.RawMaterialID,
			IssuerType:    &issuerType,
			IsBySystem:    &isSystem,
			IsIncrement:   item.IsIncrement,
			Qty:           item.Qty,
			Notes:         item.Notes,
			CreatedBy:     createdBy,
		}
		if err := tx.Create(&movement).Error; err != nil {
			tx.Rollback()
			return utils.RespApi(c, "ise", "Gagal membuat movement", err.Error())
		}

		var stockSQL string
		if *item.IsIncrement {
			stockSQL = "UPDATE raw_materials SET current_stock = COALESCE(current_stock, 0) + ?, updated_at = NOW() WHERE id = ?"
		} else {
			stockSQL = "UPDATE raw_materials SET current_stock = COALESCE(current_stock, 0) - ?, updated_at = NOW() WHERE id = ?"
		}
		if err := tx.Exec(stockSQL, *item.Qty, item.RawMaterialID).Error; err != nil {
			tx.Rollback()
			return utils.RespApi(c, "ise", "Gagal update stok", err.Error())
		}
	}

	if err := tx.Commit().Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal commit transaksi", err.Error())
	}

	return utils.RespApi(c, "ok", "Adjustment stok berhasil dicatat", nil)
}
