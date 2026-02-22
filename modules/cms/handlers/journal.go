package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type JournalHandler struct {
	DB *gorm.DB
}

func NewJournalHandler(db *gorm.DB) *JournalHandler {
	return &JournalHandler{DB: db}
}

type JournalInput struct {
	TrxDate     string  `form:"trx_date"`
	TrxType     string  `form:"trx_type"`
	TrxCategory string  `form:"trx_category"`
	Amount      float64 `form:"amount"`
	Notes       string  `form:"notes"`
	// Attachments handled via multipart form
}

func (h *JournalHandler) GetAllJournals(c *fiber.Ctx) error {
	var journals []models.Journal
	var count int64

	db := h.DB.Model(&models.Journal{})

	if startDate := c.Query("start_date"); startDate != "" {
		db = db.Where("trx_date >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		db = db.Where("trx_date <= ?", endDate)
	}
	if trxType := c.Query("trx_type"); trxType != "" {
		db = db.Where("trx_type = ?", trxType)
	}
	if search := c.Query("search"); search != "" {
		db = db.Where("trx_category ILIKE ? OR notes ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	db.Count(&count)

	if err := db.Order("trx_date desc, created_at desc").Find(&journals).Error; err != nil {
		return utils.RespApi(c, "error", "Gagal mengambil data jurnal", nil)
	}

	return utils.RespApi(c, "ok", "Success", fiber.Map{
		"data":  journals,
		"count": count,
	})
}

func (h *JournalHandler) AddJournal(c *fiber.Ctx) error {
	var input JournalInput

	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "error", "Invalid input", err.Error())
	}

	amount := input.Amount
	if amount <= 0 {
		return utils.RespApi(c, "error", "Jumlah harus lebih dari 0", nil)
	}

	trxDate, err := time.Parse("2006-01-02", input.TrxDate)
	if err != nil {
		// Try parsing with time if date only fails, or default to now?
		// Better to enforce YYYY-MM-DD
		return utils.RespApi(c, "error", "Format tanggal salah (YYYY-MM-DD)", nil)
	}

	// Handle File Uploads
	form, err := c.MultipartForm()
	var attachmentPaths []string
	if err == nil {
		files := form.File["attachments"]
		for _, file := range files {
			ext := filepath.Ext(file.Filename)
			filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
			path := fmt.Sprintf("uploads/journals/%s", filename)

			if err := os.MkdirAll("uploads/journals", os.ModePerm); err != nil {
				return utils.RespApi(c, "error", "Gagal membuat folder upload", nil)
			}

			if err := c.SaveFile(file, path); err != nil {
				return utils.RespApi(c, "error", "Gagal menyimpan file", nil)
			}
			attachmentPaths = append(attachmentPaths, path)
		}
	}

	attachmentsJSON, _ := json.Marshal(attachmentPaths)
	attachmentsStr := string(attachmentsJSON)

	var createdBy *uuid.UUID
	if uid := c.Locals("user_id"); uid != nil {
		if uidStr, ok := uid.(string); ok {
			if parsed, err := uuid.Parse(uidStr); err == nil {
				createdBy = &parsed
			}
		}
	}

	journal := models.Journal{
		TrxDate:     &trxDate,
		TrxType:     &input.TrxType,
		TrxCategory: &input.TrxCategory,
		Amount:      &amount,
		Notes:       &input.Notes,
		Attachments: &attachmentsStr,
		CreatedBy:   createdBy,
	}

	if err := h.DB.Create(&journal).Error; err != nil {
		return utils.RespApi(c, "error", "Gagal menyimpan jurnal", nil)
	}

	return utils.RespApi(c, "ok", "Jurnal berhasil disimpan", journal)
}

type BatchJournalInput struct {
	TrxDate     string  `json:"trx_date"`
	TrxType     string  `json:"trx_type"`
	TrxCategory string  `json:"trx_category"`
	Amount      float64 `json:"amount"`
	Notes       string  `json:"notes"`
	// Files handled separately by index
}

func (h *JournalHandler) BatchAddJournal(c *fiber.Ctx) error {
	// Parse multipart form
	form, err := c.MultipartForm()
	if err != nil {
		return utils.RespApi(c, "error", "Invalid form data", err.Error())
	}

	// 1. Parse JSON data for entries
	jsonData := form.Value["json_data"]
	if len(jsonData) == 0 {
		return utils.RespApi(c, "error", "No journal data provided", nil)
	}

	var inputs []BatchJournalInput
	if err := json.Unmarshal([]byte(jsonData[0]), &inputs); err != nil {
		return utils.RespApi(c, "error", "Invalid JSON format", err.Error())
	}

	if len(inputs) == 0 {
		return utils.RespApi(c, "error", "Empty journal list", nil)
	}

	var journals []models.Journal
	var createdBy *uuid.UUID
	if uid := c.Locals("user_id"); uid != nil {
		if uidStr, ok := uid.(string); ok {
			if parsed, err := uuid.Parse(uidStr); err == nil {
				createdBy = &parsed
			}
		}
	}

	// Transaction for atomicity
	tx := h.DB.Begin()

	for i, input := range inputs {
		amount := input.Amount
		if amount <= 0 {
			tx.Rollback()
			return utils.RespApi(c, "error", fmt.Sprintf("Row %d: Jumlah harus lebih dari 0", i+1), nil)
		}

		trxDate, err := time.Parse("2006-01-02", input.TrxDate)
		if err != nil {
			tx.Rollback()
			return utils.RespApi(c, "error", fmt.Sprintf("Row %d: Format tanggal salah", i+1), nil)
		}

		// Handle Files for this index
		var attachmentPaths []string
		fileKey := fmt.Sprintf("attachments_%d", i)
		if files, ok := form.File[fileKey]; ok {
			for _, file := range files {
				ext := filepath.Ext(file.Filename)
				filename := fmt.Sprintf("%d_%d%s", time.Now().UnixNano(), i, ext)
				path := fmt.Sprintf("uploads/journals/%s", filename)

				if err := os.MkdirAll("uploads/journals", os.ModePerm); err != nil {
					tx.Rollback()
					return utils.RespApi(c, "error", "Gagal membuat folder upload", nil)
				}

				if err := c.SaveFile(file, path); err != nil {
					tx.Rollback()
					return utils.RespApi(c, "error", "Gagal menyimpan file", nil)
				}
				attachmentPaths = append(attachmentPaths, path)
			}
		}

		attachmentsJSON, _ := json.Marshal(attachmentPaths)
		attachmentsStr := string(attachmentsJSON)

		journal := models.Journal{
			TrxDate:     &trxDate,
			TrxType:     &input.TrxType,
			TrxCategory: &input.TrxCategory,
			Amount:      &amount,
			Notes:       &input.Notes,
			Attachments: &attachmentsStr,
			CreatedBy:   createdBy,
		}
		journals = append(journals, journal)
	}

	if err := tx.Create(&journals).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "error", "Gagal menyimpan jurnal", err.Error())
	}

	tx.Commit()

	return utils.RespApi(c, "ok", fmt.Sprintf("%d Jurnal berhasil disimpan", len(journals)), journals)
}

func (h *JournalHandler) DeleteJournal(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.DB.Delete(&models.Journal{}, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "error", "Gagal menghapus jurnal", nil)
	}
	return utils.RespApi(c, "ok", "Jurnal berhasil dihapus", nil)
}
