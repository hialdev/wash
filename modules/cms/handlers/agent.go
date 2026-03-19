package handlers

import (
	"math/rand"
	"strconv"
	"strings"
	"time"

	authModels "aldev/modules/auth/models"
	"aldev/modules/cms/models"
	"aldev/utils"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type AgentHandler struct {
	DB *gorm.DB
}

func NewAgentHandler(db *gorm.DB) *AgentHandler {
	rand.Seed(time.Now().UnixNano())
	return &AgentHandler{DB: db}
}

func generateLutaCode() string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 6)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return "LUTA" + string(b)
}

func (h *AgentHandler) GetAllAgents(c *fiber.Ctx) error {
	var agents []models.Agent
	var total int64

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)
	search := c.Query("search", "")

	offset := (page - 1) * limit

	query := h.DB.Model(&models.Agent{})
	if search != "" {
		query = query.Where("name ILIKE ? OR code ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal hitung total", err.Error())
	}

	if err := query.Offset(offset).Limit(limit).Find(&agents).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data agent", err.Error())
	}

	totalPages := (total + int64(limit) - 1) / int64(limit)

	result := fiber.Map{
		"agents": agents,
		"pagination": fiber.Map{
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": totalPages,
		},
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data agent", result)
}

func (h *AgentHandler) GetMyAgent(c *fiber.Ctx) error {
	var agent models.Agent
	if err := h.DB.First(&agent, "user_id = ?", c.Params("id")).Error; err != nil {
		return utils.RespApi(c, "empty", "Agent tidak ditemukan", err.Error())
	}
	return utils.RespApi(c, "ok", "Berhasil mendapatkan data agent", agent)
}

func (h *AgentHandler) GetAgent(c *fiber.Ctx) error {
	id := c.Params("id")
	var agent models.Agent

	if err := h.DB.First(&agent, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Agent tidak ditemukan", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data agent", agent)
}

func (h *AgentHandler) AddAgent(c *fiber.Ctx) error {
	name := c.FormValue("name")
	phone := c.FormValue("phone")
	email := c.FormValue("email")
	address := c.FormValue("address")
	commStr := c.FormValue("commission_rate")
	isActiveStr := c.FormValue("is_active")

	isActive := true
	if isActiveStr == "false" {
		isActive = false
	}

	commRate := 0.0
	if commStr != "" {
		if val, err := strconv.ParseFloat(commStr, 64); err == nil {
			commRate = val
		}
	}

	imagePath := ""
	file, err := c.FormFile("image")
	if err == nil && file != nil {
		path, uploadErr := utils.UploadFile(c, "image", "agents")
		if uploadErr != nil {
			return utils.RespApi(c, "bad", "Gagal upload image", uploadErr.Error())
		}
		imagePath = path
	}

	code := generateLutaCode()

	agent := models.Agent{
		Name:           &name,
		Code:           &code,
		Phone:          &phone,
		Email:          &email,
		Address:        &address,
		CommissionRate: &commRate,
		IsActive:       &isActive,
	}

	if imagePath != "" {
		agent.Image = &imagePath
	}

	if err := h.DB.Create(&agent).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal membuat agent", err.Error())
	}

	return utils.RespApi(c, "ok", "Agent berhasil dibuat", agent)
}

func (h *AgentHandler) UpdateAgent(c *fiber.Ctx) error {
	id := c.Params("id")
	var agent models.Agent

	if err := h.DB.First(&agent, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Agent tidak ditemukan", err.Error())
	}

	name := c.FormValue("name")
	if name != "" {
		agent.Name = &name
	}
	phone := c.FormValue("phone")
	if phone != "" {
		agent.Phone = &phone
	}
	email := c.FormValue("email")
	if email != "" {
		agent.Email = &email
	}
	address := c.FormValue("address")
	if address != "" {
		agent.Address = &address
	}

	commStr := c.FormValue("commission_rate")
	if commStr != "" {
		if val, err := strconv.ParseFloat(commStr, 64); err == nil {
			agent.CommissionRate = &val
		}
	}

	isActiveStr := c.FormValue("is_active")
	if isActiveStr != "" {
		isActive := true
		if isActiveStr == "false" {
			isActive = false
		}
		agent.IsActive = &isActive
	}

	file, err := c.FormFile("image")
	if err == nil && file != nil {
		oldPath := ""
		if agent.Image != nil {
			oldPath = *agent.Image
		}
		path, uploadErr := utils.UpdateFile(c, oldPath, "image", "agents")
		if uploadErr != nil {
			return utils.RespApi(c, "bad", "Gagal upload image", uploadErr.Error())
		}
		agent.Image = &path
	}

	if err := h.DB.Save(&agent).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal update agent", err.Error())
	}

	return utils.RespApi(c, "ok", "Agent berhasil diupdate", agent)
}

func (h *AgentHandler) DeleteAgent(c *fiber.Ctx) error {
	id := c.Params("id")

	var agent models.Agent
	if err := h.DB.First(&agent, "id = ?", id).Error; err == nil {
		if agent.Image != nil && *agent.Image != "" {
			utils.DeleteFile(*agent.Image)
		}
	}

	if err := h.DB.Delete(&models.Agent{}, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menghapus agent", err.Error())
	}

	return utils.RespApi(c, "ok", "Agent berhasil dihapus", nil)
}

func (h *AgentHandler) GenerateUser(c *fiber.Ctx) error {
	id := c.Params("id")
	var agent models.Agent

	if err := h.DB.First(&agent, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Agent tidak ditemukan", err.Error())
	}

	if agent.UserID != nil {
		return utils.RespApi(c, "bad", "Agent ini sudah terhubung dengan akun App", nil)
	}

	// Cek role Agent
	var agentRole authModels.Role
	if err := h.DB.Where("name = ?", "Agent").First(&agentRole).Error; err != nil {
		return utils.RespApi(c, "ise", "Role Agent belum dikonfigurasi", err.Error())
	}

	// Persiapkan User Data
	username := strings.ToLower(*agent.Code)
	
	email := ""
	if agent.Email != nil && *agent.Email != "" {
		email = *agent.Email
	} else {
		email = username + "@wash.local"
	}

	phone := ""
	if agent.Phone != nil && *agent.Phone != "" {
		phone = *agent.Phone
	} else {
		phone = username // Fallback if no phone
	}

	// Cek apakah email/phone bentrok
	var count int64
	h.DB.Model(&authModels.User{}).Where("email = ? OR phone = ? OR username = ?", email, phone, username).Count(&count)
	if count > 0 {
		return utils.RespApi(c, "bad", "Email/Phone/Username sudah terpakai oleh User lain", nil)
	}

	newUser := authModels.User{
		Name:     agent.Name,
		Username: &username,
		Email:    &email,
		Phone:    &phone,
		RoleID:   &agentRole.ID,
	}

	// Gunakan gambar agent jika ada
	if agent.Image != nil && *agent.Image != "" {
		newUser.Image = agent.Image
	}

	// Save User
	if err := h.DB.Create(&newUser).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal auto-generate User", err.Error())
	}

	// Map User back to Agent
	if err := h.DB.Model(&agent).Update("user_id", newUser.ID).Error; err != nil {
		return utils.RespApi(c, "ise", "User dibuat tapi gagal terikat ke Agent", err.Error())
	}

	return utils.RespApi(c, "ok", "User berhasil di-generate. Agent kini dapat Login via OTP.", newUser)
}
