package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ServiceCategoryHandler struct {
	DB *gorm.DB
}

func NewServiceCategoryHandler(db *gorm.DB) *ServiceCategoryHandler {
	return &ServiceCategoryHandler{DB: db}
}

func (h *ServiceCategoryHandler) GetAllServiceCategories(c *fiber.Ctx) error {
	var categories []models.ServiceCategory
	if err := h.DB.Find(&categories).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mengambil data kategori servis", err.Error())
	}
	return utils.RespApi(c, "ok", "Berhasil mengambil data kategori servis", categories)
}

func (h *ServiceCategoryHandler) GetServiceCategory(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID tidak valid", nil)
	}

	var category models.ServiceCategory
	if err := h.DB.First(&category, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Kategori servis tidak ditemukan", err.Error())
	}
	return utils.RespApi(c, "ok", "Berhasil mengambil data kategori servis", category)
}

func (h *ServiceCategoryHandler) AddServiceCategory(c *fiber.Ctx) error {
	var category models.ServiceCategory
	if err := c.BodyParser(&category); err != nil {
		return utils.RespApi(c, "bad", "Input tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(category); err != nil {
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	if err := h.DB.Create(&category).Error; err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			return utils.RespApi(c, "bad", "Nama kategori sudah ada", nil)
		}
		return utils.RespApi(c, "ise", "Gagal menambahkan kategori servis", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil menambahkan kategori servis", category)
}

func (h *ServiceCategoryHandler) UpdateServiceCategory(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID tidak valid", nil)
	}

	var category models.ServiceCategory
	if err := h.DB.First(&category, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Kategori servis tidak ditemukan", err.Error())
	}

	var input models.ServiceCategory
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Input tidak valid", err.Error())
	}

	category.Name = input.Name
	category.Description = input.Description
	category.IsActive = input.IsActive

	if err := h.DB.Save(&category).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mengupdate kategori servis", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mengupdate kategori servis", category)
}

func (h *ServiceCategoryHandler) DeleteServiceCategory(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID tidak valid", nil)
	}

	// Check usage in services
	var count int64
	h.DB.Model(&models.Service{}).Where("service_category_id = ?", id).Count(&count)
	if count > 0 {
		return utils.RespApi(c, "bad", "Kategori sedang digunakan oleh servis, tidak bisa dihapus", nil)
	}

	if err := h.DB.Delete(&models.ServiceCategory{}, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menghapus kategori servis", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil menghapus kategori servis", nil)
}
