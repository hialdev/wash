package main

import (
	"aldev/connection"
	"aldev/modules/auth/models"
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

	var perms []models.Permission
	for _, name := range uniqueACLs {
		p := models.Permission{
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

	fmt.Printf("\n✅ Total permission dibuat: %d\n", len(perms))

	fmt.Println("\n👑 ========== MENYIAPKAN ROLE SUPER ADMIN ==========")

	var superAdmin models.Role
	if err := db.Where("name = ?", "Super Admin").First(&superAdmin).Error; err != nil {
		superAdmin = models.Role{
			Name:        "Super Admin",
			Description: strPtr("Full system access"),
		}
		if err := db.Create(&superAdmin).Error; err != nil {
			log.Fatal("❌ Gagal buat role Super Admin:", err)
		}
		if superAdmin.ID == uuid.Nil {
			log.Fatal("❌ Role Super Admin dibuat tapi ID kosong!")
		}
		fmt.Printf("🏷️ Role Super Admin dibuat (ID=%s)\n", superAdmin.ID.String())
	} else {
		fmt.Printf("ℹ️ Role Super Admin sudah ada (ID=%s)\n", superAdmin.ID.String())
	}

	fmt.Println("\n🔗 ========== MENGIKAT PERMISSION KE ROLE ==========")

	if len(perms) > 0 {
		if err := db.Model(&superAdmin).Association("Permissions").Replace(perms); err != nil {
			log.Fatal("❌ Gagal mengikat permission ke role:", err)
		}
		fmt.Printf("🔗 %d permission diikat ke Super Admin (Role ID=%s)\n", len(perms), superAdmin.ID.String())
	}

	// Verifikasi langsung di DB
	var count int64
	db.Table("role_permissions").Where("role_id = ?", superAdmin.ID).Count(&count)
	fmt.Printf("🔍 [VERIFIKASI] Entri di role_permissions: %d\n", count)

	if count == 0 && len(perms) > 0 {
		log.Fatal("❌ FATAL: Tidak ada entri di role_permissions setelah pengikatan!")
	}

	fmt.Println("\n👤 ========== MENYIAPKAN USER SUPER ADMIN ==========")

	var user models.User
	if err := db.Where("username = ?", "hialdev").First(&user).Error; err != nil {
		user = models.User{
			Name:     strPtr("Hi AL Dev"),
			Username: strPtr("hialdev"),
			Email:    strPtr("mna.official12@gmail.com"),
			Phone:    strPtr("+6289671052050"),
			RoleID:   &superAdmin.ID,
		}
		if err := db.Create(&user).Error; err != nil {
			log.Fatal("❌ Gagal buat user Super Admin:", err)
		}
		fmt.Println("👑 User Super Admin dibuat: hialdev")
	} else {
		db.Model(&user).Update("role_id", superAdmin.ID)
		fmt.Println("ℹ️ User Super Admin sudah ada (role diperbarui)")
	}

	fmt.Println("\n🛒 ========== MENYIAPKAN ROLE CUSTOMER ==========")

	var customerRole models.Role
	if err := db.Where("name = ?", "Customer").First(&customerRole).Error; err != nil {
		customerRole = models.Role{
			Name:        "Customer",
			Description: strPtr("Default role untuk pelanggan"),
		}
		if err := db.Create(&customerRole).Error; err != nil {
			log.Fatal("❌ Gagal buat role Customer:", err)
		}
		fmt.Println("✅ Role Customer dibuat")
	} else {
		fmt.Println("ℹ️ Role Customer sudah ada")
	}

	fmt.Println("\n🎉 ========== SEEDING SELESAI ==========")
	fmt.Printf("✅ Permission: %d\n", len(perms))
	fmt.Printf("✅ Role Super Admin ID: %s\n", superAdmin.ID.String())
	fmt.Printf("✅ Entri role_permissions: %d\n", count)
	fmt.Println("✅ Sistem permission siap digunakan!")
}

func strPtr(s string) *string {
	return &s
}
