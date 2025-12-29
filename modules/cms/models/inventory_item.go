package models

import (
	"aldev/modules/global/models"
	"time"

	"github.com/google/uuid"
)

type InventoryItem struct {
	models.BaseModel
	ProductID *uuid.UUID `json:"product_id" gorm:"type:uuid;not null;index"`
	Product   *Product   `json:"product,omitempty" gorm:"foreignKey:ProductID"`

	// Reference ke purchase (nullable untuk adjustment-created items)
	PurchaseProductID *uuid.UUID       `json:"purchase_product_id,omitempty" gorm:"type:uuid;index"`
	PurchaseProduct   *PurchaseProduct `json:"purchase_product,omitempty" gorm:"foreignKey:PurchaseProductID"`

	// Item identification
	ItemNumber *string `json:"item_number" gorm:"type:varchar(100);unique;not null"`

	// Measurement tracking
	OriginalLength  *float64 `json:"original_length" gorm:"type:decimal(15,3);not null"`
	RemainingLength *float64 `json:"remaining_length" gorm:"type:decimal(15,3);not null"`
	MeasurementUnit *string  `json:"measurement_unit" gorm:"type:varchar(20);not null"`

	// Additional info
	Width *float64 `json:"width,omitempty" gorm:"type:decimal(10,2)"`
	Notes *string  `json:"notes,omitempty" gorm:"type:text"`

	// Status
	Status     *string    `json:"status" gorm:"type:varchar(20);default:'available'"`
	DepletedAt *time.Time `json:"depleted_at,omitempty"`

	// Relations
	Allocations []InventoryAllocation `json:"allocations,omitempty" gorm:"foreignKey:InventoryItemID"`
}
