package models

import (
	authModels "aldev/modules/auth/models"
	"aldev/modules/global/models"

	"github.com/google/uuid"
)

type Agent struct {
	models.BaseModel
	Name           *string  `json:"name" gorm:"type:varchar(200);not null"`
	Code           *string  `json:"code" gorm:"type:varchar(50);unique;not null"`
	Phone          *string  `json:"phone,omitempty" gorm:"type:varchar(50)"`
	Email          *string  `json:"email,omitempty" gorm:"type:varchar(100)"`
	Address        *string  `json:"address,omitempty" gorm:"type:text"`
	CommissionRate *float64 `json:"commission_rate" gorm:"type:decimal(5,2);default:0.00"`
	Image          *string          `json:"image,omitempty" gorm:"type:text"`
	IsActive       *bool            `json:"is_active" gorm:"default:true"`
	UserID         *uuid.UUID       `json:"user_id,omitempty"`
	User           *authModels.User `json:"user,omitempty" gorm:"foreignKey:UserID;constraint:SET NULL;"`
}
