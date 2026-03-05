package models

import (
	"aldev/modules/global/models"

	"github.com/google/uuid"
)

type Service struct {
	models.BaseModel
	ServiceCategoryID *uuid.UUID       `json:"service_category_id" gorm:"type:uuid"`
	ServiceCategory   *ServiceCategory `json:"service_category,omitempty" gorm:"foreignKey:ServiceCategoryID"`
	Name              *string          `json:"name" gorm:"type:varchar(200);not null" validate:"required,min=2,max=200"`
	Description       *string          `json:"description,omitempty" gorm:"type:text"`
	Price             *float64         `json:"price" gorm:"type:decimal(15,2);not null" validate:"required,gt=0"`
	Unit              *string          `json:"unit" gorm:"type:varchar(20);not null" validate:"required"`
	EstimatedDuration *int             `json:"estimated_duration,omitempty"` // in minutes
	IsActive          *bool            `json:"is_active" gorm:"default:true"`
	Images            *string          `json:"images,omitempty" gorm:"type:text"` // JSON array
	ServiceCogs       []ServiceCog     `json:"service_cogs,omitempty" gorm:"foreignKey:ServiceID"`
}
