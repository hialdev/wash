package models

import (
	"aldev/modules/global/models"
)

type RawMaterial struct {
	models.BaseModel
	Image        *string  `json:"image" gorm:"type:varchar(255)"`
	Title        *string  `json:"title" gorm:"type:varchar(255);not null;uniqueIndex"`
	Slug         *string  `json:"slug" gorm:"type:varchar(255);not null;uniqueIndex"`
	CurrentStock *float64 `json:"current_stock" gorm:"type:decimal(15,3);default:0"`
	Unit         *string  `json:"unit" gorm:"type:varchar(50);not null"` // kg, liter, pcs, ml, dll
}
