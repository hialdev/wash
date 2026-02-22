package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jung-kurt/gofpdf" // Using gofpdf for PDF generation
	"gorm.io/gorm"
)

type FinanceReportHandler struct {
	DB *gorm.DB
}

func NewFinanceReportHandler(db *gorm.DB) *FinanceReportHandler {
	return &FinanceReportHandler{DB: db}
}

type FinanceSummary struct {
	TotalIncome  float64 `json:"total_income"`
	TotalExpense float64 `json:"total_expense"`
	NetProfit    float64 `json:"net_profit"`

	IncomeBreakdown struct {
		Sales        float64 `json:"sales"`
		ManualIncome float64 `json:"manual_income"`
	} `json:"income_breakdown"`

	ExpenseBreakdown struct {
		RawMaterialPurchase float64 `json:"raw_material_purchase"`
		ProductPurchase     float64 `json:"product_purchase"`
		ManualExpense       float64 `json:"manual_expense"`
	} `json:"expense_breakdown"`
}

func (h *FinanceReportHandler) GetSummaryReport(c *fiber.Ctx) error {
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate == "" || endDate == "" {
		now := time.Now()
		startDate = now.Format("2006-01-01")
		endDate = now.Format("2006-01-02")
	}

	// Append time to cover the full day
	queryStartDate := fmt.Sprintf("%s 00:00:00", startDate)
	queryEndDate := fmt.Sprintf("%s 23:59:59", endDate)

	var summary FinanceSummary

	// 1. Calculate Sales (Orders with status 'finish')
	h.DB.Model(&models.Order{}).
		Where("status = ? AND created_at BETWEEN ? AND ?", "finish", queryStartDate, queryEndDate).
		Select("COALESCE(SUM(total_bill), 0)").
		Scan(&summary.IncomeBreakdown.Sales)

	// 2. Calculate Manual Income (Journals with type 'income')
	h.DB.Model(&models.Journal{}).
		Where("trx_type = ? AND trx_date BETWEEN ? AND ?", "income", queryStartDate, queryEndDate).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&summary.IncomeBreakdown.ManualIncome)

	summary.TotalIncome = summary.IncomeBreakdown.Sales + summary.IncomeBreakdown.ManualIncome

	// 3. Calculate Raw Material Purchase
	// Note: Assuming purchase_date is the relevant date
	h.DB.Model(&models.RawMaterialPurchase{}).
		Where("purchase_date BETWEEN ? AND ?", queryStartDate, queryEndDate).
		Select("COALESCE(SUM(price_purchase * qty), 0)").
		Scan(&summary.ExpenseBreakdown.RawMaterialPurchase)

	// 4. Calculate Product Purchase (Principal)
	// Only count finalized purchases (is_clear = true)
	h.DB.Model(&models.Purchase{}).
		Where("is_clear = ? AND purchase_date BETWEEN ? AND ?", true, queryStartDate, queryEndDate).
		Select("COALESCE(SUM(total_price), 0)").
		Scan(&summary.ExpenseBreakdown.ProductPurchase)

	// 5. Calculate Manual Expense (Journals with type 'expense')
	h.DB.Model(&models.Journal{}).
		Where("trx_type = ? AND trx_date BETWEEN ? AND ?", "expense", queryStartDate, queryEndDate).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&summary.ExpenseBreakdown.ManualExpense)

	summary.TotalExpense = summary.ExpenseBreakdown.RawMaterialPurchase + summary.ExpenseBreakdown.ProductPurchase + summary.ExpenseBreakdown.ManualExpense
	summary.NetProfit = summary.TotalIncome - summary.TotalExpense

	return utils.RespApi(c, "ok", "Success", summary)
}

func (h *FinanceReportHandler) ExportReportPDF(c *fiber.Ctx) error {
	// Simple PDF generation logic
	summary := FinanceSummary{}

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate == "" || endDate == "" {
		now := time.Now()
		startDate = now.Format("2006-01-01")
		endDate = now.Format("2006-01-02")
	}

	// Append time to cover the full day
	queryStartDate := fmt.Sprintf("%s 00:00:00", startDate)
	queryEndDate := fmt.Sprintf("%s 23:59:59", endDate)

	// Recalculate for PDF
	h.DB.Model(&models.Order{}).Where("status = ? AND created_at BETWEEN ? AND ?", "finish", queryStartDate, queryEndDate).Select("COALESCE(SUM(total_bill), 0)").Scan(&summary.IncomeBreakdown.Sales)
	h.DB.Model(&models.Journal{}).Where("trx_type = ? AND trx_date BETWEEN ? AND ?", "income", queryStartDate, queryEndDate).Select("COALESCE(SUM(amount), 0)").Scan(&summary.IncomeBreakdown.ManualIncome)
	summary.TotalIncome = summary.IncomeBreakdown.Sales + summary.IncomeBreakdown.ManualIncome

	h.DB.Model(&models.RawMaterialPurchase{}).Where("purchase_date BETWEEN ? AND ?", queryStartDate, queryEndDate).Select("COALESCE(SUM(price_purchase * qty), 0)").Scan(&summary.ExpenseBreakdown.RawMaterialPurchase)
	h.DB.Model(&models.Purchase{}).Where("is_clear = ? AND purchase_date BETWEEN ? AND ?", true, queryStartDate, queryEndDate).Select("COALESCE(SUM(total_price), 0)").Scan(&summary.ExpenseBreakdown.ProductPurchase)
	h.DB.Model(&models.Journal{}).Where("trx_type = ? AND trx_date BETWEEN ? AND ?", "expense", queryStartDate, queryEndDate).Select("COALESCE(SUM(amount), 0)").Scan(&summary.ExpenseBreakdown.ManualExpense)
	summary.TotalExpense = summary.ExpenseBreakdown.RawMaterialPurchase + summary.ExpenseBreakdown.ProductPurchase + summary.ExpenseBreakdown.ManualExpense
	summary.NetProfit = summary.TotalIncome - summary.TotalExpense

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(40, 10, "Finance Report")
	pdf.Ln(10)
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(40, 10, fmt.Sprintf("Period: %s - %s", startDate, endDate))
	pdf.Ln(20)

	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(40, 10, "Summary")
	pdf.Ln(10)

	pdf.SetFont("Arial", "", 12)
	pdf.Cell(100, 10, fmt.Sprintf("Total Income: %.2f", summary.TotalIncome))
	pdf.Ln(8)
	pdf.Cell(100, 10, fmt.Sprintf("Total Expense: %.2f", summary.TotalExpense))
	pdf.Ln(8)
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(100, 10, fmt.Sprintf("Net Profit: %.2f", summary.NetProfit))
	pdf.Ln(20)

	// Details
	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(40, 10, "Income Details")
	pdf.Ln(10)
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(100, 10, fmt.Sprintf("Sales (Orders): %.2f", summary.IncomeBreakdown.Sales))
	pdf.Ln(8)
	pdf.Cell(100, 10, fmt.Sprintf("Manual Income (Journals): %.2f", summary.IncomeBreakdown.ManualIncome))
	pdf.Ln(15)

	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(40, 10, "Expense Details")
	pdf.Ln(10)
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(100, 10, fmt.Sprintf("Raw Material Purchase: %.2f", summary.ExpenseBreakdown.RawMaterialPurchase))
	pdf.Ln(8)
	pdf.Cell(100, 10, fmt.Sprintf("Product Purchase (Principal): %.2f", summary.ExpenseBreakdown.ProductPurchase))
	pdf.Ln(8)
	pdf.Cell(100, 10, fmt.Sprintf("Manual Expense (Journals): %.2f", summary.ExpenseBreakdown.ManualExpense))

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=finance_report_%s.pdf", startDate))

	return pdf.Output(c.Response().BodyWriter())
}
