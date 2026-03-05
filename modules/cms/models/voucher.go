package models

import (
	"aldev/modules/global/models"
	"time"
)

type Voucher struct {
	models.BaseModel
	Code          *string    `json:"code" gorm:"type:varchar(50);uniqueIndex;not null" validate:"required"`
	Description   *string    `json:"description,omitempty" gorm:"type:text"`
	DiscountType  *string    `json:"discount_type" gorm:"type:varchar(20);not null" validate:"required,oneof=percentage nominal"`
	DiscountValue *float64   `json:"discount_value" gorm:"type:decimal(15,2);not null" validate:"required,gt=0"`
	MaxDiscount   *float64   `json:"max_discount,omitempty" gorm:"type:decimal(15,2)"` // Applicable if type is percentage
	MinPurchase   *float64   `json:"min_purchase,omitempty" gorm:"type:decimal(15,2)"` // Minimum order amount to use this voucher
	IsPublic      *bool      `json:"is_public" gorm:"default:false"`                   // Show in catalog/checkout if true
	IsActive      *bool      `json:"is_active" gorm:"default:true"`
	Quota         *int       `json:"quota,omitempty" gorm:"type:int"` // Null/nil means unlimited
	UsedCount     *int       `json:"used_count" gorm:"type:int;default:0"`
	ValidFrom     *time.Time `json:"valid_from,omitempty"`
	ValidUntil    *time.Time `json:"valid_until,omitempty"`
}
