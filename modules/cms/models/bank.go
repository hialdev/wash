package models

import (
	"aldev/modules/global/models"
)

type Bank struct {
	models.BaseModel
	BankName      *string `json:"bank_name" gorm:"type:varchar(100);not null"`
	AccountNumber *string `json:"account_number" gorm:"type:varchar(100);not null"`
	AccountOwner  *string `json:"account_owner" gorm:"type:varchar(150);not null"`
	Description   *string `json:"description" gorm:"type:text"`
	Logo          *string `json:"logo" gorm:"type:text"`
	IsActive      *bool   `json:"is_active" gorm:"default:true"`
}
