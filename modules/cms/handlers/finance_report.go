package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"encoding/csv"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jung-kurt/gofpdf" // Using gofpdf for PDF generation
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

func formatRupiah(val float64) string {
	str := fmt.Sprintf("%.0f", val)
	prefix := ""
	if val < 0 {
		prefix = "-"
		str = str[1:]
	}
	var out []rune
	runes := []rune(str)
	length := len(runes)
	for i, r := range runes {
		if i > 0 && (length-i)%3 == 0 {
			out = append(out, '.')
		}
		out = append(out, r)
	}
	return prefix + "Rp " + string(out)
}

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
	summary := FinanceSummary{}
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate == "" || endDate == "" {
		now := time.Now()
		startDate = now.Format("2006-01-01")
		endDate = now.Format("2006-01-02")
	}

	queryStartDate := fmt.Sprintf("%s 00:00:00", startDate)
	queryEndDate := fmt.Sprintf("%s 23:59:59", endDate)

	// Recalculate
	h.DB.Model(&models.Order{}).Where("status = ? AND created_at BETWEEN ? AND ?", "finish", queryStartDate, queryEndDate).Select("COALESCE(SUM(total_bill), 0)").Scan(&summary.IncomeBreakdown.Sales)
	h.DB.Model(&models.Journal{}).Where("trx_type = ? AND trx_date BETWEEN ? AND ?", "income", queryStartDate, queryEndDate).Select("COALESCE(SUM(amount), 0)").Scan(&summary.IncomeBreakdown.ManualIncome)
	summary.TotalIncome = summary.IncomeBreakdown.Sales + summary.IncomeBreakdown.ManualIncome

	h.DB.Model(&models.RawMaterialPurchase{}).Where("purchase_date BETWEEN ? AND ?", queryStartDate, queryEndDate).Select("COALESCE(SUM(price_purchase * qty), 0)").Scan(&summary.ExpenseBreakdown.RawMaterialPurchase)
	h.DB.Model(&models.Purchase{}).Where("is_clear = ? AND purchase_date BETWEEN ? AND ?", true, queryStartDate, queryEndDate).Select("COALESCE(SUM(total_price), 0)").Scan(&summary.ExpenseBreakdown.ProductPurchase)
	h.DB.Model(&models.Journal{}).Where("trx_type = ? AND trx_date BETWEEN ? AND ?", "expense", queryStartDate, queryEndDate).Select("COALESCE(SUM(amount), 0)").Scan(&summary.ExpenseBreakdown.ManualExpense)
	summary.TotalExpense = summary.ExpenseBreakdown.RawMaterialPurchase + summary.ExpenseBreakdown.ProductPurchase + summary.ExpenseBreakdown.ManualExpense
	summary.NetProfit = summary.TotalIncome - summary.TotalExpense

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// 1. HEADER
	pdf.SetFont("Arial", "B", 18)
	pdf.SetTextColor(44, 62, 80)
	pdf.CellFormat(0, 10, "LAPORAN KEUANGAN", "", 0, "C", false, 0, "")
	pdf.Ln(8)
	
	pdf.SetFont("Arial", "", 11)
	pdf.SetTextColor(127, 140, 141)
	pdf.CellFormat(0, 8, fmt.Sprintf("Periode: %s s/d %s", startDate, endDate), "", 0, "C", false, 0, "")
	pdf.Ln(15)

	// Utility drawing parameters
	w := []float64{120, 60}
	
	drawTableHeader := func(title string) {
		pdf.SetFont("Arial", "B", 11)
		pdf.SetTextColor(44, 62, 80)
		pdf.Cell(0, 8, title)
		pdf.Ln(8)
		
		pdf.SetFillColor(245, 247, 250)
		pdf.SetTextColor(44, 62, 80)
		pdf.SetDrawColor(200, 210, 220)
		pdf.SetLineWidth(0.2)
		pdf.SetFont("Arial", "B", 10)
		pdf.CellFormat(w[0], 9, " Deskripsi", "1", 0, "L", true, 0, "")
		pdf.CellFormat(w[1], 9, "Jumlah ", "1", 0, "R", true, 0, "")
		pdf.Ln(-1)
	}

	drawTableRow := func(desc string, amount float64, isBold bool, isNegative bool) {
		if isBold {
			pdf.SetFont("Arial", "B", 10)
			pdf.SetTextColor(44, 62, 80)
		} else {
			pdf.SetFont("Arial", "", 10)
			pdf.SetTextColor(80, 90, 100)
		}
		
		amountStr := formatRupiah(amount)
		if isNegative && amount > 0 {
			amountStr = "(" + amountStr + ")"
			pdf.SetTextColor(231, 76, 60)
		}
		
		pdf.CellFormat(w[0], 9, " "+desc, "1", 0, "L", false, 0, "")
		pdf.CellFormat(w[1], 9, amountStr+" ", "1", 0, "R", false, 0, "")
		pdf.Ln(-1)
	}

	// 2. SECTION: RINGKASAN UTAMA
	drawTableHeader("RINGKASAN UTAMA")
	drawTableRow("Total Pendapatan", summary.TotalIncome, false, false)
	drawTableRow("Total Pengeluaran", summary.TotalExpense, false, true)
	
	pdf.SetFont("Arial", "B", 11)
	if summary.NetProfit >= 0 {
		pdf.SetTextColor(39, 174, 96)
	} else {
		pdf.SetTextColor(231, 76, 60)
	}
	pdf.SetFillColor(245, 250, 245)
	pdf.CellFormat(w[0], 10, " Laba Bersih (Net Profit)", "1", 0, "L", true, 0, "")
	pdf.CellFormat(w[1], 10, formatRupiah(summary.NetProfit)+" ", "1", 0, "R", true, 0, "")
	pdf.Ln(15)

	// 3. SECTION: RINCIAN PENDAPATAN
	drawTableHeader("RINCIAN PENDAPATAN")
	drawTableRow("Penjualan (Pesanan Selesai)", summary.IncomeBreakdown.Sales, false, false)
	drawTableRow("Pemasukan Manual (Jurnal)", summary.IncomeBreakdown.ManualIncome, false, false)
	
	pdf.SetFont("Arial", "B", 10)
	pdf.SetTextColor(44, 62, 80)
	pdf.SetFillColor(245, 247, 250)
	pdf.CellFormat(w[0], 9, " Total Pendapatan", "1", 0, "L", true, 0, "")
	pdf.CellFormat(w[1], 9, formatRupiah(summary.TotalIncome)+" ", "1", 0, "R", true, 0, "")
	pdf.Ln(15)

	// 4. SECTION: RINCIAN PENGELUARAN
	drawTableHeader("RINCIAN PENGELUARAN")
	drawTableRow("Pembelian Bahan Baku (Raw Materials)", summary.ExpenseBreakdown.RawMaterialPurchase, false, false)
	drawTableRow("Pembelian Produk (Principal)", summary.ExpenseBreakdown.ProductPurchase, false, false)
	drawTableRow("Pengeluaran Manual (Jurnal)", summary.ExpenseBreakdown.ManualExpense, false, false)
	
	pdf.SetFont("Arial", "B", 10)
	pdf.SetTextColor(44, 62, 80)
	pdf.SetFillColor(245, 247, 250)
	pdf.CellFormat(w[0], 9, " Total Pengeluaran", "1", 0, "L", true, 0, "")
	pdf.CellFormat(w[1], 9, formatRupiah(summary.TotalExpense)+" ", "1", 0, "R", true, 0, "")
	pdf.Ln(25)

	// Footer Timestamp
	pdf.SetFont("Arial", "I", 8)
	pdf.SetTextColor(150, 150, 150)
	pdf.CellFormat(0, 8, fmt.Sprintf("Laporan ini dibuat otomatis pada %s", time.Now().Format("02 Jan 2006, 15:04:05")), "", 0, "C", false, 0, "")

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=finance_report_%s.pdf", startDate))

	return pdf.Output(c.Response().BodyWriter())
}

func (h *FinanceReportHandler) ExportReportExcel(c *fiber.Ctx) error {
	summary := FinanceSummary{}
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate == "" || endDate == "" {
		now := time.Now()
		startDate = now.Format("2006-01-01")
		endDate = now.Format("2006-01-02")
	}

	queryStartDate := fmt.Sprintf("%s 00:00:00", startDate)
	queryEndDate := fmt.Sprintf("%s 23:59:59", endDate)

	// Recalculate
	h.DB.Model(&models.Order{}).Where("status = ? AND created_at BETWEEN ? AND ?", "finish", queryStartDate, queryEndDate).Select("COALESCE(SUM(total_bill), 0)").Scan(&summary.IncomeBreakdown.Sales)
	h.DB.Model(&models.Journal{}).Where("trx_type = ? AND trx_date BETWEEN ? AND ?", "income", queryStartDate, queryEndDate).Select("COALESCE(SUM(amount), 0)").Scan(&summary.IncomeBreakdown.ManualIncome)
	summary.TotalIncome = summary.IncomeBreakdown.Sales + summary.IncomeBreakdown.ManualIncome

	h.DB.Model(&models.RawMaterialPurchase{}).Where("purchase_date BETWEEN ? AND ?", queryStartDate, queryEndDate).Select("COALESCE(SUM(price_purchase * qty), 0)").Scan(&summary.ExpenseBreakdown.RawMaterialPurchase)
	h.DB.Model(&models.Purchase{}).Where("is_clear = ? AND purchase_date BETWEEN ? AND ?", true, queryStartDate, queryEndDate).Select("COALESCE(SUM(total_price), 0)").Scan(&summary.ExpenseBreakdown.ProductPurchase)
	h.DB.Model(&models.Journal{}).Where("trx_type = ? AND trx_date BETWEEN ? AND ?", "expense", queryStartDate, queryEndDate).Select("COALESCE(SUM(amount), 0)").Scan(&summary.ExpenseBreakdown.ManualExpense)
	summary.TotalExpense = summary.ExpenseBreakdown.RawMaterialPurchase + summary.ExpenseBreakdown.ProductPurchase + summary.ExpenseBreakdown.ManualExpense
	summary.NetProfit = summary.TotalIncome - summary.TotalExpense

	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			fmt.Println(err)
		}
	}()

	sheet := "Finance Report"
	f.SetSheetName("Sheet1", sheet)

	// Set Titles
	f.SetCellValue(sheet, "A1", "FINANCE REPORT")
	f.SetCellValue(sheet, "A2", fmt.Sprintf("Period: %s - %s", startDate, endDate))

	// Styles
	styleTitle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Size: 16}})
	f.SetCellStyle(sheet, "A1", "A1", styleTitle)

	styleHeader, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"E0E0E0"}, Pattern: 1},
	})
	styleBold, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})

	customFmtStr := "\"Rp\"#,##0"
	styleCurrency, _ := f.NewStyle(&excelize.Style{
		CustomNumFmt: &customFmtStr,
	})
	styleCurrencyBold, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		CustomNumFmt: &customFmtStr,
	})

	// Summary Section
	f.SetCellValue(sheet, "A4", "SUMMARY")
	f.SetCellStyle(sheet, "A4", "A4", styleBold)
	
	f.SetCellValue(sheet, "A5", "Description")
	f.SetCellValue(sheet, "B5", "Amount")
	f.SetCellStyle(sheet, "A5", "B5", styleHeader)

	f.SetCellValue(sheet, "A6", "Total Income")
	f.SetCellValue(sheet, "B6", summary.TotalIncome)
	f.SetCellValue(sheet, "A7", "Total Expense")
	f.SetCellValue(sheet, "B7", summary.TotalExpense)
	f.SetCellValue(sheet, "A8", "Net Profit")
	f.SetCellValue(sheet, "B8", summary.NetProfit)
	
	// Apply Currency Styles
	f.SetCellStyle(sheet, "B6", "B7", styleCurrency)
	f.SetCellStyle(sheet, "A8", "A8", styleBold)
	f.SetCellStyle(sheet, "B8", "B8", styleCurrencyBold)

	// Breakdown Income Section
	f.SetCellValue(sheet, "A10", "INCOME BREAKDOWN")
	f.SetCellStyle(sheet, "A10", "A10", styleBold)
	
	f.SetCellValue(sheet, "A11", "Source")
	f.SetCellValue(sheet, "B11", "Amount")
	f.SetCellStyle(sheet, "A11", "B11", styleHeader)

	f.SetCellValue(sheet, "A12", "Sales (Orders)")
	f.SetCellValue(sheet, "B12", summary.IncomeBreakdown.Sales)
	f.SetCellValue(sheet, "A13", "Manual Income (Journals)")
	f.SetCellValue(sheet, "B13", summary.IncomeBreakdown.ManualIncome)
	
	f.SetCellStyle(sheet, "B12", "B13", styleCurrency)

	// Breakdown Expense Section
	f.SetCellValue(sheet, "A15", "EXPENSE BREAKDOWN")
	f.SetCellStyle(sheet, "A15", "A15", styleBold)
	
	f.SetCellValue(sheet, "A16", "Source")
	f.SetCellValue(sheet, "B16", "Amount")
	f.SetCellStyle(sheet, "A16", "B16", styleHeader)

	f.SetCellValue(sheet, "A17", "Raw Material Purchase")
	f.SetCellValue(sheet, "B17", summary.ExpenseBreakdown.RawMaterialPurchase)
	f.SetCellValue(sheet, "A18", "Product Purchase (Principal)")
	f.SetCellValue(sheet, "B18", summary.ExpenseBreakdown.ProductPurchase)
	f.SetCellValue(sheet, "A19", "Manual Expense (Journals)")
	f.SetCellValue(sheet, "B19", summary.ExpenseBreakdown.ManualExpense)
	
	f.SetCellStyle(sheet, "B17", "B19", styleCurrency)

	f.SetColWidth(sheet, "A", "A", 30)
	f.SetColWidth(sheet, "B", "B", 25)

	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=finance_report_%s_%s.xlsx", startDate, endDate))

	return f.Write(c.Response().BodyWriter())
}

func (h *FinanceReportHandler) ExportReportCSV(c *fiber.Ctx) error {
	summary := FinanceSummary{}
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate == "" || endDate == "" {
		now := time.Now()
		startDate = now.Format("2006-01-01")
		endDate = now.Format("2006-01-02")
	}

	queryStartDate := fmt.Sprintf("%s 00:00:00", startDate)
	queryEndDate := fmt.Sprintf("%s 23:59:59", endDate)

	// Recalculate
	h.DB.Model(&models.Order{}).Where("status = ? AND created_at BETWEEN ? AND ?", "finish", queryStartDate, queryEndDate).Select("COALESCE(SUM(total_bill), 0)").Scan(&summary.IncomeBreakdown.Sales)
	h.DB.Model(&models.Journal{}).Where("trx_type = ? AND trx_date BETWEEN ? AND ?", "income", queryStartDate, queryEndDate).Select("COALESCE(SUM(amount), 0)").Scan(&summary.IncomeBreakdown.ManualIncome)
	summary.TotalIncome = summary.IncomeBreakdown.Sales + summary.IncomeBreakdown.ManualIncome

	h.DB.Model(&models.RawMaterialPurchase{}).Where("purchase_date BETWEEN ? AND ?", queryStartDate, queryEndDate).Select("COALESCE(SUM(price_purchase * qty), 0)").Scan(&summary.ExpenseBreakdown.RawMaterialPurchase)
	h.DB.Model(&models.Purchase{}).Where("is_clear = ? AND purchase_date BETWEEN ? AND ?", true, queryStartDate, queryEndDate).Select("COALESCE(SUM(total_price), 0)").Scan(&summary.ExpenseBreakdown.ProductPurchase)
	h.DB.Model(&models.Journal{}).Where("trx_type = ? AND trx_date BETWEEN ? AND ?", "expense", queryStartDate, queryEndDate).Select("COALESCE(SUM(amount), 0)").Scan(&summary.ExpenseBreakdown.ManualExpense)
	summary.TotalExpense = summary.ExpenseBreakdown.RawMaterialPurchase + summary.ExpenseBreakdown.ProductPurchase + summary.ExpenseBreakdown.ManualExpense
	summary.NetProfit = summary.TotalIncome - summary.TotalExpense

	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=finance_report_%s_%s.csv", startDate, endDate))

	writer := csv.NewWriter(c.Response().BodyWriter())
	defer writer.Flush()

	writer.Write([]string{"FINANCE REPORT"})
	writer.Write([]string{fmt.Sprintf("Period: %s - %s", startDate, endDate)})
	writer.Write([]string{""})

	writer.Write([]string{"SUMMARY"})
	writer.Write([]string{"Description", "Amount"})
	writer.Write([]string{"Total Income", fmt.Sprintf("%.2f", summary.TotalIncome)})
	writer.Write([]string{"Total Expense", fmt.Sprintf("%.2f", summary.TotalExpense)})
	writer.Write([]string{"Net Profit", fmt.Sprintf("%.2f", summary.NetProfit)})
	writer.Write([]string{""})

	writer.Write([]string{"INCOME BREAKDOWN"})
	writer.Write([]string{"Source", "Amount"})
	writer.Write([]string{"Sales (Orders)", fmt.Sprintf("%.2f", summary.IncomeBreakdown.Sales)})
	writer.Write([]string{"Manual Income (Journals)", fmt.Sprintf("%.2f", summary.IncomeBreakdown.ManualIncome)})
	writer.Write([]string{""})

	writer.Write([]string{"EXPENSE BREAKDOWN"})
	writer.Write([]string{"Source", "Amount"})
	writer.Write([]string{"Raw Material Purchase", fmt.Sprintf("%.2f", summary.ExpenseBreakdown.RawMaterialPurchase)})
	writer.Write([]string{"Product Purchase (Principal)", fmt.Sprintf("%.2f", summary.ExpenseBreakdown.ProductPurchase)})
	writer.Write([]string{"Manual Expense (Journals)", fmt.Sprintf("%.2f", summary.ExpenseBreakdown.ManualExpense)})

	return nil
}
