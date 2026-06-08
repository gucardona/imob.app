package repo_test

import (
	"context"
	"testing"

	"github.com/gucardona/imob.app/internal/repo"
)

func TestConfiguracaoRepo_Get_ReturnsDefaults(t *testing.T) {
	conn := newTestDB(t)
	r := repo.NewConfiguracaoRepo(conn)

	cfg, err := r.Get(context.Background())
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if cfg.CorPrimaria != "#1d4ed8" {
		t.Errorf("expected default CorPrimaria %q, got %q", "#1d4ed8", cfg.CorPrimaria)
	}
}
