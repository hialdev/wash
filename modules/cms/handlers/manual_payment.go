package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ManualPaymentHandler struct {
	DB *gorm.DB
}

func NewManualPaymentHandler(db *gorm.DB) *ManualPaymentHandler {
	return &ManualPaymentHandler{DB: db}
}

// UploadPaymentProof - Customer uploads payment proof for manual payment
func (h *ManualPaymentHandler) UploadPaymentProof(c *fiber.Ctx) error {
	orderID := c.Params("id")

	// Parse UUID
	id, err := uuid.Parse(orderID)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid order ID", err.Error())
	}

	// Get order
	var order models.Order
	if err := h.DB.First(&order, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "nf", "Order not found", err.Error())
	}

	// Check if order is in waiting_payment status
	if order.Status == nil || *order.Status != "waiting_payment" {
		return utils.RespApi(c, "bad", "Order is not in waiting_payment status", nil)
	}

	// Get user ID from context
	userIDStr := c.Locals("user_id")
	if userIDStr == nil {
		return utils.RespApi(c, "unauth", "User not authenticated", nil)
	}

	var userID uuid.UUID
	switch v := userIDStr.(type) {
	case string:
		parsed, err := uuid.Parse(v)
		if err != nil {
			return utils.RespApi(c, "bad", "Invalid user ID", err.Error())
		}
		userID = parsed
	case uuid.UUID:
		userID = v
	default:
		return utils.RespApi(c, "bad", "Invalid user ID type", nil)
	}

	// Check user permissions to allow staff to upload on behalf of customers
	isStaff := false
	permsRaw := c.Locals("permissions")
	if permsRaw != nil {
		if perms, ok := permsRaw.([]interface{}); ok {
			for _, p := range perms {
				if ps, ok := p.(string); ok && (ps == "Update Order" || ps == "Add Order") {
					isStaff = true
					break
				}
			}
		}
	}

	// Verify order belongs to user, skip if user is staff
	if !isStaff && (order.UserID == nil || *order.UserID != userID) {
		return utils.RespApi(c, "forbidden", "You don't have permission to access this order", nil)
	}

	// Handle image upload
	filePaths, err := utils.UploadFileFlex(c, "payment_proof", "payment_proofs")
	if err != nil || len(filePaths) == 0 {
		return utils.RespApi(c, "bad", "Failed to upload payment proof", err.Error())
	}

	paymentProof := filePaths[0]

	// Update order
	paymentMethod := "manual"
	newStatus := "payment_verification"
	updates := map[string]interface{}{
		"payment_method": paymentMethod,
		"payment_proof":  paymentProof,
		"status":         newStatus,
	}

	if err := h.DB.Model(&order).Updates(updates).Error; err != nil {
		return utils.RespApi(c, "ise", "Failed to update order", err.Error())
	}

	// Create order log
	reason := "Customer uploaded payment proof for manual payment verification"
	if err := CreateOrderLog(h.DB, id, newStatus, reason, []string{paymentProof}, &userID); err != nil {
		fmt.Printf("Failed to create order log: %v\n", err)
	}

	fmt.Printf("✅ Payment proof uploaded for order %s\n", *order.OrderNumber)

	return utils.RespApi(c, "ok", "Payment proof uploaded successfully. Please wait for admin verification.", fiber.Map{
		"order_id": id,
		"status":   newStatus,
	})
}

// VerifyPayment - Admin verifies manual payment
func (h *ManualPaymentHandler) VerifyPayment(c *fiber.Ctx) error {
	orderID := c.Params("id")

	// Parse UUID
	id, err := uuid.Parse(orderID)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid order ID", err.Error())
	}

	// Get action from body
	type VerifyInput struct {
		Action        string  `json:"action"` // approve, reject
		Reason        *string `json:"reason,omitempty"`
		PaymentMethod *string `json:"payment_method,omitempty"`
	}

	var input VerifyInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Invalid request body", err.Error())
	}

	if input.Action != "approve" && input.Action != "reject" {
		return utils.RespApi(c, "bad", "Invalid action. Must be 'approve' or 'reject'", nil)
	}

	// Get order with products
	var order models.Order
	if err := h.DB.Preload("OrderProducts.Product").First(&order, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "nf", "Order not found", err.Error())
	}

	// Check if order is in payment_verification or waiting_payment status
	if order.Status == nil || (*order.Status != "payment_verification" && *order.Status != "waiting_payment") {
		return utils.RespApi(c, "bad", "Order is not in valid status for verification", nil)
	}

	// Get admin user ID from context
	var adminID *uuid.UUID
	if userID := c.Locals("user_id"); userID != nil {
		if uid, ok := userID.(uuid.UUID); ok {
			adminID = &uid
		}
	}

	if input.Action == "approve" {
		// Approve payment - trigger same validation as Xendit callback
		tx := h.DB.Begin()
		if tx.Error != nil {
			return utils.RespApi(c, "ise", "Failed to start transaction", tx.Error.Error())
		}
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		// Validate stock availability (same logic as Xendit callback)
		var stockErrors []string
		orderProducts := order.OrderProducts

		for _, op := range orderProducts {
			var product models.Product
			if err := tx.First(&product, "id = ?", op.ProductID).Error; err != nil {
				tx.Rollback()
				fmt.Printf("❌ Product not found: %v\n", err)
				return utils.RespApi(c, "ise", "Product not found", err.Error())
			}

			// Check tracking mode
			if product.TrackingMode != nil && *product.TrackingMode == "individual" {
				// Individual tracking: check inventory availability for qty x requested_length
				if op.RequestedLength == nil {
					stockErrors = append(stockErrors, fmt.Sprintf("Product %s: requested length not specified", *product.Title))
					continue
				}
				if op.Qty == nil {
					stockErrors = append(stockErrors, fmt.Sprintf("Product %s: qty not specified", *product.Title))
					continue
				}

				// Get all available inventory items for this product
				var items []models.InventoryItem
				err := tx.Where("product_id = ? AND status = 'available' AND remaining_length >= ?",
					op.ProductID, *op.RequestedLength).
					Order("remaining_length ASC").
					Find(&items).Error

				if err != nil {
					errorMsg := fmt.Sprintf("Product %s: failed to check inventory", *product.Title)
					stockErrors = append(stockErrors, errorMsg)
					fmt.Printf("⚠️  %s\n", errorMsg)
					continue
				}

				// Check if we have enough items to fulfill the qty requirement
				availableQty := len(items)
				if availableQty < *op.Qty {
					errorMsg := fmt.Sprintf("Product %s: insufficient inventory items (available: %d items with %.2f+ %s, requested: %d items x %.2f %s)",
						*product.Title, availableQty, *op.RequestedLength, *op.MeasurementUnit, *op.Qty, *op.RequestedLength, *op.MeasurementUnit)
					stockErrors = append(stockErrors, errorMsg)
					fmt.Printf("⚠️  %s\n", errorMsg)
				}
			} else {
				// Simple tracking: check qty
				if op.Qty == nil {
					stockErrors = append(stockErrors, fmt.Sprintf("Product %s: qty not specified", *product.Title))
					continue
				}

				currentStock := 0
				if product.Stock != nil {
					currentStock = *product.Stock
				}

				if currentStock < *op.Qty {
					errorMsg := fmt.Sprintf("Product %s: stock insufficient (available: %d, requested: %d)",
						*product.Title, currentStock, *op.Qty)
					stockErrors = append(stockErrors, errorMsg)
					fmt.Printf("⚠️  %s\n", errorMsg)
				}
			}
		}

		// If stock validation fails, set status to stock_issue
		if len(stockErrors) > 0 {
			tx.Rollback()
			fmt.Println("❌ Stock validation failed! Payment approved but stock insufficient.")

			// Update order status to stock_issue
			h.DB.Model(&models.Order{}).Where("id = ?", order.ID).Update("status", "stock_issue")

			// Create order log
			reason := "Payment approved but stock validation failed"
			CreateOrderLog(h.DB, order.ID, "stock_issue", reason, nil, adminID)

			return utils.RespApi(c, "bad", "Payment approved but stock insufficient. Order moved to stock_issue status.", stockErrors)
		}

		fmt.Println("✅ Stock validation passed")

		// Update order status to waiting_process
		newStatus := "waiting_process"
		updates := map[string]interface{}{
			"status": newStatus,
		}
		if input.PaymentMethod != nil && *input.PaymentMethod != "" {
			updates["payment_method"] = *input.PaymentMethod
		}

		if err := tx.Model(&models.Order{}).Where("id = ?", order.ID).Updates(updates).Error; err != nil {
			tx.Rollback()
			fmt.Printf("❌ Failed to update order status: %v\n", err)
			return utils.RespApi(c, "ise", "Failed to update order status", err.Error())
		}

		// Commit transaction
		if err := tx.Commit().Error; err != nil {
			return utils.RespApi(c, "ise", "Failed to commit transaction", err.Error())
		}

		// Create order log for waiting_process
		reason := "Manual payment approved by admin"
		if input.Reason != nil {
			reason = *input.Reason
		}
		CreateOrderLog(h.DB, order.ID, "waiting_process", reason, nil, adminID)

		fmt.Println("✅ Manual payment approved, order status updated to waiting_process")

		return utils.RespApi(c, "ok", "Payment approved successfully", nil)
	} else {
		// Reject payment - return to waiting_payment
		newStatus := "waiting_payment"
		if err := h.DB.Model(&order).Update("status", newStatus).Error; err != nil {
			return utils.RespApi(c, "ise", "Failed to update order status", err.Error())
		}

		// Create order log
		reason := "Manual payment rejected by admin"
		if input.Reason != nil {
			reason = *input.Reason
		}
		CreateOrderLog(h.DB, order.ID, "waiting_payment", reason, nil, adminID)

		fmt.Println("❌ Manual payment rejected, order status returned to waiting_payment")

		return utils.RespApi(c, "ok", "Payment rejected. Order returned to waiting_payment status.", nil)
	}
}
