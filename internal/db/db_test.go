package db_test

import (
	"path/filepath"
	"testing"

	"github.com/gucardona/imob.app/internal/db"
)

func TestOpen_ReturnsPingableConnection(t *testing.T) {
	path := filepath.Join(t.TempDir(), "test.db")

	conn, err := db.Open(path)
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}
	defer conn.Close()

	if err := conn.Ping(); err != nil {
		t.Errorf("Ping failed: %v", err)
	}
}
