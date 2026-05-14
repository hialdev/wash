package routes

import (
	"aldev/connection"
	"aldev/modules/auth/handlers"
	"aldev/modules/auth/models"
	"aldev/modules/auth/services"
	globalHandler "aldev/modules/global/handlers"
	"aldev/routes/middlewares"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"gorm.io/gorm"
)

func SetupAuthRoutes(app *fiber.App, db *gorm.DB) {

	api := app.Group("/api")
	api.Get("/auth/test", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Auth API is running",
		})
	})

	ws := app.Group("/ws")

	// -------------- Whatsapp Websocket Routes
	wa := ws.Group("/wa")
	wa.Use(middlewares.JWTProtected())
	wa.Get("/connection", middlewares.DoACL("Read WhatsappIntegration"), websocket.New(handlers.WAHandler))
	wa.Post("/send", middlewares.DoACL("Send WhatsappIntegration"), handlers.SendMessageHandler)
	wa.Post("/check", middlewares.DoACL("Read WhatsappIntegration"), handlers.CheckNumberHandler)
	wa.Get("/status", middlewares.DoACL("Read WhatsappIntegration"), func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success":   true,
			"message":   "WhatsApp API is running",
			"connected": connection.IsConnected(),
			"user_id":   connection.GetUserID(),
		})
	})

	// -------------- Auth Routes
	otpHandler := handlers.OtpHandler{DB: db}
	otp := api.Group("/otp")
	otp.Post("/request", otpHandler.SendOTP)
	otp.Post("/request-change", otpHandler.ChangeSecurityOTP)
	otp.Post("/validate", otpHandler.ValidateOTP)

	auth := handlers.NewAuthHandler(services.NewAuthService(db))
	api.Post("/auth/me/:id", auth.CheckUserExist)
	api.Post("/checkuser", auth.CheckRegistered)
	api.Post("/auth/register", auth.Register)
	api.Post("/auth/login", auth.Login)
	api.Post("/auth/refresh", auth.RefreshToken)

	protected := api.Group("/auth")
	protected.Use(middlewares.JWTProtected())
	protected.Post("/checktoken", auth.CheckAccessToken)
	protected.Post("/logout", auth.Logout)

	// --------------- Profile Routes
	profile := handlers.NewProfileHandler(db)
	pf := api.Group("/profile")
	pf.Use(middlewares.JWTProtected())
	pf.Get("/", profile.Get)
	pf.Post("/change", profile.UpdateBasic)
	pf.Post("/change/email", profile.UpdateEmail)
	pf.Post("/change/phone", profile.UpdatePhone)

	// -------------- Access Control list Routes
	deliveryAddress := &handlers.DeliveryAddressHandler{DB: db}
	userHandler := handlers.NewUserHandler(db)
	usr := api.Group("/users")
	usr.Use(middlewares.JWTProtected())
	usr.Get("/", middlewares.DoACL("Read User"), userHandler.GetUsers)
	usr.Delete("/:id", middlewares.DoACL("Delete User"), userHandler.Delete)
	usr.Post("/", middlewares.DoACL("Add User"), userHandler.Create)
	usr.Post("/:id", middlewares.DoACL("Update User"), userHandler.Update)
	usr.Get("/:id", middlewares.DoACL("Read User"), userHandler.GetUser)
	usr.Get("/:id/delivery-addresses", middlewares.DoACL("Read User"), userHandler.GetUserAddresses)
	usr.Post("/:id/delivery-addresses", middlewares.DoACL("Update User"), deliveryAddress.CreateForUser)
	usr.Post("/:id/assign", middlewares.DoACL("Assign User"), userHandler.AssignRole)

	roles := handlers.NewRoleHandler(db)
	rl := api.Group("/roles")
	rl.Use(middlewares.JWTProtected())
	rl.Get("/", middlewares.DoACL("Read Role"), roles.GetRoles)
	rl.Get("/:id", middlewares.DoACL("Read Role"), roles.GetRole)
	rl.Post("/", middlewares.DoACL("Add Role"), roles.CreateRole)
	rl.Patch("/:id", middlewares.DoACL("Update Role"), roles.UpdateRole)
	rl.Delete("/:id", middlewares.DoACL("Delete Role"), roles.DeleteRole)

	permissions := globalHandler.NewHandlerGeneric[models.Permission](db)
	pm := api.Group("/permissions")
	pm.Use(middlewares.JWTProtected())
	pm.Get("/", middlewares.DoACL("Read Permission"), permissions.GetAll)
	pm.Get("/:id", middlewares.DoACL("Read Permission"), permissions.GetById)
	pm.Post("/", middlewares.DoACL("Add Permission"), permissions.Create)
	pm.Patch("/:id", middlewares.DoACL("Update Permission"), permissions.Update)
	pm.Delete("/:id", middlewares.DoACL("Delete Permission"), permissions.Delete)

	// --------------- Delivery Address Routes (per user)
	da := api.Group("/my-addresses")
	da.Use(middlewares.JWTProtected())
	da.Get("/", deliveryAddress.GetMyAddresses)
	da.Post("/", deliveryAddress.Create)
	da.Patch("/:id", deliveryAddress.Update)
	da.Delete("/:id", deliveryAddress.Delete)
	da.Patch("/:id/set-primary", deliveryAddress.SetPrimary)

	// --------------- My Customers Routes (agent-scoped)
	myCustomer := handlers.NewMyCustomerHandler(db)
	mc := api.Group("/my-customers")
	mc.Use(middlewares.JWTProtected())
	mc.Get("/", middlewares.DoACL("agent_order"), myCustomer.GetMyCustomers)
	mc.Post("/", middlewares.DoACL("agent_order"), myCustomer.AddMyCustomer)
	mc.Patch("/:id", middlewares.DoACL("agent_order"), myCustomer.UpdateMyCustomer)
	mc.Get("/:id/delivery-addresses", middlewares.DoACL("agent_order"), myCustomer.GetMyCustomerAddresses)
	mc.Post("/:id/delivery-addresses", middlewares.DoACL("agent_order"), myCustomer.AddMyCustomerAddress)
	mc.Patch("/:id/delivery-addresses/:addr_id", middlewares.DoACL("agent_order"), myCustomer.UpdateMyCustomerAddress)
	mc.Delete("/:id/delivery-addresses/:addr_id", middlewares.DoACL("agent_order"), myCustomer.DeleteMyCustomerAddress)
	mc.Patch("/:id/delivery-addresses/:addr_id/set-primary", middlewares.DoACL("agent_order"), myCustomer.SetMyCustomerAddressPrimary)
}
