package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type FinanceAgentHandler struct {
	DB *gorm.DB
}

func NewFinanceAgentHandler(db *gorm.DB) *FinanceAgentHandler {
	return &FinanceAgentHandler{DB: db}
}

type AgentReportData struct {
	AgentID        string  `json:"agent_id"`
	AgentName      string  `json:"agent_name"`
	AgentCode      string  `json:"agent_code"`
	TotalOrders    int     `json:"total_orders"`
	TotalSales     float64 `json:"total_sales"`
	TotalCommission float64 `json:"total_commission"`
}

func (h *FinanceAgentHandler) GetAgentFinanceReport(c *fiber.Ctx) error {
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	agentID := c.Query("agent_id")

	query := h.DB.Model(&models.Order{}).
		Joins("LEFT JOIN agents ON agents.id = orders.agent_id").
		Where("orders.is_agent_order = ?", true).
		Where("orders.status = ?", "finished")

	if startDate != "" && endDate != "" {
		query = query.Where("orders.created_at BETWEEN ? AND ?", startDate, endDate)
	}

	if agentID != "" {
		query = query.Where("orders.agent_id = ?", agentID)
	}

	var orders []models.Order
	if err := query.Preload("Agent").Find(&orders).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data report finance agent", err.Error())
	}

	// Aggregate data
	reportMap := make(map[string]*AgentReportData)
	var grandTotalSales float64
	var grandTotalCommission float64

	for _, order := range orders {
		if order.Agent == nil {
			continue
		}
		aID := order.Agent.ID.String()

		if _, exists := reportMap[aID]; !exists {
			reportMap[aID] = &AgentReportData{
				AgentID:   aID,
				AgentName: *order.Agent.Name,
				AgentCode: *order.Agent.Code,
			}
		}

		bill := 0.0
		if order.TotalBill != nil {
			bill = *order.TotalBill
		}

		commRate := 0.0
		if order.Agent.CommissionRate != nil {
			commRate = *order.Agent.CommissionRate
		}

		commission := (bill * commRate) / 100

		reportMap[aID].TotalOrders++
		reportMap[aID].TotalSales += bill
		reportMap[aID].TotalCommission += commission

		grandTotalSales += bill
		grandTotalCommission += commission
	}

	var reportList []AgentReportData
	for _, v := range reportMap {
		reportList = append(reportList, *v)
	}

	responseData := fiber.Map{
		"reports":                reportList,
		"grand_total_sales":      grandTotalSales,
		"grand_total_commission": grandTotalCommission,
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan report finance agent", responseData)
}
