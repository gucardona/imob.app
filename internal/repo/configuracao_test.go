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
	if cfg.CorSecundaria != "#64748b" {
		t.Errorf("expected default CorSecundaria %q, got %q", "#64748b", cfg.CorSecundaria)
	}
	if cfg.NomeImobiliaria != "" {
		t.Errorf("expected empty NomeImobiliaria, got %q", cfg.NomeImobiliaria)
	}
}

func TestConfiguracaoRepo_Update_PersistsAllFields(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	r := repo.NewConfiguracaoRepo(conn)

	want := repo.Configuracao{
		NomeImobiliaria: "Imobiliária Teste",
		LogoPath:        "logo/logo.jpg",
		CorPrimaria:     "#ff0000",
		CorSecundaria:   "#00ff00",
		Endereco:        "Rua A, 1",
		Telefone:        "48 3333-3333",
		Whatsapp:        "5548999999999",
		Email:           "teste@exemplo.com",
		InstagramURL:    "https://instagram.com/teste",
		TextoSobre:      "Sobre nós.",
		TextoHome:       "Bem-vindos.",
	}

	if err := r.Update(ctx, want); err != nil {
		t.Fatalf("Update returned error: %v", err)
	}

	got, err := r.Get(ctx)
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if got.NomeImobiliaria != want.NomeImobiliaria {
		t.Errorf("NomeImobiliaria: got %q, want %q", got.NomeImobiliaria, want.NomeImobiliaria)
	}
	if got.Whatsapp != want.Whatsapp {
		t.Errorf("Whatsapp: got %q, want %q", got.Whatsapp, want.Whatsapp)
	}
	if got.CorPrimaria != want.CorPrimaria {
		t.Errorf("CorPrimaria: got %q, want %q", got.CorPrimaria, want.CorPrimaria)
	}
	if got.InstagramURL != want.InstagramURL {
		t.Errorf("InstagramURL: got %q, want %q", got.InstagramURL, want.InstagramURL)
	}
	if got.LogoPath != want.LogoPath {
		t.Errorf("LogoPath: got %q, want %q", got.LogoPath, want.LogoPath)
	}
}
