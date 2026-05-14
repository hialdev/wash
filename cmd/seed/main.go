package main

import (
	"aldev/connection"
	authModels "aldev/modules/auth/models"
	cmsModels "aldev/modules/cms/models"
	"aldev/utils"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
)

// Helper types for setting json load
type SeedSetting struct {
	Name       string  `json:"name"`
	SetKey     string  `json:"set_key"`
	SetValue   *string `json:"set_value"`
	SetType    string  `json:"set_type"`
	SetOptions *string `json:"set_options"`
	IsUrgent   bool    `json:"is_urgent"`
}

type SeedGroup struct {
	Name        string        `json:"name"`
	Description *string       `json:"description"`
	Icon        *string       `json:"icon"`
	Settings    []SeedSetting `json:"settings"`
}

func main() {
	fmt.Println("🚀 Memulai Unified Master Database Seeder...")
	
	err := godotenv.Load()
	if err != nil {
		fmt.Println("⚠️  Peringatan: Tidak dapat memuat file .env, menggunakan variabel lingkungan sistem.")
	}

	// --- Inisialisasi DB & Redis ---
	connection.InitDB()
	db := connection.DB

	// --- 0. RUN CENTRALIZED MIGRATION FIRST ---
	fmt.Println("\n🔄 [0/5] ==================== MIGRATING DATABASE SCHEMA ====================")
	if err := connection.RunMigrations(db); err != nil {
		log.Fatalf("❌ Migration Gagal: %v", err)
	}
	
	fmt.Println("\n🔌 Menginisialisasi koneksi Redis...")
	connection.InitRedis()
	if connection.Redis != nil {
		fmt.Println("✅ Redis terhubung")
	} else {
		fmt.Println("⚠️  Redis tidak tersedia (melewati proses cache redis)")
	}

	// --- 1. SEED URP (Users, Roles, & Permissions) ---
	fmt.Println("\n🧹 [1/5] ==================== MEMBERSIHKAN & PEMINDAIAN ACL ====================")
	fmt.Println("🗑️  Menghapus cache permission lama...")
	if err := utils.InvalidateAllPermissions(); err != nil {
		fmt.Printf("⚠️  Gagal hapus cache: %v\n", err)
	}

	fmt.Println("🗑️  Membersihkan data role_permissions lama...")
	db.Exec("TRUNCATE TABLE role_permissions, permissions CASCADE")
	db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name)")
	fmt.Println("✅ Tabel Permission dibersihkan dan Index Unik dipastikan ada")

	fmt.Println("📋 Memindai Route ACL dari folder routes...")
	routeFiles := []string{
		"modules/cms/routes/api.go",
		"modules/auth/routes/api.go",
	}
	acls, err := utils.ScanACLFromFiles(routeFiles)
	if err != nil {
		log.Fatal("❌ Gagal memindai ACL dari berkas rute:", err)
	}
	fmt.Printf("🔍 Ditemukan %d ACL mentah\n", len(acls))

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
	fmt.Printf("✨ Dihasilkan %d Permission unik setelah normalisasi\n", len(uniqueACLs))

	// Simpan semua Permission
	var perms []authModels.Permission
	for _, name := range uniqueACLs {
		p := authModels.Permission{
			Name:        name,
			Description: strPtr("Akses untuk melakukan " + name),
		}
		result := db.Where("name = ?", name).FirstOrCreate(&p)
		if result.Error != nil {
			log.Fatalf("❌ Gagal merekam permission '%s': %v", name, result.Error)
		}
		perms = append(perms, p)
	}
	fmt.Println("✅ Semua permission berhasil dimasukkan ke database")

	// Buat Roles
	fmt.Println("\n👑 Menyusun Roles...")
	roleNames := []string{"Superadmin", "Owner", "Manager", "Kasir", "Customer"}
	roles := make(map[string]authModels.Role)

	for _, rn := range roleNames {
		var role authModels.Role
		if err := db.Where("name = ?", rn).First(&role).Error; err != nil {
			role = authModels.Role{
				Name:        rn,
				Description: strPtr("Akses penuh sebagai " + rn),
			}
			db.Create(&role)
		}
		roles[rn] = role
	}

	// Reload permissions dari DB
	var allPermsFromDB []authModels.Permission
	db.Find(&allPermsFromDB)
	
	permMap := make(map[string]authModels.Permission)
	for _, p := range allPermsFromDB {
		permMap[p.Name] = p
	}

	getPermsByNames := func(names []string) []authModels.Permission {
		var result []authModels.Permission
		for _, n := range names {
			if p, ok := permMap[n]; ok {
				result = append(result, p)
			}
		}
		return result
	}

	// Aturan mapping permission
	customerPermNames := []string{"Read Product", "Read Service", "Read Voucher"}
	kasirPermNames := []string{
		"Read Product", "Read Service", "Read Voucher",
		"Read Order", "Update Order", "Create Order",
	}

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

		fmt.Printf("🎭 Menyematkan %d permission ke role: %s...\n", len(permSet), rn)
		db.Exec("DELETE FROM role_permissions WHERE role_id = ?", role.ID)
		for _, p := range permSet {
			db.Exec("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", role.ID, p.ID)
		}
	}
	fmt.Println("✅ Konfigurasi Role & Permission rampung!")

	// Seeding 5 base users
	fmt.Println("\n👤 Menyusun Master Test Users...")
	getRoleID := func(rn string) *uuid.UUID {
		r := roles[rn]
		return &r.ID
	}

	createTestUser := func(name, username, email, phone, roleName string) {
		var user authModels.User
		if err := db.Where("username = ?", username).First(&user).Error; err != nil {
			user = authModels.User{
				Name:     strPtr(name),
				Username: strPtr(username),
				Email:    strPtr(email),
				Phone:    strPtr(phone),
				RoleID:   getRoleID(roleName),
			}
			db.Create(&user)
			fmt.Printf("👤 User '%s' (%s) berhasil dibuat!\n", username, roleName)
		} else {
			fmt.Printf("ℹ️  User '%s' sudah ada.\n", username)
		}
	}

	createTestUser("Super Admin", "superadmin", "admin@laundry.com", "+62811111111", "Superadmin")
	createTestUser("Laundry Owner", "owner", "owner@laundry.com", "+62822222222", "Owner")
	createTestUser("Store Manager", "manager", "manager@laundry.com", "+62833333333", "Manager")
	createTestUser("Kasir Staff", "kasir", "kasir@laundry.com", "+62844444444", "Kasir")
	createTestUser("Customer Test", "customer", "customer@gmail.com", "+62855555555", "Customer")

	// --- 2. SEED SETTINGS FROM JSON ---
	fmt.Println("\n⚙️  [2/5] ==================== MEMBACA SETTINGS DEFAULT ====================")
	jsonPath := "cmd/exports/setting/output.json"
	jsonData, err := os.ReadFile(jsonPath)
	if err != nil {
		fmt.Printf("⚠️  Gagal membaca %s: %v (Melanjutkan seeder lainnya)\n", jsonPath, err)
	} else {
		var groups []SeedGroup
		_ = json.Unmarshal(jsonData, &groups)
		for _, grp := range groups {
			var group cmsModels.SettingGroup
			if err := db.Where("name = ?", grp.Name).First(&group).Error; err != nil {
				group = cmsModels.SettingGroup{
					Name:        grp.Name,
					Description: grp.Description,
					Icon:        grp.Icon,
				}
				db.Create(&group)
			}

			for _, s := range grp.Settings {
				var setting cmsModels.Setting
				if err := db.Where("set_key = ?", s.SetKey).First(&setting).Error; err != nil {
					db.Create(&cmsModels.Setting{
						Name:       s.Name,
						SetKey:     s.SetKey,
						SetValue:   s.SetValue,
						SetType:    s.SetType,
						SetOptions: s.SetOptions,
						IsUrgent:   s.IsUrgent,
						GroupID:    uuid.UUID(group.ID),
					})
				}
			}
		}
		fmt.Println("🎉 Default System Settings berhasil diseed!")
	}

	// --- 3. SEED BANK DATA ---
	fmt.Println("\n🏦 [3/5] ==================== MENYIAPKAN BANK & QRIS ====================")
	
	createBank := func(name, number, owner, desc string, isQris bool) {
		var bank cmsModels.Bank
		if err := db.Where("bank_name = ?", name).First(&bank).Error; err != nil {
			bank = cmsModels.Bank{
				BankName:      strPtr(name),
				AccountNumber: strPtr(number),
				AccountOwner:  strPtr(owner),
				Description:   strPtr(desc),
				IsActive:      boolPtr(true),
				IsQris:        boolPtr(isQris),
			}
			db.Create(&bank)
			fmt.Printf("🏦 Bank/QRIS '%s' berhasil dibuat!\n", name)
		} else {
			fmt.Printf("ℹ️  Bank '%s' sudah terdaftar.\n", name)
		}
	}

	createBank("BCA Transfer", "1234567890", "PT Laundry Pintar Jaya", "Transfer antar bank BCA cabang Jakarta", false)
	createBank("QRIS Manual", "N/A", "Pintar Laundry Group", "Scan barcode QRIS di struk/ponsel", true)

	// --- 4. SEED SERVICE CATEGORIES & SERVICES ---
	fmt.Println("\n👕 [4/5] ==================== MENYIAPKAN KATALOG LAYANAN ====================")
	
	seedKatalog := func() {
		// 1. Kategori
		var catKiloan cmsModels.ServiceCategory
		if err := db.Where("name = ?", "Kiloan").First(&catKiloan).Error; err != nil {
			catKiloan = cmsModels.ServiceCategory{
				Name:        strPtr("Kiloan"),
				Description: strPtr("Layanan laundry ditimbang per Kilogram"),
				IsActive:    boolPtr(true),
			}
			db.Create(&catKiloan)
		}

		var catSatuan cmsModels.ServiceCategory
		if err := db.Where("name = ?", "Satuan").First(&catSatuan).Error; err != nil {
			catSatuan = cmsModels.ServiceCategory{
				Name:        strPtr("Satuan"),
				Description: strPtr("Layanan laundry eksklusif per Pcs"),
				IsActive:    boolPtr(true),
			}
			db.Create(&catSatuan)
		}

		// 2. Services
		createService := func(catID uuid.UUID, name, desc, unit string, price float64, dur int) {
			var s cmsModels.Service
			if err := db.Where("name = ? AND unit = ?", name, unit).First(&s).Error; err != nil {
				s = cmsModels.Service{
					ServiceCategoryID: &catID,
					Name:              strPtr(name),
					Description:       strPtr(desc),
					Price:             floatPtr(price),
					Unit:              strPtr(unit),
					EstimatedDuration: intPtr(dur),
					IsActive:          boolPtr(true),
					IsParent:          boolPtr(false),
				}
				db.Create(&s)
				fmt.Printf("👕 Layanan '%s' (%s/%s) berhasil didaftarkan!\n", name, formatRupiahLocal(price), unit)
			}
		}

		createService(uuid.UUID(catKiloan.ID), "Cuci Komplit (Cuci + Setrika)", "Pencucian menyeluruh diakhiri dengan setrika uap wangi.", "kg", 6000.00, 1440)
		createService(uuid.UUID(catKiloan.ID), "Cuci Kering Saja", "Hanya dicuci dan dikeringkan mesin komersial, tanpa setrika.", "kg", 4500.00, 720)
		createService(uuid.UUID(catKiloan.ID), "Setrika Saja", "Hanya disetrika uap wangi, pakaian diantar rapi.", "kg", 4000.00, 720)

		createService(uuid.UUID(catSatuan.ID), "Jas Eksklusif", "Dry cleaning / cuci khusus jas + hanger premium.", "pcs", 25000.00, 2880)
		createService(uuid.UUID(catSatuan.ID), "Selimut / Blanket", "Pembersihan selimut tebal dan duvet bedcover.", "pcs", 15000.00, 1440)
		createService(uuid.UUID(catSatuan.ID), "Boneka Sedang", "Dicuci bersih hingga bebas tungau dan kuman.", "pcs", 10000.00, 1440)
	}

	seedKatalog()
	fmt.Println("✅ Katalog Layanan standar sudah siap digunakan!")

	// --- 5. SEED VOUCHERS ---
	fmt.Println("\n🎫 [5/5] ==================== MENYIAPKAN VOUCHER DISKON ====================")
	
	createVoucher := func(code, desc, discType string, val, max, min float64, public bool) {
		var v cmsModels.Voucher
		if err := db.Where("code = ?", code).First(&v).Error; err != nil {
			validFrom := time.Now()
			validUntil := time.Now().AddDate(1, 0, 0) // Valid 1 tahun ke depan
			
			v = cmsModels.Voucher{
				Code:          strPtr(code),
				Description:   strPtr(desc),
				DiscountType:  strPtr(discType),
				DiscountValue: floatPtr(val),
				MaxDiscount:   floatPtr(max),
				MinPurchase:   floatPtr(min),
				IsPublic:      boolPtr(public),
				IsActive:      boolPtr(true),
				ValidFrom:     &validFrom,
				ValidUntil:    &validUntil,
			}
			db.Create(&v)
			fmt.Printf("🎫 Voucher '%s' berhasil dibuat!\n", code)
		} else {
			fmt.Printf("ℹ️  Voucher '%s' sudah terdaftar.\n", code)
		}
	}

	createVoucher("LAUNCH20", "Diskon Rilis Spesial 20%", "percentage", 20.0, 50000.0, 10000.0, true)
	createVoucher("PINTAR5K", "Potongan Langsung Rp 5.000 Tanpa Min Belanja!", "nominal", 5000.0, 5000.0, 0.0, true)

	fmt.Println("\n==================================================================")
	fmt.Println("🎉 SUKSES! Unified Database Master Seeder Berjalan Sempurna!")
	fmt.Println("💡 Jalankan perintah 'air' atau 'go run cmd/main.go' untuk memulai aplikasi.")
	fmt.Println("==================================================================")
}

// --- Helpers ---

func strPtr(s string) *string {
	return &s
}

func boolPtr(b bool) *bool {
	return &b
}

func floatPtr(f float64) *float64 {
	return &f
}

func intPtr(i int) *int {
	return &i
}

func formatRupiahLocal(val float64) string {
	str := fmt.Sprintf("%.0f", val)
	var out []rune
	runes := []rune(str)
	length := len(runes)
	for i, r := range runes {
		if i > 0 && (length-i)%3 == 0 {
			out = append(out, '.')
		}
		out = append(out, r)
	}
	return "Rp " + string(out)
}
