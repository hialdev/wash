package models

import (
	"aldev/modules/global/models"

	"github.com/google/uuid"
)

type StockMovement struct {
	models.BaseModel
	ProductID *uuid.UUID `json:"product_id" gorm:"type:uuid;not null"`
	Product   *Product   `json:"product,omitempty" gorm:"foreignKey:ProductID"`

	// Optional reference to inventory item
	InventoryItemID *uuid.UUID     `json:"inventory_item_id,omitempty" gorm:"type:uuid;index"`
	InventoryItem   *InventoryItem `json:"inventory_item,omitempty" gorm:"foreignKey:InventoryItemID"`

	ReferenceType *string    `json:"reference_type" gorm:"type:varchar(50);not null"` // purchase, order, adjustment
	ReferenceID   *uuid.UUID `json:"reference_id" gorm:"type:uuid;not null"`

	// Reference relations (not stored in DB, populated via preload)
	Purchase   *Purchase   `json:"purchase,omitempty" gorm:"-"`
	Order      *Order      `json:"order,omitempty" gorm:"-"`
	Adjustment *Adjustment `json:"adjustment,omitempty" gorm:"-"`

	Qty         *int    `json:"qty" gorm:"not null"` // positive for increment, negative for decrement
	Unit        *string `json:"unit" gorm:"type:varchar(20);default:'pcs'"`
	Description *string `json:"description,omitempty" gorm:"type:text"`
}
