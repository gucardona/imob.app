package repo_test

import (
	"context"
	"testing"

	"github.com/gucardona/imob.app/internal/repo"
)

func sampleImovel() repo.Imovel {
	return repo.Imovel{
		Titulo:       "Casa com Vista para o Mar",
		Descricao:    "Linda casa de três quartos.",
		Tipo:         "casa",
		Finalidade:   "venda",
		Cidade:       "Florianópolis",
		Bairro:       "Canasvieiras",
		Endereco:     "Rua das Gaivotas, 100",
		Preco:        850000,
		AreaM2:       180,
		Quartos:      3,
		Banheiros:    2,
		VagasGaragem: 2,
		Status:       "disponivel",
		Destaque:     false,
	}
}

func TestImovelRepo_CreateGeneratesSlugFromTitulo(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)

	id, err := imoveis.Create(ctx, sampleImovel())
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	got, err := imoveis.Get(ctx, id)
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if got.Slug != "casa-com-vista-para-o-mar" {
		t.Errorf("expected slug %q, got %q", "casa-com-vista-para-o-mar", got.Slug)
	}
	if got.Titulo != "Casa com Vista para o Mar" {
		t.Errorf("expected titulo to round-trip, got %q", got.Titulo)
	}
}

func TestImovelRepo_List_ReturnsCreatedImoveis(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)

	first := sampleImovel()
	first.Titulo = "Primeiro Imóvel"
	second := sampleImovel()
	second.Titulo = "Segundo Imóvel"

	if _, err := imoveis.Create(ctx, first); err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if _, err := imoveis.Create(ctx, second); err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	list, err := imoveis.List(ctx)
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(list) != 2 {
		t.Fatalf("expected 2 imóveis, got %d", len(list))
	}
}

func TestImovelRepo_UpdateChangesFieldsAndRegeneratesSlug(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)

	id, err := imoveis.Create(ctx, sampleImovel())
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	updated := sampleImovel()
	updated.ID = id
	updated.Titulo = "Casa Reformada"
	updated.Preco = 900000

	if err := imoveis.Update(ctx, updated); err != nil {
		t.Fatalf("Update returned error: %v", err)
	}

	got, err := imoveis.Get(ctx, id)
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if got.Titulo != "Casa Reformada" {
		t.Errorf("expected updated titulo, got %q", got.Titulo)
	}
	if got.Slug != "casa-reformada" {
		t.Errorf("expected regenerated slug %q, got %q", "casa-reformada", got.Slug)
	}
	if got.Preco != 900000 {
		t.Errorf("expected updated preco 900000, got %v", got.Preco)
	}
}

func TestImovelRepo_SetDestaque_TogglesFlag(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)

	id, err := imoveis.Create(ctx, sampleImovel())
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	if err := imoveis.SetDestaque(ctx, id, true); err != nil {
		t.Fatalf("SetDestaque(true) returned error: %v", err)
	}
	got, err := imoveis.Get(ctx, id)
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if !got.Destaque {
		t.Error("expected destaque to be true after SetDestaque(true)")
	}

	if err := imoveis.SetDestaque(ctx, id, false); err != nil {
		t.Fatalf("SetDestaque(false) returned error: %v", err)
	}
	got, err = imoveis.Get(ctx, id)
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if got.Destaque {
		t.Error("expected destaque to be false after SetDestaque(false)")
	}
}

func TestImovelRepo_Delete_RemovesImovel(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)

	id, err := imoveis.Create(ctx, sampleImovel())
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	if err := imoveis.Delete(ctx, id); err != nil {
		t.Fatalf("Delete returned error: %v", err)
	}

	if _, err := imoveis.Get(ctx, id); err == nil {
		t.Error("expected Get to fail after Delete")
	}
}

func TestSlugify_NormalizesAccentsAndPunctuation(t *testing.T) {
	cases := map[string]string{
		"Casa com Vista para o Mar": "casa-com-vista-para-o-mar",
		"Apartamento - 2 Quartos!!": "apartamento-2-quartos",
		"  Espaços   Múltiplos  ":   "espacos-multiplos",
	}

	for input, want := range cases {
		if got := repo.Slugify(input); got != want {
			t.Errorf("Slugify(%q) = %q, want %q", input, got, want)
		}
	}
}
