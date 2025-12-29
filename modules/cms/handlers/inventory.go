package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"fmt"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type InventoryHandler struct {
	DB *gorm.DB
}

func NewInventoryHandler(db *gorm.DB) *InventoryHandler {
	return &InventoryHandler{DB: db}
}

// GetProductInventory - Get all inventory items for a product
func (h *InventoryHandler) GetProductInventory(c *fiber.Ctx) error {
	productIDStr := c.Params("product_id")

	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid product ID", err.Error())
	}

	// Get product info
	var product models.Product
	if err := h.DB.First(&product, "id = ?", productID).Error; err != nil {
		return utils.RespApi(c, "nf", "Product not found", err.Error())
	}

	// Check if product uses individual tracking
	if product.TrackingMode == nil || *product.TrackingMode != "individual" {
		return utils.RespApi(c, "bad", "Product does not use individual tracking", nil)
	}

	// Get all inventory items
	var items []models.InventoryItem
	if err := h.DB.Where("product_id = ?", productID).
		Order("status ASC, remaining_length DESC, created_at ASC").
		Find(&items).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan inventory items", err.Error())
	}

	// Calculate summary
	var totalItems int64
	var totalAvailable float64
	var availableItems int64
	var depletedItems int64

	for _, item := range items {
		totalItems++
		if item.Status != nil && *item.Status == "available" {
			availableItems++
			if item.RemainingLength != nil {
				totalAvailable += *item.RemainingLength
			}
		} else if item.Status != nil && *item.Status == "depleted" {
			depletedItems++
		}
	}

	var measurementUnit string
	if len(items) > 0 && items[0].MeasurementUnit != nil {
		measurementUnit = *items[0].MeasurementUnit
	}

	result := fiber.Map{
		"items": items,
		"summary": fiber.Map{
			"total_items":      totalItems,
			"available_items":  availableItems,
			"depleted_items":   depletedItems,
			"total_available":  totalAvailable,
			"measurement_unit": measurementUnit,
		},
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan inventory items", result)
}

// CheckAvailability - Check if requested length is available
func (h *InventoryHandler) CheckAvailability(c *fiber.Ctx) error {
	productIDStr := c.Params("product_id")
	requestedLengthStr := c.Query("length", "0")

	requestedLength, err := strconv.ParseFloat(requestedLengthStr, 64)
	if err != nil || requestedLength <= 0 {
		return utils.RespApi(c, "bad", "Invalid requested length", nil)
	}

	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid product ID", err.Error())
	}

	// Find suitable inventory item (minimize waste strategy)
	var item models.InventoryItem
	err = h.DB.Where("product_id = ? AND status = 'available' AND remaining_length >= ?",
		productID, requestedLength).
		Order("remaining_length ASC"). // Ambil yang paling kecil tapi cukup (minimize waste)
		First(&item).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.RespApi(c, "ok", "Stock tidak tersedia", fiber.Map{
				"available": false,
			})
		}
		return utils.RespApi(c, "ise", "Gagal cek availability", err.Error())
	}

	return utils.RespApi(c, "ok", "Stock tersedia", fiber.Map{
		"available": true,
		"item":      item,
	})
}

// GetInventoryReport - Get utilization report for inventory items
func (h *InventoryHandler) GetInventoryReport(c *fiber.Ctx) error {
	productIDStr := c.Query("product_id", "")

	query := h.DB.Model(&models.InventoryItem{})

	if productIDStr != "" {
		productID, err := uuid.Parse(productIDStr)
		if err != nil {
			return utils.RespApi(c, "bad", "Invalid product ID", err.Error())
		}
		query = query.Where("product_id = ?", productID)
	}

	var items []models.InventoryItem
	if err := query.Preload("Product").Find(&items).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan inventory items", err.Error())
	}

	// Calculate utilization for each item
	type ItemReport struct {
		ItemNumber        string  `json:"item_number"`
		ProductTitle      string  `json:"product_title"`
		OriginalLength    float64 `json:"original_length"`
		RemainingLength   float64 `json:"remaining_length"`
		UsedLength        float64 `json:"used_length"`
		UtilizationRate   float64 `json:"utilization_rate"` // percentage
		MeasurementUnit   string  `json:"measurement_unit"`
		Status            string  `json:"status"`
		PurchaseProductID string  `json:"purchase_product_id"`
	}

	var report []ItemReport

	for _, item := range items {
		originalLength := float64(0)
		if item.OriginalLength != nil {
			originalLength = *item.OriginalLength
		}

		remainingLength := float64(0)
		if item.RemainingLength != nil {
			remainingLength = *item.RemainingLength
		}

		usedLength := originalLength - remainingLength
		utilizationRate := float64(0)
		if originalLength > 0 {
			utilizationRate = (usedLength / originalLength) * 100
		}

		productTitle := ""
		if item.Product != nil && item.Product.Title != nil {
			productTitle = *item.Product.Title
		}

		itemNumber := ""
		if item.ItemNumber != nil {
			itemNumber = *item.ItemNumber
		}

		measurementUnit := ""
		if item.MeasurementUnit != nil {
			measurementUnit = *item.MeasurementUnit
		}

		status := ""
		if item.Status != nil {
			status = *item.Status
		}

		purchaseProductID := ""
		if item.PurchaseProductID != nil {
			purchaseProductID = item.PurchaseProductID.String()
		}

		report = append(report, ItemReport{
			ItemNumber:        itemNumber,
			ProductTitle:      productTitle,
			OriginalLength:    originalLength,
			RemainingLength:   remainingLength,
			UsedLength:        usedLength,
			UtilizationRate:   utilizationRate,
			MeasurementUnit:   measurementUnit,
			Status:            status,
			PurchaseProductID: purchaseProductID,
		})
	}

	// Calculate overall statistics
	var totalOriginal, totalRemaining, totalUsed float64
	var totalItems int64 = int64(len(report))

	for _, item := range report {
		totalOriginal += item.OriginalLength
		totalRemaining += item.RemainingLength
		totalUsed += item.UsedLength
	}

	overallUtilization := float64(0)
	if totalOriginal > 0 {
		overallUtilization = (totalUsed / totalOriginal) * 100
	}

	result := fiber.Map{
		"items": report,
		"summary": fiber.Map{
			"total_items":         totalItems,
			"total_original":      fmt.Sprintf("%.2f", totalOriginal),
			"total_remaining":     fmt.Sprintf("%.2f", totalRemaining),
			"total_used":          fmt.Sprintf("%.2f", totalUsed),
			"overall_utilization": fmt.Sprintf("%.2f%%", overallUtilization),
		},
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan inventory report", result)
}

// GetInventoryItemsWithAllocations - Get inventory items with detailed allocation history
func (h *InventoryHandler) GetInventoryItemsWithAllocations(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	productID := c.Query("product_id", "")
	status := c.Query("status", "") // available, depleted, all
	search := c.Query("search", "") // search by item_number

	offset := (page - 1) * limit

	// Base query
	db := h.DB.Model(&models.InventoryItem{}).
		Preload("Product").
		Preload("Allocations.OrderProduct.Order").
		Preload("Allocations.OrderProduct.Product")

	// Filter by product
	if productID != "" {
		db = db.Where("product_id = ?", productID)
	}

	// Filter by status
	if status != "" && status != "all" {
		db = db.Where("status = ?", status)
	}

	// Filter by search (item_number)
	if search != "" {
		db = db.Where("LOWER(item_number) LIKE ?", "%"+strings.ToLower(search)+"%")
	}

	// Count total
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal hitung total", err.Error())
	}

	// Sorting - available first, then by remaining length
	db = db.Order("CASE WHEN status = 'available' THEN 0 ELSE 1 END, remaining_length DESC, created_at ASC")

	// Fetch data
	var items []models.InventoryItem
	if err := db.Offset(offset).Limit(limit).Find(&items).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal ambil data", err.Error())
	}

	totalPages := (total + int64(limit) - 1) / int64(limit)

	// Calculate summary if product_id is specified
	var summary *fiber.Map
	if productID != "" {
		var totalItems int64
		var availableItems int64
		var depletedItems int64
		var totalAvailableLength float64
		var totalOriginalLength float64

		h.DB.Model(&models.InventoryItem{}).Where("product_id = ?", productID).Count(&totalItems)
		h.DB.Model(&models.InventoryItem{}).Where("product_id = ? AND status = 'available'", productID).Count(&availableItems)
		h.DB.Model(&models.InventoryItem{}).Where("product_id = ? AND status = 'depleted'", productID).Count(&depletedItems)

		h.DB.Model(&models.InventoryItem{}).
			Where("product_id = ? AND status = 'available'", productID).
			Select("COALESCE(SUM(remaining_length), 0)").
			Scan(&totalAvailableLength)

		h.DB.Model(&models.InventoryItem{}).
			Where("product_id = ?", productID).
			Select("COALESCE(SUM(original_length), 0)").
			Scan(&totalOriginalLength)

		summary = &fiber.Map{
			"total_items":            totalItems,
			"available_items":        availableItems,
			"depleted_items":         depletedItems,
			"total_available_length": totalAvailableLength,
			"total_original_length":  totalOriginalLength,
		}
	}

	result := fiber.Map{
		"items": items,
		"pagination": fiber.Map{
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": totalPages,
		},
	}

	if summary != nil {
		result["summary"] = summary
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan inventory items", result)
}
