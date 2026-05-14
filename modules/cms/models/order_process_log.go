package models

import (
	authModels "aldev/modules/auth/models"
	"aldev/modules/global/models"

	"github.com/google/uuid"
)

// OrderProcessLog tracks order-level processing updates (kasir-centric).
// Each entry represents one process step for the entire order.
type OrderProcessLog struct {
	models.BaseModel
	OrderID     *uuid.UUID       `json:"order_id" gorm:"type:uuid;not null;index"`
	Order       *Order           `json:"order,omitempty" gorm:"foreignKey:OrderID"`
	ProcessType *string          `json:"process_type" gorm:"type:varchar(50);not null"`
	// pickup | queue | washing | drying | ironing | packing | ready | delivery | done | other
	Description  *string          `json:"description,omitempty" gorm:"type:text"`
	Images       *string          `json:"images,omitempty" gorm:"type:text"` // JSON array of relative URLs
	CreatedByID  *uuid.UUID       `json:"created_by_id" gorm:"type:uuid"`
	CreatedBy    *authModels.User `json:"created_by,omitempty" gorm:"foreignKey:CreatedByID;references:ID"`
}
