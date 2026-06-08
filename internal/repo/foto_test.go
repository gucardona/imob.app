package repo_test

import (
	"context"
	"testing"

	"github.com/gucardona/imob.app/internal/repo"
)

func createTestImovel(t *testing.T, imoveis repo.ImovelRepo) int64 {
	t.Helper()
	id, err := imoveis.Create(context.Background(), sampleImovel())
	if err != nil {
		t.Fatalf("Create imóvel returned error: %v", err)
	}
	return id
}

func TestFotoRepo_CreateThenListByImovel_OrdersByOrdem(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)
	fotos := repo.NewFotoRepo(conn)

	imovelID := createTestImovel(t, imoveis)

	firstID, err := fotos.Create(ctx, repo.Foto{
		ImovelID:        imovelID,
		CaminhoOriginal: "uploads/1/a-original.jpg",
		CaminhoThumb:    "uploads/1/a-thumb.jpg",
		CaminhoGrande:   "uploads/1/a-grande.jpg",
		Ordem:           0,
	})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	secondID, err := fotos.Create(ctx, repo.Foto{
		ImovelID:        imovelID,
		CaminhoOriginal: "uploads/1/b-original.jpg",
		CaminhoThumb:    "uploads/1/b-thumb.jpg",
		CaminhoGrande:   "uploads/1/b-grande.jpg",
		Ordem:           1,
	})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	list, err := fotos.ListByImovel(ctx, imovelID)
	if err != nil {
		t.Fatalf("ListByImovel returned error: %v", err)
	}
	if len(list) != 2 {
		t.Fatalf("expected 2 fotos, got %d", len(list))
	}
	if list[0].ID != firstID || list[1].ID != secondID {
		t.Errorf("expected fotos ordered by ordem (%d, %d), got (%d, %d)", firstID, secondID, list[0].ID, list[1].ID)
	}
}

func TestFotoRepo_SetPrincipal_EnsuresOnlyOnePerImovel(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)
	fotos := repo.NewFotoRepo(conn)

	imovelID := createTestImovel(t, imoveis)

	firstID, _ := fotos.Create(ctx, repo.Foto{ImovelID: imovelID, CaminhoOriginal: "a-original.jpg", CaminhoThumb: "a-thumb.jpg", CaminhoGrande: "a-grande.jpg", Ordem: 0})
	secondID, _ := fotos.Create(ctx, repo.Foto{ImovelID: imovelID, CaminhoOriginal: "b-original.jpg", CaminhoThumb: "b-thumb.jpg", CaminhoGrande: "b-grande.jpg", Ordem: 1})

	if err := fotos.SetPrincipal(ctx, imovelID, firstID); err != nil {
		t.Fatalf("SetPrincipal returned error: %v", err)
	}
	if err := fotos.SetPrincipal(ctx, imovelID, secondID); err != nil {
		t.Fatalf("SetPrincipal returned error: %v", err)
	}

	list, err := fotos.ListByImovel(ctx, imovelID)
	if err != nil {
		t.Fatalf("ListByImovel returned error: %v", err)
	}

	principalCount := 0
	for _, f := range list {
		if f.Principal {
			principalCount++
			if f.ID != secondID {
				t.Errorf("expected foto %d to be principal, got %d marked principal", secondID, f.ID)
			}
		}
	}
	if principalCount != 1 {
		t.Errorf("expected exactly 1 principal foto, got %d", principalCount)
	}
}

func TestFotoRepo_Delete_RemovesFoto(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)
	fotos := repo.NewFotoRepo(conn)

	imovelID := createTestImovel(t, imoveis)
	id, err := fotos.Create(ctx, repo.Foto{ImovelID: imovelID, CaminhoOriginal: "a-original.jpg", CaminhoThumb: "a-thumb.jpg", CaminhoGrande: "a-grande.jpg", Ordem: 0})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	if err := fotos.Delete(ctx, id); err != nil {
		t.Fatalf("Delete returned error: %v", err)
	}

	list, err := fotos.ListByImovel(ctx, imovelID)
	if err != nil {
		t.Fatalf("ListByImovel returned error: %v", err)
	}
	if len(list) != 0 {
		t.Errorf("expected 0 fotos after delete, got %d", len(list))
	}
}
