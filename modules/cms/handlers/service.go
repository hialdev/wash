package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ServiceHandler struct {
	DB *gorm.DB
}

func NewServiceHandler(db *gorm.DB) *ServiceHandler {
	return &ServiceHandler{DB: db}
}

func (h *ServiceHandler) GetAllServices(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	search := strings.ToLower(c.Query("search", ""))
	categoryID := c.Query("category_id", "")
	status := c.Query("status", "") // active, inactive

	offset := (page - 1) * limit

	db := h.DB.Preload("ServiceCategory")

	if search != "" {
		db = db.Where("LOWER(name) LIKE ?", "%"+search+"%")
	}

	if categoryID != "" {
		db = db.Where("service_category_id = ?", categoryID)
	}

	if status != "" {
		isActive := status == "active"
		db = db.Where("is_active = ?", isActive)
	}

	var total int64
	countQuery := h.DB.Model(&models.Service{})
	if search != "" {
		countQuery = countQuery.Where("LOWER(name) LIKE ?", "%"+search+"%")
	}
	if categoryID != "" {
		countQuery = countQuery.Where("service_category_id = ?", categoryID)
	}
	if status != "" {
		isActive := status == "active"
		countQuery = countQuery.Where("is_active = ?", isActive)
	}
	if err := countQuery.Count(&total).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal hitung total", err.Error())
	}

	var services []models.Service
	if err := db.Offset(offset).Limit(limit).Find(&services).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal ambil data", err.Error())
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

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data Services", result)
}

func (h *ServiceHandler) GetService(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Id tidak valid", nil)
	}

	var service models.Service
	if err := h.DB.Preload("ServiceCategory").First(&service, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Service tidak ditemukan", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mengambil data Service", service)
}

func (h *ServiceHandler) AddService(c *fiber.Ctx) error {
	// Parse fields
	name := c.FormValue("name")
	description := c.FormValue("description")
	priceStr := c.FormValue("price")
	unit := c.FormValue("unit")
	estimatedDurationStr := c.FormValue("estimated_duration")
	isActiveStr := c.FormValue("is_active")
	categoryIDStr := c.FormValue("service_category_id")

	// Convert types
	price, _ := strconv.ParseFloat(priceStr, 64)
	estimatedDuration, _ := strconv.Atoi(estimatedDurationStr)
	isActive := true
	if isActiveStr != "" {
		isActive, _ = strconv.ParseBool(isActiveStr)
	}

	var categoryID *uuid.UUID
	if categoryIDStr != "" {
		id, err := uuid.Parse(categoryIDStr)
		if err == nil {
			categoryID = &id
		}
	}

	// Create service struct
	service := models.Service{
		Name:              &name,
		Description:       &description,
		Price:             &price,
		Unit:              &unit,
		EstimatedDuration: &estimatedDuration,
		IsActive:          &isActive,
		ServiceCategoryID: categoryID,
	}

	// Validate
	if err := utils.Validate.Struct(service); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	// Handle Images
	form, err := c.MultipartForm()
	if err == nil && form != nil {
		files := form.File["images"]
		var uploadedPaths []string

		for _, file := range files {
			// Save file
			savedFile, err := utils.SaveFile(file, "services") // Upload to 'services' folder
			if err != nil {
				fmt.Printf("Failed to save image: %v\n", err)
				continue
			}
			uploadedPaths = append(uploadedPaths, savedFile.Path)
		}

		if len(uploadedPaths) > 0 {
			imagesJSON, _ := json.Marshal(uploadedPaths)
			imagesStr := string(imagesJSON)
			service.Images = &imagesStr
		} else {
			// If no files uploaded, check if "existing_images" are provided (for edit mostly, but maybe relevant)
			// For AddService, we usually just take new files
		}
	}

	if err := h.DB.Create(&service).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal membuat Service", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil membuat Service", service)
}

func (h *ServiceHandler) UpdateService(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Id tidak valid", nil)
	}

	var service models.Service
	if err := h.DB.First(&service, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Service tidak ditemukan", err.Error())
	}

	// Parse fields
	name := c.FormValue("name")
	description := c.FormValue("description")
	priceStr := c.FormValue("price")
	unit := c.FormValue("unit")
	estimatedDurationStr := c.FormValue("estimated_duration")
	isActiveStr := c.FormValue("is_active")
	categoryIDStr := c.FormValue("service_category_id")

	// Update fields
	if name != "" {
		service.Name = &name
	}
	if description != "" {
		service.Description = &description
	}
	if priceStr != "" {
		price, _ := strconv.ParseFloat(priceStr, 64)
		service.Price = &price
	}
	if unit != "" {
		service.Unit = &unit
	}
	if estimatedDurationStr != "" {
		estimatedDuration, _ := strconv.Atoi(estimatedDurationStr)
		service.EstimatedDuration = &estimatedDuration
	}
	if isActiveStr != "" {
		isActive, _ := strconv.ParseBool(isActiveStr)
		service.IsActive = &isActive
	}
	if categoryIDStr != "" {
		catID, err := uuid.Parse(categoryIDStr)
		if err == nil {
			service.ServiceCategoryID = &catID
		}
	}

	// Handle Images
	form, err := c.MultipartForm()
	var currentImages []string
	if service.Images != nil && *service.Images != "" {
		json.Unmarshal([]byte(*service.Images), &currentImages)
	}

	// Check for existing images to keep
	// Frontend should send "existing_images" as array of strings
	// Since fiber's form handling for array of strings can be tricky, we might need multiple check
	existingImages := c.FormValue("existing_images") // expects JSON string if complex, or multiple keys
	// Simplied approach: if existing_images is passed as JSON string
	if existingImages != "" {
		var keptImages []string
		json.Unmarshal([]byte(existingImages), &keptImages)
		currentImages = keptImages // Replace current with what frontend says to keep
	}

	// Add new files
	if err == nil && form != nil {
		files := form.File["images"]
		for _, file := range files {
			savedFile, err := utils.SaveFile(file, "services")
			if err != nil {
				continue
			}
			currentImages = append(currentImages, savedFile.Path)
		}
	}

	if len(currentImages) > 0 {
		imagesJSON, _ := json.Marshal(currentImages)
		imagesStr := string(imagesJSON)
		service.Images = &imagesStr
	} else {
		empty := "[]"
		service.Images = &empty
	}

	if err := h.DB.Save(&service).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal update Service", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil update Service", service)
}

func (h *ServiceHandler) DeleteService(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Id tidak valid", nil)
	}

	// Soft delete
	if err := h.DB.Delete(&models.Service{}, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menghapus Service", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil menghapus Service", nil)
}
