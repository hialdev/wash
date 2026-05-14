package connection

import (
	authModels "aldev/modules/auth/models"
	cmsModels "aldev/modules/cms/models"
	"fmt"

	"gorm.io/gorm"
)

// RunMigrations runs AutoMigrate for ALL registered models in the system.
// This guarantees that any runner (seeder, main web app, etc.) initializes the full database schema correctly.
func RunMigrations(db *gorm.DB) error {
	fmt.Println("🔄 Menjalankan AutoMigrate untuk seluruh skema tabel...")
	err := db.AutoMigrate(
		// Auth + RBAC
		&authModels.User{},
		&authModels.Role{},
		&authModels.Permission{},
		&authModels.Otp{},
		&authModels.DeliveryAddress{},

		// CMS
		&cmsModels.SettingGroup{},
		&cmsModels.Setting{},
		&cmsModels.ExampleRich{},
		&cmsModels.Agent{},
		&cmsModels.AgentCommissionRate{},

		// E-Commerce
		&cmsModels.ProductType{},
		&cmsModels.Product{},
		&cmsModels.Principle{},
		&cmsModels.Purchase{},
		&cmsModels.PurchaseProduct{},
		&cmsModels.Order{},
		&cmsModels.OrderProduct{},
		&cmsModels.OrderLogStatus{},
		&cmsModels.OrderProcessingLog{},
		&cmsModels.Adjustment{},
		&cmsModels.StockMovement{},
		&cmsModels.InventoryItem{},
		&cmsModels.InventoryAllocation{},

		// Services
		&cmsModels.ServiceCategory{},
		&cmsModels.Service{},
		&cmsModels.ServiceCog{},
		&cmsModels.OrderService{},
		&cmsModels.OrderServiceProcess{},
		&cmsModels.OrderServiceDetail{},
		&cmsModels.OrderProcessLog{}, // order-level process tracking

		// Raw Materials (COGS)
		&cmsModels.RawMaterial{},
		&cmsModels.RawMaterialPurchase{},
		&cmsModels.RawMaterialMovement{},

		// Voucher
		&cmsModels.Voucher{},

		// Finance
		&cmsModels.Bank{},
		&cmsModels.Journal{},
	)

	if err != nil {
		fmt.Printf("❌ Gagal menjalankan AutoMigrate: %v\n", err)
		return err
	}

	fmt.Println("✅ AutoMigrate selesai! Seluruh struktur tabel berhasil dibangun.")
	return nil
}
