package handlers

import (
	"aldev/modules/cms/models"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ReturnStockToInventory returns stock to inventory when order is canceled or refunded
func ReturnStockToInventory(db *gorm.DB, orderID uuid.UUID, reason string) error {
	// Get order with products and allocations
	var order models.Order
	if err := db.Preload("OrderProducts.Product").
		Preload("OrderProducts.InventoryAllocations.InventoryItem").
		First(&order, "id = ?", orderID).Error; err != nil {
		return fmt.Errorf("failed to get order: %w", err)
	}

	fmt.Printf("🔄 Returning stock for order %s\n", *order.OrderNumber)

	// Start transaction
	tx := db.Begin()
	if tx.Error != nil {
		return fmt.Errorf("failed to start transaction: %w", tx.Error)
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, op := range order.OrderProducts {
		if op.Product == nil {
			continue
		}

		product := op.Product
		trackingMode := "simple"
		if product.TrackingMode != nil {
			trackingMode = *product.TrackingMode
		}

		if trackingMode == "individual" {
			// Individual tracking: restore inventory items
			for _, allocation := range op.InventoryAllocations {
				if allocation.InventoryItem == nil || allocation.AllocatedLength == nil {
					continue
				}

				item := allocation.InventoryItem
				allocatedLength := *allocation.AllocatedLength

				// Calculate new remaining length
				newRemaining := *item.RemainingLength + allocatedLength

				// Update inventory item
				updates := map[string]interface{}{
					"remaining_length": newRemaining,
				}

				// If item was depleted and now has stock, restore status
				if item.Status != nil && *item.Status == "depleted" && newRemaining > 0 {
					updates["status"] = "available"
					updates["depleted_at"] = nil

					// Increase product stock (item is now available again)
					if err := tx.Model(&models.Product{}).
						Where("id = ?", op.ProductID).
						UpdateColumn("stock", gorm.Expr("stock + ?", 1)).Error; err != nil {
						tx.Rollback()
						return fmt.Errorf("failed to increase product stock: %w", err)
					}
					fmt.Printf("📈 Product stock increased (inventory item restored)\n")
				}

				if err := tx.Model(item).Updates(updates).Error; err != nil {
					tx.Rollback()
					return fmt.Errorf("failed to update inventory item: %w", err)
				}

				// Create stock movement for return
				referenceType := "order"
				description := fmt.Sprintf("Stock returned from canceled/refunded order %s (Item: %s, Reason: %s)",
					*order.OrderNumber, *item.ItemNumber, reason)
				qtyPositive := int(allocatedLength)
				unit := *op.MeasurementUnit

				stockMovement := models.StockMovement{
					ProductID:       op.ProductID,
					InventoryItemID: &item.ID,
					ReferenceType:   &referenceType,
					ReferenceID:     &order.ID,
					Qty:             &qtyPositive,
					Unit:            &unit,
					Description:     &description,
				}

				if err := tx.Create(&stockMovement).Error; err != nil {
					tx.Rollback()
					return fmt.Errorf("failed to create stock movement: %w", err)
				}

				fmt.Printf("✅ Inventory item %s restored: +%.2f %s (remaining: %.2f)\n",
					*item.ItemNumber, allocatedLength, unit, newRemaining)
			}
		} else {
			// Simple tracking: increase product stock
			if op.Qty == nil {
				continue
			}

			if err := tx.Model(&models.Product{}).
				Where("id = ?", op.ProductID).
				UpdateColumn("stock", gorm.Expr("stock + ?", *op.Qty)).Error; err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to increase product stock: %w", err)
			}

			// Create stock movement for return
			referenceType := "order"
			description := fmt.Sprintf("Stock returned from canceled/refunded order %s (Reason: %s)",
				*order.OrderNumber, reason)
			unit := "pcs"

			stockMovement := models.StockMovement{
				ProductID:     op.ProductID,
				ReferenceType: &referenceType,
				ReferenceID:   &order.ID,
				Qty:           op.Qty,
				Unit:          &unit,
				Description:   &description,
			}

			if err := tx.Create(&stockMovement).Error; err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to create stock movement: %w", err)
			}

			fmt.Printf("✅ Product %s stock increased: +%d pcs\n", *product.Title, *op.Qty)
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	fmt.Println("✅ Stock returned successfully")
	return nil
}
