package models

import (
	"aldev/modules/global/models"

	"github.com/google/uuid"
)

type DeliveryAddress struct {
	models.BaseModel
	UserID      *uuid.UUID `json:"user_id" gorm:"type:uuid;not null;index"`
	User        *User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Address     *string    `json:"address" gorm:"type:text;not null"`
	PhoneNumber *string    `json:"phone_number" gorm:"type:varchar(50);not null"`
	IsPrimary   *bool      `json:"is_primary" gorm:"default:false"`
	Notes       *string    `json:"notes,omitempty" gorm:"type:text"`
}
