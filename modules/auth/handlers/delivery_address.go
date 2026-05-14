package handlers

import (
	"aldev/modules/auth/models"
	"aldev/utils"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DeliveryAddressHandler struct {
	DB *gorm.DB
}

type DeliveryAddressInput struct {
	Address     string `json:"address" validate:"required"`
	PhoneNumber string `json:"phone_number" validate:"required"`
	Notes       string `json:"notes"`
	IsPrimary   bool   `json:"is_primary"`
}

func (h *DeliveryAddressHandler) getUserIDFromCtx(c *fiber.Ctx) (uuid.UUID, error) {
	userJWT := c.Locals("user")
	if userJWT == nil {
		return uuid.Nil, fiber.ErrUnauthorized
	}
	token := userJWT.(*jwt.Token)
	claims := token.Claims.(jwt.MapClaims)
	userID, err := uuid.Parse(claims["user_id"].(string))
	if err != nil {
		return uuid.Nil, err
	}
	return userID, nil
}

func (h *DeliveryAddressHandler) Create(c *fiber.Ctx) error {
	userID, err := h.getUserIDFromCtx(c)
	if err != nil {
		return utils.RespApi(c, "unauth", "User ID not found in token", nil)
	}

	var input DeliveryAddressInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Data input salah", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	tx := h.DB.Begin()

	// If marked as primary, set all other addresses of this user to not primary
	if input.IsPrimary {
		tx.Model(&models.DeliveryAddress{}).Where("user_id = ?", userID).Update("is_primary", false)
	}

	// Check if this is the first address, if so, force primary
	var addressCount int64
	tx.Model(&models.DeliveryAddress{}).Where("user_id = ?", userID).Count(&addressCount)
	if addressCount == 0 {
		input.IsPrimary = true
	}

	address := models.DeliveryAddress{
		UserID:      &userID,
		Address:     &input.Address,
		PhoneNumber: &input.PhoneNumber,
		Notes:       &input.Notes,
		IsPrimary:   &input.IsPrimary,
	}

	if err := tx.Create(&address).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal menyimpan alamat", err.Error())
	}

	tx.Commit()
	return utils.RespApi(c, "created", "Alamat berhasil ditambahkan", address)
}

func (h *DeliveryAddressHandler) GetMyAddresses(c *fiber.Ctx) error {
	userID, err := h.getUserIDFromCtx(c)
	if err != nil {
		return utils.RespApi(c, "unauth", "User ID not found in token", nil)
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "100"))
	search := c.Query("search", "")

	offset := (page - 1) * limit

	var addresses []models.DeliveryAddress
	db := h.DB.Where("user_id = ?", userID).Order("is_primary DESC, created_at DESC")

	if search != "" {
		db = db.Where("LOWER(address) LIKE ?", "%"+strings.ToLower(search)+"%")
	}

	var total int64
	db.Model(&models.DeliveryAddress{}).Count(&total)

	if err := db.Offset(offset).Limit(limit).Find(&addresses).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data alamat", err.Error())
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	return utils.RespPagination(c, "ok", "Berhasil mengambil alamat", addresses, total, page, totalPages)
}

func (h *DeliveryAddressHandler) Update(c *fiber.Ctx) error {
	id := c.Params("id")
	userID, err := h.getUserIDFromCtx(c)
	if err != nil {
		return utils.RespApi(c, "unauth", "User ID not found in token", nil)
	}

	var input DeliveryAddressInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Data input salah", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	tx := h.DB.Begin()

	var address models.DeliveryAddress
	if err := tx.Where("id = ? AND user_id = ?", id, userID).First(&address).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return utils.RespApi(c, "bad", "Alamat tidak ditemukan", nil)
		}
		return utils.RespApi(c, "ise", "Gagal mencari alamat", err.Error())
	}

	if input.IsPrimary && !*address.IsPrimary {
		tx.Model(&models.DeliveryAddress{}).Where("user_id = ?", userID).Update("is_primary", false)
	}

	// Don't un-primary if it's the only address
	if !input.IsPrimary && *address.IsPrimary {
		var otherCount int64
		tx.Model(&models.DeliveryAddress{}).Where("user_id = ? AND id != ?", userID, id).Count(&otherCount)
		if otherCount == 0 {
			input.IsPrimary = true
		}
	}

	address.Address = &input.Address
	address.PhoneNumber = &input.PhoneNumber
	address.Notes = &input.Notes
	address.IsPrimary = &input.IsPrimary

	if err := tx.Save(&address).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal mengupdate alamat", err.Error())
	}

	tx.Commit()
	return utils.RespApi(c, "ok", "Alamat berhasil diupdate", address)
}

func (h *DeliveryAddressHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	userID, err := h.getUserIDFromCtx(c)
	if err != nil {
		return utils.RespApi(c, "unauth", "User ID not found in token", nil)
	}

	var address models.DeliveryAddress
	if err := h.DB.Where("id = ? AND user_id = ?", id, userID).First(&address).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.RespApi(c, "bad", "Alamat tidak ditemukan", nil)
		}
		return utils.RespApi(c, "ise", "Gagal mencari alamat", err.Error())
	}

	tx := h.DB.Begin()

	if err := tx.Delete(&address).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal menghapus alamat", err.Error())
	}

	if *address.IsPrimary {
		var newPrimary models.DeliveryAddress
		if err := tx.Where("user_id = ?", userID).Order("created_at DESC").First(&newPrimary).Error; err == nil {
			tx.Model(&newPrimary).Update("is_primary", true)
		}
	}

	tx.Commit()
	return utils.RespApi(c, "ok", "Alamat berhasil dihapus", nil)
}

func (h *DeliveryAddressHandler) SetPrimary(c *fiber.Ctx) error {
	id := c.Params("id")
	userID, err := h.getUserIDFromCtx(c)
	if err != nil {
		return utils.RespApi(c, "unauth", "User ID not found in token", nil)
	}

	tx := h.DB.Begin()

	var address models.DeliveryAddress
	if err := tx.Where("id = ? AND user_id = ?", id, userID).First(&address).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return utils.RespApi(c, "bad", "Alamat tidak ditemukan", nil)
		}
		return utils.RespApi(c, "ise", "Gagal mencari alamat", err.Error())
	}

	if err := tx.Model(&models.DeliveryAddress{}).Where("user_id = ?", userID).Update("is_primary", false).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal mengatur alamat utama", err.Error())
	}

	if err := tx.Model(&models.DeliveryAddress{}).Where("id = ?", id).Update("is_primary", true).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal mengatur alamat utama", err.Error())
	}

	tx.Commit()
	return utils.RespApi(c, "ok", "Alamat utama berhasil diatur", nil)
}

// CreateForUser — create delivery address for a specific user (used by Kasir)
func (h *DeliveryAddressHandler) CreateForUser(c *fiber.Ctx) error {
	userIDStr := c.Params("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return utils.RespApi(c, "bad", "User ID yang diberikan tidak valid", nil)
	}

	var input DeliveryAddressInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Data input salah", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	tx := h.DB.Begin()

	// If marked as primary, reset others first
	if input.IsPrimary {
		tx.Model(&models.DeliveryAddress{}).Where("user_id = ?", userID).Update("is_primary", false)
	}

	// Auto-primary if first address
	var addressCount int64
	tx.Model(&models.DeliveryAddress{}).Where("user_id = ?", userID).Count(&addressCount)
	if addressCount == 0 {
		input.IsPrimary = true
	}

	address := models.DeliveryAddress{
		UserID:      &userID,
		Address:     &input.Address,
		PhoneNumber: &input.PhoneNumber,
		Notes:       &input.Notes,
		IsPrimary:   &input.IsPrimary,
	}

	if err := tx.Create(&address).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal menyimpan alamat", err.Error())
	}

	tx.Commit()
	return utils.RespApi(c, "created", "Alamat berhasil ditambahkan", address)
}
