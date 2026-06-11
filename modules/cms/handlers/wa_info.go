package handlers

import (
	"aldev/connection"
	"aldev/utils"

	"github.com/gofiber/fiber/v2"
)

// GetWAInfo — GET /api/wa-info
// Public endpoint: returns the connected WhatsApp admin phone number
// so the frontend catalog page can build a wa.me link.
func GetWAInfo(c *fiber.Ctx) error {
	if !connection.IsConnected() {
		return utils.RespApi(c, "ok", "WhatsApp not connected", fiber.Map{
			"connected": false,
			"phone":     "",
		})
	}

	phone := connection.GetUserID()

	return utils.RespApi(c, "ok", "WhatsApp connected", fiber.Map{
		"connected": true,
		"phone":     phone,
	})
}
