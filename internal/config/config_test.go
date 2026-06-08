package config_test

import (
	"testing"

	"github.com/gucardona/imob.app/internal/config"
)

func TestLoad_Defaults(t *testing.T) {
	t.Setenv("PORT", "")
	t.Setenv("DATABASE_PATH", "")

	cfg := config.Load()

	if cfg.Port != "8004" {
		t.Errorf("expected default port 8004, got %q", cfg.Port)
	}
	if cfg.DatabasePath != "imob.db" {
		t.Errorf("expected default database path imob.db, got %q", cfg.DatabasePath)
	}
}

func TestLoad_FromEnv(t *testing.T) {
	t.Setenv("PORT", "9000")
	t.Setenv("DATABASE_PATH", "/tmp/custom.db")

	cfg := config.Load()

	if cfg.Port != "9000" {
		t.Errorf("expected port 9000, got %q", cfg.Port)
	}
	if cfg.DatabasePath != "/tmp/custom.db" {
		t.Errorf("expected database path /tmp/custom.db, got %q", cfg.DatabasePath)
	}
}
