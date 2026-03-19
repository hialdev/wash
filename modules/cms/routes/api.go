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
	sgroup.Use(middlewares.DoACL("Read Setting")).Get("/", set_group.GetAllSettingGroups)
	sgroup.Use(middlewares.DoACL("Read Setting")).Get("/:id", set_group.GetSettingGroup)
	sgroup.Use(middlewares.DoACL("Add Setting")).Post("/", set_group.CreateSettingGroup)
	sgroup.Use(middlewares.DoACL("Update Setting")).Patch("/:id", set_group.UpdateSettingGroup)
	sgroup.Use(middlewares.DoACL("Delete Setting")).Delete("/:id", set_group.DeleteSettingGroup)

	settings := handlers.NewSettingHandler(db)
	setting := api.Group("/settings")
	setting.Get("/key/:key", settings.GetSettingByKey)
	setting.Use(middlewares.JWTProtected())
	setting.Use(middlewares.DoACL("Add Setting")).Post("/", settings.AddSetting)
	setting.Use(middlewares.DoACL("Update Setting")).Post("/:id/value", settings.ValueSetting)
	setting.Use(middlewares.DoACL("Update Setting")).Patch("/:id", settings.UpdateSetting)
	setting.Use(middlewares.DoACL("Read Setting")).Get("/:id", settings.GetSetting)
	setting.Use(middlewares.DoACL("Delete Setting")).Delete("/:id", settings.DeleteSetting)

	// Example Rich Handler routes
	exampleRichs := handlers.NewExampleRichHandler(db)
	exampleRich := api.Group("/example-rich")
	exampleRich.Use(middlewares.JWTProtected())
	exampleRich.Use(middlewares.DoACL("Read ExampleRich")).Get("/", exampleRichs.GetAllExampleRichHandlers)
	exampleRich.Use(middlewares.DoACL("Read ExampleRich")).Get("/:id", exampleRichs.GetExampleRichHandler)
	exampleRich.Use(middlewares.DoACL("Add ExampleRich")).Post("/", exampleRichs.AddExampleRichHandler)
	exampleRich.Use(middlewares.DoACL("Update ExampleRich")).Post("/:id", exampleRichs.UpdateExampleRichHandler)
	exampleRich.Use(middlewares.DoACL("Delete ExampleRich")).Delete("/:id", exampleRichs.DeleteExampleRichHandler)

	// ProductType routes
	productTypes := handlers.NewProductTypeHandler(db)
	productType := api.Group("/product-types")
	productType.Use(middlewares.JWTProtected())
	productType.Get("/", productTypes.GetAllProductTypes)
	productType.Get("/:id", productTypes.GetProductType)
	productType.Use(middlewares.DoACL("Add ProductType")).Post("/", productTypes.AddProductType)
	productType.Use(middlewares.DoACL("Update ProductType")).Post("/:id", productTypes.UpdateProductType)
	productType.Use(middlewares.DoACL("Delete ProductType")).Delete("/:id", productTypes.DeleteProductType)

	// Product routes
	products := handlers.NewProductHandler(db)
	product := api.Group("/products")
	product.Use(middlewares.JWTProtected())
	product.Use(middlewares.DoACL("Read Product")).Get("/", products.GetAllProducts)
	product.Use(middlewares.DoACL("Read Product")).Get("/:id", products.GetProduct)
	product.Use(middlewares.DoACL("Add Product")).Post("/", products.AddProduct)
	product.Use(middlewares.DoACL("Update Product")).Post("/:id", products.UpdateProduct)
	product.Use(middlewares.DoACL("Delete Product")).Delete("/:id", products.DeleteProduct)

	// Principle routes
	principles := handlers.NewPrincipleHandler(db)
	principle := api.Group("/principles")
	principle.Use(middlewares.JWTProtected())
	principle.Use(middlewares.DoACL("Read Principle")).Get("/", principles.GetAllPrinciples)
	principle.Use(middlewares.DoACL("Read Principle")).Get("/:id", principles.GetPrinciple)
	principle.Use(middlewares.DoACL("Add Principle")).Post("/", principles.AddPrinciple)
	principle.Use(middlewares.DoACL("Update Principle")).Post("/:id", principles.UpdatePrinciple)
	principle.Use(middlewares.DoACL("Delete Principle")).Delete("/:id", principles.DeletePrinciple)

	// Purchase routes
	purchases := handlers.NewPurchaseHandler(db)
	purchase := api.Group("/purchases")
	purchase.Use(middlewares.JWTProtected())
	purchase.Use(middlewares.DoACL("Read Purchase")).Get("/", purchases.GetAllPurchases)
	purchase.Use(middlewares.DoACL("Read Purchase")).Get("/:id", purchases.GetPurchase)
	purchase.Use(middlewares.DoACL("Add Purchase")).Post("/", purchases.AddPurchase)
	purchase.Use(middlewares.DoACL("Update Purchase")).Post("/:id", purchases.UpdatePurchase)
	purchase.Use(middlewares.DoACL("Update Purchase")).Post("/:id/finish", purchases.FinishPurchase)
	purchase.Use(middlewares.DoACL("Delete Purchase")).Delete("/:id", purchases.DeletePurchase)

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
	userRoutes.Post("/checkout", myOrder.CreateMyOrder)

	// Manual payment routes (customer)
	manualPayment := handlers.NewManualPaymentHandler(db)
	userRoutes.Post("/orders/:id/upload-payment-proof", manualPayment.UploadPaymentProof)

	orders := handlers.NewOrderHandler(db)
	od := api.Group("/orders")
	od.Use(middlewares.JWTProtected())
	od.Use(middlewares.DoACL("Read Order")).Get("/", orders.GetAllOrders)
	od.Use(middlewares.DoACL("Read Order")).Get("/:id", orders.GetOrder)
	od.Use(middlewares.DoACL("Add Order")).Post("/", orders.AddOrder)

	// Customer actions for stock_issue orders (no ACL - customer self-service)
	od.Post("/:id/request-refund", orders.RequestRefund)
	od.Post("/:id/wait-restock", orders.WaitRestock)

	// Admin order actions (require Update Order permission)
	od.Use(middlewares.DoACL("Refund Order")).Post("/:id/admin-refund", orders.AdminRefund)
	od.Use(middlewares.DoACL("Cancel Order")).Post("/:id/admin-cancel", orders.AdminCancel)
	od.Use(middlewares.DoACL("Update Order")).Post("/:id/admin-confirm-restock", orders.AdminConfirmRestock)
	od.Use(middlewares.DoACL("Update Order")).Post("/:id/admin-finish", orders.AdminFinish)

	// Manual payment verification (admin)
	od.Use(middlewares.DoACL("Update Order")).Post("/:id/verify-payment", manualPayment.VerifyPayment)

	// Order processing routes (manual inventory allocation)
	od.Use(middlewares.DoACL("Update Order")).Get("/:id/processing-data", orders.GetProcessingData)
	od.Use(middlewares.DoACL("Update Order")).Post("/:id/process", orders.ProcessOrder)
	od.Use(middlewares.DoACL("Read Order")).Get("/:id/processing-log", orders.GetProcessingLog)

	// Service Tracking routes
	orderServices := handlers.NewOrderServiceHandler(db)
	ods := od.Group("/services")
	ods.Use(middlewares.DoACL("Read Order")).Get("/:id/tracking", orderServices.GetServiceTracking)
	ods.Use(middlewares.DoACL("Update Order")).Post("/:id/process", orderServices.AddServiceProcess)
	ods.Use(middlewares.DoACL("Update Order")).Post("/:id/details", orderServices.UpdateServiceDetail)

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
	adjustment.Use(middlewares.DoACL("Read Adjustment")).Get("/", adjustments.GetAllAdjustments)
	adjustment.Use(middlewares.DoACL("Read Adjustment")).Get("/:id", adjustments.GetAdjustment)
	adjustment.Use(middlewares.DoACL("Add Adjustment")).Post("/", adjustments.AddAdjustment)
	adjustment.Use(middlewares.DoACL("Update Adjustment")).Post("/:id", adjustments.UpdateAdjustment)
	adjustment.Use(middlewares.DoACL("Finish Adjustment")).Post("/:id/finish", adjustments.FinishAdjustment)
	adjustment.Use(middlewares.DoACL("Delete Adjustment")).Delete("/:id", adjustments.DeleteAdjustment)

	// StockMovement routes (read-only)
	stockMovements := handlers.NewStockMovementHandler(db)
	stockMovement := api.Group("/stock-movements")
	stockMovement.Use(middlewares.JWTProtected())
	stockMovement.Use(middlewares.DoACL("Read StockMovement")).Get("/", stockMovements.GetAllStockMovements)
	stockMovement.Use(middlewares.DoACL("Read StockMovement")).Get("/:id", stockMovements.GetStockMovement)

	// Inventory routes
	inventories := handlers.NewInventoryHandler(db)
	inventory := api.Group("/inventory")
	inventory.Use(middlewares.JWTProtected())
	inventory.Use(middlewares.DoACL("Read Product")).Get("/items", inventories.GetInventoryItemsWithAllocations)
	inventory.Use(middlewares.DoACL("Read Product")).Get("/:product_id", inventories.GetProductInventory)
	inventory.Use(middlewares.DoACL("Read Product")).Get("/:product_id/check", inventories.CheckAvailability)
	inventory.Use(middlewares.DoACL("Read Product")).Get("/report", inventories.GetInventoryReport)

	// Dashboard routes
	dashboards := handlers.NewDashboardHandler(db)
	dashboard := api.Group("/dashboard")
	dashboard.Use(middlewares.JWTProtected())
	dashboard.Use(middlewares.DoACL("Read Dashboard")).Get("/sales", dashboards.GetSalesDashboard)
	dashboard.Use(middlewares.DoACL("Read Dashboard")).Get("/stock", dashboards.GetStockDashboard)
	dashboard.Use(middlewares.DoACL("Read Dashboard")).Get("/purchase", dashboards.GetPurchaseDashboard)

	// Analytics routes
	salesAnalytics := handlers.NewSalesAnalyticsHandler(db)
	analytics := api.Group("/analytics")
	analytics.Use(middlewares.JWTProtected())
	analytics.Use(middlewares.DoACL("Read Dashboard")).Get("/super-sales", salesAnalytics.GetSuperSales)
	analytics.Use(middlewares.DoACL("Read Dashboard")).Get("/super-sales", salesAnalytics.GetSuperSales)

	// Service Category routes
	serviceCategories := handlers.NewServiceCategoryHandler(db)
	serviceCategoryGroup := api.Group("/service-categories")
	serviceCategoryGroup.Use(middlewares.JWTProtected())
	serviceCategoryGroup.Get("/", serviceCategories.GetAllServiceCategories)
	serviceCategoryGroup.Get("/:id", serviceCategories.GetServiceCategory)
	serviceCategoryGroup.Use(middlewares.DoACL("Add Service")).Post("/", serviceCategories.AddServiceCategory)
	serviceCategoryGroup.Use(middlewares.DoACL("Update Service")).Post("/:id", serviceCategories.UpdateServiceCategory)
	serviceCategoryGroup.Use(middlewares.DoACL("Delete Service")).Delete("/:id", serviceCategories.DeleteServiceCategory)

	// Service routes
	services := handlers.NewServiceHandler(db)
	serviceGroup := api.Group("/services")
	serviceGroup.Use(middlewares.JWTProtected())
	serviceGroup.Use(middlewares.DoACL("Read Service")).Get("/", services.GetAllServices)
	serviceGroup.Use(middlewares.DoACL("Read Service")).Get("/:id", services.GetService)
	serviceGroup.Use(middlewares.DoACL("Add Service")).Post("/", services.AddService)
	serviceGroup.Use(middlewares.DoACL("Update Service")).Post("/:id", services.UpdateService)
	serviceGroup.Use(middlewares.DoACL("Delete Service")).Delete("/:id", services.DeleteService)

	// Service Cogs routes
	serviceCogs := handlers.NewServiceCogHandler(db)
	scGroup := api.Group("/service-cogs")
	scGroup.Use(middlewares.JWTProtected())
	scGroup.Use(middlewares.DoACL("Read Service")).Get("/", serviceCogs.GetAllServiceCogs)
	scGroup.Use(middlewares.DoACL("Read Service")).Get("/:id", serviceCogs.GetServiceCog)
	scGroup.Use(middlewares.DoACL("Update Service")).Post("/", serviceCogs.AddServiceCog)
	scGroup.Use(middlewares.DoACL("Update Service")).Post("/:id", serviceCogs.UpdateServiceCog)
	scGroup.Use(middlewares.DoACL("Update Service")).Delete("/:id", serviceCogs.DeleteServiceCog)

	// Raw Material routes
	rawMaterials := handlers.NewRawMaterialHandler(db)
	rm := api.Group("/raw-materials")
	rm.Use(middlewares.JWTProtected())
	rm.Use(middlewares.DoACL("Read RawMaterial")).Get("/", rawMaterials.GetAllRawMaterials)
	rm.Use(middlewares.DoACL("Read RawMaterial")).Get("/:id", rawMaterials.GetRawMaterial)
	rm.Use(middlewares.DoACL("Add RawMaterial")).Post("/", rawMaterials.AddRawMaterial)
	rm.Use(middlewares.DoACL("Update RawMaterial")).Post("/:id", rawMaterials.UpdateRawMaterial)
	rm.Use(middlewares.DoACL("Delete RawMaterial")).Delete("/:id", rawMaterials.DeleteRawMaterial)

	// Raw Material Purchase routes
	rmPurchases := handlers.NewRawMaterialPurchaseHandler(db)
	rmp := api.Group("/raw-material-purchases")
	rmp.Use(middlewares.JWTProtected())
	rmp.Use(middlewares.DoACL("Read RawMaterial")).Get("/", rmPurchases.GetAllRawMaterialPurchases)
	rmp.Use(middlewares.DoACL("Read RawMaterial")).Get("/:id", rmPurchases.GetRawMaterialPurchase)
	rmp.Use(middlewares.DoACL("Add RawMaterial")).Post("/", rmPurchases.AddRawMaterialPurchase)
	rmp.Use(middlewares.DoACL("Delete RawMaterial")).Delete("/:id", rmPurchases.DeleteRawMaterialPurchase)

	// Raw Material Movement routes
	rmMovements := handlers.NewRawMaterialMovementHandler(db)
	rmm := api.Group("/raw-material-movements")
	rmm.Use(middlewares.JWTProtected())
	rmm.Use(middlewares.DoACL("Read RawMaterial")).Get("/", rmMovements.GetAllRawMaterialMovements)
	rmm.Use(middlewares.DoACL("Add RawMaterial")).Post("/adjustment", rmMovements.SubmitAdjustment)

	// Submit order raw material usage (under orders group)
	od.Use(middlewares.DoACL("Update Order")).Post("/:id/raw-material-usage", rmMovements.SubmitOrderUsage)

	// Agents routes
	agents := handlers.NewAgentHandler(db)
	agentRoutes := api.Group("/agents")
	agentRoutes.Use(middlewares.JWTProtected())
	agentRoutes.Get("/my-agent/:id", agents.GetMyAgent)
	agentRoutes.Use(middlewares.DoACL("Read Agent")).Get("/", agents.GetAllAgents)
	agentRoutes.Use(middlewares.DoACL("Read Agent")).Get("/:id", agents.GetAgent)
	agentRoutes.Use(middlewares.DoACL("Add Agent")).Post("/", agents.AddAgent)
	agentRoutes.Use(middlewares.DoACL("Update Agent")).Patch("/:id", agents.UpdateAgent)
	agentRoutes.Use(middlewares.DoACL("Delete Agent")).Delete("/:id", agents.DeleteAgent)
	agentRoutes.Use(middlewares.DoACL("Update Agent")).Post("/:id/generate-user", agents.GenerateUser)

	agentRoutes.Use(middlewares.DoACL("Read Agent")).Get("/:id/commissions", handlers.AgentCommissionHandler{DB: db}.GetCommissions)
	agentRoutes.Use(middlewares.DoACL("Update Agent")).Post("/:id/commissions/bulk", handlers.AgentCommissionHandler{DB: db}.BulkUpdateCommissions)

	// Agent Order routes (restricted to agent_order role/permission)
	agentOrderHandler := handlers.NewAgentOrderHandler(db)
	agentOrderRoutes := api.Group("/agent-orders")
	agentOrderRoutes.Use(middlewares.JWTProtected())
	agentOrderRoutes.Use(middlewares.DoACL("agent_order")).Post("/", agentOrderHandler.AddAgentOrder)

	// Finance Agent Report routes
	financeAgentHandler := handlers.NewFinanceAgentHandler(db)
	financeAgent := api.Group("/finance-agent")
	financeAgent.Use(middlewares.JWTProtected())
	financeAgent.Use(middlewares.DoACL("Read Finance")).Get("/", financeAgentHandler.GetAgentFinanceReport)

	// Journal Routes
	journals := handlers.NewJournalHandler(db)
	journal := api.Group("/journals")
	journal.Use(middlewares.JWTProtected())
	journal.Use(middlewares.DoACL("Read Journal")).Get("/", journals.GetAllJournals)
	journal.Use(middlewares.DoACL("Add Journal")).Post("/", journals.AddJournal)
	journal.Use(middlewares.DoACL("Add Journal")).Post("/batch", journals.BatchAddJournal)
	journal.Use(middlewares.DoACL("Delete Journal")).Delete("/:id", journals.DeleteJournal)

	// Finance Report Routes
	financeReports := handlers.NewFinanceReportHandler(db)
	finance := api.Group("/finance")
	finance.Use(middlewares.JWTProtected())
	finance.Use(middlewares.DoACL("Read Finance")).Get("/summary", financeReports.GetSummaryReport)
	finance.Use(middlewares.DoACL("Read Finance")).Get("/export-pdf", financeReports.ExportReportPDF)

	// Voucher Routes
	vouchers := handlers.NewVoucherHandler(db)
	voucher := api.Group("/vouchers")
	voucher.Use(middlewares.JWTProtected())

	// Public Voucher Validation Route (No ACL, just requires JWT)
	voucher.Post("/validate", vouchers.ValidateVoucher)

	voucher.Use(middlewares.DoACL("Read Voucher")).Get("/", vouchers.GetAllVouchers)
	voucher.Use(middlewares.DoACL("Read Voucher")).Get("/:id", vouchers.GetVoucher)
	voucher.Use(middlewares.DoACL("Add Voucher")).Post("/", vouchers.AddVoucher)
	voucher.Use(middlewares.DoACL("Update Voucher")).Post("/:id", vouchers.UpdateVoucher)
	voucher.Use(middlewares.DoACL("Delete Voucher")).Delete("/:id", vouchers.DeleteVoucher)

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
