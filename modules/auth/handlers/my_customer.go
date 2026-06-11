package handlers

import (
	"aldev/modules/auth/models"
	"aldev/utils"
	"fmt"
	"math/rand"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ---------------------------------------------------------------------------
// MyCustomerHandler — handles agent-scoped customer management
// ---------------------------------------------------------------------------

type MyCustomerHandler struct {
	DB *gorm.DB
}

func NewMyCustomerHandler(db *gorm.DB) *MyCustomerHandler {
	return &MyCustomerHandler{DB: db}
}

// MyCustomerInput — for creating a new customer
type MyCustomerInput struct {
	Name  string `json:"name" validate:"required,min=2,max=100"`
	Phone string `json:"phone" validate:"required,min=6,max=16"`
	Email string `json:"email" validate:"omitempty,email"`
}

// MyCustomerUpdateInput — agent can only update name
type MyCustomerUpdateInput struct {
	Name string `json:"name" validate:"required,min=2,max=100"`
}

// helper — get logged-in user UUID from JWT
func getUserIDFromJWT(c *fiber.Ctx) (uuid.UUID, error) {
	userJWT := c.Locals("user")
	if userJWT == nil {
		return uuid.Nil, fiber.ErrUnauthorized
	}
	token := userJWT.(*jwt.Token)
	claims := token.Claims.(jwt.MapClaims)
	return uuid.Parse(claims["user_id"].(string))
}

// helper — generate a unique username from name
func generateUsername(name string) string {
	base := strings.ToLower(strings.ReplaceAll(name, " ", ""))
	if len(base) > 8 {
		base = base[:8]
	}
	suffix := fmt.Sprintf("%04d", rand.Intn(10000)) //nolint:gosec
	return base + suffix
}

// ---------------------------------------------------------------------------
// GET /api/my-customers
// ---------------------------------------------------------------------------

func (h *MyCustomerHandler) GetMyCustomers(c *fiber.Ctx) error {
	agentUserID, err := getUserIDFromJWT(c)
	if err != nil {
		return utils.RespApi(c, "unauth", "Token tidak valid", nil)
	}

	search := strings.ToLower(c.Query("search", ""))

	db := h.DB.Model(&models.User{}).
		Preload("Role").
		Where("created_by = ?", agentUserID)

	if search != "" {
		db = db.Where(`LOWER(users.name) LIKE ? OR LOWER(CAST(users.phone AS TEXT)) LIKE ? OR LOWER(users.email) LIKE ?`,
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	db.Count(&total)

	var customers []models.User
	if err := db.Order("created_at DESC").Find(&customers).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mengambil data pelanggan", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mengambil daftar pelanggan", fiber.Map{
		"customers": customers,
		"total":     total,
	})
}

// ---------------------------------------------------------------------------
// POST /api/my-customers
// ---------------------------------------------------------------------------

func (h *MyCustomerHandler) AddMyCustomer(c *fiber.Ctx) error {
	agentUserID, err := getUserIDFromJWT(c)
	if err != nil {
		return utils.RespApi(c, "unauth", "Token tidak valid", nil)
	}

	var input MyCustomerInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Data input tidak valid", err.Error())
	}
	if err := utils.Validate.Struct(input); err != nil {
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	// Find the Customer role
	var customerRole models.Role
	if err := h.DB.Where("name = ?", "Customer").First(&customerRole).Error; err != nil {
		return utils.RespApi(c, "ise", "Role Customer tidak ditemukan, pastikan seeder sudah dijalankan", err.Error())
	}

	username := generateUsername(input.Name)
	newUser := models.User{
		Name:      &input.Name,
		Username:  &username,
		Phone:     &input.Phone,
		RoleID:    &customerRole.ID,
		CreatedBy: &agentUserID,
	}

	if input.Email != "" {
		newUser.Email = &input.Email
	}

	if err := h.DB.Create(&newUser).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal membuat pelanggan", err.Error())
	}

	// Reload with preloads
	h.DB.Preload("Role").First(&newUser, "id = ?", newUser.ID)

	return utils.RespApi(c, "ok", "Pelanggan berhasil ditambahkan", newUser)
}

// ---------------------------------------------------------------------------
// PATCH /api/my-customers/:id
// ---------------------------------------------------------------------------

func (h *MyCustomerHandler) UpdateMyCustomer(c *fiber.Ctx) error {
	agentUserID, err := getUserIDFromJWT(c)
	if err != nil {
		return utils.RespApi(c, "unauth", "Token tidak valid", nil)
	}

	customerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.RespApi(c, "bad", "ID tidak valid", nil)
	}

	var customer models.User
	if err := h.DB.First(&customer, "id = ? AND created_by = ?", customerID, agentUserID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.RespApi(c, "notfound", "Pelanggan tidak ditemukan atau bukan milik Anda", nil)
		}
		return utils.RespApi(c, "ise", "Gagal mencari pelanggan", err.Error())
	}

	var input MyCustomerUpdateInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Data input tidak valid", err.Error())
	}
	if err := utils.Validate.Struct(input); err != nil {
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	customer.Name = &input.Name
	if err := h.DB.Save(&customer).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mengupdate pelanggan", err.Error())
	}

	h.DB.Preload("Role").First(&customer, customer.ID)

	return utils.RespApi(c, "ok", "Pelanggan berhasil diupdate", customer)
}

// ---------------------------------------------------------------------------
// GET /api/my-customers/:id/delivery-addresses
// ---------------------------------------------------------------------------

func (h *MyCustomerHandler) GetMyCustomerAddresses(c *fiber.Ctx) error {
	agentUserID, err := getUserIDFromJWT(c)
	if err != nil {
		return utils.RespApi(c, "unauth", "Token tidak valid", nil)
	}

	customerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.RespApi(c, "bad", "ID tidak valid", nil)
	}

	// Ownership check
	var count int64
	h.DB.Model(&models.User{}).Where("id = ? AND created_by = ?", customerID, agentUserID).Count(&count)
	if count == 0 {
		return utils.RespApi(c, "notfound", "Pelanggan tidak ditemukan atau bukan milik Anda", nil)
	}

	var addresses []models.DeliveryAddress
	if err := h.DB.Where("user_id = ?", customerID).Order("is_primary DESC, created_at DESC").Find(&addresses).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mengambil alamat pelanggan", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mengambil alamat pelanggan", addresses)
}

// ---------------------------------------------------------------------------
// POST /api/my-customers/:id/delivery-addresses
// ---------------------------------------------------------------------------

func (h *MyCustomerHandler) AddMyCustomerAddress(c *fiber.Ctx) error {
	agentUserID, err := getUserIDFromJWT(c)
	if err != nil {
		return utils.RespApi(c, "unauth", "Token tidak valid", nil)
	}

	customerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.RespApi(c, "bad", "ID tidak valid", nil)
	}

	// Ownership check
	var count int64
	h.DB.Model(&models.User{}).Where("id = ? AND created_by = ?", customerID, agentUserID).Count(&count)
	if count == 0 {
		return utils.RespApi(c, "notfound", "Pelanggan tidak ditemukan atau bukan milik Anda", nil)
	}

	var input DeliveryAddressInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Data input tidak valid", err.Error())
	}
	if err := utils.Validate.Struct(input); err != nil {
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	tx := h.DB.Begin()

	// If this is primary, unset existing primary first
	if input.IsPrimary {
		tx.Model(&models.DeliveryAddress{}).Where("user_id = ?", customerID).Update("is_primary", false)
	}

	// Auto-set as primary if first address
	var addrCount int64
	tx.Model(&models.DeliveryAddress{}).Where("user_id = ?", customerID).Count(&addrCount)
	if addrCount == 0 {
		input.IsPrimary = true
	}

	isPrimary := input.IsPrimary
	address := models.DeliveryAddress{
		UserID:      &customerID,
		Address:     &input.Address,
		PhoneNumber: &input.PhoneNumber,
		Notes:       &input.Notes,
		IsPrimary:   &isPrimary,
	}

	if err := tx.Create(&address).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal menyimpan alamat", err.Error())
	}

	tx.Commit()
	return utils.RespApi(c, "ok", "Alamat pelanggan berhasil ditambahkan", address)
}

// ---------------------------------------------------------------------------
// PATCH /api/my-customers/:id/delivery-addresses/:addr_id — Update address
// ---------------------------------------------------------------------------

func (h *MyCustomerHandler) UpdateMyCustomerAddress(c *fiber.Ctx) error {
	agentUserID, err := getUserIDFromJWT(c)
	if err != nil {
		return utils.RespApi(c, "unauth", "Token tidak valid", nil)
	}

	customerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.RespApi(c, "bad", "Customer ID tidak valid", nil)
	}
	addrID := c.Params("addr_id")

	// Ownership check
	var count int64
	h.DB.Model(&models.User{}).Where("id = ? AND created_by = ?", customerID, agentUserID).Count(&count)
	if count == 0 {
		return utils.RespApi(c, "notfound", "Pelanggan tidak ditemukan atau bukan milik Anda", nil)
	}

	var input DeliveryAddressInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Data input tidak valid", err.Error())
	}

	tx := h.DB.Begin()
	var address models.DeliveryAddress
	if err := tx.Where("id = ? AND user_id = ?", addrID, customerID).First(&address).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "notfound", "Alamat tidak ditemukan", nil)
	}

	if input.IsPrimary && !*address.IsPrimary {
		tx.Model(&models.DeliveryAddress{}).Where("user_id = ?", customerID).Update("is_primary", false)
	}

	address.Address = &input.Address
	address.PhoneNumber = &input.PhoneNumber
	address.Notes = &input.Notes
	address.IsPrimary = &input.IsPrimary

	if err := tx.Save(&address).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal mengupdate alamat", err.Error())
	}
	tx.Commit()
	return utils.RespApi(c, "ok", "Alamat berhasil diupdate", address)
}

// ---------------------------------------------------------------------------
// DELETE /api/my-customers/:id/delivery-addresses/:addr_id
// ---------------------------------------------------------------------------

func (h *MyCustomerHandler) DeleteMyCustomerAddress(c *fiber.Ctx) error {
	agentUserID, err := getUserIDFromJWT(c)
	if err != nil {
		return utils.RespApi(c, "unauth", "Token tidak valid", nil)
	}

	customerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.RespApi(c, "bad", "Customer ID tidak valid", nil)
	}
	addrID := c.Params("addr_id")

	// Ownership check
	var count int64
	h.DB.Model(&models.User{}).Where("id = ? AND created_by = ?", customerID, agentUserID).Count(&count)
	if count == 0 {
		return utils.RespApi(c, "notfound", "Pelanggan tidak ditemukan atau bukan milik Anda", nil)
	}

	var address models.DeliveryAddress
	if err := h.DB.Where("id = ? AND user_id = ?", addrID, customerID).First(&address).Error; err != nil {
		return utils.RespApi(c, "notfound", "Alamat tidak ditemukan", nil)
	}

	tx := h.DB.Begin()
	if err := tx.Delete(&address).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal menghapus alamat", err.Error())
	}
	// Set new primary if deleted was the primary
	if *address.IsPrimary {
		var newPrimary models.DeliveryAddress
		if tx.Where("user_id = ?", customerID).Order("created_at DESC").First(&newPrimary).Error == nil {
			tx.Model(&newPrimary).Update("is_primary", true)
		}
	}
	tx.Commit()
	return utils.RespApi(c, "ok", "Alamat berhasil dihapus", nil)
}

// ---------------------------------------------------------------------------
// PATCH /api/my-customers/:id/delivery-addresses/:addr_id/set-primary
// ---------------------------------------------------------------------------

func (h *MyCustomerHandler) SetMyCustomerAddressPrimary(c *fiber.Ctx) error {
	agentUserID, err := getUserIDFromJWT(c)
	if err != nil {
		return utils.RespApi(c, "unauth", "Token tidak valid", nil)
	}

	customerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.RespApi(c, "bad", "Customer ID tidak valid", nil)
	}
	addrID := c.Params("addr_id")

	// Ownership check
	var count int64
	h.DB.Model(&models.User{}).Where("id = ? AND created_by = ?", customerID, agentUserID).Count(&count)
	if count == 0 {
		return utils.RespApi(c, "notfound", "Pelanggan tidak ditemukan atau bukan milik Anda", nil)
	}

	tx := h.DB.Begin()
	tx.Model(&models.DeliveryAddress{}).Where("user_id = ?", customerID).Update("is_primary", false)
	if err := tx.Model(&models.DeliveryAddress{}).Where("id = ? AND user_id = ?", addrID, customerID).Update("is_primary", true).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal set alamat utama", err.Error())
	}
	tx.Commit()
	return utils.RespApi(c, "ok", "Alamat utama berhasil diatur", nil)
}
