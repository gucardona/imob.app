package handlers_test

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gucardona/imob.app/internal/db"
	"github.com/gucardona/imob.app/internal/handlers"
)

func newTestRouter(t *testing.T) http.Handler {
	t.Helper()

	path := filepath.Join(t.TempDir(), "test.db")
	conn, err := db.Open(path)
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}
	t.Cleanup(func() { conn.Close() })

	if err := db.Migrate(conn); err != nil {
		t.Fatalf("Migrate returned error: %v", err)
	}

	return handlers.NewRouter(conn)
}

func TestRouter_Healthz_ReturnsOK(t *testing.T) {
	router := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
	if rec.Body.String() != "ok" {
		t.Errorf("expected body %q, got %q", "ok", rec.Body.String())
	}
}

func TestRouter_Home_RendersWelcomePage(t *testing.T) {
	router := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Bem-vindo") {
		t.Errorf("expected body to contain %q, got: %s", "Bem-vindo", rec.Body.String())
	}
}
