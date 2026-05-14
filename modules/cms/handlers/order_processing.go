package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ProcessingPiece represents a single piece in processing
type ProcessingPiece struct {
	PieceNumber         int                    `json:"piece_number"`
	UseRemnant          bool                   `json:"use_remnant"`
	SelectedInventoryID *uuid.UUID             `json:"selected_inventory_id"`
	AvailableRemnants   []AvailableRemnantItem `json:"available_remnants"`
}

// AvailableRemnantItem represents available remnant stock
type AvailableRemnantItem struct {
	ID              uuid.UUID `json:"id"`
	ItemNumber      string    `json:"item_number"`
	RemainingLength float64   `json:"remaining_length"`
}

// ProcessingItem represents an order product with processing options
type ProcessingItem struct {
	OrderProductID  uuid.UUID         `json:"order_product_id"`
	Product         *models.Product   `json:"product"`
	TrackingMode    string            `json:"tracking_mode"`
	Qty             int               `json:"qty"`
	RequestedLength *float64          `json:"requested_length"`
	Pieces          []ProcessingPiece `json:"pieces"`
}

// ProcessingService represents an order service for processing
type ProcessingService struct {
	OrderServiceID uuid.UUID       `json:"order_service_id"`
	Service        *models.Service `json:"service"`
	Qty            float64         `json:"qty"`
	PriceAtOrder   float64         `json:"price_at_order"`
	Notes          string          `json:"notes"`
}

// ProcessingDataResponse represents the response for GetProcessingData
type ProcessingDataResponse struct {
	Order              *models.Order       `json:"order"`
	ProcessingItems    []ProcessingItem    `json:"processing_items"`
	ProcessingServices []ProcessingService `json:"processing_services"`
}

// ProcessOrderRequest represents the request body for ProcessOrder
type ProcessOrderRequest struct {
	ProcessingItems    []ProcessOrderItem    `json:"processing_items"`
	ProcessingServices []ProcessOrderService `json:"processing_services"`
}

type ProcessOrderService struct {
	OrderServiceID uuid.UUID `json:"order_service_id"`
	Notes          string    `json:"notes"`
}

type ProcessOrderItem struct {
	OrderProductID uuid.UUID           `json:"order_product_id"`
	Pieces         []ProcessOrderPiece `json:"pieces"`
}

type ProcessOrderPiece struct {
	PieceNumber int        `json:"piece_number"`
	UseRemnant  bool       `json:"use_remnant"`
	InventoryID *uuid.UUID `json:"inventory_id"`
}

// GetProcessingData returns order details with processing options
func (h *OrderHandler) GetProcessingData(c *fiber.Ctx) error {
	orderID := c.Params("id")

	// Parse UUID
	id, err := uuid.Parse(orderID)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid order ID", err.Error())
	}

	// Get order with products and services
	var order models.Order
	if err := h.DB.Preload("OrderProducts.Product").
		Preload("OrderServices.Service"). // Preload services
		First(&order, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "nf", "Order not found", err.Error())
	}

	// Check if order is in waiting_process status
	if order.Status == nil || *order.Status != "waiting_process" {
		return utils.RespApi(c, "bad", "Order is not in waiting_process status", nil)
	}

	// Build processing items
	processingItems := []ProcessingItem{}
	processingServices := []ProcessingService{}

	for _, op := range order.OrderProducts {
		if op.Product == nil {
			continue
		}

		trackingMode := "simple"
		if op.Product.TrackingMode != nil {
			trackingMode = *op.Product.TrackingMode
		}

		item := ProcessingItem{
			OrderProductID:  op.ID,
			Product:         op.Product,
			TrackingMode:    trackingMode,
			Qty:             *op.Qty,
			RequestedLength: op.RequestedLength,
			Pieces:          []ProcessingPiece{},
		}

		// For individual tracking, create pieces with remnant options
		if trackingMode == "individual" && op.RequestedLength != nil {
			// Get available remnants (items with remaining_length >= requested_length)
			var remnants []models.InventoryItem
			h.DB.Where("product_id = ? AND status = 'available' AND remaining_length >= ?",
				op.ProductID, *op.RequestedLength).
				Order("remaining_length ASC").
				Find(&remnants)

			availableRemnants := []AvailableRemnantItem{}
			for _, r := range remnants {
				availableRemnants = append(availableRemnants, AvailableRemnantItem{
					ID:              r.ID,
					ItemNumber:      *r.ItemNumber,
					RemainingLength: *r.RemainingLength,
				})
			}

			// Create pieces
			for i := 0; i < *op.Qty; i++ {
				item.Pieces = append(item.Pieces, ProcessingPiece{
					PieceNumber:         i + 1,
					UseRemnant:          false,
					SelectedInventoryID: nil,
					AvailableRemnants:   availableRemnants,
				})
			}
		}

		processingItems = append(processingItems, item)
	}

	for _, os := range order.OrderServices {
		if os.Service == nil {
			continue
		}

		item := ProcessingService{
			OrderServiceID: os.ID,
			Service:        os.Service,
			Qty:            *os.Qty,
			PriceAtOrder:   *os.PriceAtOrder,
			Notes:          "",
		}
		if os.Notes != nil {
			item.Notes = *os.Notes
		}

		processingServices = append(processingServices, item)
	}

	response := ProcessingDataResponse{
		Order:              &order,
		ProcessingItems:    processingItems,
		ProcessingServices: processingServices,
	}

	return utils.RespApi(c, "ok", "Processing data retrieved successfully", response)
}

// ProcessOrder processes the order with admin selections
func (h *OrderHandler) ProcessOrder(c *fiber.Ctx) error {
	orderID := c.Params("id")

	// Parse UUID
	id, err := uuid.Parse(orderID)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid order ID", err.Error())
	}

	// Parse request body
	var req ProcessOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.RespApi(c, "bad", "Invalid request body", err.Error())
	}

	// Get order
	var order models.Order
	if err := h.DB.Preload("OrderProducts.Product").
		Preload("OrderServices.Service"). // Preload services
		First(&order, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "nf", "Order not found", err.Error())
	}

	// Validate order status
	if order.Status == nil || *order.Status != "waiting_process" {
		return utils.RespApi(c, "bad", "Order is not in waiting_process status", nil)
	}

	// Start transaction
	tx := h.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	fmt.Println("================================================")
	fmt.Printf("🔄 Processing Order: %s\n", *order.OrderNumber)
	fmt.Println("================================================")

	// Validate inventory item capacity (check if same item is used multiple times)
	inventoryUsage := make(map[uuid.UUID]struct {
		TotalAllocated  float64
		RemainingLength float64
		ItemNumber      string
	})

	for _, reqItem := range req.ProcessingItems {
		// Find order product
		var op *models.OrderProduct
		for i := range order.OrderProducts {
			if order.OrderProducts[i].ID == reqItem.OrderProductID {
				op = &order.OrderProducts[i]
				break
			}
		}

		if op == nil || op.Product == nil || op.RequestedLength == nil {
			continue
		}

		trackingMode := "simple"
		if op.Product.TrackingMode != nil {
			trackingMode = *op.Product.TrackingMode
		}

		if trackingMode == "individual" {
			for _, piece := range reqItem.Pieces {
				if piece.UseRemnant && piece.InventoryID != nil {
					// Get inventory item to check remaining length
					var item models.InventoryItem
					if err := h.DB.First(&item, "id = ?", piece.InventoryID).Error; err != nil {
						tx.Rollback()
						return utils.RespApi(c, "bad", fmt.Sprintf("Inventory item not found for piece %d", piece.PieceNumber), nil)
					}

					// Track usage
					if _, exists := inventoryUsage[*piece.InventoryID]; !exists {
						inventoryUsage[*piece.InventoryID] = struct {
							TotalAllocated  float64
							RemainingLength float64
							ItemNumber      string
						}{
							TotalAllocated:  0,
							RemainingLength: *item.RemainingLength,
							ItemNumber:      *item.ItemNumber,
						}
					}

					usage := inventoryUsage[*piece.InventoryID]
					usage.TotalAllocated += *op.RequestedLength
					inventoryUsage[*piece.InventoryID] = usage
				}
			}
		}
	}

	// Check if any inventory item is over-allocated
	for _, usage := range inventoryUsage {
		if usage.TotalAllocated > usage.RemainingLength {
			tx.Rollback()
			return utils.RespApi(c, "bad",
				fmt.Sprintf("Inventory item %s is over-allocated! Total needed: %.2fm, Available: %.2fm",
					usage.ItemNumber, usage.TotalAllocated, usage.RemainingLength),
				nil)
		}
	}

	fmt.Println("✅ Inventory capacity validation passed")

	// Process each order product
	for _, reqItem := range req.ProcessingItems {
		// Find order product
		var op *models.OrderProduct
		for i := range order.OrderProducts {
			if order.OrderProducts[i].ID == reqItem.OrderProductID {
				op = &order.OrderProducts[i]
				break
			}
		}

		if op == nil || op.Product == nil {
			tx.Rollback()
			return utils.RespApi(c, "bad", "Order product not found", nil)
		}

		trackingMode := "simple"
		if op.Product.TrackingMode != nil {
			trackingMode = *op.Product.TrackingMode
		}

		if trackingMode == "simple" {
			// Simple tracking: auto allocate (decrease stock)
			fmt.Printf("📦 Processing simple product: %s (Qty: %d)\n", *op.Product.Title, *op.Qty)

			result := tx.Model(&models.Product{}).
				Where("id = ? AND stock >= ?", op.ProductID, *op.Qty).
				UpdateColumn("stock", gorm.Expr("stock - ?", *op.Qty))

			if result.Error != nil {
				tx.Rollback()
				return utils.RespApi(c, "ise", "Failed to update stock", result.Error.Error())
			}

			if result.RowsAffected == 0 {
				tx.Rollback()
				return utils.RespApi(c, "bad", fmt.Sprintf("Stock insufficient for %s", *op.Product.Title), nil)
			}

			// Create stock movement
			referenceType := "order"
			description := fmt.Sprintf("Order %s", *order.OrderNumber)
			qtyNegative := -*op.Qty
			unit := "pcs"
			stockMovement := models.StockMovement{
				ProductID:     op.ProductID,
				ReferenceType: &referenceType,
				ReferenceID:   &order.ID,
				Qty:           &qtyNegative,
				Unit:          &unit,
				Description:   &description,
			}

			if err := tx.Create(&stockMovement).Error; err != nil {
				tx.Rollback()
				return utils.RespApi(c, "ise", "Failed to create stock movement", err.Error())
			}

			fmt.Printf("✅ Simple product processed\n")

		} else {
			// Individual tracking: manual allocation based on admin selection
			fmt.Printf("📦 Processing individual product: %s (Qty: %d)\n", *op.Product.Title, *op.Qty)

			for _, piece := range reqItem.Pieces {
				var item models.InventoryItem

				if piece.UseRemnant && piece.InventoryID != nil {
					// Use selected remnant
					if err := tx.First(&item, "id = ?", piece.InventoryID).Error; err != nil {
						tx.Rollback()
						return utils.RespApi(c, "bad", fmt.Sprintf("Remnant item not found for piece %d", piece.PieceNumber), nil)
					}
				} else {
					// Use new stock (remaining_length = original_length)
					err := tx.Where("product_id = ? AND status = 'available' AND remaining_length = original_length AND remaining_length >= ?",
						op.ProductID, *op.RequestedLength).
						Order("remaining_length ASC").
						First(&item).Error

					if err != nil {
						tx.Rollback()
						return utils.RespApi(c, "bad", fmt.Sprintf("New stock not available for piece %d", piece.PieceNumber), nil)
					}
				}

				// Create allocation
				allocation := models.InventoryAllocation{
					InventoryItemID: &item.ID,
					OrderProductID:  &op.ID,
					AllocatedLength: op.RequestedLength,
					MeasurementUnit: op.MeasurementUnit,
				}

				if err := tx.Create(&allocation).Error; err != nil {
					tx.Rollback()
					return utils.RespApi(c, "ise", "Failed to create allocation", err.Error())
				}

				// Update inventory item
				newRemaining := *item.RemainingLength - *op.RequestedLength
				updates := map[string]interface{}{
					"remaining_length": newRemaining,
				}

				productStockDecrease := false
				if newRemaining <= 0 {
					now := time.Now()
					updates["status"] = "depleted"
					updates["depleted_at"] = now
					productStockDecrease = true
				}

				if err := tx.Model(&item).Updates(updates).Error; err != nil {
					tx.Rollback()
					return utils.RespApi(c, "ise", "Failed to update inventory item", err.Error())
				}

				// Decrease product stock if inventory item is depleted
				if productStockDecrease {
					result := tx.Model(&models.Product{}).
						Where("id = ? AND stock > 0", op.ProductID).
						UpdateColumn("stock", gorm.Expr("stock - ?", 1))

					if result.Error != nil {
						tx.Rollback()
						return utils.RespApi(c, "ise", "Failed to update product stock", result.Error.Error())
					}

					fmt.Printf("📉 Product stock decreased (inventory item depleted)\n")
				}

				// Create stock movement (use negative requested_length as qty)
				referenceType := "order"
				stockType := "new"
				if piece.UseRemnant {
					stockType = "remnant"
				}
				description := fmt.Sprintf("Order %s (Item: %s, Piece %d/%d, Type: %s)",
					*order.OrderNumber, *item.ItemNumber, piece.PieceNumber, *op.Qty, stockType)

				// Use negative float for qty (e.g., -3.5 meter)
				qtyNegative := -*op.RequestedLength
				qtyInt := int(qtyNegative)
				unit := *op.MeasurementUnit

				stockMovement := models.StockMovement{
					ProductID:       op.ProductID,
					InventoryItemID: &item.ID,
					ReferenceType:   &referenceType,
					ReferenceID:     &order.ID,
					Qty:             &qtyInt,
					Unit:            &unit,
					Description:     &description,
				}

				if err := tx.Create(&stockMovement).Error; err != nil {
					tx.Rollback()
					return utils.RespApi(c, "ise", "Failed to create stock movement", err.Error())
				}

				fmt.Printf("✅ Piece %d/%d allocated from %s (remaining: %.2f, stock movement: %.2f %s)\n",
					piece.PieceNumber, *op.Qty, *item.ItemNumber, newRemaining, qtyNegative, unit)
			}
		}
	}

	// Update order status to on_progress (use direct update to avoid FK constraint issues)
	newStatus := "on_progress"
	if err := tx.Model(&models.Order{}).Where("id = ?", order.ID).Update("status", newStatus).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Failed to update order status", err.Error())
	}

	// Create order log (use tx for transaction consistency)
	CreateOrderLog(tx, order.ID, "on_progress", "Order processed and inventory allocated", nil, nil)

	// Get admin user ID from context (stored as string from JWT)
	var adminID *uuid.UUID
	if uid := c.Locals("user_id"); uid != nil {
		if userIDStr, ok := uid.(string); ok {
			if parsedID, err := uuid.Parse(userIDStr); err == nil {
				adminID = &parsedID
			}
		}
	}

	// Create processing log with detailed information including product and inventory details
	type ProcessingLogDetail struct {
		OrderProductID string `json:"order_product_id,omitempty"`
		ProductTitle   string `json:"product_title,omitempty"`
		Pieces         []struct {
			PieceNumber int    `json:"piece_number"`
			UseRemnant  bool   `json:"use_remnant"`
			InventoryID string `json:"inventory_id,omitempty"`
			ItemNumber  string `json:"item_number,omitempty"`
		} `json:"pieces,omitempty"`
		// Service fields
		OrderServiceID string `json:"order_service_id,omitempty"`
		ServiceName    string `json:"service_name,omitempty"`
		ServiceQty     string `json:"service_qty,omitempty"`
	}

	var logDetails []ProcessingLogDetail
	for _, reqItem := range req.ProcessingItems {
		// Find order product
		var op *models.OrderProduct
		for i := range order.OrderProducts {
			if order.OrderProducts[i].ID == reqItem.OrderProductID {
				op = &order.OrderProducts[i]
				break
			}
		}

		if op == nil || op.Product == nil {
			continue
		}

		detail := ProcessingLogDetail{
			OrderProductID: reqItem.OrderProductID.String(),
			ProductTitle:   "",
		}

		if op.Product.Title != nil {
			detail.ProductTitle = *op.Product.Title
		}

		for _, piece := range reqItem.Pieces {
			pieceDetail := struct {
				PieceNumber int    `json:"piece_number"`
				UseRemnant  bool   `json:"use_remnant"`
				InventoryID string `json:"inventory_id,omitempty"`
				ItemNumber  string `json:"item_number,omitempty"`
			}{
				PieceNumber: piece.PieceNumber,
				UseRemnant:  piece.UseRemnant,
			}

			if piece.InventoryID != nil {
				var item models.InventoryItem
				if err := h.DB.First(&item, "id = ?", piece.InventoryID).Error; err == nil {
					pieceDetail.InventoryID = piece.InventoryID.String()
					if item.ItemNumber != nil {
						pieceDetail.ItemNumber = *item.ItemNumber
					}
				}
			}

			detail.Pieces = append(detail.Pieces, pieceDetail)
		}

		logDetails = append(logDetails, detail)
	}

	// Add service logs
	for _, reqService := range req.ProcessingServices {
		var os *models.OrderService
		for i := range order.OrderServices {
			if order.OrderServices[i].ID == reqService.OrderServiceID {
				os = &order.OrderServices[i]
				break
			}
		}

		if os == nil || os.Service == nil {
			continue
		}

		detail := ProcessingLogDetail{
			OrderServiceID: reqService.OrderServiceID.String(),
			ServiceName:    *os.Service.Name + " (Service)",
			ServiceQty:     fmt.Sprintf("%.2f %s", *os.Qty, *os.Service.Unit),
		}
		logDetails = append(logDetails, detail)
	}

	processingDetailsJSON, _ := json.Marshal(logDetails)
	processingDetailsStr := string(processingDetailsJSON)
	notes := fmt.Sprintf("Order processed successfully with %d product(s) and %d service(s)",
		len(req.ProcessingItems), len(req.ProcessingServices))

	processingLog := models.OrderProcessingLog{
		OrderID:           &order.ID,
		ProcessedByID:     adminID,
		ProcessingDetails: &processingDetailsStr,
		Notes:             &notes,
	}

	if err := tx.Create(&processingLog).Error; err != nil {
		// Don't rollback for logging error, just log it
		fmt.Printf("⚠️  Failed to create processing log: %v\n", err)
	} else {
		fmt.Println("✅ Processing log created")
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return utils.RespApi(c, "ise", "Failed to commit transaction", err.Error())
	}

	fmt.Println("✅ Order processed successfully!")
	fmt.Println("================================================")

	return utils.RespApi(c, "ok", "Order processed successfully", nil)
}

// KasirValidateAndProcess - Direct validation and fast processing for cashier flow
func (h *OrderHandler) KasirValidateAndProcess(c *fiber.Ctx) error {
	orderID := c.Params("id")
	id, err := uuid.Parse(orderID)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid order ID", err.Error())
	}

	type Request struct {
		WeightKg *float64 `json:"weight_kg"`
		TotalPcs *int     `json:"total_pcs"`
		Notes    *string  `json:"notes"`
	}

	var req Request
	if err := c.BodyParser(&req); err != nil {
		return utils.RespApi(c, "bad", "Invalid request body", err.Error())
	}

	var order models.Order
	if err := h.DB.Preload("OrderProducts.Product").First(&order, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "nf", "Order not found", err.Error())
	}

	tx := h.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 1. Update fields
	updates := map[string]interface{}{}
	if req.WeightKg != nil {
		updates["weight_kg"] = *req.WeightKg
	}
	if req.TotalPcs != nil {
		updates["total_pcs"] = *req.TotalPcs
	}
	if req.Notes != nil {
		updates["notes"] = *req.Notes
	}

	// 2. Advance status
	status := ""
	if order.Status != nil {
		status = *order.Status
	}

	var adminUUID *uuid.UUID
	if uid := c.Locals("user_id"); uid != nil {
		if uidParsed, ok := uid.(uuid.UUID); ok {
			adminUUID = &uidParsed
		} else if uidStr, ok := uid.(string); ok {
			if p, err := uuid.Parse(uidStr); err == nil {
				adminUUID = &p
			}
		}
	}

	// Auto-approve payment if waiting_payment or verification
	if status == "waiting_payment" || status == "payment_verification" {
		reason := "Payment approved instantly via Cashier Fast Validation"
		CreateOrderLog(tx, order.ID, "waiting_process", reason, nil, adminUUID)
		status = "waiting_process"
	}

	// Auto-advance from waiting_process to on_progress
	if status == "waiting_process" {
		for _, op := range order.OrderProducts {
			if op.Product == nil {
				continue
			}
			trackingMode := "simple"
			if op.Product.TrackingMode != nil {
				trackingMode = *op.Product.TrackingMode
			}

			if trackingMode == "simple" {
				res := tx.Model(&models.Product{}).
					Where("id = ? AND stock >= ?", op.ProductID, *op.Qty).
					UpdateColumn("stock", gorm.Expr("stock - ?", *op.Qty))
				if res.Error != nil {
					tx.Rollback()
					return utils.RespApi(c, "ise", "Failed to update product stock", res.Error.Error())
				}

				refType := "order"
				desc := fmt.Sprintf("Auto-allocated by Fast Process: Order %s", *order.OrderNumber)
				qtyNeg := -*op.Qty
				unit := "pcs"
				mvmt := models.StockMovement{
					ProductID:     op.ProductID,
					ReferenceType: &refType,
					ReferenceID:   &order.ID,
					Qty:           &qtyNeg,
					Unit:          &unit,
					Description:   &desc,
				}
				if err := tx.Create(&mvmt).Error; err != nil {
					tx.Rollback()
					return utils.RespApi(c, "ise", "Failed to create stock movement", err.Error())
				}
			} else {
				tx.Rollback()
				return utils.RespApi(c, "bad", "Order contains individual stock tracking. Please use manual process to select serial/remnants.", nil)
			}
		}

		updates["status"] = "on_progress"
		CreateOrderLog(tx, order.ID, "on_progress", "Fast processed to 'On Progress' status", nil, adminUUID)
	} else {
		updates["status"] = status
	}

	if err := tx.Model(&order).Updates(updates).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Failed to update order", err.Error())
	}

	if err := tx.Commit().Error; err != nil {
		return utils.RespApi(c, "ise", "Failed to commit transaction", err.Error())
	}

	return utils.RespApi(c, "ok", "Order fast-validated and processed successfully!", nil)
}

