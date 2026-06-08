package handlers_test

import (
	"context"
	"database/sql"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gucardona/imob.app/internal/auth"
	"github.com/gucardona/imob.app/internal/config"
	"github.com/gucardona/imob.app/internal/db"
	"github.com/gucardona/imob.app/internal/handlers"
	"github.com/gucardona/imob.app/internal/repo"
)

func newTestRouter(t *testing.T) http.Handler {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "test.db")
	conn, err := db.Open(dbPath)
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}
	t.Cleanup(func() { conn.Close() })

	if err := db.Migrate(conn); err != nil {
		t.Fatalf("Migrate returned error: %v", err)
	}

	cfg := config.Config{
		SessionSecret: "test-secret-do-not-use-in-prod",
		UploadsDir:    t.TempDir(),
	}

	return handlers.NewRouter(handlers.Deps{Conn: conn, Config: cfg})
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

func TestRouter_AdminImoveisList_RequiresAuth(t *testing.T) {
	router := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/admin/imoveis", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusSeeOther {
		t.Errorf("expected redirect status %d, got %d", http.StatusSeeOther, rec.Code)
	}
	if loc := rec.Header().Get("Location"); loc != "/admin/login" {
		t.Errorf("expected redirect to /admin/login, got %q", loc)
	}
}

func loginAsTestAdmin(t *testing.T, conn *sql.DB, router http.Handler) []*http.Cookie {
	t.Helper()

	hash, err := auth.HashPassword("senha-segura")
	if err != nil {
		t.Fatalf("HashPassword returned error: %v", err)
	}
	if _, err := repo.NewAdminRepo(conn).Create(context.Background(), "admin@example.com", hash); err != nil {
		t.Fatalf("creating admin returned error: %v", err)
	}

	form := url.Values{"email": {"admin@example.com"}, "senha": {"senha-segura"}}
	req := httptest.NewRequest(http.MethodPost, "/admin/login", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusSeeOther {
		t.Fatalf("expected login redirect %d, got %d: %s", http.StatusSeeOther, rec.Code, rec.Body.String())
	}

	return rec.Result().Cookies()
}

func TestRouter_AdminImoveis_FullCRUDFlow(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")
	conn, err := db.Open(dbPath)
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	if err := db.Migrate(conn); err != nil {
		t.Fatalf("Migrate returned error: %v", err)
	}

	cfg := config.Config{SessionSecret: "test-secret-do-not-use-in-prod", UploadsDir: t.TempDir()}
	router := handlers.NewRouter(handlers.Deps{Conn: conn, Config: cfg})

	cookies := loginAsTestAdmin(t, conn, router)
	authedRequest := func(method, target string, body io.Reader, contentType string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, target, body)
		if contentType != "" {
			req.Header.Set("Content-Type", contentType)
		}
		for _, c := range cookies {
			req.AddCookie(c)
		}
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		return rec
	}

	createForm := url.Values{
		"titulo": {"Casa de Praia"}, "descricao": {"Bem perto do mar."},
		"tipo": {"casa"}, "finalidade": {"venda"},
		"cidade": {"Florianópolis"}, "bairro": {"Jurerê"}, "endereco": {"Av. Beira Mar, 1"},
		"preco": {"1200000"}, "area_m2": {"220"}, "quartos": {"4"}, "banheiros": {"3"},
		"vagas_garagem": {"2"}, "status": {"disponivel"}, "destaque": {"1"},
	}
	createRec := authedRequest(http.MethodPost, "/admin/imoveis", strings.NewReader(createForm.Encode()), "application/x-www-form-urlencoded")
	if createRec.Code != http.StatusSeeOther {
		t.Fatalf("expected create redirect %d, got %d: %s", http.StatusSeeOther, createRec.Code, createRec.Body.String())
	}
	location := createRec.Header().Get("Location")

	listRec := authedRequest(http.MethodGet, "/admin/imoveis", nil, "")
	if !strings.Contains(listRec.Body.String(), "Casa de Praia") {
		t.Errorf("expected list to contain the new imóvel, got: %s", listRec.Body.String())
	}

	editRec := authedRequest(http.MethodGet, location, nil, "")
	if editRec.Code != http.StatusOK || !strings.Contains(editRec.Body.String(), "Casa de Praia") {
		t.Fatalf("expected edit form %d w/ titulo, got %d: %s", http.StatusOK, editRec.Code, editRec.Body.String())
	}

	updateForm := url.Values(createForm)
	updateForm.Set("titulo", "Casa de Praia Reformada")
	updateRec := authedRequest(http.MethodPost, strings.TrimSuffix(location, "/editar"), strings.NewReader(updateForm.Encode()), "application/x-www-form-urlencoded")
	if updateRec.Code != http.StatusSeeOther {
		t.Fatalf("expected update redirect %d, got %d: %s", http.StatusSeeOther, updateRec.Code, updateRec.Body.String())
	}

	listRec = authedRequest(http.MethodGet, "/admin/imoveis", nil, "")
	if !strings.Contains(listRec.Body.String(), "Casa de Praia Reformada") {
		t.Errorf("expected list to reflect the update, got: %s", listRec.Body.String())
	}

	destaqueRec := authedRequest(http.MethodPost, strings.TrimSuffix(location, "/editar")+"/destaque", nil, "")
	if destaqueRec.Code != http.StatusSeeOther {
		t.Fatalf("expected destaque toggle redirect %d, got %d", http.StatusSeeOther, destaqueRec.Code)
	}

	deleteRec := authedRequest(http.MethodPost, strings.TrimSuffix(location, "/editar")+"/excluir", nil, "")
	if deleteRec.Code != http.StatusSeeOther {
		t.Fatalf("expected delete redirect %d, got %d", http.StatusSeeOther, deleteRec.Code)
	}

	listRec = authedRequest(http.MethodGet, "/admin/imoveis", nil, "")
	if strings.Contains(listRec.Body.String(), "Casa de Praia Reformada") {
		t.Errorf("expected deleted imóvel to be gone from the list, got: %s", listRec.Body.String())
	}
}
