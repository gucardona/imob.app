package db_test

import (
	"path/filepath"
	"testing"

	"github.com/gucardona/imob.app/internal/db"
)

func TestMigrate_CreatesAllTables(t *testing.T) {
	path := filepath.Join(t.TempDir(), "test.db")
	conn, err := db.Open(path)
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}
	defer conn.Close()

	if err := db.Migrate(conn); err != nil {
		t.Fatalf("Migrate returned error: %v", err)
	}

	expectedTables := []string{"imoveis", "fotos", "configuracao", "admins", "schema_migrations"}
	for _, table := range expectedTables {
		var name string
		err := conn.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`, table).Scan(&name)
		if err != nil {
			t.Errorf("expected table %q to exist: %v", table, err)
		}
	}
}

func TestMigrate_SeedsConfigurationRow(t *testing.T) {
	path := filepath.Join(t.TempDir(), "test.db")
	conn, err := db.Open(path)
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}
	defer conn.Close()

	if err := db.Migrate(conn); err != nil {
		t.Fatalf("Migrate returned error: %v", err)
	}

	var count int
	if err := conn.QueryRow(`SELECT COUNT(*) FROM configuracao WHERE id = 1`).Scan(&count); err != nil {
		t.Fatalf("counting configuracao rows: %v", err)
	}
	if count != 1 {
		t.Errorf("expected exactly 1 configuracao row with id=1, got %d", count)
	}
}

func TestMigrate_IsIdempotent(t *testing.T) {
	path := filepath.Join(t.TempDir(), "test.db")
	conn, err := db.Open(path)
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}
	defer conn.Close()

	if err := db.Migrate(conn); err != nil {
		t.Fatalf("first Migrate returned error: %v", err)
	}
	if err := db.Migrate(conn); err != nil {
		t.Fatalf("second Migrate returned error: %v", err)
	}

	var count int
	if err := conn.QueryRow(`SELECT COUNT(*) FROM schema_migrations`).Scan(&count); err != nil {
		t.Fatalf("counting schema_migrations: %v", err)
	}
	if count != 1 {
		t.Errorf("expected exactly 1 recorded migration, got %d", count)
	}
}
