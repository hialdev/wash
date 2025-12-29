package models

import (
	"aldev/modules/global/models"
	"time"

	"github.com/google/uuid"
)

type InventoryAllocation struct {
	models.BaseModel
	InventoryItemID *uuid.UUID     `json:"inventory_item_id" gorm:"type:uuid;not null;index"`
	InventoryItem   *InventoryItem `json:"inventory_item,omitempty" gorm:"foreignKey:InventoryItemID"`

	OrderProductID *uuid.UUID    `json:"order_product_id" gorm:"type:uuid;not null;index"`
	OrderProduct   *OrderProduct `json:"order_product,omitempty" gorm:"foreignKey:OrderProductID"`

	AllocatedLength *float64 `json:"allocated_length" gorm:"type:decimal(15,3);not null"`
	MeasurementUnit *string  `json:"measurement_unit" gorm:"type:varchar(20);not null"`

	CreatedAt time.Time `json:"created_at"`
}
