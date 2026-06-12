package repo_test

import (
	"context"
	"testing"

	"github.com/gucardona/imob.app/internal/repo"
)

func TestConfiguracaoRepo_UpdateAndGet(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	r := repo.NewConfiguracaoRepo(conn)

	updated := repo.Configuracao{
		NomeImobiliaria: "Imobiliária Teste",
		CorPrimaria:     "#ff0000",
		CorSecundaria:   "#00ff00",
		Telefone:        "51999999999",
		Whatsapp:        "5551999999999",
		Email:           "test@test.com",
		HeroMode:        "gradient",
	}
	if err := r.Update(ctx, updated); err != nil {
		t.Fatalf("Update returned error: %v", err)
	}

	got, err := r.Get(ctx)
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if got.NomeImobiliaria != "Imobiliária Teste" {
		t.Errorf("expected NomeImobiliaria %q, got %q", "Imobiliária Teste", got.NomeImobiliaria)
	}
	if got.CorPrimaria != "#ff0000" {
		t.Errorf("expected CorPrimaria %q, got %q", "#ff0000", got.CorPrimaria)
	}
	if got.HeroMode != "gradient" {
		t.Errorf("expected HeroMode %q, got %q", "gradient", got.HeroMode)
	}
}

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
	if cfg.CorSecundaria != "#64748b" {
		t.Errorf("expected default CorSecundaria %q, got %q", "#64748b", cfg.CorSecundaria)
	}
	if cfg.NomeImobiliaria != "" {
		t.Errorf("expected empty NomeImobiliaria, got %q", cfg.NomeImobiliaria)
	}
}
