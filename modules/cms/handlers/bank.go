package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type BankHandler struct {
	DB *gorm.DB
}

type BankInput struct {
	BankName      string  `json:"bank_name" validate:"required"`
	AccountNumber string  `json:"account_number" validate:"required"`
	AccountOwner  string  `json:"account_owner" validate:"required"`
	Description   *string `json:"description"`
	Logo          *string `json:"logo"`
	IsActive      *bool   `json:"is_active"`
}

func (h *BankHandler) Create(c *fiber.Ctx) error {
	bankName := c.FormValue("bank_name")
	accountNumber := c.FormValue("account_number")
	accountOwner := c.FormValue("account_owner")
	description := c.FormValue("description")
	isActiveStr := c.FormValue("is_active", "true")

	input := BankInput{
		BankName:      bankName,
		AccountNumber: accountNumber,
		AccountOwner:  accountOwner,
	}
	if description != "" {
		input.Description = &description
	}
	isActive := isActiveStr == "true"
	input.IsActive = &isActive

	if err := utils.Validate.Struct(&input); err != nil {
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	uploadPath, err := utils.UploadFile(c, "logo", "banks")
	if err == nil && uploadPath != "" {
		input.Logo = &uploadPath
	}

	bank := models.Bank{
		BankName:      &input.BankName,
		AccountNumber: &input.AccountNumber,
		AccountOwner:  &input.AccountOwner,
		Description:   input.Description,
		Logo:          input.Logo,
		IsActive:      &isActive,
	}

	if err := h.DB.Create(&bank).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menambahkan data bank", err.Error())
	}

	return utils.RespApi(c, "created", "Data bank berhasil ditambahkan", bank)
}

func (h *BankHandler) GetAll(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	search := c.Query("search", "")
	isActiveStr := c.Query("is_active", "")

	offset := (page - 1) * limit
	var banks []models.Bank
	db := h.DB.Model(&models.Bank{})

	if search != "" {
		db = db.Where("LOWER(bank_name) LIKE ? OR LOWER(account_number) LIKE ? OR LOWER(account_owner) LIKE ?",
			"%"+strings.ToLower(search)+"%",
			"%"+strings.ToLower(search)+"%",
			"%"+strings.ToLower(search)+"%")
	}

	if isActiveStr != "" {
		isActive, _ := strconv.ParseBool(isActiveStr)
		db = db.Where("is_active = ?", isActive)
	}

	var total int64
	db.Count(&total)

	if err := db.Order("created_at DESC").Offset(offset).Limit(limit).Find(&banks).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mengambil data bank", err.Error())
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	return utils.RespPagination(c, "ok", "Berhasil mengambil data bank", banks, total, page, totalPages)
}

func (h *BankHandler) GetById(c *fiber.Ctx) error {
	id := c.Params("id")
	var bank models.Bank

	if err := h.DB.First(&bank, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.RespApi(c, "bad", "Data bank tidak ditemukan", nil)
		}
		return utils.RespApi(c, "ise", "Gagal mengambil data bank", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mengambil data bank", bank)
}

func (h *BankHandler) Update(c *fiber.Ctx) error {
	id := c.Params("id")
	var bank models.Bank

	if err := h.DB.First(&bank, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.RespApi(c, "bad", "Data bank tidak ditemukan", nil)
		}
		return utils.RespApi(c, "ise", "Gagal mengambil data bank", err.Error())
	}

	bankName := c.FormValue("bank_name")
	accountNumber := c.FormValue("account_number")
	accountOwner := c.FormValue("account_owner")
	description := c.FormValue("description")
	isActiveStr := c.FormValue("is_active", "")

	input := BankInput{
		BankName:      bankName,
		AccountNumber: accountNumber,
		AccountOwner:  accountOwner,
	}
	if description != "" {
		input.Description = &description
	}
	if isActiveStr != "" {
		isActive := isActiveStr == "true"
		input.IsActive = &isActive
	}

	if err := utils.Validate.Struct(&input); err != nil {
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	uploadPath, err := utils.UploadFile(c, "logo", "banks")
	if err == nil && uploadPath != "" {
		bank.Logo = &uploadPath
	}

	if input.BankName != "" {
		bank.BankName = &input.BankName
	}
	if input.AccountNumber != "" {
		bank.AccountNumber = &input.AccountNumber
	}
	if input.AccountOwner != "" {
		bank.AccountOwner = &input.AccountOwner
	}
	if input.Description != nil {
		bank.Description = input.Description
	}
	if input.IsActive != nil {
		bank.IsActive = input.IsActive
	}

	if err := h.DB.Save(&bank).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mengupdate data bank", err.Error())
	}

	return utils.RespApi(c, "ok", "Data bank berhasil diupdate", bank)
}

func (h *BankHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	var bank models.Bank

	if err := h.DB.First(&bank, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.RespApi(c, "bad", "Data bank tidak ditemukan", nil)
		}
		return utils.RespApi(c, "ise", "Gagal mengambil data bank", err.Error())
	}

	if err := h.DB.Delete(&bank).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menghapus data bank", err.Error())
	}

	return utils.RespApi(c, "ok", "Data bank berhasil dihapus", nil)
}
