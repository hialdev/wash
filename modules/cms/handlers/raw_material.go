package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"fmt"
	"strconv"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RawMaterialHandler struct {
	DB *gorm.DB
}

func NewRawMaterialHandler(db *gorm.DB) *RawMaterialHandler {
	return &RawMaterialHandler{DB: db}
}

type RawMaterialInput struct {
	Title *string `json:"title" validate:"required,max=255"`
	Slug  *string `json:"slug" validate:"required,max=255"`
	Unit  *string `json:"unit" validate:"required,max=50"`
}

func (h *RawMaterialHandler) GetAllRawMaterials(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	search := strings.ToLower(c.Query("search", ""))
	sort := c.Query("sort", "created_at")
	order := c.Query("order", "desc")

	offset := (page - 1) * limit

	db := h.DB.Model(&models.RawMaterial{})

	if search != "" {
		db = db.Where("LOWER(title) LIKE ? OR LOWER(slug) LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal hitung total", err.Error())
	}

	validSortFields := map[string]string{
		"id":            "id",
		"title":         "title",
		"current_stock": "current_stock",
		"created_at":    "created_at",
	}
	sortBy, ok := validSortFields[sort]
	if !ok {
		sortBy = "created_at"
	}
	db = db.Order(fmt.Sprintf("%s %s", sortBy, order))

	var rawMaterials []models.RawMaterial
	if err := db.Offset(offset).Limit(limit).Find(&rawMaterials).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal ambil data", err.Error())
	}

	totalPages := (total + int64(limit) - 1) / int64(limit)

	result := fiber.Map{
		"raw_materials": rawMaterials,
		"pagination": fiber.Map{
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": totalPages,
		},
	}
	return utils.RespApi(c, "ok", "Berhasil mendapatkan data Raw Materials", result)
}

func (h *RawMaterialHandler) GetRawMaterial(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Id tidak valid", nil)
	}

	var rawMaterial models.RawMaterial
	if err := h.DB.First(&rawMaterial, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data Raw Material", err.Error())
	}
	return utils.RespApi(c, "ok", "Berhasil mendapatkan data Raw Material", rawMaterial)
}

func (h *RawMaterialHandler) AddRawMaterial(c *fiber.Ctx) error {
	title := c.FormValue("title")
	slug := c.FormValue("slug")
	unit := c.FormValue("unit")

	input := RawMaterialInput{
		Title: &title,
		Slug:  &slug,
		Unit:  &unit,
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	// Upload gambar jika ada
	var imagePath *string
	_, err := c.FormFile("image")
	if err == nil {
		paths, uploadErr := utils.UploadFileFlex(c, "image", "raw-materials")
		if uploadErr == nil && len(paths) > 0 {
			imagePath = &paths[0]
		}
	}

	initialStock := 0.0
	rawMaterial := models.RawMaterial{
		Title:        &title,
		Slug:         &slug,
		Unit:         &unit,
		Image:        imagePath,
		CurrentStock: &initialStock,
	}

	if err := h.DB.Create(&rawMaterial).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal membuat Raw Material", err.Error())
	}
	return utils.RespApi(c, "ok", "Berhasil membuat Raw Material", rawMaterial)
}

func (h *RawMaterialHandler) UpdateRawMaterial(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Id tidak valid", nil)
	}

	var rawMaterial models.RawMaterial
	if err := h.DB.First(&rawMaterial, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Data tidak ditemukan", err.Error())
	}

	title := c.FormValue("title")
	slug := c.FormValue("slug")
	unit := c.FormValue("unit")

	if title != "" {
		rawMaterial.Title = &title
	}
	if slug != "" {
		rawMaterial.Slug = &slug
	}
	if unit != "" {
		rawMaterial.Unit = &unit
	}

	// Upload gambar baru jika ada
	_, err = c.FormFile("image")
	if err == nil {
		paths, uploadErr := utils.UploadFileFlex(c, "image", "raw-materials")
		if uploadErr == nil && len(paths) > 0 {
			rawMaterial.Image = &paths[0]
		}
	}

	if err := h.DB.Save(&rawMaterial).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal update Raw Material", err.Error())
	}
	return utils.RespApi(c, "ok", "Berhasil update Raw Material", rawMaterial)
}

func (h *RawMaterialHandler) DeleteRawMaterial(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Id tidak valid", nil)
	}

	if err := h.DB.Delete(&models.RawMaterial{}, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menghapus Raw Material", err.Error())
	}
	return utils.RespApi(c, "ok", "Berhasil menghapus Raw Material", nil)
}
