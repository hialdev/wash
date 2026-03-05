package models

import (
	"aldev/modules/global/models"

	"github.com/google/uuid"
)

type ServiceCog struct {
	models.BaseModel
	ServiceID     *uuid.UUID   `json:"service_id" gorm:"type:uuid;not null"`
	Service       *Service     `json:"service,omitempty" gorm:"foreignKey:ServiceID"`
	RawMaterialID *uuid.UUID   `json:"raw_material_id" gorm:"type:uuid;not null"`
	RawMaterial   *RawMaterial `json:"raw_material,omitempty" gorm:"foreignKey:RawMaterialID"`
	Qty           *float64     `json:"qty" gorm:"type:decimal(15,3);not null" validate:"required,gt=0"`
	Unit          *string      `json:"unit" gorm:"type:varchar(50);not null" validate:"required"` // same unit as raw material
}
