package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// -------------------------------------------------------------------
// AddProcessLog — POST /orders/:id/process-log
// Kasir menambahkan entri proses ke order (tanpa per-service)
// -------------------------------------------------------------------
func (h *OrderHandler) AddProcessLog(c *fiber.Ctx) error {
	orderID := c.Params("id")
	id, err := uuid.Parse(orderID)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid order ID", err.Error())
	}

	// Verify order exists
	var order models.Order
	if err := h.DB.First(&order, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "nf", "Order tidak ditemukan", err.Error())
	}

	// Parse fields
	processType := c.FormValue("process_type")
	if processType == "" {
		return utils.RespApi(c, "bad", "process_type wajib diisi", nil)
	}
	description := c.FormValue("description")

	// Get caller user ID
	var createdByID *uuid.UUID
	if userID := c.Locals("user_id"); userID != nil {
		if uid, ok := userID.(uuid.UUID); ok {
			createdByID = &uid
		}
	}

	// Upload images if provided
	var imagesJSON *string
	form, err := c.MultipartForm()
	if err == nil && form != nil {
		if len(form.File["images"]) > 0 {
			if filePaths, err := utils.UploadFileFlex(c, "images", "order_process"); err == nil && len(filePaths) > 0 {
				raw, _ := json.Marshal(filePaths)
				s := string(raw)
				imagesJSON = &s
			}
		}
	}

	// Build log entry
	logEntry := models.OrderProcessLog{
		OrderID:     &id,
		ProcessType: &processType,
		CreatedByID: createdByID,
	}
	if description != "" {
		logEntry.Description = &description
	}
	if imagesJSON != nil {
		logEntry.Images = imagesJSON
	}

	if err := h.DB.Create(&logEntry).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menyimpan log proses", err.Error())
	}

	// Reload with relations
	h.DB.Preload("CreatedBy").First(&logEntry, "id = ?", logEntry.ID)

	// Auto-set status to on_progress if still waiting_process
	if order.Status != nil && *order.Status == "waiting_process" {
		h.DB.Model(&order).Update("status", "on_progress")
	}

	return utils.RespApi(c, "ok", "Log proses berhasil ditambahkan", logEntry)
}

// -------------------------------------------------------------------
// GetProcessLogs — GET /orders/:id/process-log
// -------------------------------------------------------------------
func (h *OrderHandler) GetProcessLogs(c *fiber.Ctx) error {
	orderID := c.Params("id")
	id, err := uuid.Parse(orderID)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid order ID", err.Error())
	}

	var logs []models.OrderProcessLog
	if err := h.DB.
		Preload("CreatedBy").
		Where("order_id = ?", id).
		Order("created_at ASC").
		Find(&logs).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mengambil log proses", err.Error())
	}

	return utils.RespApi(c, "ok", "Log proses berhasil diambil", logs)
}

// -------------------------------------------------------------------
// FinishOrder — POST /orders/:id/finish
// Selesaikan pesanan (bisa tanpa log proses)
// -------------------------------------------------------------------
func (h *OrderHandler) FinishOrder(c *fiber.Ctx) error {
	orderID := c.Params("id")
	id, err := uuid.Parse(orderID)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid order ID", err.Error())
	}

	var order models.Order
	if err := h.DB.First(&order, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "nf", "Order tidak ditemukan", err.Error())
	}

	// Only allow finishing if order is in a processable state
	allowedStatuses := map[string]bool{
		"waiting_payment":      true,
		"confirmed":            true,
		"payment_verification": true,
		"waiting_process":      true,
		"on_progress":          true,
	}
	if order.Status == nil || !allowedStatuses[*order.Status] {
		return utils.RespApi(c, "bad", "Status order tidak dapat diselesaikan: "+func() string {
			if order.Status != nil {
				return *order.Status
			}
			return "unknown"
		}(), nil)
	}

	// Get caller user ID
	var createdByID *uuid.UUID
	if userID := c.Locals("user_id"); userID != nil {
		if uid, ok := userID.(uuid.UUID); ok {
			createdByID = &uid
		}
	}

	// Update order status
	finishStatus := "finish"
	if err := h.DB.Model(&order).Update("status", finishStatus).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal memperbarui status order", err.Error())
	}

	// Log the status change
	reason := "Pesanan diselesaikan"
	logStatus := models.OrderLogStatus{
		OrderID:   &id,
		Status:    &finishStatus,
		Reason:    &reason,
		CreatedBy: createdByID,
	}
	h.DB.Create(&logStatus)

	// Reload order
	h.DB.Preload("User").Preload("OrderServices.Service").First(&order, "id = ?", id)

	return utils.RespApi(c, "ok", "Pesanan berhasil diselesaikan", order)
}
