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
	status := c.Query("status", "")   // active, inactive
	parentID := c.Query("parent_id", "") // specific parent = get variants; "none" = top-level only
	withVariants := c.Query("with_variants", "false") == "true"

	offset := (page - 1) * limit

	db := h.DB.Preload("ServiceCategory")
	if withVariants {
		db = db.Preload("Variants")
	}

	// Parent-ID filter logic
	if parentID == "none" {
		// Only top-level (parent) services
		db = db.Where("parent_id IS NULL")
	} else if parentID != "" {
		// Only variants of this parent
		db = db.Where("parent_id = ?", parentID)
	}

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

	countQuery := h.DB.Model(&models.Service{})
	if parentID == "none" {
		countQuery = countQuery.Where("parent_id IS NULL")
	} else if parentID != "" {
		countQuery = countQuery.Where("parent_id = ?", parentID)
	}
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

	var total int64
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
	if err := h.DB.
		Preload("ServiceCategory").
		Preload("Variants").
		Preload("ServiceCogs.RawMaterial").
		First(&service, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Service tidak ditemukan", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mengambil data Service", service)
}

func (h *ServiceHandler) AddService(c *fiber.Ctx) error {
	var service models.Service

	// 1. Support monolithic payloads containing full hierarchies (Parent + Variants + COGS)
	payload := c.FormValue("payload")
	if payload != "" {
		if err := json.Unmarshal([]byte(payload), &service); err != nil {
			return utils.RespApi(c, "bad", "Gagal memproses payload data JSON", err.Error())
		}
	} else {
		// Fallback: Legacy parsing from flat form fields
		name := c.FormValue("name")
		description := c.FormValue("description")
		priceStr := c.FormValue("price")
		unit := c.FormValue("unit")
		estimatedDurationStr := c.FormValue("estimated_duration")
		isActiveStr := c.FormValue("is_active")
		isParentStr := c.FormValue("is_parent")
		categoryIDStr := c.FormValue("service_category_id")
		parentIDStr := c.FormValue("parent_id")

		price, _ := strconv.ParseFloat(priceStr, 64)
		estimatedDuration, _ := strconv.Atoi(estimatedDurationStr)
		
		isActive := true
		if isActiveStr != "" {
			isActive, _ = strconv.ParseBool(isActiveStr)
		}
		
		isParent := false
		if isParentStr != "" {
			isParent, _ = strconv.ParseBool(isParentStr)
		}

		var categoryID *uuid.UUID
		if categoryIDStr != "" {
			id, err := uuid.Parse(categoryIDStr)
			if err == nil {
				categoryID = &id
			}
		}

		var parentID *uuid.UUID
		if parentIDStr != "" {
			pid, err := uuid.Parse(parentIDStr)
			if err == nil {
				parentID = &pid
			}
		}

		service = models.Service{
			Name:              &name,
			Description:       &description,
			Price:             &price,
			Unit:              &unit,
			EstimatedDuration: &estimatedDuration,
			IsActive:          &isActive,
			IsParent:          &isParent,
			ServiceCategoryID: categoryID,
			ParentID:          parentID,
		}
	}

	// 2. Business Constraint: An active group parent CANNOT hold a localized BOM directly
	if service.IsParent != nil && *service.IsParent {
		service.ServiceCogs = nil
	}

	// 2.5 Business Constraint: Ensure appropriate pricing context
	if service.IsParent == nil || !*service.IsParent {
		// If standalone, price must be > 0
		if service.Price == nil || *service.Price <= 0 {
			return utils.RespApi(c, "bad", "Validasi gagal", map[string]string{"Service.Price": "Harga layanan standalone harus lebih besar dari 0"})
		}
	} else {
		// If parent, enforce that each registered variant has a price > 0
		for i, v := range service.Variants {
			if v.Price == nil || *v.Price <= 0 {
				return utils.RespApi(c, "bad", "Validasi gagal", map[string]string{fmt.Sprintf("Service.Variants[%d].Price", i): "Harga untuk varian ini harus lebih besar dari 0"})
			}
		}
	}

	// 3. Validate structural compliance
	if err := utils.Validate.Struct(service); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	// 4. Process and map Parent Service media uploads
	form, err := c.MultipartForm()
	if err == nil && form != nil {
		files := form.File["images"]
		var uploadedPaths []string

		for _, file := range files {
			savedFile, err := utils.SaveFile(file, "services")
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
		}
	}

	// 5. Atomically commit complete Parent -> Variant -> ServiceCog relation tree
	if err := h.DB.Create(&service).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal membuat Service beserta komponen hirarkinya", err.Error())
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
	isParentStr := c.FormValue("is_parent")
	categoryIDStr := c.FormValue("service_category_id")
	parentIDStr := c.FormValue("parent_id")

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
	if parentIDStr == "null" || parentIDStr == "remove" {
		// Explicit unset: promote variant to top-level service
		service.ParentID = nil
	} else if parentIDStr != "" {
		pid, err := uuid.Parse(parentIDStr)
		if err == nil {
			service.ParentID = &pid
		}
	}

	if isParentStr != "" {
		isParent, _ := strconv.ParseBool(isParentStr)
		service.IsParent = &isParent
		// If promoting to parent, purge any accidental existing localized BOM ties
		if isParent {
			h.DB.Where("service_id = ?", service.ID).Delete(&models.ServiceCog{})
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
