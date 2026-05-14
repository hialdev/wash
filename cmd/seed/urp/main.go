package main

import (
	"aldev/connection"
	authModels "aldev/modules/auth/models"
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

	// Run Full Migrations
	if err := connection.RunMigrations(db); err != nil {
		log.Fatalf("❌ Migration Gagal: %v", err)
	}

	fmt.Println("🗑️ Menghapus data role_permissions dan permissions...")
	// Gunakan TRUNCATE CASCADE untuk membersihkan semua relasi
	db.Exec("TRUNCATE TABLE role_permissions, permissions CASCADE")
	
	// Tambahkan unique index manual jika belum ada
	db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name)")

	fmt.Println("✅ Data permission lama dibersihkan dan Index Unik dipastikan ada")

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


	// 1. Setup Roles
	roleNames := []string{"Superadmin", "Owner", "Manager", "Kasir", "Customer"}
	roles := make(map[string]authModels.Role)

	for _, rn := range roleNames {
		var role authModels.Role
		if err := db.Where("name = ?", rn).First(&role).Error; err != nil {
			role = authModels.Role{
				Name:        rn,
				Description: strPtr(rn + " access role"),
			}
			db.Create(&role)
		}
		roles[rn] = role
	}

	// 3. Reload all permissions from DB to get fresh IDs
	var allPermsFromDB []authModels.Permission
	db.Find(&allPermsFromDB)
	
	permMap := make(map[string]authModels.Permission)
	for _, p := range allPermsFromDB {
		permMap[p.Name] = p
	}

	// Helper to get actual permission objects from names
	getPermsByNames := func(names []string) []authModels.Permission {
		var result []authModels.Permission
		for _, n := range names {
			if p, ok := permMap[n]; ok {
				result = append(result, p)
			}
		}
		return result
	}

	// 4. Define Permission Sets
	customerPermNames := []string{"Read Product", "Read Service", "Read Voucher"}
	kasirPermNames := []string{
		"Read Product", "Read Service", "Read Voucher",
		"Read Order", "Update Order",
	}

	// 5. Assign Permissions to Roles using Raw SQL to be safe
	for rn, role := range roles {
		var permSet []authModels.Permission
		switch rn {
		case "Superadmin", "Owner":
			permSet = allPermsFromDB
		case "Manager":
			for _, p := range allPermsFromDB {
				if p.Name != "Delete User" {
					permSet = append(permSet, p)
				}
			}
		case "Kasir":
			permSet = getPermsByNames(kasirPermNames)
		case "Customer":
			permSet = getPermsByNames(customerPermNames)
		default:
			permSet = getPermsByNames(customerPermNames)
		}

		fmt.Printf("🎭 Assigning %d permissions to role %s...\n", len(permSet), rn)
		
		// Clear existing permissions for this role first
		db.Exec("DELETE FROM role_permissions WHERE role_id = ?", role.ID)
		
		for _, p := range permSet {
			if err := db.Exec("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", role.ID, p.ID).Error; err != nil {
				fmt.Printf("⚠️  Gagal insert perm %s ke role %s: %v\n", p.Name, rn, err)
			}
		}
	}

	fmt.Println("✅ Roles & Permissions configured for all 5 roles")

	fmt.Println("\n👤 ========== MENYIAPKAN USER SEEDER ==========")

	// Helper to get Role ID pointer
	getRoleID := func(rn string) *uuid.UUID {
		r := roles[rn]
		return &r.ID
	}

	// A. Superadmin User
	var saUser authModels.User
	if err := db.Where("username = ?", "superadmin").First(&saUser).Error; err != nil {
		saUser = authModels.User{
			Name:     strPtr("Super Admin"),
			Username: strPtr("superadmin"),
			Email:    strPtr("admin@laundry.com"),
			Phone:    strPtr("+62000000001"),
			RoleID:   getRoleID("Superadmin"),
		}
		db.Create(&saUser)
		fmt.Println("👑 User Superadmin dibuat: superadmin")
	}

	// B. Owner User
	var ownerUser authModels.User
	if err := db.Where("username = ?", "owner").First(&ownerUser).Error; err != nil {
		ownerUser = authModels.User{
			Name:     strPtr("Laundry Owner"),
			Username: strPtr("owner"),
			Email:    strPtr("owner@laundry.com"),
			Phone:    strPtr("+62000000002"),
			RoleID:   getRoleID("Owner"),
		}
		db.Create(&ownerUser)
		fmt.Println("🏢 User Owner dibuat: owner")
	}

	// C. Manager User
	var managerUser authModels.User
	if err := db.Where("username = ?", "manager").First(&managerUser).Error; err != nil {
		managerUser = authModels.User{
			Name:     strPtr("Store Manager"),
			Username: strPtr("manager"),
			Email:    strPtr("manager@laundry.com"),
			Phone:    strPtr("+62000000003"),
			RoleID:   getRoleID("Manager"),
		}
		db.Create(&managerUser)
		fmt.Println("👨‍💼 User Manager dibuat: manager")
	}

	// D. Kasir User
	var kasirUser authModels.User
	if err := db.Where("username = ?", "kasir").First(&kasirUser).Error; err != nil {
		kasirUser = authModels.User{
			Name:     strPtr("Kasir Staff"),
			Username: strPtr("kasir"),
			Email:    strPtr("kasir@laundry.com"),
			Phone:    strPtr("+62000000004"),
			RoleID:   getRoleID("Kasir"),
		}
		db.Create(&kasirUser)
		fmt.Println("🛒 User Kasir dibuat: kasir")
	}

	// E. Customer User
	var customerUser authModels.User
	if err := db.Where("username = ?", "customer").First(&customerUser).Error; err != nil {
		customerUser = authModels.User{
			Name:     strPtr("Customer Test"),
			Username: strPtr("customer"),
			Email:    strPtr("customer@gmail.com"),
			Phone:    strPtr("+62000000005"),
			RoleID:   getRoleID("Customer"),
		}
		db.Create(&customerUser)
		fmt.Println("👤 User Customer dibuat: customer")
	}

	fmt.Println("\n🎉 ========== SEEDING SELESAI ==========")
	fmt.Println("✅ 5 Role dan User Test berhasil dikonfigurasi!")
}

func strPtr(s string) *string {
	return &s
}
