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

func TestLoad_SessionSecretAndUploadsDir_Defaults(t *testing.T) {
	t.Setenv("SESSION_SECRET", "")
	t.Setenv("UPLOADS_DIR", "")

	cfg := config.Load()

	if cfg.SessionSecret != "" {
		t.Errorf("expected empty default session secret, got %q", cfg.SessionSecret)
	}
	if cfg.UploadsDir != "uploads" {
		t.Errorf("expected default uploads dir %q, got %q", "uploads", cfg.UploadsDir)
	}
}

func TestLoad_SessionSecretAndUploadsDir_FromEnv(t *testing.T) {
	t.Setenv("SESSION_SECRET", "super-secret-value")
	t.Setenv("UPLOADS_DIR", "/var/data/uploads")

	cfg := config.Load()

	if cfg.SessionSecret != "super-secret-value" {
		t.Errorf("expected session secret %q, got %q", "super-secret-value", cfg.SessionSecret)
	}
	if cfg.UploadsDir != "/var/data/uploads" {
		t.Errorf("expected uploads dir %q, got %q", "/var/data/uploads", cfg.UploadsDir)
	}
}
