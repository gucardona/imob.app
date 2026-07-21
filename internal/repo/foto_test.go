package repo_test

import (
	"context"
	"errors"
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

func TestFotoRepo_Reorder_UpdatesOrdem(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)
	fotos := repo.NewFotoRepo(conn)

	imovelID := createTestImovel(t, imoveis)
	firstID, _ := fotos.Create(ctx, repo.Foto{ImovelID: imovelID, CaminhoOriginal: "a-original.jpg", CaminhoThumb: "a-thumb.jpg", CaminhoGrande: "a-grande.jpg", Ordem: 0})
	secondID, _ := fotos.Create(ctx, repo.Foto{ImovelID: imovelID, CaminhoOriginal: "b-original.jpg", CaminhoThumb: "b-thumb.jpg", CaminhoGrande: "b-grande.jpg", Ordem: 1})
	thirdID, _ := fotos.Create(ctx, repo.Foto{ImovelID: imovelID, CaminhoOriginal: "c-original.jpg", CaminhoThumb: "c-thumb.jpg", CaminhoGrande: "c-grande.jpg", Ordem: 2})

	if err := fotos.Reorder(ctx, imovelID, []int64{thirdID, firstID, secondID}); err != nil {
		t.Fatalf("Reorder returned error: %v", err)
	}

	list, err := fotos.ListByImovel(ctx, imovelID)
	if err != nil {
		t.Fatalf("ListByImovel returned error: %v", err)
	}
	got := []int64{list[0].ID, list[1].ID, list[2].ID}
	want := []int64{thirdID, firstID, secondID}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected order %v, got %v", want, got)
		}
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

	if err := fotos.Delete(ctx, imovelID, id); err != nil {
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

func TestFotoRepo_GetPrincipal_ReturnsPrincipalFoto(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)
	fotos := repo.NewFotoRepo(conn)

	id, err := imoveis.Create(ctx, sampleImovel())
	if err != nil {
		t.Fatalf("Create imovel returned error: %v", err)
	}

	fotoID, err := fotos.Create(ctx, repo.Foto{
		ImovelID:        id,
		CaminhoOriginal: "1/foto-1-original.jpg",
		CaminhoThumb:    "1/foto-1-thumb.jpg",
		CaminhoGrande:   "1/foto-1-grande.jpg",
		Principal:       true,
		Ordem:           0,
	})
	if err != nil {
		t.Fatalf("Create foto returned error: %v", err)
	}

	got, err := fotos.GetPrincipal(ctx, id)
	if err != nil {
		t.Fatalf("GetPrincipal returned error: %v", err)
	}
	if got.ID != fotoID {
		t.Errorf("expected fotoID %d, got %d", fotoID, got.ID)
	}
	if got.CaminhoThumb != "1/foto-1-thumb.jpg" {
		t.Errorf("expected thumb path, got %q", got.CaminhoThumb)
	}
}

func TestFotoRepo_GetByID_ReturnsFoto(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)
	fotos := repo.NewFotoRepo(conn)

	imovelID := createTestImovel(t, imoveis)
	fotoID, err := fotos.Create(ctx, repo.Foto{
		ImovelID:        imovelID,
		CaminhoOriginal: "1/a-original.jpg",
		CaminhoThumb:    "1/a-thumb.jpg",
		CaminhoGrande:   "1/a-grande.jpg",
		Ordem:           0,
	})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	got, err := fotos.GetByID(ctx, imovelID, fotoID)
	if err != nil {
		t.Fatalf("GetByID returned error: %v", err)
	}
	if got.ID != fotoID {
		t.Errorf("expected fotoID %d, got %d", fotoID, got.ID)
	}
	if got.CaminhoOriginal != "1/a-original.jpg" {
		t.Errorf("expected CaminhoOriginal %q, got %q", "1/a-original.jpg", got.CaminhoOriginal)
	}
}

func TestFotoRepo_GetByID_NotFound(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)
	fotos := repo.NewFotoRepo(conn)

	imovelID := createTestImovel(t, imoveis)

	_, err := fotos.GetByID(ctx, imovelID, 9999)
	if !errors.Is(err, repo.ErrNotFound) {
		t.Errorf("expected repo.ErrNotFound, got %v", err)
	}
}

func TestFotoRepo_GetPrincipal_NotFoundWhenNoPrincipal(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)
	fotos := repo.NewFotoRepo(conn)

	id, err := imoveis.Create(ctx, sampleImovel())
	if err != nil {
		t.Fatalf("Create imovel returned error: %v", err)
	}

	_, err = fotos.GetPrincipal(ctx, id)
	if !errors.Is(err, repo.ErrNotFound) {
		t.Errorf("expected repo.ErrNotFound for imovel with no fotos, got %v", err)
	}
}
