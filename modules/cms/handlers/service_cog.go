package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"strconv"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ServiceCogHandler struct {
	DB *gorm.DB
}

func NewServiceCogHandler(db *gorm.DB) *ServiceCogHandler {
	return &ServiceCogHandler{DB: db}
}

func (h *ServiceCogHandler) GetAllServiceCogs(c *fiber.Ctx) error {
	serviceID := c.Query("service_id", "")

	db := h.DB.Preload("Service").Preload("RawMaterial")

	if serviceID != "" {
		db = db.Where("service_id = ?", serviceID)
	}

	var serviceCogs []models.ServiceCog
	if err := db.Find(&serviceCogs).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal ambil data Service Cogs", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data Service Cogs", serviceCogs)
}

func (h *ServiceCogHandler) GetServiceCog(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Id tidak valid", nil)
	}

	var serviceCog models.ServiceCog
	if err := h.DB.Preload("Service").Preload("RawMaterial").First(&serviceCog, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Service Cog tidak ditemukan", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mengambil data Service Cog", serviceCog)
}

func (h *ServiceCogHandler) AddServiceCog(c *fiber.Ctx) error {
	var input struct {
		ServiceID     string  `json:"service_id" validate:"required,uuid"`
		RawMaterialID string  `json:"raw_material_id" validate:"required,uuid"`
		Qty           float64 `json:"qty" validate:"required,gt=0"`
		Unit          string  `json:"unit" validate:"required"`
	}

	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Format JSON salah", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	serviceID, _ := uuid.Parse(input.ServiceID)
	rawMaterialID, _ := uuid.Parse(input.RawMaterialID)

	serviceCog := models.ServiceCog{
		ServiceID:     &serviceID,
		RawMaterialID: &rawMaterialID,
		Qty:           &input.Qty,
		Unit:          &input.Unit,
	}

	if err := h.DB.Create(&serviceCog).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal membuat Service Cog", err.Error())
	}

	h.DB.Preload("RawMaterial").First(&serviceCog, "id = ?", serviceCog.ID)

	return utils.RespApi(c, "ok", "Berhasil membuat Service Cog", serviceCog)
}

func (h *ServiceCogHandler) UpdateServiceCog(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Id tidak valid", nil)
	}

	var serviceCog models.ServiceCog
	if err := h.DB.First(&serviceCog, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Service Cog tidak ditemukan", err.Error())
	}

	var input map[string]interface{}
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Format JSON salah", err.Error())
	}

	if rawMaterialID, ok := input["raw_material_id"].(string); ok && rawMaterialID != "" {
		rid, err := uuid.Parse(rawMaterialID)
		if err == nil {
			serviceCog.RawMaterialID = &rid
		}
	}

	// Qty is float64 in JSON unmarshaled map, but sometimes string if form
	if qtyIntf, ok := input["qty"]; ok {
		switch v := qtyIntf.(type) {
		case float64:
			serviceCog.Qty = &v
		case string:
			if q, err := strconv.ParseFloat(v, 64); err == nil {
				serviceCog.Qty = &q
			}
		}
	}

	if unit, ok := input["unit"].(string); ok && unit != "" {
		serviceCog.Unit = &unit
	}

	if err := h.DB.Save(&serviceCog).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal update Service Cog", err.Error())
	}

	h.DB.Preload("RawMaterial").First(&serviceCog, "id = ?", serviceCog.ID)

	return utils.RespApi(c, "ok", "Berhasil update Service Cog", serviceCog)
}

func (h *ServiceCogHandler) DeleteServiceCog(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Id tidak valid", nil)
	}

	if err := h.DB.Delete(&models.ServiceCog{}, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menghapus Service Cog", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil menghapus Service Cog", nil)
}
