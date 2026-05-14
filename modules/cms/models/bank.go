package models

import (
	"aldev/modules/global/models"
)

type Bank struct {
	models.BaseModel
	BankName      *string `json:"bank_name" gorm:"type:varchar(100)"`
	AccountNumber *string `json:"account_number" gorm:"type:varchar(100)"`
	AccountOwner  *string `json:"account_owner" gorm:"type:varchar(150)"`
	Description   *string `json:"description" gorm:"type:text"`
	Logo          *string `json:"logo" gorm:"type:text"`
	IsActive      *bool   `json:"is_active" gorm:"default:true"`
	IsQris        *bool   `json:"is_qris" gorm:"default:false"` // if true, show QR image instead of account number
	QrisImage     *string `json:"qris_image" gorm:"type:text"`  // path to QRIS image
}
