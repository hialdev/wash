package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AgentCommissionHandler struct {
	DB *gorm.DB
}

type CommissionRateInput struct {
	Type     *string    `json:"type" validate:"required,oneof=service product"`
	IssuerID *uuid.UUID `json:"issuer_id" validate:"required"`
	RateType *string    `json:"rate_type" validate:"required,oneof=percentage fixed"`
	Rate     *float64   `json:"rate" validate:"required,min=0"`
}

type BulkCommissionRateInput struct {
	Rates []CommissionRateInput `json:"rates" validate:"dive"`
}

func (h AgentCommissionHandler) GetCommissions(c *fiber.Ctx) error {
	agentIDParam := c.Params("id")
	agentID, err := uuid.Parse(agentIDParam)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid Agent ID", nil)
	}

	var rates []models.AgentCommissionRate
	if err := h.DB.Where("agent_id = ?", agentID).Find(&rates).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mengambil data komisi", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan commission rates", rates)
}

func (h AgentCommissionHandler) BulkUpdateCommissions(c *fiber.Ctx) error {
	agentIDParam := c.Params("id")
	agentID, err := uuid.Parse(agentIDParam)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid Agent ID", nil)
	}

	// Verify agent exists
	var agent models.Agent
	if err := h.DB.First(&agent, "id = ?", agentID).Error; err != nil {
		return utils.RespApi(c, "bad", "Agent tidak ditemukan", nil)
	}

	var input BulkCommissionRateInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Gagal memproses request body", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	tx := h.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Delete all existing commissions for this agent
	if err := tx.Where("agent_id = ?", agentID).Delete(&models.AgentCommissionRate{}).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal menghapus rate lama", err.Error())
	}

	// Insert new ones if rates are provided
	if len(input.Rates) > 0 {
		var newRates []models.AgentCommissionRate
		for _, r := range input.Rates {
			newRates = append(newRates, models.AgentCommissionRate{
				AgentID:  &agentID,
				Type:     r.Type,
				IssuerID: r.IssuerID,
				RateType: r.RateType,
				Rate:     r.Rate,
			})
		}

		if err := tx.Create(&newRates).Error; err != nil {
			tx.Rollback()
			return utils.RespApi(c, "ise", "Gagal menyimpan rate komisi baru", err.Error())
		}
	}

	if err := tx.Commit().Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal commit database", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil memperbarui commission rates", nil)
}
