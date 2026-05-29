package models

import (
	"aldev/modules/global/models"

	"github.com/google/uuid"
)

type Service struct {
	models.BaseModel
	ServiceCategoryID *uuid.UUID       `json:"service_category_id" gorm:"type:uuid"`
	ServiceCategory   *ServiceCategory `json:"service_category,omitempty" gorm:"foreignKey:ServiceCategoryID"`
	ParentID          *uuid.UUID       `json:"parent_id,omitempty" gorm:"type:uuid;index"` // null = parent service, set = variant of parent
	Parent            *Service         `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Variants          []Service        `json:"variants,omitempty" gorm:"foreignKey:ParentID"`
	Name              *string          `json:"name" gorm:"type:varchar(200);not null" validate:"required,min=2,max=200"`
	Description       *string          `json:"description,omitempty" gorm:"type:text"`
	Price             *float64         `json:"price" gorm:"type:decimal(15,2);not null" validate:"required,gte=0"`
	Unit              *string          `json:"unit" gorm:"type:varchar(20);not null" validate:"required"`
	EstimatedDuration *int             `json:"estimated_duration,omitempty"`                          // in minutes
	EstimateHour      *float64         `json:"estimate_hour,omitempty" gorm:"type:decimal(10,2)"`     // in hours
	MinimumQtyOrder   *float64         `json:"minimum_qty_order" gorm:"type:decimal(10,2);default:1" validate:"omitempty,min=1"` // BOM set size, default 1
	IsActive          *bool            `json:"is_active" gorm:"default:true"`
	IsParent          *bool            `json:"is_parent" gorm:"default:false"`
	Images            *string          `json:"images,omitempty" gorm:"type:text"` // JSON array
	ServiceCogs       []ServiceCog     `json:"service_cogs,omitempty" gorm:"foreignKey:ServiceID"`
}
