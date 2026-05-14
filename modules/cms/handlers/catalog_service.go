package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type CatalogServiceHandler struct {
	DB *gorm.DB
}

func NewCatalogServiceHandler(db *gorm.DB) *CatalogServiceHandler {
	return &CatalogServiceHandler{DB: db}
}

func (h *CatalogServiceHandler) GetCatalogServices(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "12"))
	search := strings.ToLower(c.Query("search", ""))
	categoryID := c.Query("category_id", "")
	parentID := c.Query("parent_id", "")

	offset := (page - 1) * limit

	// Active services only
	db := h.DB.Model(&models.Service{}).
		Where("is_active = ?", true).
		Preload("ServiceCategory").
		Preload("Variants", "is_active = ?", true)

	if search != "" {
		db = db.Where("LOWER(name) LIKE ?", "%"+search+"%")
	}

	if categoryID != "" {
		db = db.Where("service_category_id = ?", categoryID)
	}

	if parentID == "none" {
		db = db.Where("parent_id IS NULL")
	} else if parentID != "" {
		db = db.Where("parent_id = ?", parentID)
	} else if search == "" {
		// By default only show parent services if not searching
		db = db.Where("parent_id IS NULL")
	}

	var total int64
	countQuery := h.DB.Model(&models.Service{}).Where("is_active = ?", true)
	if search != "" {
		countQuery = countQuery.Where("LOWER(name) LIKE ?", "%"+search+"%")
	}
	if categoryID != "" {
		countQuery = countQuery.Where("service_category_id = ?", categoryID)
	}
	if parentID == "none" {
		countQuery = countQuery.Where("parent_id IS NULL")
	} else if parentID != "" {
		countQuery = countQuery.Where("parent_id = ?", parentID)
	} else if search == "" {
		countQuery = countQuery.Where("parent_id IS NULL")
	}
	countQuery.Count(&total)

	var services []models.Service
	if err := db.Offset(offset).Limit(limit).Find(&services).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mengambil data catalog services", err.Error())
	}

	totalPages := (total + int64(limit) - 1) / int64(limit)

	result := fiber.Map{
		"services": services,
		"pagination": fiber.Map{
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": totalPages,
		},
	}

	return utils.RespApi(c, "ok", "Berhasil mengambil data catalog services", result)
}
