package models

import (
	"aldev/modules/global/models"

	"github.com/google/uuid"
)

type AgentCommissionRate struct {
	models.BaseModel
	AgentID  *uuid.UUID `json:"agent_id" gorm:"type:uuid;not null"`
	Type     *string    `json:"type" gorm:"type:varchar(20);not null"` // 'service' | 'product'
	IssuerID *uuid.UUID `json:"issuer_id" gorm:"type:uuid;not null"`   // service_id / product_id (doesn't enforce foreign key for flexibility)
	RateType *string    `json:"rate_type" gorm:"type:varchar(20);not null;default:'percentage'"` // 'percentage' | 'fixed'
	Rate     *float64   `json:"rate" gorm:"type:decimal(15,2);not null;default:0.00"` // Percentage value or Fixed nominal

	Agent Agent `json:"-" gorm:"foreignKey:AgentID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}

func (AgentCommissionRate) TableName() string {
	return "agent_commission_rates"
}
