package models

import (
	authModels "aldev/modules/auth/models"
	"aldev/modules/global/models"

	"github.com/google/uuid"
)

// OrderProcessingLog tracks detailed information about order processing
type OrderProcessingLog struct {
	models.BaseModel
	OrderID           *uuid.UUID       `json:"order_id" gorm:"type:uuid;not null;index"`
	Order             *Order           `json:"order,omitempty" gorm:"foreignKey:OrderID"`
	ProcessedByID     *uuid.UUID       `json:"processed_by_id" gorm:"type:uuid"`
	ProcessedBy       *authModels.User `json:"processed_by,omitempty" gorm:"foreignKey:ProcessedByID"`
	ProcessingDetails *string          `json:"processing_details" gorm:"type:jsonb"` // JSON: selections, remnant choices, etc.
	Notes             *string          `json:"notes,omitempty" gorm:"type:text"`
}
