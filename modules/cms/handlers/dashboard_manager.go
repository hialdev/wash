package handlers

import (
	authModels "aldev/modules/auth/models"
	"aldev/modules/cms/models"
	"aldev/utils"

	"github.com/gofiber/fiber/v2"
)

// GetManagerDashboard returns aggregated KPI data for manager/owner role
func (h *DashboardHandler) GetManagerDashboard(c *fiber.Ctx) error {
	// --- Revenue: sum of finished orders ---
	var totalRevenue float64
	h.DB.Model(&models.Order{}).Where("status = ?", "finish").
		Select("COALESCE(SUM(total_bill), 0)").Scan(&totalRevenue)

	// --- Expense: sum of raw material purchases (price_purchase × qty) ---
	var totalExpense float64
	h.DB.Model(&models.RawMaterialPurchase{}).
		Select("COALESCE(SUM(price_purchase * qty), 0)").Scan(&totalExpense)

	// --- Total orders ---
	var totalOrders int64
	h.DB.Model(&models.Order{}).Count(&totalOrders)

	// --- Orders by status ---
	var ordersByStatus []struct {
		Status string
		Count  int64
	}
	h.DB.Model(&models.Order{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&ordersByStatus)

	// --- Total employees (non-customer roles) ---
	var totalEmployees int64
	h.DB.Model(&authModels.User{}).
		Joins("JOIN roles ON users.role_id = roles.id").
		Where("LOWER(roles.name) NOT IN ?", []string{"customer", "superadmin"}).
		Count(&totalEmployees)

	// --- Total active services (top-level only) ---
	var totalServices int64
	h.DB.Model(&models.Service{}).Where("is_active = true AND parent_id IS NULL").Count(&totalServices)

	// --- Raw material stock stats ---
	var rmTotal, rmBelow20, rmAbove20 int64
	h.DB.Model(&models.RawMaterial{}).Count(&rmTotal)
	h.DB.Model(&models.RawMaterial{}).Where("current_stock < 20").Count(&rmBelow20)
	h.DB.Model(&models.RawMaterial{}).Where("current_stock >= 20").Count(&rmAbove20)

	// --- Low stock raw materials (for alert) ---
	var lowStockMaterials []models.RawMaterial
	h.DB.Model(&models.RawMaterial{}).
		Where("current_stock < 20").
		Order("current_stock ASC").
		Limit(5).
		Find(&lowStockMaterials)

	// --- Recent 5 orders ---
	var recentOrders []models.Order
	h.DB.Model(&models.Order{}).
		Preload("User").
		Preload("OrderServices.Service").
		Order("created_at DESC").
		Limit(5).
		Find(&recentOrders)

	// --- Recent 10 activity (order log status) ---
	var recentActivity []models.OrderLogStatus
	h.DB.Model(&models.OrderLogStatus{}).
		Order("created_at DESC").
		Limit(10).
		Find(&recentActivity)

	result := fiber.Map{
		"total_revenue":   totalRevenue,
		"total_expense":   totalExpense,
		"net_profit":      totalRevenue - totalExpense,
		"total_orders":    totalOrders,
		"orders_by_status": ordersByStatus,
		"total_employees": totalEmployees,
		"total_services":  totalServices,
		"raw_material": fiber.Map{
			"total":           rmTotal,
			"below_20":        rmBelow20,
			"above_20":        rmAbove20,
			"low_stock_items": lowStockMaterials,
		},
		"recent_orders":   recentOrders,
		"recent_activity": recentActivity,
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan Manager Dashboard", result)
}
