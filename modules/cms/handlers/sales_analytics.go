package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SalesAnalyticsHandler struct {
	DB *gorm.DB
}

func NewSalesAnalyticsHandler(db *gorm.DB) *SalesAnalyticsHandler {
	return &SalesAnalyticsHandler{DB: db}
}

type SuperSalesParams struct {
	StartDate  string `query:"start_date"`
	EndDate    string `query:"end_date"`
	ProductIDs string `query:"product_ids"`
	Sort       string `query:"sort"`
}

type ChartDataItem struct {
	Name         string  `json:"name"`
	Revenue      float64 `json:"revenue"`
	Cost         float64 `json:"cost"`
	Profit       float64 `json:"profit"`
	QuantitySold int     `json:"quantity_sold"`
}

type TopProductItem struct {
	ProductID        *uuid.UUID `json:"product_id"`
	ProductName      string     `json:"product_name"`
	ProductUnit      string     `json:"product_unit"`
	QuantitySold     int        `json:"quantity_sold"`
	TotalRevenue     float64    `json:"total_revenue"`
	AvgSalePrice     float64    `json:"avg_sale_price"`
	TotalCost        float64    `json:"total_cost"`
	AvgPurchasePrice float64    `json:"avg_purchase_price"`
	TotalProfit      float64    `json:"total_profit"`
	ProfitMargin     float64    `json:"profit_margin"`
}

func (h *SalesAnalyticsHandler) GetSuperSales(c *fiber.Ctx) error {
	var params SuperSalesParams
	if err := c.QueryParser(&params); err != nil {
		return utils.RespApi(c, "bad", "Invalid query parameters", err.Error())
	}

	// Validate required parameters
	if params.StartDate == "" || params.EndDate == "" {
		return utils.RespApi(c, "bad", "start_date and end_date are required", nil)
	}

	// Parse dates
	startDate, err := time.Parse("2006-01-02", params.StartDate)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid start_date format. Use YYYY-MM-DD", err.Error())
	}

	endDate, err := time.Parse("2006-01-02", params.EndDate)
	if err != nil {
		return utils.RespApi(c, "bad", "Invalid end_date format. Use YYYY-MM-DD", err.Error())
	}

	// Set end date to end of day
	endDate = endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)

	// Default sort
	if params.Sort == "" {
		params.Sort = "profit_desc"
	}

	var topProducts []TopProductItem
	var totalRevenue, totalCost, totalProfit float64

	// Get all products or filtered products
	var products []models.Product
	query := h.DB.Preload("ProductType")

	if params.ProductIDs != "" {
		productIDs := strings.Split(params.ProductIDs, ",")
		var uuids []uuid.UUID
		for _, id := range productIDs {
			if uid, err := uuid.Parse(strings.TrimSpace(id)); err == nil {
				uuids = append(uuids, uid)
			}
		}
		if len(uuids) > 0 {
			query = query.Where("id IN ?", uuids)
		}
	}

	query.Find(&products)

	for _, product := range products {
		// Calculate revenue and qty sold
		var revenue float64
		var qtySold float64

		if product.TrackingMode != nil && *product.TrackingMode == "individual" {
			// Individual: revenue = SUM(qty × requested_length × price_at_order)
			// qty_sold = SUM(qty × requested_length) in meters
			h.DB.Table("order_products").
				Select("SUM(qty * requested_length * price_at_order) as revenue, SUM(qty * requested_length) as qty_sold").
				Joins("INNER JOIN orders ON order_products.order_id = orders.id").
				Where("orders.status = ?", "finish").
				Where("orders.created_at BETWEEN ? AND ?", startDate, endDate).
				Where("order_products.product_id = ?", product.ID).
				Row().Scan(&revenue, &qtySold)
		} else {
			// Simple: revenue = SUM(qty × price_at_order)
			// qty_sold = SUM(qty)
			h.DB.Table("order_products").
				Select("SUM(qty * price_at_order) as revenue, SUM(qty) as qty_sold").
				Joins("INNER JOIN orders ON order_products.order_id = orders.id").
				Where("orders.status = ?", "finish").
				Where("orders.created_at BETWEEN ? AND ?", startDate, endDate).
				Where("order_products.product_id = ?", product.ID).
				Row().Scan(&revenue, &qtySold)
		}

		if revenue == 0 {
			continue // Skip products with no sales
		}

		// Calculate avg purchase price and cost
		var avgPurchasePrice float64
		var cost float64

		if product.TrackingMode != nil && *product.TrackingMode == "individual" {
			// For individual: AVG(purchase_price / length_per_item)
			var sumPricePerMeter float64
			var countRecords int64

			h.DB.Table("purchase_products").
				Select("SUM(purchase_price / NULLIF(length_per_item, 0)) as sum_price_per_meter, COUNT(*) as count_records").
				Joins("INNER JOIN purchases ON purchase_products.purchase_id = purchases.id").
				Where("purchases.is_clear = ?", true).
				Where("purchase_products.product_id = ?", product.ID).
				Where("purchase_products.length_per_item > 0").
				Row().Scan(&sumPricePerMeter, &countRecords)

			if countRecords > 0 {
				avgPurchasePrice = sumPricePerMeter / float64(countRecords)
				cost = avgPurchasePrice * qtySold // qtySold is in meters
			}
		} else {
			// For simple: AVG(purchase_price) directly
			h.DB.Table("purchase_products").
				Select("AVG(purchase_price) as avg_price").
				Joins("INNER JOIN purchases ON purchase_products.purchase_id = purchases.id").
				Where("purchases.is_clear = ?", true).
				Where("purchase_products.product_id = ?", product.ID).
				Row().Scan(&avgPurchasePrice)

			cost = avgPurchasePrice * qtySold
		}

		profit := revenue - cost
		profitMargin := 0.0
		if revenue > 0 {
			profitMargin = (profit / revenue) * 100
		}

		productName := *product.Title
		productUnit := "qty"
		if product.TrackingMode != nil && *product.TrackingMode == "individual" {
			if product.MeasurementUnit != nil && *product.MeasurementUnit != "" {
				productUnit = *product.MeasurementUnit
			} else {
				productUnit = "meter"
			}
		}

		// Calculate average sale price
		avgSalePrice := 0.0
		if qtySold > 0 {
			avgSalePrice = revenue / qtySold
		}

		topProducts = append(topProducts, TopProductItem{
			ProductID:        &product.ID,
			ProductName:      productName,
			ProductUnit:      productUnit,
			QuantitySold:     int(qtySold),
			TotalRevenue:     revenue,
			AvgSalePrice:     avgSalePrice,
			TotalCost:        cost,
			AvgPurchasePrice: avgPurchasePrice,
			TotalProfit:      profit,
			ProfitMargin:     profitMargin,
		})

		totalRevenue += revenue
		totalCost += cost
		totalProfit += profit
	}

	// Sort data based on sort parameter
	sortFunc := func(i, j int) bool {
		if params.Sort == "profit_asc" {
			return topProducts[i].TotalProfit < topProducts[j].TotalProfit
		}
		return topProducts[i].TotalProfit > topProducts[j].TotalProfit
	}

	// Simple bubble sort
	for i := 0; i < len(topProducts)-1; i++ {
		for j := 0; j < len(topProducts)-i-1; j++ {
			if !sortFunc(j, j+1) {
				topProducts[j], topProducts[j+1] = topProducts[j+1], topProducts[j]
			}
		}
	}

	profitMargin := 0.0
	if totalRevenue > 0 {
		profitMargin = (totalProfit / totalRevenue) * 100
	}

	// Prepare chart data from top products
	chartData := make([]ChartDataItem, 0, len(topProducts))
	for _, item := range topProducts {
		chartData = append(chartData, ChartDataItem{
			Name:         item.ProductName,
			Revenue:      item.TotalRevenue,
			Cost:         item.AvgPurchasePrice * float64(item.QuantitySold),
			Profit:       item.TotalProfit,
			QuantitySold: item.QuantitySold,
		})
	}

	result := fiber.Map{
		"summary": fiber.Map{
			"total_revenue": totalRevenue,
			"total_cost":    totalCost,
			"total_profit":  totalProfit,
			"profit_margin": profitMargin,
		},
		"chart_data":   chartData,
		"top_products": topProducts,
	}

	fmt.Printf("✅ Super sales analytics fetched: %d items\n", len(topProducts))

	return utils.RespApi(c, "ok", "Successfully fetched super sales analytics", result)
}
