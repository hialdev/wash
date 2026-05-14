package models

import (
	authModels "aldev/modules/auth/models"
	"aldev/modules/global/models"

	"github.com/google/uuid"
)

type OrderService struct {
	models.BaseModel
	OrderID          *uuid.UUID `json:"order_id" gorm:"type:uuid;not null"`
	Order            *Order     `json:"order,omitempty" gorm:"foreignKey:OrderID"`
	ServiceID        *uuid.UUID `json:"service_id" gorm:"type:uuid;not null"`
	Service          *Service   `json:"service,omitempty" gorm:"foreignKey:ServiceID"`
	ServiceVariantID *uuid.UUID `json:"service_variant_id,omitempty" gorm:"type:uuid;index"` // nullable – refers to a Service with ParentID set
	ServiceVariant   *Service   `json:"service_variant,omitempty" gorm:"foreignKey:ServiceVariantID"`
	Qty              *float64   `json:"qty" gorm:"type:decimal(10,2);not null" validate:"required,gt=0"`
	PriceAtOrder     *float64   `json:"price_at_order" gorm:"type:decimal(15,2);not null"`
	Subtotal         *float64   `json:"subtotal" gorm:"type:decimal(15,2);not null"`
	Notes            *string    `json:"notes,omitempty" gorm:"type:text"`

	AgentCommissionRate   *float64 `json:"agent_commission_rate,omitempty" gorm:"type:decimal(15,2)"` // Historical rate
	AgentCommissionAmount *float64 `json:"agent_commission_amount,omitempty" gorm:"type:decimal(15,2)"` // Calculated amount at checkout

	// Relationships
	ServiceProcess []OrderServiceProcess `json:"service_process,omitempty" gorm:"foreignKey:OrderServiceID"`
	ServiceDetail  *OrderServiceDetail   `json:"service_detail,omitempty" gorm:"foreignKey:OrderServiceID"`
}

type OrderServiceProcess struct {
	models.BaseModel
	OrderServiceID *uuid.UUID       `json:"order_service_id" gorm:"type:uuid;not null"`
	OrderService   *OrderService    `json:"order_service,omitempty" gorm:"foreignKey:OrderServiceID"`
	ProcessType    *string          `json:"process_type" gorm:"type:varchar(50);not null"` // pickup, processing, delivery, done, other
	Description    *string          `json:"description,omitempty" gorm:"type:text"`
	Images         *string          `json:"images,omitempty" gorm:"type:text"` // JSON Array
	CreatedByID    *uuid.UUID       `json:"created_by_id" gorm:"type:uuid"`
	Creator        *authModels.User `json:"creator,omitempty" gorm:"foreignKey:CreatedByID;references:ID"`
}

type OrderServiceDetail struct {
	models.BaseModel
	OrderServiceID *uuid.UUID    `json:"order_service_id" gorm:"type:uuid;not null"`
	OrderService   *OrderService `json:"order_service,omitempty" gorm:"foreignKey:OrderServiceID"`
	Description    *string       `json:"description,omitempty" gorm:"type:text"` // HTML content
	Images         *string       `json:"images,omitempty" gorm:"type:text"`      // JSON Array
}
