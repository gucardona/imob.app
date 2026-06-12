package repo_test

import (
	"context"
	"database/sql"
	"errors"
	"path/filepath"
	"testing"

	idb "github.com/gucardona/imob.app/internal/db"
	"github.com/gucardona/imob.app/internal/repo"
)

func newTestDB(t *testing.T) *sql.DB {
	t.Helper()

	path := filepath.Join(t.TempDir(), "test.db")
	conn, err := idb.Open(path)
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}
	t.Cleanup(func() { conn.Close() })

	if err := idb.Migrate(conn); err != nil {
		t.Fatalf("Migrate returned error: %v", err)
	}

	return conn
}

func TestAdminRepo_CreateThenFindByEmail(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	admins := repo.NewAdminRepo(conn)

	id, err := admins.Create(ctx, "admin@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if id == 0 {
		t.Error("expected a non-zero id")
	}

	found, err := admins.FindByEmail(ctx, "admin@example.com")
	if err != nil {
		t.Fatalf("FindByEmail returned error: %v", err)
	}
	if found.ID != id {
		t.Errorf("expected id %d, got %d", id, found.ID)
	}
	if found.SenhaHash != "hashed-password" {
		t.Errorf("expected stored hash %q, got %q", "hashed-password", found.SenhaHash)
	}
}

func TestAdminRepo_FindByEmail_ReturnsErrNotFound(t *testing.T) {
	conn := newTestDB(t)
	admins := repo.NewAdminRepo(conn)

	_, err := admins.FindByEmail(context.Background(), "missing@example.com")
	if !errors.Is(err, repo.ErrNotFound) {
		t.Errorf("expected repo.ErrNotFound, got %v", err)
	}
}

func TestAdminRepo_FindByID_ReturnsAdmin(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	admins := repo.NewAdminRepo(conn)

	id, err := admins.Create(ctx, "admin2@example.com", "hash2")
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	found, err := admins.FindByID(ctx, id)
	if err != nil {
		t.Fatalf("FindByID returned error: %v", err)
	}
	if found.ID != id {
		t.Errorf("expected id %d, got %d", id, found.ID)
	}
	if found.Email != "admin2@example.com" {
		t.Errorf("expected email %q, got %q", "admin2@example.com", found.Email)
	}
}

func TestAdminRepo_FindByID_NotFound(t *testing.T) {
	conn := newTestDB(t)
	admins := repo.NewAdminRepo(conn)

	_, err := admins.FindByID(context.Background(), 9999)
	if !errors.Is(err, repo.ErrNotFound) {
		t.Errorf("expected repo.ErrNotFound, got %v", err)
	}
}
