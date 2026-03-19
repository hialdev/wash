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
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AgentOrderInput struct {
	UserID          *uuid.UUID          `json:"user_id" validate:"required"`
	AgentID         *uuid.UUID          `json:"agent_id" validate:"required"`
	AddressReceiver *string             `json:"address_receiver" validate:"required"`
	PhoneReceiver   *string             `json:"phone_receiver" validate:"required"`
	Notes           *string             `json:"notes,omitempty"`
	VoucherCode     *string             `json:"voucher_code,omitempty"`
	Products        []OrderProductInput `json:"products,omitempty" validate:"omitempty,dive"`
	Services        []OrderServiceInput `json:"services,omitempty" validate:"omitempty,dive"`
}

type AgentOrderHandler struct {
	DB *gorm.DB
}

func NewAgentOrderHandler(db *gorm.DB) *AgentOrderHandler {
	return &AgentOrderHandler{DB: db}
}

func (h *AgentOrderHandler) AddAgentOrder(c *fiber.Ctx) error {
	var input AgentOrderInput

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

		if product.TrackingMode != nil && *product.TrackingMode == "individual" {
			if productInput.RequestedLength == nil || *productInput.RequestedLength <= 0 {
				return utils.RespApi(c, "bad", fmt.Sprintf("Requested length required untuk produk %s", *product.Title), nil)
			}

			var item models.InventoryItem
			err := h.DB.Where("product_id = ? AND status = 'available' AND remaining_length >= ?",
				productInput.ProductID, *productInput.RequestedLength).
				Order("remaining_length ASC").
				First(&item).Error

			if err != nil {
				if err == gorm.ErrRecordNotFound {
					return utils.RespApi(c, "bad", fmt.Sprintf("Stock %s tidak mencukupi", *product.Title), nil)
				}
				return utils.RespApi(c, "ise", "Gagal cek stock", err.Error())
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
			if productInput.Qty == nil || *productInput.Qty <= 0 {
				return utils.RespApi(c, "bad", fmt.Sprintf("Qty required untuk produk %s", *product.Title), nil)
			}

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

	// Make sure agent exists
	var agent models.Agent
	if err := h.DB.First(&agent, "id = ?", input.AgentID).Error; err != nil {
		return utils.RespApi(c, "bad", "Agent tidak ditemukan", err.Error())
	}

	var commissionRates []models.AgentCommissionRate
	h.DB.Where("agent_id = ?", agent.ID).Find(&commissionRates)

	commissionMap := make(map[uuid.UUID]models.AgentCommissionRate)
	for _, cr := range commissionRates {
		commissionMap[*cr.IssuerID] = cr
	}

	orderNumber := fmt.Sprintf("ORD-%s-%d", time.Now().Format("20060102"), time.Now().Unix())

	tx := h.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

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
		} else {
			discountAmount = *voucher.DiscountValue
		}

		if discountAmount > totalBill {
			discountAmount = totalBill
		}

		totalBill -= discountAmount
		voucherID = &voucher.ID

		if err := tx.Model(&models.Voucher{}).Where("id = ?", voucher.ID).UpdateColumn("used_count", gorm.Expr("used_count + ?", 1)).Error; err != nil {
			tx.Rollback()
			return utils.RespApi(c, "ise", "Gagal update penggunaan voucher", err.Error())
		}
	}

	statusWaitingPayment := "waiting_payment"
	isAgentOrder := true

	order := models.Order{
		OrderNumber:     &orderNumber,
		UserID:          input.UserID,
		AddressReceiver: input.AddressReceiver,
		PhoneReceiver:   input.PhoneReceiver,
		Status:          &statusWaitingPayment,
		Notes:           input.Notes,
		TotalBill:       &totalBill,
		VoucherID:       voucherID,
		DiscountAmount:  &discountAmount,
		IsAgentOrder:    &isAgentOrder,
		AgentID:         input.AgentID,
	}

	if err := tx.Create(&order).Error; err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Tidak dapat membuat Order", err.Error())
	}

	for _, item := range orderItems {
		var commRate float64
		var commAmount float64

		if cr, ok := commissionMap[*item.ProductID]; ok {
			commRate = *cr.Rate
			if cr.RateType != nil && *cr.RateType == "fixed" {
				commAmount = *cr.Rate * float64(*item.Qty)
			} else {
				commAmount = *item.Subtotal * (*cr.Rate / 100)
			}
		} else {
			if agent.CommissionRate != nil {
				commRate = *agent.CommissionRate
				commAmount = *item.Subtotal * (*agent.CommissionRate / 100)
			}
		}

		orderProduct := models.OrderProduct{
			OrderID:               &order.ID,
			ProductID:             item.ProductID,
			Qty:                   item.Qty,
			RequestedLength:       item.RequestedLength,
			MeasurementUnit:       item.MeasurementUnit,
			PriceAtOrder:          item.PriceAtOrder,
			AgentCommissionRate:   &commRate,
			AgentCommissionAmount: &commAmount,
		}

		if err := tx.Create(&orderProduct).Error; err != nil {
			tx.Rollback()
			return utils.RespApi(c, "ise", "Tidak dapat membuat Order Product", err.Error())
		}
	}

	for _, item := range orderServiceItems {
		var commRate float64
		var commAmount float64

		if cr, ok := commissionMap[*item.ServiceID]; ok {
			commRate = *cr.Rate
			if cr.RateType != nil && *cr.RateType == "fixed" {
				commAmount = *cr.Rate * float64(*item.Qty)
			} else {
				commAmount = *item.Subtotal * (*cr.Rate / 100)
			}
		} else {
			if agent.CommissionRate != nil {
				commRate = *agent.CommissionRate
				commAmount = *item.Subtotal * (*agent.CommissionRate / 100)
			}
		}

		orderService := models.OrderService{
			OrderID:               &order.ID,
			ServiceID:             item.ServiceID,
			Qty:                   item.Qty,
			PriceAtOrder:          item.PriceAtOrder,
			Subtotal:              item.Subtotal,
			Notes:                 item.Notes,
			AgentCommissionRate:   &commRate,
			AgentCommissionAmount: &commAmount,
		}

		if err := tx.Create(&orderService).Error; err != nil {
			tx.Rollback()
			return utils.RespApi(c, "ise", "Tidak dapat membuat Order Service", err.Error())
		}
	}

	xenditInvoiceID, xenditInvoiceURL, err := h.createXenditInvoice(order, orderItems, orderServiceItems)
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

	if err := CreateOrderLog(tx, order.ID, "waiting_payment", GetDefaultReason("waiting_payment"), nil, nil); err != nil {
		tx.Rollback()
		return utils.RespApi(c, "ise", "Gagal membuat order log", err.Error())
	}

	if err := tx.Commit().Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menyimpan data", err.Error())
	}

	h.DB.Preload("OrderProducts.Product").
		Preload("OrderServices.Service").
		First(&order, "id = ?", order.ID)

	return utils.RespApi(c, "ok", "Berhasil membuat data Agent Order", order)
}

func (h *AgentOrderHandler) createXenditInvoice(order models.Order, orderItems []struct {
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
	var items []map[string]interface{}

	for _, item := range orderItems {
		itemName := *item.Product.Title
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

	for _, item := range orderServiceItems {
		items = append(items, map[string]interface{}{
			"name":     *item.Service.Name + " (Service)",
			"quantity": *item.Qty,
			"price":    *item.PriceAtOrder,
		})
	}

	payload := map[string]interface{}{
		"external_id":      order.ID.String(),
		"amount":           *order.TotalBill,
		"description":      fmt.Sprintf("Agent Order %s", *order.OrderNumber),
		"invoice_duration": 86400,
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
