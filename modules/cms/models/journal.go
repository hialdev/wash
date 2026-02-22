package models

import (
	"aldev/modules/global/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Journal struct {
	models.BaseModel
	TrxDate     *time.Time `json:"trx_date" gorm:"not null"`
	TrxType     *string    `json:"trx_type" gorm:"type:varchar(50);not null"` // income, expense
	TrxCategory *string    `json:"trx_category" gorm:"type:varchar(100)"`     // e.g. "Gaji Karyawan", "Sewa Tempat", "Listrik"
	Amount      *float64   `json:"amount" gorm:"type:decimal(19,2);not null"`
	Notes       *string    `json:"notes" gorm:"type:text"`
	Attachments *string    `json:"attachments" gorm:"type:text"` // JSON array of file paths (max 5)
	CreatedBy   *uuid.UUID `json:"created_by" gorm:"type:uuid"`
}

func (m *Journal) BeforeCreate(tx *gorm.DB) (err error) {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return
}
