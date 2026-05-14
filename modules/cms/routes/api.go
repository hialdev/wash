package routes

import (
	"aldev/modules/cms/handlers"
	"aldev/routes/middlewares"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func SetupCMSRoutes(app *fiber.App, db *gorm.DB) {
	api := app.Group("/api")

	set_group := handlers.NewSettingGroupHandler(db)
	sgroup := api.Group("/setting-groups")
	sgroup.Use(middlewares.JWTProtected())
	sgroup.Get("/", middlewares.DoACL("Read Setting"), set_group.GetAllSettingGroups)
	sgroup.Get("/:id", middlewares.DoACL("Read Setting"), set_group.GetSettingGroup)
	sgroup.Post("/", middlewares.DoACL("Add Setting"), set_group.CreateSettingGroup)
	sgroup.Patch("/:id", middlewares.DoACL("Update Setting"), set_group.UpdateSettingGroup)
	sgroup.Delete("/:id", middlewares.DoACL("Delete Setting"), set_group.DeleteSettingGroup)

	settings := handlers.NewSettingHandler(db)
	setting := api.Group("/settings")
	setting.Get("/key/:key", settings.GetSettingByKey)
	setting.Use(middlewares.JWTProtected())
	setting.Post("/", middlewares.DoACL("Add Setting"), settings.AddSetting)
	setting.Post("/:id/value", middlewares.DoACL("Update Setting"), settings.ValueSetting)
	setting.Patch("/:id", middlewares.DoACL("Update Setting"), settings.UpdateSetting)
	setting.Get("/:id", middlewares.DoACL("Read Setting"), settings.GetSetting)
	setting.Delete("/:id", middlewares.DoACL("Delete Setting"), settings.DeleteSetting)

	// Example Rich Handler routes
	exampleRichs := handlers.NewExampleRichHandler(db)
	exampleRich := api.Group("/example-rich")
	exampleRich.Use(middlewares.JWTProtected())
	exampleRich.Get("/", middlewares.DoACL("Read ExampleRich"), exampleRichs.GetAllExampleRichHandlers)
	exampleRich.Get("/:id", middlewares.DoACL("Read ExampleRich"), exampleRichs.GetExampleRichHandler)
	exampleRich.Post("/", middlewares.DoACL("Add ExampleRich"), exampleRichs.AddExampleRichHandler)
	exampleRich.Post("/:id", middlewares.DoACL("Update ExampleRich"), exampleRichs.UpdateExampleRichHandler)
	exampleRich.Delete("/:id", middlewares.DoACL("Delete ExampleRich"), exampleRichs.DeleteExampleRichHandler)

	// ProductType routes
	productTypes := handlers.NewProductTypeHandler(db)
	productType := api.Group("/product-types")
	productType.Use(middlewares.JWTProtected())
	productType.Get("/", productTypes.GetAllProductTypes)
	productType.Get("/:id", productTypes.GetProductType)
	productType.Post("/", middlewares.DoACL("Add ProductType"), productTypes.AddProductType)
	productType.Post("/:id", middlewares.DoACL("Update ProductType"), productTypes.UpdateProductType)
	productType.Delete("/:id", middlewares.DoACL("Delete ProductType"), productTypes.DeleteProductType)

	// Product routes
	products := handlers.NewProductHandler(db)
	product := api.Group("/products")
	product.Use(middlewares.JWTProtected())
	product.Get("/", middlewares.DoACL("Read Product"), products.GetAllProducts)
	product.Get("/:id", middlewares.DoACL("Read Product"), products.GetProduct)
	product.Post("/", middlewares.DoACL("Add Product"), products.AddProduct)
	product.Post("/:id", middlewares.DoACL("Update Product"), products.UpdateProduct)
	product.Delete("/:id", middlewares.DoACL("Delete Product"), products.DeleteProduct)

	// Principle routes
	principles := handlers.NewPrincipleHandler(db)
	principle := api.Group("/principles")
	principle.Use(middlewares.JWTProtected())
	principle.Get("/", middlewares.DoACL("Read Principle"), principles.GetAllPrinciples)
	principle.Get("/:id", middlewares.DoACL("Read Principle"), principles.GetPrinciple)
	principle.Post("/", middlewares.DoACL("Add Principle"), principles.AddPrinciple)
	principle.Post("/:id", middlewares.DoACL("Update Principle"), principles.UpdatePrinciple)
	principle.Delete("/:id", middlewares.DoACL("Delete Principle"), principles.DeletePrinciple)

	// Purchase routes
	purchases := handlers.NewPurchaseHandler(db)
	purchase := api.Group("/purchases")
	purchase.Use(middlewares.JWTProtected())
	purchase.Get("/", middlewares.DoACL("Read Purchase"), purchases.GetAllPurchases)
	purchase.Get("/:id", middlewares.DoACL("Read Purchase"), purchases.GetPurchase)
	purchase.Post("/", middlewares.DoACL("Add Purchase"), purchases.AddPurchase)
	purchase.Post("/:id", middlewares.DoACL("Update Purchase"), purchases.UpdatePurchase)
	purchase.Post("/:id/finish", middlewares.DoACL("Update Purchase"), purchases.FinishPurchase)
	purchase.Delete("/:id", middlewares.DoACL("Delete Purchase"), purchases.DeletePurchase)

	// Order routes
	// Public/Auth Catalog routes
	catalog := handlers.NewCatalogHandler(db)
	api.Get("/catalog", catalog.GetCatalogProducts)
	api.Get("/catalog/stock/:id", catalog.GetProductStock)

	// Public Service Catalog
	catalogService := handlers.NewCatalogServiceHandler(db)
	api.Get("/catalog/services", catalogService.GetCatalogServices)

	// Protected User Actions (require valid JWT)
	myOrder := handlers.NewMyOrderHandler(db)
	userRoutes := api.Group("/user") // Group for user-centric routes
	userRoutes.Use(middlewares.JWTProtected())
	userRoutes.Get("/my-orders", myOrder.GetMyOrders)
	userRoutes.Get("/my-orders/:id", myOrder.GetMyOrderDetail)
	userRoutes.Post("/my-orders/:id/rate", myOrder.RateOrder)
	userRoutes.Get("/my-orders/:id/process-log", myOrder.GetMyOrderProcessLogs)
	userRoutes.Post("/checkout", myOrder.CreateMyOrder)

	// Manual payment routes (customer)
	manualPayment := handlers.NewManualPaymentHandler(db)
	userRoutes.Post("/orders/:id/upload-payment-proof", manualPayment.UploadPaymentProof)

	orders := handlers.NewOrderHandler(db)
	od := api.Group("/orders")
	od.Use(middlewares.JWTProtected())
	od.Get("/", middlewares.DoACL("Read Order"), orders.GetAllOrders)
	od.Get("/:id", middlewares.DoACL("Read Order"), orders.GetOrder)
	od.Post("/", middlewares.DoACL("Add Order"), orders.AddOrder)

	// Customer actions for stock_issue orders (no ACL - customer self-service)
	od.Post("/:id/request-refund", orders.RequestRefund)
	od.Post("/:id/wait-restock", orders.WaitRestock)

	// Admin order actions (require Update Order permission)
	od.Post("/:id/admin-refund", middlewares.DoACL("Refund Order"), orders.AdminRefund)
	od.Post("/:id/admin-cancel", middlewares.DoACL("Cancel Order"), orders.AdminCancel)
	od.Post("/:id/admin-confirm-restock", middlewares.DoACL("Update Order"), orders.AdminConfirmRestock)
	od.Post("/:id/admin-finish", middlewares.DoACL("Update Order"), orders.AdminFinish)

	// Manual payment verification (admin)
	od.Post("/:id/verify-payment", middlewares.DoACL("Update Order"), manualPayment.VerifyPayment)

	// Order processing routes (manual inventory allocation)
	od.Get("/:id/processing-data", middlewares.DoACL("Update Order"), orders.GetProcessingData)
	od.Post("/:id/process", middlewares.DoACL("Update Order"), orders.ProcessOrder)
	od.Post("/:id/kasir-validate-and-process", middlewares.DoACL("Update Order"), orders.KasirValidateAndProcess)
	od.Get("/:id/processing-log", middlewares.DoACL("Read Order"), orders.GetProcessingLog)

	// Order-level process log (kasir — simple, no per-service tracking)
	od.Get("/:id/process-log", middlewares.DoACL("Read Order"), orders.GetProcessLogs)
	od.Post("/:id/process-log", middlewares.DoACL("Update Order"), orders.AddProcessLog)
	od.Post("/:id/finish", middlewares.DoACL("Update Order"), orders.FinishOrder)

	// Service Tracking routes
	orderServices := handlers.NewOrderServiceHandler(db)
	ods := od.Group("/services")
	ods.Get("/:id/tracking", middlewares.DoACL("Read Order"), orderServices.GetServiceTracking)
	ods.Post("/:id/process", middlewares.DoACL("Update Order"), orderServices.AddServiceProcess)
	ods.Post("/:id/details", middlewares.DoACL("Update Order"), orderServices.UpdateServiceDetail)

	// User-scoped service tracking (no specific ACL, just valid JWT)
	userRoutes.Get("/services/:id/tracking", orderServices.GetServiceTracking)

	// Order Log Status routes
	orderLogStatus := handlers.NewOrderLogStatusHandler(db)
	orderLogStatusGroup := api.Group("/order-log-status")
	orderLogStatusGroup.Use(middlewares.JWTProtected())
	orderLogStatusGroup.Get("/", orderLogStatus.GetAllOrderLogStatus)

	// Xendit callback (no auth required)
	api.Post("/xendit/callback", orders.XenditCallback)

	// Adjustment routes
	adjustments := handlers.NewAdjustmentHandler(db)
	adjustment := api.Group("/adjustments")
	adjustment.Use(middlewares.JWTProtected())
	adjustment.Get("/", middlewares.DoACL("Read Adjustment"), adjustments.GetAllAdjustments)
	adjustment.Get("/:id", middlewares.DoACL("Read Adjustment"), adjustments.GetAdjustment)
	adjustment.Post("/", middlewares.DoACL("Add Adjustment"), adjustments.AddAdjustment)
	adjustment.Post("/:id", middlewares.DoACL("Update Adjustment"), adjustments.UpdateAdjustment)
	adjustment.Post("/:id/finish", middlewares.DoACL("Finish Adjustment"), adjustments.FinishAdjustment)
	adjustment.Delete("/:id", middlewares.DoACL("Delete Adjustment"), adjustments.DeleteAdjustment)

	// StockMovement routes (read-only)
	stockMovements := handlers.NewStockMovementHandler(db)
	stockMovement := api.Group("/stock-movements")
	stockMovement.Use(middlewares.JWTProtected())
	stockMovement.Get("/", middlewares.DoACL("Read StockMovement"), stockMovements.GetAllStockMovements)
	stockMovement.Get("/:id", middlewares.DoACL("Read StockMovement"), stockMovements.GetStockMovement)

	// Inventory routes
	inventories := handlers.NewInventoryHandler(db)
	inventory := api.Group("/inventory")
	inventory.Use(middlewares.JWTProtected())
	inventory.Get("/items", middlewares.DoACL("Read Product"), inventories.GetInventoryItemsWithAllocations)
	inventory.Get("/:product_id", middlewares.DoACL("Read Product"), inventories.GetProductInventory)
	inventory.Get("/:product_id/check", middlewares.DoACL("Read Product"), inventories.CheckAvailability)
	inventory.Get("/report", middlewares.DoACL("Read Product"), inventories.GetInventoryReport)

	// Dashboard routes
	dashboards := handlers.NewDashboardHandler(db)
	dashboard := api.Group("/dashboard")
	dashboard.Use(middlewares.JWTProtected())
	dashboard.Get("/sales", middlewares.DoACL("Read Dashboard"), dashboards.GetSalesDashboard)
	dashboard.Get("/stock", middlewares.DoACL("Read Dashboard"), dashboards.GetStockDashboard)
	dashboard.Get("/purchase", middlewares.DoACL("Read Dashboard"), dashboards.GetPurchaseDashboard)
	dashboard.Get("/manager", middlewares.DoACL("Read Dashboard"), dashboards.GetManagerDashboard)
	dashboard.Get("/superadmin", middlewares.DoACL("Read Dashboard"), dashboards.GetSuperadminDashboard)

	// Analytics routes
	salesAnalytics := handlers.NewSalesAnalyticsHandler(db)
	analytics := api.Group("/analytics")
	analytics.Use(middlewares.JWTProtected())
	analytics.Get("/super-sales", middlewares.DoACL("Read Dashboard"), salesAnalytics.GetSuperSales)
	// Removed duplicate route for same path

	// Service Category routes
	serviceCategories := handlers.NewServiceCategoryHandler(db)
	serviceCategoryGroup := api.Group("/service-categories")
	serviceCategoryGroup.Use(middlewares.JWTProtected())
	serviceCategoryGroup.Get("/", serviceCategories.GetAllServiceCategories)
	serviceCategoryGroup.Get("/:id", serviceCategories.GetServiceCategory)
	serviceCategoryGroup.Post("/", middlewares.DoACL("Add Service"), serviceCategories.AddServiceCategory)
	serviceCategoryGroup.Post("/:id", middlewares.DoACL("Update Service"), serviceCategories.UpdateServiceCategory)
	serviceCategoryGroup.Delete("/:id", middlewares.DoACL("Delete Service"), serviceCategories.DeleteServiceCategory)

	// Service routes
	services := handlers.NewServiceHandler(db)
	serviceGroup := api.Group("/services")
	serviceGroup.Use(middlewares.JWTProtected())
	serviceGroup.Get("/", middlewares.DoACL("Read Service"), services.GetAllServices)
	serviceGroup.Get("/:id", middlewares.DoACL("Read Service"), services.GetService)
	serviceGroup.Post("/", middlewares.DoACL("Add Service"), services.AddService)
	serviceGroup.Post("/:id", middlewares.DoACL("Update Service"), services.UpdateService)
	serviceGroup.Delete("/:id", middlewares.DoACL("Delete Service"), services.DeleteService)

	// Service Cogs routes
	serviceCogs := handlers.NewServiceCogHandler(db)
	scGroup := api.Group("/service-cogs")
	scGroup.Use(middlewares.JWTProtected())
	scGroup.Get("/", middlewares.DoACL("Read Service"), serviceCogs.GetAllServiceCogs)
	scGroup.Get("/:id", middlewares.DoACL("Read Service"), serviceCogs.GetServiceCog)
	scGroup.Post("/", middlewares.DoACL("Update Service"), serviceCogs.AddServiceCog)
	scGroup.Post("/:id", middlewares.DoACL("Update Service"), serviceCogs.UpdateServiceCog)
	scGroup.Delete("/:id", middlewares.DoACL("Update Service"), serviceCogs.DeleteServiceCog)

	// Raw Material routes
	rawMaterials := handlers.NewRawMaterialHandler(db)
	rm := api.Group("/raw-materials")
	rm.Use(middlewares.JWTProtected())
	rm.Get("/", middlewares.DoACL("Read RawMaterial"), rawMaterials.GetAllRawMaterials)
	rm.Get("/:id", middlewares.DoACL("Read RawMaterial"), rawMaterials.GetRawMaterial)
	rm.Post("/", middlewares.DoACL("Add RawMaterial"), rawMaterials.AddRawMaterial)
	rm.Post("/:id", middlewares.DoACL("Update RawMaterial"), rawMaterials.UpdateRawMaterial)
	rm.Delete("/:id", middlewares.DoACL("Delete RawMaterial"), rawMaterials.DeleteRawMaterial)

	// Raw Material Purchase routes
	rmPurchases := handlers.NewRawMaterialPurchaseHandler(db)
	rmp := api.Group("/raw-material-purchases")
	rmp.Use(middlewares.JWTProtected())
	rmp.Get("/", middlewares.DoACL("Read RawMaterial"), rmPurchases.GetAllRawMaterialPurchases)
	rmp.Get("/:id", middlewares.DoACL("Read RawMaterial"), rmPurchases.GetRawMaterialPurchase)
	rmp.Post("/", middlewares.DoACL("Add RawMaterial"), rmPurchases.AddRawMaterialPurchase)
	rmp.Delete("/:id", middlewares.DoACL("Delete RawMaterial"), rmPurchases.DeleteRawMaterialPurchase)

	// Raw Material Movement routes
	rmMovements := handlers.NewRawMaterialMovementHandler(db)
	rmm := api.Group("/raw-material-movements")
	rmm.Use(middlewares.JWTProtected())
	rmm.Get("/", middlewares.DoACL("Read RawMaterial"), rmMovements.GetAllRawMaterialMovements)
	rmm.Post("/adjustment", middlewares.DoACL("Add RawMaterial"), rmMovements.SubmitAdjustment)

	// Submit order raw material usage (under orders group)
	od.Post("/:id/raw-material-usage", middlewares.DoACL("Update Order"), rmMovements.SubmitOrderUsage)

	// Agents routes
	agents := handlers.NewAgentHandler(db)
	agentRoutes := api.Group("/agents")
	agentRoutes.Use(middlewares.JWTProtected())
	agentRoutes.Get("/my-agent/:id", agents.GetMyAgent)
	agentRoutes.Get("/", middlewares.DoACL("Read Agent"), agents.GetAllAgents)
	agentRoutes.Get("/:id", middlewares.DoACL("Read Agent"), agents.GetAgent)
	agentRoutes.Post("/", middlewares.DoACL("Add Agent"), agents.AddAgent)
	agentRoutes.Patch("/:id", middlewares.DoACL("Update Agent"), agents.UpdateAgent)
	agentRoutes.Delete("/:id", middlewares.DoACL("Delete Agent"), agents.DeleteAgent)
	agentRoutes.Post("/:id/generate-user", middlewares.DoACL("Update Agent"), agents.GenerateUser)

	agentRoutes.Get("/:id/commissions", middlewares.DoACL("Read Agent"), handlers.AgentCommissionHandler{DB: db}.GetCommissions)
	agentRoutes.Post("/:id/commissions/bulk", middlewares.DoACL("Update Agent"), handlers.AgentCommissionHandler{DB: db}.BulkUpdateCommissions)

	// Agent Order routes (restricted to agent_order role/permission)
	agentOrderHandler := handlers.NewAgentOrderHandler(db)
	agentOrderRoutes := api.Group("/agent-orders")
	agentOrderRoutes.Use(middlewares.JWTProtected())
	agentOrderRoutes.Post("/", middlewares.DoACL("agent_order"), agentOrderHandler.AddAgentOrder)

	// Finance Agent Report routes
	financeAgentHandler := handlers.NewFinanceAgentHandler(db)
	financeAgent := api.Group("/finance-agent")
	financeAgent.Use(middlewares.JWTProtected())
	financeAgent.Get("/", middlewares.DoACL("Read Finance"), financeAgentHandler.GetAgentFinanceReport)

	// Journal Routes
	journals := handlers.NewJournalHandler(db)
	journal := api.Group("/journals")
	journal.Use(middlewares.JWTProtected())
	journal.Get("/", middlewares.DoACL("Read Journal"), journals.GetAllJournals)
	journal.Post("/", middlewares.DoACL("Add Journal"), journals.AddJournal)
	journal.Post("/batch", middlewares.DoACL("Add Journal"), journals.BatchAddJournal)
	journal.Delete("/:id", middlewares.DoACL("Delete Journal"), journals.DeleteJournal)

	// Finance Report Routes
	financeReports := handlers.NewFinanceReportHandler(db)
	finance := api.Group("/finance")
	finance.Use(middlewares.JWTProtected())
	finance.Get("/summary", middlewares.DoACL("Read Finance"), financeReports.GetSummaryReport)
	finance.Get("/export-pdf", middlewares.DoACL("Read Finance"), financeReports.ExportReportPDF)
	finance.Get("/export-excel", middlewares.DoACL("Read Finance"), financeReports.ExportReportExcel)
	finance.Get("/export-csv", middlewares.DoACL("Read Finance"), financeReports.ExportReportCSV)

	// Voucher Routes
	vouchers := handlers.NewVoucherHandler(db)
	voucher := api.Group("/vouchers")
	voucher.Use(middlewares.JWTProtected())

	// Public Voucher Validation Route (No ACL, just requires JWT)
	voucher.Post("/validate", vouchers.ValidateVoucher)

	voucher.Get("/", middlewares.DoACL("Read Voucher"), vouchers.GetAllVouchers)
	voucher.Get("/:id", middlewares.DoACL("Read Voucher"), vouchers.GetVoucher)
	voucher.Post("/", middlewares.DoACL("Add Voucher"), vouchers.AddVoucher)
	voucher.Post("/:id", middlewares.DoACL("Update Voucher"), vouchers.UpdateVoucher)
	voucher.Delete("/:id", middlewares.DoACL("Delete Voucher"), vouchers.DeleteVoucher)

	// Bank routes
	bankHandler := &handlers.BankHandler{DB: db}
	banks := api.Group("/banks")
	banks.Use(middlewares.JWTProtected())
	banks.Get("/", bankHandler.GetAll)       // All logged-in users can view banks
	banks.Get("/:id", bankHandler.GetById)   // All logged-in users can view bank detail
	banks.Post("/", bankHandler.Create)      // Admin only (no ACL for now, can be added)
	banks.Post("/:id", bankHandler.Update)   // Admin only
	banks.Delete("/:id", bankHandler.Delete) // Admin only
}
