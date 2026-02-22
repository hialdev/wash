package models

import (
	"aldev/modules/global/models"

	"github.com/google/uuid"
)

type RawMaterialMovement struct {
	models.BaseModel
	RawMaterialID *uuid.UUID   `json:"raw_material_id" gorm:"type:uuid;not null;index"`
	RawMaterial   *RawMaterial `json:"raw_material,omitempty" gorm:"foreignKey:RawMaterialID"`
	IssuerType    *string      `json:"issuer_type" gorm:"type:varchar(50)"` // order, adjustment, purchase
	IssuerID      *uuid.UUID   `json:"issuer_id" gorm:"type:uuid"`
	IsBySystem    *bool        `json:"is_by_system" gorm:"default:false"`
	IsIncrement   *bool        `json:"is_increment" gorm:"not null"` // true = tambah stock, false = kurangi
	Qty           *float64     `json:"qty" gorm:"type:decimal(15,3);not null"`
	Notes         *string      `json:"notes" gorm:"type:text"`
	CreatedBy     *uuid.UUID   `json:"created_by" gorm:"type:uuid"`
}
