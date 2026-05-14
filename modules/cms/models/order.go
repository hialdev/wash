package models

import (
	authModels "aldev/modules/auth/models"
	"aldev/modules/global/models"

	"github.com/google/uuid"
)

type Order struct {
	models.BaseModel
	OrderNumber      *string          `json:"order_number" gorm:"type:varchar(100);unique;index;not null"`
	UserID           *uuid.UUID       `json:"user_id" gorm:"type:uuid;not null"`
	User             *authModels.User `json:"user,omitempty" gorm:"foreignKey:UserID"`
	AddressReceiver  *string          `json:"address_receiver" gorm:"type:text;not null"`
	PhoneReceiver    *string          `json:"phone_receiver" gorm:"type:varchar(50);not null"`
	Status           *string          `json:"status" gorm:"type:varchar(50);default:'waiting_payment'"`
	Notes            *string          `json:"notes,omitempty" gorm:"type:text"`
	TotalBill        *float64         `json:"total_bill" gorm:"type:decimal(15,2);not null"`
	PaymentMethod    *string          `json:"payment_method,omitempty" gorm:"type:varchar(20)"` // xendit, manual
	PaymentProof     *string          `json:"payment_proof,omitempty" gorm:"type:text"`         // for manual payment
	XenditInvoiceID  *string          `json:"xendit_invoice_id,omitempty" gorm:"type:varchar(200)"`
	XenditInvoiceURL *string          `json:"xendit_invoice_url,omitempty" gorm:"type:text"`

	VoucherID      *uuid.UUID `json:"voucher_id,omitempty" gorm:"type:uuid"`
	Voucher        *Voucher   `json:"voucher,omitempty" gorm:"foreignKey:VoucherID"`
	DiscountAmount *float64   `json:"discount_amount" gorm:"type:decimal(15,2);default:0"`

	IsAgentOrder *bool      `json:"is_agent_order" gorm:"type:boolean;default:false"`
	AgentID      *uuid.UUID `json:"agent_id,omitempty" gorm:"type:uuid"`
	Agent        *Agent     `json:"agent,omitempty" gorm:"foreignKey:AgentID"`

	OrderProducts    []OrderProduct    `json:"order_products,omitempty" gorm:"foreignKey:OrderID"`
	OrderServices    []OrderService    `json:"order_services,omitempty" gorm:"foreignKey:OrderID"`
	OrderLogs        []OrderLogStatus  `json:"order_logs,omitempty" gorm:"foreignKey:OrderID"`
	OrderProcessLogs []OrderProcessLog `json:"order_process_logs,omitempty" gorm:"foreignKey:OrderID"`

	Rating *int    `json:"rating,omitempty" gorm:"type:int"`
	Review *string `json:"review,omitempty" gorm:"type:text"`

	// Kasir order boarding fields
	WeightKg *float64 `json:"weight_kg,omitempty" gorm:"type:decimal(10,3)"`
	TotalPcs *int     `json:"total_pcs,omitempty" gorm:"type:int"`
}

type OrderProduct struct {
	models.BaseModel
	OrderID      *uuid.UUID `json:"order_id" gorm:"type:uuid;not null"`
	ProductID    *uuid.UUID `json:"product_id" gorm:"type:uuid;not null"`
	Product      *Product   `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	Order        *Order     `json:"order,omitempty" gorm:"foreignKey:OrderID"`
	PriceAtOrder *float64   `json:"price_at_order" gorm:"type:decimal(15,2);not null"`
	Qty          *int       `json:"qty" gorm:"not null"`

	AgentCommissionRate   *float64 `json:"agent_commission_rate,omitempty" gorm:"type:decimal(15,2)"` // Historical rate
	AgentCommissionAmount *float64 `json:"agent_commission_amount,omitempty" gorm:"type:decimal(15,2)"` // Calculated amount at checkout

	// For individual tracking products
	RequestedLength *float64 `json:"requested_length,omitempty" gorm:"type:decimal(15,3)"`
	MeasurementUnit *string  `json:"measurement_unit,omitempty" gorm:"type:varchar(20)"`

	// Relations
	InventoryAllocations []InventoryAllocation `json:"inventory_allocations,omitempty" gorm:"foreignKey:OrderProductID"`
}
