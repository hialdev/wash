package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type VoucherHandler struct {
	DB *gorm.DB
}

func NewVoucherHandler(db *gorm.DB) *VoucherHandler {
	return &VoucherHandler{DB: db}
}

func (h *VoucherHandler) GetAllVouchers(c *fiber.Ctx) error {
	isPublicStr := c.Query("is_public", "")
	isActiveStr := c.Query("is_active", "")
	code := strings.ToLower(c.Query("code", ""))

	db := h.DB.Model(&models.Voucher{})

	if isPublicStr != "" {
		isPublic, _ := strconv.ParseBool(isPublicStr)
		db = db.Where("is_public = ?", isPublic)
	}

	if isActiveStr != "" {
		isActive, _ := strconv.ParseBool(isActiveStr)
		db = db.Where("is_active = ?", isActive)
	}

	if code != "" {
		db = db.Where("LOWER(code) LIKE ?", "%"+code+"%")
	}

	// Filter valid date for active public vouchers
	onlyValid := c.Query("only_valid", "")
	if onlyValid == "true" {
		now := time.Now()
		db = db.Where("(valid_from IS NULL OR valid_from <= ?) AND (valid_until IS NULL OR valid_until >= ?)", now, now)
		db = db.Where("quota IS NULL OR used_count < quota")
	}

	var vouchers []models.Voucher
	if err := db.Order("created_at desc").Find(&vouchers).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal ambil data Voucher", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data Voucher", vouchers)
}

func (h *VoucherHandler) GetVoucher(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Id tidak valid", nil)
	}

	var voucher models.Voucher
	if err := h.DB.First(&voucher, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Voucher tidak ditemukan", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mengambil data Voucher", voucher)
}

func (h *VoucherHandler) AddVoucher(c *fiber.Ctx) error {
	var voucher models.Voucher

	if err := c.BodyParser(&voucher); err != nil {
		return utils.RespApi(c, "bad", "Format JSON salah", err.Error())
	}

	if err := utils.Validate.Struct(voucher); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	// Code to uppercase
	upperCode := strings.ToUpper(*voucher.Code)
	voucher.Code = &upperCode

	if err := h.DB.Create(&voucher).Error; err != nil {
		if strings.Contains(err.Error(), "unique") {
			return utils.RespApi(c, "bad", "Kode Voucher sudah digunakan", nil)
		}
		return utils.RespApi(c, "ise", "Gagal membuat Voucher", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil membuat Voucher", voucher)
}

func (h *VoucherHandler) UpdateVoucher(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Id tidak valid", nil)
	}

	var voucher models.Voucher
	if err := h.DB.First(&voucher, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Voucher tidak ditemukan", err.Error())
	}

	var input models.Voucher
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Format JSON salah", err.Error())
	}

	if input.Code != nil {
		upperCode := strings.ToUpper(*input.Code)
		voucher.Code = &upperCode
	}
	if input.Description != nil {
		voucher.Description = input.Description
	}
	if input.DiscountType != nil {
		voucher.DiscountType = input.DiscountType
	}
	if input.DiscountValue != nil {
		voucher.DiscountValue = input.DiscountValue
	}
	if input.MaxDiscount != nil {
		voucher.MaxDiscount = input.MaxDiscount
	} else if c.BodyParser(&map[string]interface{}{"max_discount": nil}) == nil {
		// handle clearing it if needed, simple logic
	}
	if input.MinPurchase != nil {
		voucher.MinPurchase = input.MinPurchase
	}
	if input.IsPublic != nil {
		voucher.IsPublic = input.IsPublic
	}
	if input.IsActive != nil {
		voucher.IsActive = input.IsActive
	}
	if input.Quota != nil {
		voucher.Quota = input.Quota
	}
	if input.ValidFrom != nil {
		voucher.ValidFrom = input.ValidFrom
	}
	if input.ValidUntil != nil {
		voucher.ValidUntil = input.ValidUntil
	}

	if err := h.DB.Save(&voucher).Error; err != nil {
		if strings.Contains(err.Error(), "unique") {
			return utils.RespApi(c, "bad", "Kode Voucher sudah digunakan", nil)
		}
		return utils.RespApi(c, "ise", "Gagal update Voucher", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil update Voucher", voucher)
}

func (h *VoucherHandler) DeleteVoucher(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Id tidak valid", nil)
	}

	if err := h.DB.Delete(&models.Voucher{}, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menghapus Voucher", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil menghapus Voucher", nil)
}

func (h *VoucherHandler) ValidateVoucher(c *fiber.Ctx) error {
	var input struct {
		Code          string  `json:"code" validate:"required"`
		TotalPurchase float64 `json:"total_purchase" validate:"required"`
	}

	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Format JSON salah", err.Error())
	}

	upperCode := strings.ToUpper(input.Code)
	var voucher models.Voucher

	if err := h.DB.Where("code = ?", upperCode).First(&voucher).Error; err != nil {
		return utils.RespApi(c, "bad", "Voucher tidak ditemukan", nil)
	}

	if !*voucher.IsActive {
		return utils.RespApi(c, "bad", "Voucher tidak aktif", nil)
	}

	now := time.Now()
	if voucher.ValidFrom != nil && now.Before(*voucher.ValidFrom) {
		return utils.RespApi(c, "bad", "Voucher belum berlaku", nil)
	}
	if voucher.ValidUntil != nil && now.After(*voucher.ValidUntil) {
		return utils.RespApi(c, "bad", "Voucher sudah kadaluwarsa", nil)
	}

	if voucher.Quota != nil && voucher.UsedCount != nil && *voucher.UsedCount >= *voucher.Quota {
		return utils.RespApi(c, "bad", "Kuota voucher telah habis", nil)
	}

	if voucher.MinPurchase != nil && input.TotalPurchase < *voucher.MinPurchase {
		return utils.RespApi(c, "bad", "Total belanja belum memenuhi syarat minimum voucher", nil)
	}

	// Calculate discount
	var discountAmount float64
	if *voucher.DiscountType == "percentage" {
		discountAmount = input.TotalPurchase * (*voucher.DiscountValue / 100)
		if voucher.MaxDiscount != nil && *voucher.MaxDiscount > 0 && discountAmount > *voucher.MaxDiscount {
			discountAmount = *voucher.MaxDiscount
		}
	} else { // nominal
		discountAmount = *voucher.DiscountValue
	}

	// Ensure discount doesn't exceed total
	if discountAmount > input.TotalPurchase {
		discountAmount = input.TotalPurchase
	}

	result := fiber.Map{
		"voucher":         voucher,
		"discount_amount": discountAmount,
		"final_total":     input.TotalPurchase - discountAmount,
	}

	return utils.RespApi(c, "ok", "Voucher valid", result)
}
