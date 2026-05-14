package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrderServiceHandler struct {
	DB *gorm.DB
}

func NewOrderServiceHandler(db *gorm.DB) *OrderServiceHandler {
	return &OrderServiceHandler{DB: db}
}

// GetServiceTracking - Get all processes and details for an OrderService
func (h *OrderServiceHandler) GetServiceTracking(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid Order Service ID", err.Error())
	}

	// Get OrderService with relations
	var orderService models.OrderService
	if err := h.DB.Preload("ServiceProcess.Creator").Preload("ServiceDetail").
		Preload("Service").Preload("Order").
		First(&orderService, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "nf", "Order Service not found", err.Error())
	}

	return utils.RespApi(c, "ok", "Successfully retrieved service tracking data", orderService)
}

// AddServiceProcess - Add a new process step to the service
func (h *OrderServiceHandler) AddServiceProcess(c *fiber.Ctx) error {
	idStr := c.Params("id")
	orderServiceID, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid Order Service ID", err.Error())
	}

	// Parse body
	processType := c.FormValue("process_type")
	description := c.FormValue("description")

	if processType == "" {
		return utils.RespApi(c, "bad", "Process Type is required", nil)
	}

	// Handle Images
	form, err := c.MultipartForm()
	var images []string

	if err == nil {
		files := form.File["images"]
		for _, file := range files {
			// Validate file size (max 5MB)
			if file.Size > 5*1024*1024 {
				return utils.RespApi(c, "bad", fmt.Sprintf("File %s too large (max 5MB)", file.Filename), nil)
			}

			// Save file
			filename := fmt.Sprintf("%d-%s", utils.MakeTimestamp(), strings.ReplaceAll(file.Filename, " ", "-"))
			path := filepath.Join("uploads", "service-process", filename)

			// Ensure directory exists
			utils.EnsureDir("uploads/service-process")

			if err := c.SaveFile(file, path); err != nil {
				return utils.RespApi(c, "ise", "Failed to save image", err.Error())
			}
			images = append(images, path)
		}
	}

	// Prepare images JSON
	var imagesJSON *string
	if len(images) > 0 {
		imagesBytes, _ := json.Marshal(images)
		imagesStr := string(imagesBytes)
		imagesJSON = &imagesStr
	}

	// Get User ID from context (creator)
	var createdBy *uuid.UUID
	if uid := c.Locals("user_id"); uid != nil {
		if u, ok := uid.(uuid.UUID); ok {
			createdBy = &u
		}
	}

	// Create Process
	process := models.OrderServiceProcess{
		OrderServiceID: &orderServiceID,
		ProcessType:    &processType,
		Description:    &description,
		Images:         imagesJSON,
		CreatedByID:    createdBy,
	}

	if err := h.DB.Create(&process).Error; err != nil {
		return utils.RespApi(c, "ise", "Failed to create service process", err.Error())
	}

	return utils.RespApi(c, "ok", "Service process added successfully", process)
}

// UpdateServiceDetail - Update or Create detailed info for a service
func (h *OrderServiceHandler) UpdateServiceDetail(c *fiber.Ctx) error {
	idStr := c.Params("id")
	orderServiceID, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid Order Service ID", err.Error())
	}

	// Parse body
	description := c.FormValue("description")
	existingImagesStr := c.FormValue("existing_images") // JSON string of existing image paths

	var existingImages []string
	if existingImagesStr != "" {
		json.Unmarshal([]byte(existingImagesStr), &existingImages)
	}

	// Handle New Images
	form, err := c.MultipartForm()
	var newImages []string

	if err == nil {
		files := form.File["images"]
		for _, file := range files {
			// Validate file size (max 5MB)
			if file.Size > 5*1024*1024 {
				return utils.RespApi(c, "bad", fmt.Sprintf("File %s too large (max 5MB)", file.Filename), nil)
			}

			// Save file
			filename := fmt.Sprintf("%d-%s", utils.MakeTimestamp(), strings.ReplaceAll(file.Filename, " ", "-"))
			path := filepath.Join("uploads", "service-detail", filename)

			// Ensure directory exists
			utils.EnsureDir("uploads/service-detail")

			if err := c.SaveFile(file, path); err != nil {
				return utils.RespApi(c, "ise", "Failed to save image", err.Error())
			}
			newImages = append(newImages, path)
		}
	}

	// Combine images
	finalImages := append(existingImages, newImages...)

	// Prepare images JSON
	var imagesJSON *string
	if len(finalImages) > 0 {
		imagesBytes, _ := json.Marshal(finalImages)
		imagesStr := string(imagesBytes)
		imagesJSON = &imagesStr
	} else {
		// If explicit empty array or null, we might want to clear it.
		// But here if length is 0, we can set it to "[]" or null.
		empty := "[]"
		imagesJSON = &empty
	}

	// Check if detail exists
	var detail models.OrderServiceDetail
	err = h.DB.Where("order_service_id = ?", orderServiceID).First(&detail).Error

	if err == gorm.ErrRecordNotFound {
		// Create new
		detail = models.OrderServiceDetail{
			OrderServiceID: &orderServiceID,
			Description:    &description,
			Images:         imagesJSON,
		}
		if err := h.DB.Create(&detail).Error; err != nil {
			return utils.RespApi(c, "ise", "Failed to create service detail", err.Error())
		}
	} else if err != nil {
		return utils.RespApi(c, "ise", "Failed to check existing detail", err.Error())
	} else {
		// Update existing
		updates := map[string]interface{}{
			"description": description,
			"images":      imagesJSON,
		}
		if err := h.DB.Model(&detail).Updates(updates).Error; err != nil {
			return utils.RespApi(c, "ise", "Failed to update service detail", err.Error())
		}
	}

	return utils.RespApi(c, "ok", "Service details updated successfully", detail)
}
