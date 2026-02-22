package models

import "aldev/modules/global/models"

type ServiceCategory struct {
	models.BaseModel
	Name        *string `json:"name" gorm:"type:varchar(100);not null" validate:"required,min=2,max=100"`
	Description *string `json:"description,omitempty" gorm:"type:text"`
	IsActive    *bool   `json:"is_active" gorm:"default:true"`
}
