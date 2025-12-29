package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AdjustmentInput struct {
	ProductID   *uuid.UUID `json:"product_id" validate:"required"`
	Qty         *int       `json:"qty" validate:"required,gt=0"`
	IsIncrement *bool      `json:"is_increment" validate:"required"`
	Description *string    `json:"description,omitempty"`

	// For individual tracking products
	LengthPerItem    *float64    `json:"length_per_item,omitempty"`
	Width            *float64    `json:"width,omitempty"`
	MeasurementUnit  *string     `json:"measurement_unit,omitempty"`
	InventoryItemIDs []uuid.UUID `json:"inventory_item_ids,omitempty"`
}

type AdjustmentHandler struct {
	DB *gorm.DB
}

func NewAdjustmentHandler(db *gorm.DB) *AdjustmentHandler {
	return &AdjustmentHandler{DB: db}
}

func (h *AdjustmentHandler) GetAdjustment(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Id yang diberikan tidak valid", nil)
	}

	var adjustment models.Adjustment
	if err := h.DB.Preload("Product").First(&adjustment, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data Adjustment", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data Adjustment", adjustment)
}

func (h *AdjustmentHandler) GetAllAdjustments(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	search := strings.ToLower(c.Query("search", ""))
	sort := c.Query("sort", "id")
	order := c.Query("order", "desc")
	productID := c.Query("product_id", "")

	offset := (page - 1) * limit

	db := h.DB.Model(&models.Adjustment{}).Preload("Product")

	// Filter by product
	if productID != "" {
		db = db.Where("product_id = ?", productID)
	}

	// Filter search
	if search != "" {
		db = db.Where("LOWER(description) LIKE ?", "%"+search+"%")
	}

	// Count total
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal hitung total", err.Error())
	}

	// Sorting (whitelisted)
	validSortFields := map[string]string{
		"id":         "id",
		"qty":        "qty",
		"created_at": "created_at",
	}
	sortBy, ok := validSortFields[sort]
	if !ok {
		sortBy = "created_at"
	}
	db = db.Order(fmt.Sprintf("%s %s", sortBy, order))

	// Fetch data
	var adjustments []models.Adjustment
	if err := db.Offset(offset).Limit(limit).Find(&adjustments).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal ambil data", err.Error())
	}

	totalPages := (total + int64(limit) - 1) / int64(limit)

	result := fiber.Map{
		"adjustments": adjustments,
		"pagination": fiber.Map{
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": totalPages,
		},
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data Adjustments", result)
}

func (h *AdjustmentHandler) AddAdjustment(c *fiber.Ctx) error {
	var input AdjustmentInput

	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	// Get product to check tracking mode
	var product models.Product
	if err := h.DB.First(&product, "id = ?", input.ProductID).Error; err != nil {
		return utils.RespApi(c, "bad", "Product tidak ditemukan", err.Error())
	}

	// Validate based on tracking mode
	if product.TrackingMode != nil && *product.TrackingMode == "individual" {
		if *input.IsIncrement {
			// For increment: require length_per_item
			if input.LengthPerItem == nil || *input.LengthPerItem <= 0 {
				return utils.RespApi(c, "bad", fmt.Sprintf("Length per item required untuk produk individual tracking %s", *product.Title), nil)
			}
		} else {
			// For decrement: require inventory_item_ids
			if len(input.InventoryItemIDs) == 0 {
				return utils.RespApi(c, "bad", "Inventory item IDs required untuk decrement individual tracking product", nil)
			}
			if len(input.InventoryItemIDs) != *input.Qty {
				return utils.RespApi(c, "bad", fmt.Sprintf("Jumlah inventory items (%d) harus sama dengan qty (%d)", len(input.InventoryItemIDs), *input.Qty), nil)
			}

			// Validate all inventory items exist and belong to this product
			for _, itemID := range input.InventoryItemIDs {
				var item models.InventoryItem
				if err := h.DB.First(&item, "id = ? AND product_id = ?", itemID, input.ProductID).Error; err != nil {
					return utils.RespApi(c, "bad", fmt.Sprintf("Inventory item %s tidak ditemukan atau bukan milik product ini", itemID), nil)
				}
				if item.Status != nil && *item.Status != "available" {
					return utils.RespApi(c, "bad", fmt.Sprintf("Inventory item %s tidak available (status: %s)", *item.ItemNumber, *item.Status), nil)
				}
			}
		}
	}

	// Start transaction
	tx := h.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create adjustment with is_clear = false by default (not finished yet)
	isClear := false
	adjustment := models.Adjustment{
		ProductID:   input.ProductID,
		Qty:         input.Qty,
		IsIncrement: input.IsIncrement,
		IsClear:     &isClear,
		Description: input.Description,
	}

	// Store inventory_item_ids for individual tracking decrement
	if product.TrackingMode != nil && *product.TrackingMode == "individual" && !*input.IsIncrement {
		if len(input.InventoryItemIDs) > 0 {
			idsJSON, err := json.Marshal(input.InventoryItemIDs)
			if err != nil {
				tx.Rollback()
				return utils.RespApi(c, "ise", "Gagal encode inventory item IDs", err.Error())
			}
			idsStr := string(idsJSON)
			adjustment.InventoryItemIDs = &idsStr
		}
	}

	if err := tx.Create(&adjustment).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Tidak dapat membuat Adjustment", err.Error())
	}

	// Handle individual tracking products
	if product.TrackingMode != nil && *product.TrackingMode == "individual" {
		if *input.IsIncrement {
			// Create inventory items for each qty
			for i := 1; i <= *input.Qty; i++ {
				itemNumber := fmt.Sprintf("%s-ADJ-%d-%03d",
					*product.ProductNumber,
					adjustment.CreatedAt.Unix(),
					i)

				status := "available"
				inventoryItem := models.InventoryItem{
					ProductID:       input.ProductID,
					ItemNumber:      &itemNumber,
					OriginalLength:  input.LengthPerItem,
					RemainingLength: input.LengthPerItem,
					MeasurementUnit: product.MeasurementUnit,
					Width:           input.Width,
					Status:          &status,
				}

				if err := tx.Create(&inventoryItem).Error; err != nil {
					tx.Rollback()
					return utils.RespApi(c, "ise", "Tidak dapat membuat Inventory Item", err.Error())
				}
			}
		}
		// For decrement: inventory_item_ids already stored in adjustment model
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menyimpan data", err.Error())
	}

	// Load product relation
	h.DB.Preload("Product").First(&adjustment, "id = ?", adjustment.ID)

	return utils.RespApi(c, "ok", "Berhasil membuat data Adjustment. Silakan finish untuk apply stock changes.", adjustment)
}

func (h *AdjustmentHandler) UpdateAdjustment(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	// Get existing adjustment
	var existingAdjustment models.Adjustment
	if err := h.DB.First(&existingAdjustment, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data Adjustment", err.Error())
	}

	// Check if adjustment is already cleared (finished)
	if existingAdjustment.IsClear != nil && *existingAdjustment.IsClear {
		return utils.RespApi(c, "bad", "Adjustment sudah di-finish dan tidak dapat diedit", nil)
	}

	var input AdjustmentInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	// Update adjustment
	existingAdjustment.ProductID = input.ProductID
	existingAdjustment.Qty = input.Qty
	existingAdjustment.IsIncrement = input.IsIncrement
	existingAdjustment.Description = input.Description

	if err := h.DB.Save(&existingAdjustment).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal update Adjustment", err.Error())
	}

	// Load product relation
	h.DB.Preload("Product").First(&existingAdjustment, "id = ?", existingAdjustment.ID)

	return utils.RespApi(c, "ok", "Berhasil update data Adjustment", existingAdjustment)
}

func (h *AdjustmentHandler) FinishAdjustment(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	// Get existing adjustment
	var adjustment models.Adjustment
	if err := h.DB.Preload("Product").First(&adjustment, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data Adjustment", err.Error())
	}

	// Check if already finished
	if adjustment.IsClear != nil && *adjustment.IsClear {
		return utils.RespApi(c, "bad", "Adjustment sudah di-finish sebelumnya", nil)
	}

	// Get product
	var product models.Product
	if err := h.DB.First(&product, "id = ?", adjustment.ProductID).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data product", err.Error())
	}

	// Start transaction
	tx := h.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Handle based on tracking mode
	if product.TrackingMode != nil && *product.TrackingMode == "individual" {
		// Individual tracking: handle inventory items
		if *adjustment.IsIncrement {
			// For increment: inventory items already created in AddAdjustment
			// Just create stock movements for tracking
			var items []models.InventoryItem
			if err := tx.Where("product_id = ? AND item_number LIKE ?",
				adjustment.ProductID,
				fmt.Sprintf("%%ADJ-%d%%", adjustment.CreatedAt.Unix())).
				Find(&items).Error; err != nil {
				tx.Rollback()
				return utils.RespApi(c, "ise", "Gagal mendapatkan inventory items", err.Error())
			}

			// Create stock movement for each item
			for _, item := range items {
				referenceType := "adjustment"
				desc := fmt.Sprintf("Adjustment Increment - %s", *item.ItemNumber)
				if adjustment.Description != nil && *adjustment.Description != "" {
					desc = fmt.Sprintf("%s - %s", *adjustment.Description, *item.ItemNumber)
				}

				qtyInt := int(*item.OriginalLength)
				unit := ""
				if item.MeasurementUnit != nil {
					unit = *item.MeasurementUnit
				}

				stockMovement := models.StockMovement{
					ProductID:       adjustment.ProductID,
					InventoryItemID: &item.ID,
					ReferenceType:   &referenceType,
					ReferenceID:     &adjustment.ID,
					Qty:             &qtyInt,
					Unit:            &unit,
					Description:     &desc,
				}

				if err := tx.Create(&stockMovement).Error; err != nil {
					tx.Rollback()
					return utils.RespApi(c, "ise", "Gagal membuat stock movement", err.Error())
				}
			}
		} else {
			// For decrement: mark inventory items as depleted
			if adjustment.InventoryItemIDs == nil || *adjustment.InventoryItemIDs == "" {
				tx.Rollback()
				return utils.RespApi(c, "bad", "Inventory item IDs tidak ditemukan untuk adjustment decrement", nil)
			}

			// Parse inventory item IDs
			var itemIDs []uuid.UUID
			if err := json.Unmarshal([]byte(*adjustment.InventoryItemIDs), &itemIDs); err != nil {
				tx.Rollback()
				return utils.RespApi(c, "ise", "Gagal parse inventory item IDs", err.Error())
			}

			// Mark each item as depleted and create stock movement
			for _, itemID := range itemIDs {
				var item models.InventoryItem
				if err := tx.First(&item, "id = ?", itemID).Error; err != nil {
					tx.Rollback()
					return utils.RespApi(c, "ise", fmt.Sprintf("Inventory item %s tidak ditemukan", itemID), err.Error())
				}

				// Update item status to depleted
				status := "depleted"
				now := time.Now()
				if err := tx.Model(&item).Updates(map[string]interface{}{
					"status":      status,
					"depleted_at": now,
				}).Error; err != nil {
					tx.Rollback()
					return utils.RespApi(c, "ise", "Gagal update inventory item status", err.Error())
				}

				// Create stock movement (negative for decrement)
				referenceType := "adjustment"
				desc := fmt.Sprintf("Adjustment Decrement - %s", *item.ItemNumber)
				if adjustment.Description != nil && *adjustment.Description != "" {
					desc = fmt.Sprintf("%s - %s", *adjustment.Description, *item.ItemNumber)
				}

				qtyNegative := -int(*item.RemainingLength)
				unit := ""
				if item.MeasurementUnit != nil {
					unit = *item.MeasurementUnit
				}

				stockMovement := models.StockMovement{
					ProductID:       adjustment.ProductID,
					InventoryItemID: &item.ID,
					ReferenceType:   &referenceType,
					ReferenceID:     &adjustment.ID,
					Qty:             &qtyNegative,
					Unit:            &unit,
					Description:     &desc,
				}

				if err := tx.Create(&stockMovement).Error; err != nil {
					tx.Rollback()
					return utils.RespApi(c, "ise", "Gagal membuat stock movement", err.Error())
				}
			}
		}
	} else {
		// Simple tracking: update product stock directly
		// Check if decrement would cause negative stock
		if !*adjustment.IsIncrement {
			if product.Stock == nil || adjustment.Qty == nil {
				tx.Rollback()
				return utils.RespApi(c, "ise", "Data product atau adjustment tidak valid", nil)
			}

			newStock := *product.Stock - *adjustment.Qty
			if newStock < 0 {
				productTitle := "Unknown"
				if product.Title != nil {
					productTitle = *product.Title
				}
				tx.Rollback()
				return utils.RespApi(c, "bad", fmt.Sprintf("Tidak dapat finish adjustment. Stock product %s akan menjadi negatif (%d)", productTitle, newStock), nil)
			}
		}

		// Update stock
		var stockChange int
		if *adjustment.IsIncrement {
			stockChange = *adjustment.Qty
		} else {
			stockChange = -*adjustment.Qty
		}

		result := tx.Exec("UPDATE products SET stock = COALESCE(stock, 0) + ?, updated_at = NOW() WHERE id = ?", stockChange, adjustment.ProductID)
		if result.Error != nil {
			tx.Rollback()
			return utils.RespApi(c, "ise", "Gagal update stock product", result.Error.Error())
		}
		if result.RowsAffected == 0 {
			tx.Rollback()
			return utils.RespApi(c, "bad", "Product tidak ditemukan", nil)
		}

		// Create stock movement
		referenceType := "adjustment"
		desc := "Adjustment (Finished)"
		if adjustment.Description != nil && *adjustment.Description != "" {
			desc = *adjustment.Description + " (Finished)"
		}
		stockMovement := models.StockMovement{
			ProductID:     adjustment.ProductID,
			ReferenceType: &referenceType,
			ReferenceID:   &adjustment.ID,
			Qty:           &stockChange,
			Description:   &desc,
		}

		if err := tx.Create(&stockMovement).Error; err != nil {
			tx.Rollback()
			return utils.RespApi(c, "ise", "Gagal membuat stock movement", err.Error())
		}
	}

	// Set is_clear to true
	isClear := true
	if err := tx.Model(&models.Adjustment{}).Where("id = ?", id).Updates(map[string]interface{}{
		"is_clear": isClear,
	}).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal finish Adjustment", err.Error())
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menyimpan data", err.Error())
	}

	// Load relations
	h.DB.Preload("Product").First(&adjustment, "id = ?", adjustment.ID)

	return utils.RespApi(c, "ok", "Berhasil finish Adjustment. Stock telah diupdate dan adjustment terkunci", adjustment)
}

func (h *AdjustmentHandler) DeleteAdjustment(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	// Get adjustment
	var adjustment models.Adjustment
	if err := h.DB.Preload("Product").First(&adjustment, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data Adjustment", err.Error())
	}

	// If adjustment is finished (is_clear = true), need to revert changes
	if adjustment.IsClear != nil && *adjustment.IsClear {
		// Get product
		var product models.Product
		if err := h.DB.First(&product, "id = ?", adjustment.ProductID).Error; err != nil {
			return utils.RespApi(c, "ise", "Gagal mendapatkan data product", err.Error())
		}

		// Start transaction
		tx := h.DB.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		// Handle based on tracking mode
		if product.TrackingMode != nil && *product.TrackingMode == "individual" {
			if *adjustment.IsIncrement {
				// For increment: delete created inventory items
				var items []models.InventoryItem
				if err := tx.Where("product_id = ? AND item_number LIKE ?",
					adjustment.ProductID,
					fmt.Sprintf("%%ADJ-%d%%", adjustment.CreatedAt.Unix())).
					Find(&items).Error; err != nil {
					tx.Rollback()
					return utils.RespApi(c, "ise", "Gagal mendapatkan inventory items", err.Error())
				}

				// Delete inventory items
				for _, item := range items {
					if err := tx.Delete(&item).Error; err != nil {
						tx.Rollback()
						return utils.RespApi(c, "ise", "Gagal menghapus inventory item", err.Error())
					}
				}
			} else {
				// For decrement: restore inventory items to available
				if adjustment.InventoryItemIDs == nil || *adjustment.InventoryItemIDs == "" {
					tx.Rollback()
					return utils.RespApi(c, "bad", "Inventory item IDs tidak ditemukan", nil)
				}

				// Parse inventory item IDs
				var itemIDs []uuid.UUID
				if err := json.Unmarshal([]byte(*adjustment.InventoryItemIDs), &itemIDs); err != nil {
					tx.Rollback()
					return utils.RespApi(c, "ise", "Gagal parse inventory item IDs", err.Error())
				}

				// Restore each item to available
				for _, itemID := range itemIDs {
					var item models.InventoryItem
					if err := tx.First(&item, "id = ?", itemID).Error; err != nil {
						tx.Rollback()
						return utils.RespApi(c, "ise", fmt.Sprintf("Inventory item %s tidak ditemukan", itemID), err.Error())
					}

					// Restore status to available
					status := "available"
					if err := tx.Model(&item).Updates(map[string]interface{}{
						"status":      status,
						"depleted_at": nil,
					}).Error; err != nil {
						tx.Rollback()
						return utils.RespApi(c, "ise", "Gagal restore inventory item status", err.Error())
					}
				}
			}
		} else {
			// Simple tracking: revert stock
			if product.Stock == nil || adjustment.Qty == nil {
				tx.Rollback()
				return utils.RespApi(c, "ise", "Data product atau adjustment tidak valid", nil)
			}

			// Calculate opposite stock change
			var oppositeStockChange int
			if *adjustment.IsIncrement {
				oppositeStockChange = -*adjustment.Qty // Decrement
			} else {
				oppositeStockChange = *adjustment.Qty // Increment
			}

			// Check if opposite change would cause negative stock
			newStock := *product.Stock + oppositeStockChange
			if newStock < 0 {
				productTitle := "Unknown"
				if product.Title != nil {
					productTitle = *product.Title
				}
				tx.Rollback()
				return utils.RespApi(c, "bad", fmt.Sprintf("Can't delete! Stock product %s akan menjadi minus (%d) setelah revert adjustment", productTitle, newStock), nil)
			}

			// Revert stock using opposite change
			result := tx.Exec("UPDATE products SET stock = COALESCE(stock, 0) + ?, updated_at = NOW() WHERE id = ?", oppositeStockChange, adjustment.ProductID)
			if result.Error != nil {
				tx.Rollback()
				return utils.RespApi(c, "ise", "Gagal revert stock product", result.Error.Error())
			}
		}

		// Delete stock movements
		if err := tx.Where("reference_type = ? AND reference_id = ?", "adjustment", id).
			Delete(&models.StockMovement{}).Error; err != nil {
			tx.Rollback()
			return utils.RespApi(c, "ise", "Gagal menghapus stock movement", err.Error())
		}

		// Delete adjustment
		if err := tx.Delete(&adjustment).Error; err != nil {
			tx.Rollback()
			return utils.RespApi(c, "ise", "Gagal menghapus Adjustment", err.Error())
		}

		// Commit transaction
		if err := tx.Commit().Error; err != nil {
			return utils.RespApi(c, "ise", "Gagal menyimpan data", err.Error())
		}

		return utils.RespApi(c, "ok", "Berhasil menghapus Adjustment dan revert changes", nil)
	}

	// If not finished, just delete without reverting changes
	// For individual tracking increment, also delete inventory items
	var product models.Product
	if err := h.DB.First(&product, "id = ?", adjustment.ProductID).Error; err == nil {
		if product.TrackingMode != nil && *product.TrackingMode == "individual" && *adjustment.IsIncrement {
			// Delete inventory items created for this adjustment
			h.DB.Where("product_id = ? AND item_number LIKE ?",
				adjustment.ProductID,
				fmt.Sprintf("%%ADJ-%d%%", adjustment.CreatedAt.Unix())).
				Delete(&models.InventoryItem{})
		}
	}

	if err := h.DB.Delete(&adjustment).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menghapus Adjustment", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil menghapus Adjustment", nil)
}
