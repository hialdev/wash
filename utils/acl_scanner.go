package utils

import (
	"os"
	"regexp"
	"strings"
)

func ScanACLFromFiles(files []string) ([]string, error) {
	reg := regexp.MustCompile(`DoACL\("([^"]+)"\)`)

	aclSet := map[string]bool{}

	for _, fp := range files {
		content, err := os.ReadFile(fp)
		if err != nil {
			return nil, err
		}

		matches := reg.FindAllStringSubmatch(string(content), -1)
		for _, m := range matches {
			acl := m[1]
			aclSet[acl] = true
		}
	}

	// Convert map ke []string
	result := []string{}
	for acl := range aclSet {
		result = append(result, normalizePermissionName(acl))
	}

	return result, nil
}

func normalizePermissionName(s string) string {
	// 1. Trim spasi
	s = strings.TrimSpace(s)
	// 2. Ganti spasi berlebih jadi satu spasi
	s = strings.Join(strings.Fields(s), " ")
	// 3. (Opsional) lowercase? → TIDAK, karena permission biasanya case-sensitive!
	//    Tapi pastikan konsisten di kode Anda.
	return s
}
