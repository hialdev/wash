package handlers

import (
	"aldev/connection"
	"aldev/modules/cms/models"
	"aldev/utils"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrderLogStatusHandler struct {
	DB *gorm.DB
}

func NewOrderLogStatusHandler(db *gorm.DB) *OrderLogStatusHandler {
	return &OrderLogStatusHandler{DB: db}
}

// GetAllOrderLogStatus - Get all logs for an order
func (h *OrderLogStatusHandler) GetAllOrderLogStatus(c *fiber.Ctx) error {
	orderID := c.Query("order_id", "")

	if orderID == "" {
		return utils.RespApi(c, "bad", "order_id is required", nil)
	}

	// Parse UUID
	id, err := uuid.Parse(orderID)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid order_id", err.Error())
	}

	var logs []models.OrderLogStatus
	if err := h.DB.Where("order_id = ?", id).Order("created_at DESC").Find(&logs).Error; err != nil {
		return utils.RespApi(c, "ise", "Failed to get order logs", err.Error())
	}

	return utils.RespApi(c, "ok", "Successfully retrieved order logs", logs)
}

// Helper function to create order log status
func CreateOrderLog(db *gorm.DB, orderID uuid.UUID, status string, reason string, images []string, createdBy *uuid.UUID) error {
	// Convert images to JSON string
	var imagesJSON *string
	if len(images) > 0 {
		imagesBytes, err := json.Marshal(images)
		if err != nil {
			return err
		}
		imagesStr := string(imagesBytes)
		imagesJSON = &imagesStr
	}

	orderLog := models.OrderLogStatus{
		OrderID:   &orderID,
		Status:    &status,
		Images:    imagesJSON,
		Reason:    &reason,
		CreatedBy: createdBy,
	}

	if err := db.Create(&orderLog).Error; err != nil {
		return err
	}

	// Fetch order details inside the current transaction/session BEFORE spawning the background goroutine.
	// This ensures we get the most up-to-date order fields (weight, bill, pcs, etc.) and preloaded relations.
	var order models.Order
	if err := db.Preload("User").
		Preload("OrderServices").
		Preload("OrderServices.Service").
		Preload("OrderServices.ServiceVariant").
		First(&order, "id = ?", orderID).Error; err != nil {
		log.Printf("WA Notification: Failed to fetch order in main thread: %v", err)
		// We still return nil to not crash the order process if database query fails here
		return nil
	}

	// Trigger WA notification in background, passing the pre-loaded order
	go func(order models.Order) {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("WA Notification: panic in background goroutine: %v", r)
			}
		}()

		log.Printf("WA Notification: Starting background job for order ID: %s, status: %s", order.ID, status)

		if order.PhoneReceiver == nil || *order.PhoneReceiver == "" {
			log.Printf("WA Notification: PhoneReceiver is empty/nil for order %s, skipping", order.ID)
			return
		}

		orderNum := ""
		if order.OrderNumber != nil {
			orderNum = *order.OrderNumber
		}

		rawPhone := *order.PhoneReceiver
		formattedPhone := rawPhone
		
		// Clean and format phone number for logging and display
		// Ensure 08 starts with +628
		if strings.HasPrefix(rawPhone, "08") {
			formattedPhone = "+628" + rawPhone[2:]
			log.Printf("WA Notification: Phone parser matched prefix '08', converting %s -> %s", rawPhone, formattedPhone)
		} else if strings.HasPrefix(rawPhone, "0") {
			formattedPhone = "+62" + rawPhone[1:]
			log.Printf("WA Notification: Phone parser matched prefix '0', converting %s -> %s", rawPhone, formattedPhone)
		} else if strings.HasPrefix(rawPhone, "62") {
			formattedPhone = "+" + rawPhone
			log.Printf("WA Notification: Phone parser matched prefix '62', converting %s -> %s", rawPhone, formattedPhone)
		} else if strings.HasPrefix(rawPhone, "+62") {
			formattedPhone = rawPhone
			log.Printf("WA Notification: Phone parser matched prefix '+62', keeping %s -> %s", rawPhone, formattedPhone)
		} else {
			formattedPhone = "+62" + rawPhone
			log.Printf("WA Notification: Phone parser matched fallback, prefixing with +62: %s -> %s", rawPhone, formattedPhone)
		}

		log.Printf("WA Notification: Prepared order %s successfully for status %s. Raw Phone: %s -> Formatted: %s", orderNum, status, rawPhone, formattedPhone)

		var message string
		catalogURL := strings.Replace(os.Getenv("VERIFY_URL"), "/auth/verify", "/catalog", 1)
		baseURL := strings.Replace(os.Getenv("VERIFY_URL"), "/auth/verify", "", 1)
		baseURL = strings.TrimSuffix(baseURL, "/")

		switch status {
		case "pickup":
			customerName := "Pelanggan"
			if order.User != nil && order.User.Name != nil {
				customerName = *order.User.Name
			}
			phone := ""
			if order.PhoneReceiver != nil {
				phone = *order.PhoneReceiver
			}
			address := ""
			if order.AddressReceiver != nil {
				address = *order.AddressReceiver
			}

			message = fmt.Sprintf(
				"Halo! Pesanan penjemputan laundry Anda dengan nomor *%s* telah dibuat. Kurir kami akan segera menjemput pakaian Anda. Terima kasih!\n\n"+
					"*Data Customer:*\n"+
					"- Nama: %s\n"+
					"- No. Telepon: %s\n"+
					"- Alamat Penjemputan: %s",
				orderNum, customerName, phone, address,
			)

		case "calculating":
			message = fmt.Sprintf(
				"Halo! Pakaian Anda untuk pesanan *%s* telah kami terima di toko dan sedang dalam proses penimbangan & detailing.\n\n"+
					"Silakan klik link berikut untuk melihat katalog layanan kami:\n%s\n\n"+
					"Jika Anda belum memilih layanan, silakan mulai memilih layanan yang tersedia melalui link di atas. Terima kasih!",
				orderNum, catalogURL,
			)

		case "waiting_payment":
			// Detail penimbangan (pcs)
			detailingText := ""
			if order.TotalPcs != nil {
				detailingText += fmt.Sprintf("- Total: %d pcs\n", *order.TotalPcs)
			}
			if order.WeightKg != nil {
				detailingText += fmt.Sprintf("- Berat: %.2f kg\n", *order.WeightKg)
			}
			
			pcsItems := []struct {
				name string
				val  *int
			}{
				{"Baju", order.BajuPcs},
				{"Celana", order.CelanaPcs},
				{"Selimut", order.SelimutPcs},
				{"Sprei", order.SpreiPcs},
				{"Sempak", order.SempakPcs},
				{"Bra", order.BraPcs},
				{"Lainnya", order.LainnyaPcs},
			}
			hasPcs := false
			for _, item := range pcsItems {
				if item.val != nil && *item.val > 0 {
					if !hasPcs {
						detailingText += "  Detail Pcs:\n"
						hasPcs = true
					}
					detailingText += fmt.Sprintf("  • %s: %d pcs\n", item.name, *item.val)
				}
			}
			detailingText = strings.TrimSuffix(detailingText, "\n")

			// Layanan yang dipilih (already preloaded)
			servicesText := ""
			for _, os := range order.OrderServices {
				name := ""
				if os.Service != nil {
					name = *os.Service.Name
				}
				if os.ServiceVariant != nil {
					name = fmt.Sprintf("%s (%s)", name, *os.ServiceVariant.Name)
				}
				qty := 0.0
				if os.Qty != nil {
					qty = *os.Qty
				}
				subtotal := 0.0
				if os.Subtotal != nil {
					subtotal = *os.Subtotal
				}
				servicesText += fmt.Sprintf("- %s x %.2f = Rp %s\n", name, qty, fmt.Sprintf("%.0f", subtotal))
			}
			servicesText = strings.TrimSuffix(servicesText, "\n")

			bill := 0.0
			if order.TotalBill != nil {
				bill = *order.TotalBill
			}

			// Foto Penimbangan
			photoURL := ""
			var weighingImages []string
			if order.WeighingImages != nil && *order.WeighingImages != "" {
				json.Unmarshal([]byte(*order.WeighingImages), &weighingImages)
			}
			if len(weighingImages) > 0 {
				photoURL = fmt.Sprintf("%s/%s", baseURL, weighingImages[0])
			}

			message = fmt.Sprintf(
				"Halo! Proses penimbangan pesanan laundry *%s* Anda telah selesai.\n\n"+
					"*Detail Penimbangan:*\n%s\n\n"+
					"*Layanan yang Dipilih:*\n%s\n\n"+
					"*Total Tagihan:* Rp %s\n\n"+
					"Silakan klik link berikut untuk melihat katalog layanan:\n%s\n\n"+
					"Silakan lakukan pembayaran melalui aplikasi agar pesanan Anda dapat segera kami proses. Terima kasih!",
				orderNum, detailingText, servicesText, fmt.Sprintf("%.0f", bill), catalogURL,
			)

			if photoURL != "" {
				message += fmt.Sprintf("\n\n*Foto Penimbangan:*\n%s", photoURL)
			}

		case "on_progress":
			message = fmt.Sprintf("Halo! Pembayaran untuk pesanan *%s* telah kami terima. Pakaian Anda saat ini sedang masuk ke dalam proses pencucian. Kami akan menginfokan kembali jika sudah selesai. Terima kasih!", orderNum)

		case "waiting_finish":
			// Foto Packing
			photoURL := ""
			var packingImages []string
			if order.PackingImages != nil && *order.PackingImages != "" {
				json.Unmarshal([]byte(*order.PackingImages), &packingImages)
			}
			if len(packingImages) > 0 {
				photoURL = fmt.Sprintf("%s/%s", baseURL, packingImages[0])
			}

			message = fmt.Sprintf("Halo! Pesanan laundry *%s* Anda telah selesai diproses dan dipacking dengan rapi. Pesanan siap untuk diambil di toko atau diantar ke rumah Anda. Terima kasih!", orderNum)
			if photoURL != "" {
				message += fmt.Sprintf("\n\n*Foto Packing:*\n%s", photoURL)
			}

		case "delivering":
			courierName := "-"
			if order.DeliveryName != nil && *order.DeliveryName != "" {
				courierName = *order.DeliveryName
			}
			courierPhone := "-"
			if order.DeliveryPhone != nil && *order.DeliveryPhone != "" {
				courierPhone = *order.DeliveryPhone
			}
			destAddress := ""
			if order.DeliveryAddress != nil && *order.DeliveryAddress != "" {
				destAddress = *order.DeliveryAddress
			} else if order.AddressReceiver != nil {
				destAddress = *order.AddressReceiver
			}

			message = fmt.Sprintf(
				"Halo! Pesanan laundry *%s* Anda saat ini sedang dalam proses pengantaran oleh kurir kami ke alamat tujuan.\n\n"+
					"*Informasi Pengantaran:*\n"+
					"- Nama Kurir: %s\n"+
					"- HP Kurir: %s\n"+
					"- Alamat Tujuan: %s\n\n"+
					"Mohon ditunggu ya. Terima kasih!",
				orderNum, courierName, courierPhone, destAddress,
			)

		case "finish":
			// Layanan yang diambil (already preloaded)
			servicesText := ""
			for _, os := range order.OrderServices {
				name := ""
				if os.Service != nil {
					name = *os.Service.Name
				}
				if os.ServiceVariant != nil {
					name = fmt.Sprintf("%s (%s)", name, *os.ServiceVariant.Name)
				}
				qty := 0.0
				if os.Qty != nil {
					qty = *os.Qty
				}
				servicesText += fmt.Sprintf("- %s x %.2f\n", name, qty)
			}
			servicesText = strings.TrimSuffix(servicesText, "\n")

			bill := 0.0
			if order.TotalBill != nil {
				bill = *order.TotalBill
			}

			message = fmt.Sprintf(
				"Halo! Pesanan laundry *%s* Anda telah berhasil diterima/diselesaikan. Terima kasih telah mempercayai layanan kami! 🙏😊\n\n"+
					"*Layanan yang Diambil:*\n%s\n\n"+
					"*Total Tagihan Terbayar:* Rp %s",
				orderNum, servicesText, fmt.Sprintf("%.0f", bill),
			)

		default:
			return
		}

		// 3. Send message
		log.Printf("WA Notification: Checking if WhatsApp client is connected...")
		if connection.IsConnected() {
			log.Printf("WA Notification: WhatsApp client is CONNECTED. Sending message to %s...", formattedPhone)
			err := connection.SendMessageWithRetry(*order.PhoneReceiver, message, 3)
			if err != nil {
				log.Printf("WA Notification: ERROR! Failed to send message to %s: %v", formattedPhone, err)
			} else {
				log.Printf("WA Notification: SUCCESS! Successfully sent message to %s for status: %s", formattedPhone, status)
			}
		} else {
			log.Printf("WA Notification: WARNING! WhatsApp client is NOT connected. Skipping status notification for order %s to %s", orderNum, formattedPhone)
		}
	}(order)

	return nil
}

// GetDefaultReason returns default reason for each status
func GetDefaultReason(status string) string {
	defaultReasons := map[string]string{
		"pickup":          "Pesanan dibuat, menunggu penjemputan pakaian",
		"calculating":     "Pakaian diterima, sedang dilakukan penimbangan",
		"waiting_payment": "Orderan dibuat",
		"stock_issue":     "Pembayaran diterima namun stock tidak mencukupi salah satu / seluruh product",
		"refund_pending":  "Mengajukan refund, menunggu refund dari admin",
		"waiting_restock": "Menunggu restock dari admin",
		"refunded":        "Admin berhasil refund",
		"on_progress":     "Pesanan sedang disiapkan dan diproses",
		"waiting_finish":  "Pesanan siap, menunggu pengambilan/pengantaran",
		"delivering":      "Pesanan sedang dalam pengantaran",
		"canceled":        "Pesanan dibatalkan",
		"finish":          "Pesanan telah selesai, terimakasih telah mempercayai kami",
	}

	if reason, ok := defaultReasons[status]; ok {
		return reason
	}
	return "Status updated"
}
