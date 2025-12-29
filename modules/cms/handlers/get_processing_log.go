package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// GetProcessingLog returns the processing log for an order
func (h *OrderHandler) GetProcessingLog(c *fiber.Ctx) error {
	orderID := c.Params("id")

	// Parse UUID
	id, err := uuid.Parse(orderID)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid order ID", err.Error())
	}

	// Get processing log with processed_by and order relations
	var log models.OrderProcessingLog
	if err := h.DB.
		Preload("ProcessedBy").
		Preload("Order.OrderProducts.Product").
		Where("order_id = ?", id).
		First(&log).Error; err != nil {
		return utils.RespApi(c, "nf", "Processing log not found", err.Error())
	}

	return utils.RespApi(c, "ok", "Processing log retrieved successfully", log)
}
