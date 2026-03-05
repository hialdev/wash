package handlers

import (
	"aldev/connection"
	"aldev/modules/cms/models"
	"aldev/utils"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MyOrderHandler struct {
	DB *gorm.DB
}

func NewMyOrderHandler(db *gorm.DB) *MyOrderHandler {
	return &MyOrderHandler{DB: db}
}

func (h *MyOrderHandler) GetUserIDFromToken(c *fiber.Ctx) (string, error) {
	// 🔑 Ambil token dari cookie
	tokenStr := c.Cookies("accessToken")
	if tokenStr == "" {
		fmt.Println("❌ No accessToken cookie found")
		return "", utils.RespApi(c, "perm", "Token tidak ditemukan", nil)
	}
	fmt.Printf("✅ Token from cookie: %.50s...\n", tokenStr)

	// 🔐 Parse token
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fiber.NewError(fiber.StatusUnauthorized, "Signing method tidak valid")
		}
		return []byte(os.Getenv("APP_SECRET")), nil
	})

	if err != nil || !token.Valid {
		fmt.Printf("❌ Invalid token: %v\n", err)
		return "", utils.RespApi(c, "perm", "Token tidak valid", nil)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		fmt.Println("❌ Failed to cast claims to MapClaims")
		return "", utils.RespApi(c, "perm", "Claim token tidak valid", nil)
	}

	if claims["type"] != "access" {
		fmt.Printf("❌ Token type is not 'access', got: %v\n", claims["type"])
		return "", utils.RespApi(c, "perm", "Token bukan access token", nil)
	}

	userID, _ := claims["user_id"].(string)

	return userID, nil
}

// GetMyOrders - Fetch orders strictly for the logged-in user
func (h *MyOrderHandler) GetMyOrders(c *fiber.Ctx) error {
	// Get user ID from JWT middleware context
	userID, err := h.GetUserIDFromToken(c)

	if err != nil {
		return utils.RespApi(c, "unauth", "User ID not found in token", nil)
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	search := strings.ToLower(c.Query("search", ""))
	sort := c.Query("sort", "created_at")
	orderDir := c.Query("order", "desc")
	status := c.Query("status", "")

	offset := (page - 1) * limit

	// Base query filtered by UserID
	db := h.DB.Distinct().
		Preload("OrderProducts.Product").
		Preload("OrderServices.Service"). // Preload services
		Preload("OrderLogs").
		Preload("Voucher").
		Where("user_id = ?", userID)

	// Filter search
	if search != "" {
		db = db.Where("LOWER(order_number) LIKE ?", "%"+search+"%")
	}

	// Filter by status
	if status != "" {
		db = db.Where("status = ?", status)
	}

	// Count total
	var total int64
	if err := db.Model(&models.Order{}).Count(&total).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal hitung total", err.Error())
	}

	// Sorting
	validSortFields := map[string]string{
		"total_bill": "total_bill",
		"created_at": "created_at",
	}
	sortBy, ok := validSortFields[sort]
	if !ok {
		sortBy = "created_at"
	}
	db = db.Order(fmt.Sprintf("%s %s", sortBy, orderDir))

	// Fetch data
	var orders []models.Order
	if err := db.Offset(offset).Limit(limit).Find(&orders).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal ambil data", err.Error())
	}

	totalPages := (total + int64(limit) - 1) / int64(limit)

	result := fiber.Map{
		"orders": orders,
		"pagination": fiber.Map{
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": totalPages,
		},
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data Pesanan Saya", result)
}

// CreateMyOrder - Create order strictly for the logged-in user
func (h *MyOrderHandler) CreateMyOrder(c *fiber.Ctx) error {
	var input CustomerOrderInput

	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	// Validate at least one item exists
	if len(input.Products) == 0 && len(input.Services) == 0 {
		return utils.RespApi(c, "bad", "Order harus memiliki minimal 1 produk atau layanan", nil)
	}

	// Get user ID from JWT middleware context
	userID, err := h.GetUserIDFromToken(c)
	if err != nil {
		return utils.RespApi(c, "unauth", "User ID not found in token", nil)
	}

	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return utils.RespApi(c, "bad", "User ID tidak valid", err.Error())
	}

	// Calculate total bill and validate stock
	var totalBill float64 = 0

	// Prepare Product Items
	var orderItems []struct {
		ProductID       *uuid.UUID
		Qty             *int
		RequestedLength *float64
		MeasurementUnit *string
		PriceAtOrder    *float64
		Subtotal        *float64
		Product         models.Product
	}

	for _, productInput := range input.Products {
		var product models.Product
		if err := h.DB.First(&product, "id = ?", productInput.ProductID).Error; err != nil {
			return utils.RespApi(c, "bad", "Product tidak ditemukan", err.Error())
		}

		if product.IsActive != nil && !*product.IsActive {
			return utils.RespApi(c, "bad", fmt.Sprintf("Product %s tidak aktif", *product.Title), nil)
		}

		var subtotal float64
		priceAtOrder := *product.SalePrice

		// Check tracking mode
		if product.TrackingMode != nil && *product.TrackingMode == "individual" {
			// Individual tracking: check inventory items for qty x requested_length
			if productInput.RequestedLength == nil || *productInput.RequestedLength <= 0 {
				return utils.RespApi(c, "bad", fmt.Sprintf("Requested length required untuk produk %s", *product.Title), nil)
			}
			if productInput.Qty == nil || *productInput.Qty <= 0 {
				return utils.RespApi(c, "bad", fmt.Sprintf("Qty required untuk produk %s", *product.Title), nil)
			}

			// Get all available inventory items that can fulfill the requested length
			var items []models.InventoryItem
			err := h.DB.Where("product_id = ? AND status = 'available' AND remaining_length >= ?",
				productInput.ProductID, *productInput.RequestedLength).
				Order("remaining_length ASC").
				Find(&items).Error

			if err != nil {
				return utils.RespApi(c, "ise", "Gagal cek stock", err.Error())
			}

			// Check if we have enough items to fulfill the qty requirement
			availableQty := len(items)
			if availableQty < *productInput.Qty {
				return utils.RespApi(c, "bad", fmt.Sprintf("Stock %s tidak mencukupi (tersedia: %d item dengan %.2f+ %s, diminta: %d item x %.2f %s)",
					*product.Title, availableQty, *productInput.RequestedLength, *product.MeasurementUnit, *productInput.Qty, *productInput.RequestedLength, *product.MeasurementUnit), nil)
			}

			subtotal = *productInput.RequestedLength * priceAtOrder * float64(*productInput.Qty)
			totalBill += subtotal

			orderItems = append(orderItems, struct {
				ProductID       *uuid.UUID
				Qty             *int
				RequestedLength *float64
				MeasurementUnit *string
				PriceAtOrder    *float64
				Subtotal        *float64
				Product         models.Product
			}{
				ProductID:       productInput.ProductID,
				Qty:             productInput.Qty,
				RequestedLength: productInput.RequestedLength,
				MeasurementUnit: productInput.MeasurementUnit,
				PriceAtOrder:    &priceAtOrder,
				Subtotal:        &subtotal,
				Product:         product,
			})

		} else {
			// Simple tracking: check qty
			if productInput.Qty == nil || *productInput.Qty <= 0 {
				return utils.RespApi(c, "bad", fmt.Sprintf("Qty required untuk produk %s", *product.Title), nil)
			}

			// Check stock availability
			if product.Stock == nil || *product.Stock < *productInput.Qty {
				return utils.RespApi(c, "bad", fmt.Sprintf("Stock product %s tidak mencukupi", *product.Title), nil)
			}

			subtotal = priceAtOrder * float64(*productInput.Qty)
			totalBill += subtotal

			orderItems = append(orderItems, struct {
				ProductID       *uuid.UUID
				Qty             *int
				RequestedLength *float64
				MeasurementUnit *string
				PriceAtOrder    *float64
				Subtotal        *float64
				Product         models.Product
			}{
				ProductID:    productInput.ProductID,
				Qty:          productInput.Qty,
				PriceAtOrder: &priceAtOrder,
				Subtotal:     &subtotal,
				Product:      product,
			})
		}
	}

	// Prepare Service Items
	var orderServiceItems []struct {
		ServiceID    *uuid.UUID
		Qty          *float64
		PriceAtOrder *float64
		Subtotal     *float64
		Notes        *string
		Service      models.Service
	}

	for _, serviceInput := range input.Services {
		var service models.Service
		if err := h.DB.First(&service, "id = ?", serviceInput.ServiceID).Error; err != nil {
			return utils.RespApi(c, "bad", "Service tidak ditemukan", err.Error())
		}

		if service.IsActive != nil && !*service.IsActive {
			return utils.RespApi(c, "bad", fmt.Sprintf("Service %s tidak aktif", *service.Name), nil)
		}

		priceAtOrder := *service.Price
		subtotal := priceAtOrder * *serviceInput.Qty
		totalBill += subtotal

		orderServiceItems = append(orderServiceItems, struct {
			ServiceID    *uuid.UUID
			Qty          *float64
			PriceAtOrder *float64
			Subtotal     *float64
			Notes        *string
			Service      models.Service
		}{
			ServiceID:    serviceInput.ServiceID,
			Qty:          serviceInput.Qty,
			PriceAtOrder: &priceAtOrder,
			Subtotal:     &subtotal,
			Notes:        serviceInput.Notes,
			Service:      service,
		})
	}

	orderNumber := fmt.Sprintf("ORD-%s-%d", time.Now().Format("20060102"), time.Now().Unix())

	tx := h.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Handle Voucher
	var voucherID *uuid.UUID
	var discountAmount float64

	if input.VoucherCode != nil && *input.VoucherCode != "" {
		upperCode := strings.ToUpper(*input.VoucherCode)
		var voucher models.Voucher

		if err := tx.Where("code = ?", upperCode).First(&voucher).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				tx.Rollback()
				return utils.RespApi(c, "bad", "Voucher tidak ditemukan", nil)
			}
			tx.Rollback()
			return utils.RespApi(c, "ise", "Gagal cek voucher", err.Error())
		}

		if !*voucher.IsActive {
			tx.Rollback()
			return utils.RespApi(c, "bad", "Voucher tidak aktif", nil)
		}

		now := time.Now()
		if voucher.ValidFrom != nil && now.Before(*voucher.ValidFrom) {
			tx.Rollback()
			return utils.RespApi(c, "bad", "Voucher belum berlaku", nil)
		}
		if voucher.ValidUntil != nil && now.After(*voucher.ValidUntil) {
			tx.Rollback()
			return utils.RespApi(c, "bad", "Voucher sudah kadaluwarsa", nil)
		}

		if voucher.Quota != nil && voucher.UsedCount != nil && *voucher.UsedCount >= *voucher.Quota {
			tx.Rollback()
			return utils.RespApi(c, "bad", "Kuota voucher telah habis", nil)
		}

		if voucher.MinPurchase != nil && totalBill < *voucher.MinPurchase {
			tx.Rollback()
			return utils.RespApi(c, "bad", "Total belanja belum memenuhi syarat minimum voucher", nil)
		}

		if *voucher.DiscountType == "percentage" {
			discountAmount = totalBill * (*voucher.DiscountValue / 100)
			if voucher.MaxDiscount != nil && *voucher.MaxDiscount > 0 && discountAmount > *voucher.MaxDiscount {
				discountAmount = *voucher.MaxDiscount
			}
		} else { // nominal
			discountAmount = *voucher.DiscountValue
		}

		if discountAmount > totalBill {
			discountAmount = totalBill
		}

		totalBill -= discountAmount
		voucherID = &voucher.ID

		// Increment used count
		if err := tx.Model(&models.Voucher{}).Where("id = ?", voucher.ID).UpdateColumn("used_count", gorm.Expr("used_count + ?", 1)).Error; err != nil {
			tx.Rollback()
			return utils.RespApi(c, "ise", "Gagal update penggunaan voucher", err.Error())
		}
	}

	statusWaitingPayment := "waiting_payment"
	order := models.Order{
		OrderNumber:     &orderNumber,
		UserID:          &parsedUserID,
		AddressReceiver: input.AddressReceiver,
		PhoneReceiver:   input.PhoneReceiver,
		Status:          &statusWaitingPayment,
		Notes:           input.Notes,
		TotalBill:       &totalBill,
		VoucherID:       voucherID,
		DiscountAmount:  &discountAmount,
	}

	if err := tx.Create(&order).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Tidak dapat membuat Order", err.Error())
	}

	// Create order products
	for _, item := range orderItems {
		orderProduct := models.OrderProduct{
			OrderID:         &order.ID,
			ProductID:       item.ProductID,
			PriceAtOrder:    item.PriceAtOrder,
			Qty:             item.Qty,
			RequestedLength: item.RequestedLength,
			MeasurementUnit: item.MeasurementUnit,
		}

		if err := tx.Create(&orderProduct).Error; err != nil {
			tx.Rollback()
			return utils.RespApi(c, "ise", "Tidak dapat membuat Order Product", err.Error())
		}
	}

	// Create order services
	for _, item := range orderServiceItems {
		orderService := models.OrderService{
			OrderID:      &order.ID,
			ServiceID:    item.ServiceID,
			Qty:          item.Qty,
			PriceAtOrder: item.PriceAtOrder,
			Subtotal:     item.Subtotal,
			Notes:        item.Notes,
		}

		if err := tx.Create(&orderService).Error; err != nil {
			tx.Rollback()
			return utils.RespApi(c, "ise", "Tidak dapat membuat Order Service", err.Error())
		}
	}

	// Create Xendit invoice
	xenditInvoiceID, xenditInvoiceURL, err := createXenditInvoiceLocal(order, orderItems, orderServiceItems)
	if err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal membuat invoice Xendit", err.Error())
	}

	if err := tx.Model(&order).Updates(map[string]interface{}{
		"xendit_invoice_id":  xenditInvoiceID,
		"xendit_invoice_url": xenditInvoiceURL,
	}).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal update order dengan invoice Xendit", err.Error())
	}

	if err := CreateOrderLog(tx, order.ID, "waiting_payment", GetDefaultReason("waiting_payment"), nil, &parsedUserID); err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal membuat order log", err.Error())
	}

	if err := tx.Commit().Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menyimpan data", err.Error())
	}

	h.DB.Preload("OrderProducts.Product").
		Preload("OrderServices.Service"). // Preload services
		First(&order, "id = ?", order.ID)

	return utils.RespApi(c, "ok", "Berhasil membuat pesanan", order)
}

// GetMyOrderDetail - Fetch a specific order strictly for the logged-in user
func (h *MyOrderHandler) GetMyOrderDetail(c *fiber.Ctx) error {
	// Get user ID from JWT middleware context
	userID, err := h.GetUserIDFromToken(c)
	if err != nil {
		return utils.RespApi(c, "unauth", "User ID not found in token", nil)
	}

	orderID := c.Params("id")

	var order models.Order
	if err := h.DB.Preload("OrderProducts.Product").
		Preload("OrderServices.Service"). // Preload services
		Preload("OrderLogs").
		Preload("Voucher").
		Where("id = ? AND user_id = ?", orderID, userID).
		First(&order).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.RespApi(c, "nf", "Pesanan tidak ditemukan", nil)
		}
		return utils.RespApi(c, "ise", "Gagal mengambil data pesanan", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan detail pesanan", order)
}

// Helper duplicated from OrderHandler to avoid cross-struct dependency without refactoring everything
func createXenditInvoiceLocal(order models.Order, orderItems []struct {
	ProductID       *uuid.UUID
	Qty             *int
	RequestedLength *float64
	MeasurementUnit *string
	PriceAtOrder    *float64
	Subtotal        *float64
	Product         models.Product
}, orderServiceItems []struct {
	ServiceID    *uuid.UUID
	Qty          *float64
	PriceAtOrder *float64
	Subtotal     *float64
	Notes        *string
	Service      models.Service
}) (string, string, error) {
	// Prepare invoice items
	var items []map[string]interface{}

	// Add Product Items
	for _, item := range orderItems {
		itemName := *item.Product.Title

		// For individual tracking products, show requested_length in item name
		// And price per item for Xendit = requested_length * price_per_unit
		var quantity float64
		var price float64

		if item.RequestedLength != nil && *item.RequestedLength > 0 {
			itemName = fmt.Sprintf("%s (%v %s per item)", *item.Product.Title, *item.RequestedLength, *item.MeasurementUnit)
			quantity = float64(*item.Qty)
			price = *item.RequestedLength * *item.PriceAtOrder
		} else if item.Qty != nil {
			quantity = float64(*item.Qty)
			price = *item.PriceAtOrder
		}

		items = append(items, map[string]interface{}{
			"name":     itemName,
			"quantity": quantity,
			"price":    price,
		})
	}

	// Add Service Items
	for _, item := range orderServiceItems {
		items = append(items, map[string]interface{}{
			"name":     *item.Service.Name + " (Service)",
			"quantity": *item.Qty,
			"price":    *item.PriceAtOrder,
		})
	}

	// Prepare invoice payload
	payload := map[string]interface{}{
		"external_id":      order.ID.String(),
		"amount":           *order.TotalBill,
		"description":      fmt.Sprintf("Order %s", *order.OrderNumber),
		"invoice_duration": 86400, // 24 hours
		"currency":         "IDR",
		"items":            items,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", "", err
	}

	apiURL := "https://api.xendit.co/v2/invoices"
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", connection.GetBasicAuthHeader())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", err
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return "", "", fmt.Errorf("xendit API error: %s", string(body))
	}

	invoiceID := result["id"].(string)
	invoiceURL := result["invoice_url"].(string)

	return invoiceID, invoiceURL, nil
}
