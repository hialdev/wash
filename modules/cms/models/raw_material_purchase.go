package models

import (
	"aldev/modules/global/models"
	"time"

	"github.com/google/uuid"
)

type RawMaterialPurchase struct {
	models.BaseModel
	PurchaseDate  *time.Time   `json:"purchase_date" gorm:"not null"`
	RawMaterialID *uuid.UUID   `json:"raw_material_id" gorm:"type:uuid;not null;index"`
	RawMaterial   *RawMaterial `json:"raw_material,omitempty" gorm:"foreignKey:RawMaterialID"`
	PricePurchase *float64     `json:"price_purchase" gorm:"type:decimal(15,2);not null"`
	Qty           *float64     `json:"qty" gorm:"type:decimal(15,3);not null"`
	CreatedBy     *uuid.UUID   `json:"created_by" gorm:"type:uuid"`
	Notes         *string      `json:"notes" gorm:"type:text"`
}
