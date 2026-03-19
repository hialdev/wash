package main

import (
	"aldev/connection"
	authModels "aldev/modules/auth/models"
	cmsModels "aldev/modules/cms/models"
	"aldev/utils"
	"fmt"
	"log"
	"strings"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("❗ Gagal memuat file .env:", err)
	}

	connection.InitDB()
	db := connection.DB

	fmt.Println("🔌 Menginisialisasi koneksi Redis...")
	connection.InitRedis()
	if connection.Redis != nil {
		fmt.Println("✅ Redis terhubung")
	} else {
		fmt.Println("⚠️ Redis tidak tersedia")
	}

	fmt.Println("\n🧹 ========== MENGGHAPUS DATA LAMA ==========")

	fmt.Println("🗑️ Menghapus cache permission...")
	if err := utils.InvalidateAllPermissions(); err != nil {
		fmt.Printf("⚠️ Gagal hapus cache: %v\n", err)
	}

	if err := db.Exec("DELETE FROM role_permissions").Error; err != nil {
		log.Fatal("❌ Gagal hapus role_permissions:", err)
	}
	if err := db.Exec("DELETE FROM permissions").Error; err != nil {
		log.Fatal("❌ Gagal hapus permissions:", err)
	}
	fmt.Println("✅ Data permission lama dihapus")

	fmt.Println("\n📋 ========== MEMINDAI ACL DARI ROUTE ==========")

	files := []string{
		"modules/cms/routes/api.go",
		"modules/auth/routes/api.go",
	}

	acls, err := utils.ScanACLFromFiles(files)
	if err != nil {
		log.Fatal("❌ Gagal memindai ACL:", err)
	}
	fmt.Printf("🔍 Ditemukan %d ACL mentah\n", len(acls))

	// Normalisasi & deduplikasi
	normalize := func(s string) string {
		s = strings.TrimSpace(s)
		return strings.Join(strings.Fields(s), " ")
	}

	seen := make(map[string]bool)
	var uniqueACLs []string
	for _, acl := range acls {
		norm := normalize(acl)
		if norm != "" && !seen[norm] {
			seen[norm] = true
			uniqueACLs = append(uniqueACLs, norm)
		}
	}
	fmt.Printf("✨ %d permission unik setelah normalisasi\n", len(uniqueACLs))

	fmt.Println("\n💾 ========== MEMBUAT PERMISSION ==========")

	var perms []authModels.Permission
	for _, name := range uniqueACLs {
		p := authModels.Permission{
			Name:        name,
			Description: strPtr("Can " + name),
		}
		result := db.Where("name = ?", name).FirstOrCreate(&p)
		if result.Error != nil {
			log.Fatalf("❌ Gagal membuat/temukan permission '%s': %v", name, result.Error)
		}
		if p.ID == uuid.Nil {
			log.Fatalf("❌ Permission '%s' tidak memiliki ID valid!", name)
		}
		perms = append(perms, p)
		if result.RowsAffected > 0 {
			fmt.Printf("✅ Created: %s (ID=%s)\n", name, p.ID.String())
		} else {
			fmt.Printf("ℹ️ Exists: %s (ID=%s)\n", name, p.ID.String())
		}
	}

	fmt.Println("\n👑 ========== MENYIAPKAN ROLE & PERMISSION ==========")

	// 1. Define Permission Groups
	baseAccess := []string{"Read Product", "Read Service", "Read Voucher"}
	agentAccess := []string{"agent_order", "Read Dashboard", "Read Finance"}
	customerAccess := []string{}
	// allAccess will be uniqueACLs

	var basePerms []authModels.Permission
	db.Where("name IN ?", baseAccess).Find(&basePerms)

	var agentPerms []authModels.Permission
	db.Where("name IN ? OR name IN ?", baseAccess, agentAccess).Find(&agentPerms)

	var customerPerms []authModels.Permission
	db.Where("name IN ? OR name IN ?", baseAccess, customerAccess).Find(&customerPerms)

	// current 'perms' variable contains all uniqueACLs (allAccess)

	// 2. Setup Super Admin
	var superAdmin authModels.Role
	if err := db.Where("name = ?", "Super Admin").First(&superAdmin).Error; err != nil {
		superAdmin = authModels.Role{
			Name:        "Super Admin",
			Description: strPtr("Full system access"),
		}
		db.Create(&superAdmin)
	}
	db.Model(&superAdmin).Association("Permissions").Replace(perms)
	fmt.Printf("✅ Role Super Admin: %d perms\n", len(perms))

	// 3. Setup Admin
	var adminRole authModels.Role
	if err := db.Where("name = ?", "Admin").First(&adminRole).Error; err != nil {
		adminRole = authModels.Role{
			Name:        "Admin",
			Description: strPtr("Administrator access"),
		}
		db.Create(&adminRole)
	}
	db.Model(&adminRole).Association("Permissions").Replace(perms)
	fmt.Printf("✅ Role Admin: %d perms\n", len(perms))

	// 4. Setup Agent
	var agentRole authModels.Role
	if err := db.Where("name = ?", "Agent").First(&agentRole).Error; err != nil {
		agentRole = authModels.Role{
			Name:        "Agent",
			Description: strPtr("Agent access with focused permissions"),
		}
		db.Create(&agentRole)
	}
	db.Model(&agentRole).Association("Permissions").Replace(agentPerms)
	fmt.Printf("✅ Role Agent: %d perms\n", len(agentPerms))

	// 5. Setup Customer
	var customerRole authModels.Role
	if err := db.Where("name = ?", "Customer").First(&customerRole).Error; err != nil {
		customerRole = authModels.Role{
			Name:        "Customer",
			Description: strPtr("Default customer access"),
		}
		db.Create(&customerRole)
	}
	db.Model(&customerRole).Association("Permissions").Replace(customerPerms)
	fmt.Printf("✅ Role Customer: %d perms\n", len(customerPerms))

	fmt.Println("\n👤 ========== MENYIAPKAN USER SEEDER ==========")

	// A. Super Admin User
	var saUser authModels.User
	if err := db.Where("username = ?", "hialdev").First(&saUser).Error; err != nil {
		saUser = authModels.User{
			Name:     strPtr("Hi AL Dev"),
			Username: strPtr("hialdev"),
			Email:    strPtr("mna.official12@gmail.com"),
			Phone:    strPtr("+6289671052050"),
			RoleID:   &superAdmin.ID,
		}
		db.Create(&saUser)
		fmt.Println("👑 User Super Admin dibuat: hialdev")
	} else {
		db.Model(&saUser).Update("role_id", superAdmin.ID)
		fmt.Println("ℹ️ User Super Admin diperbarui")
	}

	// B. Sample Agent User
	var agentUser authModels.User
	if err := db.Where("username = ?", "agent_luta").First(&agentUser).Error; err != nil {
		agentUser = authModels.User{
			Name:     strPtr("Agent Luta Seeder"),
			Username: strPtr("agent_luta"),
			Email:    strPtr("agent_luta@mail.com"),
			Phone:    strPtr("+62896765423"),
			RoleID:   &agentRole.ID,
		}
		if err := db.Create(&agentUser).Error; err == nil {
			fmt.Println("👔 User Agent dibuat: agent_luta")

			// create agent profile
			code := "LUTA001"
			commRate := 10.0
			isActive := true
			agentProfile := cmsModels.Agent{
				Name:           agentUser.Name,
				Code:           &code,
				Phone:          agentUser.Phone,
				Email:          agentUser.Email,
				UserID:         &agentUser.ID,
				CommissionRate: &commRate,
				IsActive:       &isActive,
			}
			db.Create(&agentProfile)
			fmt.Println("📑 Agent Profile LUTA001 dibuat")
		}
	} else {
		db.Model(&agentUser).Updates(map[string]interface{}{
			"role_id": agentRole.ID,
			"email":   "agent_luta@mail.com",
			"phone":   "+62896765423",
		})
		fmt.Println("ℹ️ User Agent diperbarui")
	}

	// Verifikasi langsung di DB
	var count int64
	db.Table("role_permissions").Where("role_id = ?", superAdmin.ID).Count(&count)

	fmt.Println("\n🎉 ========== SEEDING SELESAI ==========")
	fmt.Printf("✅ Role Super Admin ID: %s\n", superAdmin.ID.String())
	fmt.Printf("✅ Role Agent ID: %s\n", agentRole.ID.String())
	fmt.Printf("✅ Entri role_permissions SA: %d\n", count)
	fmt.Println("✅ Sistem permission siap digunakan!")
}

func strPtr(s string) *string {
	return &s
}
