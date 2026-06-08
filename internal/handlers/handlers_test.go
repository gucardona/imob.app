package handlers_test

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"regexp"
	"strconv"
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

func TestRouter_Home_RendersPage(t *testing.T) {
	router := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Imóveis") {
		t.Errorf("expected body to contain nav link 'Imóveis', got: %s", rec.Body.String())
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

	imovelID, err := strconv.ParseInt(strings.TrimSuffix(strings.TrimPrefix(location, "/admin/imoveis/"), "/editar"), 10, 64)
	if err != nil {
		t.Fatalf("failed to parse imóvel ID from location %q: %v", location, err)
	}
	imoveis := repo.NewImovelRepo(conn)
	updated, err := imoveis.Get(context.Background(), imovelID)
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if updated.Destaque {
		t.Error("expected destaque to be toggled off")
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

func TestRouter_AdminFotos_UploadPrincipalAndRemoveFlow(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")
	conn, err := db.Open(dbPath)
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	if err := db.Migrate(conn); err != nil {
		t.Fatalf("Migrate returned error: %v", err)
	}

	uploadsDir := t.TempDir()
	cfg := config.Config{SessionSecret: "test-secret-do-not-use-in-prod", UploadsDir: uploadsDir}
	router := handlers.NewRouter(handlers.Deps{Conn: conn, Config: cfg})
	cookies := loginAsTestAdmin(t, conn, router)

	imoveis := repo.NewImovelRepo(conn)
	imovelID, err := imoveis.Create(context.Background(), repo.Imovel{
		Titulo: "Imóvel com Fotos", Tipo: "casa", Finalidade: "venda",
		Cidade: "Blumenau", Bairro: "Centro", Status: "disponivel", Preco: 500000,
	})
	if err != nil {
		t.Fatalf("creating imóvel returned error: %v", err)
	}

	uploadRec := uploadSampleFoto(t, router, cookies, imovelID)
	if uploadRec.Code != http.StatusOK {
		t.Fatalf("expected upload status %d, got %d: %s", http.StatusOK, uploadRec.Code, uploadRec.Body.String())
	}
	if !strings.Contains(uploadRec.Body.String(), "fotos-grid") {
		t.Errorf("expected fragment to contain the fotos grid, got: %s", uploadRec.Body.String())
	}

	imgSrcMatch := regexp.MustCompile(`<img src="([^"]+)"`).FindStringSubmatch(uploadRec.Body.String())
	if len(imgSrcMatch) != 2 {
		t.Fatalf("expected to find an <img src> in the fragment, got: %s", uploadRec.Body.String())
	}
	imgSrc := imgSrcMatch[1]
	if !strings.HasPrefix(imgSrc, fmt.Sprintf("/uploads/%d/", imovelID)) {
		t.Errorf("expected img src to be a servable /uploads/%d/... URL, got %q", imovelID, imgSrc)
	}
	if strings.Contains(imgSrc, uploadsDir) {
		t.Errorf("expected img src %q to be decoupled from the configured uploadsDir %q, but it contains it", imgSrc, uploadsDir)
	}

	imgReq := httptest.NewRequest(http.MethodGet, imgSrc, nil)
	for _, c := range cookies {
		imgReq.AddCookie(c)
	}
	imgRec := httptest.NewRecorder()
	router.ServeHTTP(imgRec, imgReq)
	if imgRec.Code != http.StatusOK {
		t.Fatalf("expected GET %s status %d, got %d", imgSrc, http.StatusOK, imgRec.Code)
	}
	if ct := imgRec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "image/") {
		t.Errorf("expected GET %s Content-Type to start with image/, got %q", imgSrc, ct)
	}

	fotos := repo.NewFotoRepo(conn)
	list, err := fotos.ListByImovel(context.Background(), imovelID)
	if err != nil {
		t.Fatalf("ListByImovel returned error: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 foto after upload, got %d", len(list))
	}
	fotoID := list[0].ID

	principalReq := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/admin/imoveis/%d/fotos/%d/principal", imovelID, fotoID), nil)
	for _, c := range cookies {
		principalReq.AddCookie(c)
	}
	principalRec := httptest.NewRecorder()
	router.ServeHTTP(principalRec, principalReq)
	if principalRec.Code != http.StatusOK {
		t.Fatalf("expected principal toggle status %d, got %d", http.StatusOK, principalRec.Code)
	}

	list, _ = fotos.ListByImovel(context.Background(), imovelID)
	if !list[0].Principal {
		t.Error("expected foto to be marked principal")
	}

	deleteReq := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/admin/imoveis/%d/fotos/%d/excluir", imovelID, fotoID), nil)
	for _, c := range cookies {
		deleteReq.AddCookie(c)
	}
	deleteRec := httptest.NewRecorder()
	router.ServeHTTP(deleteRec, deleteReq)
	if deleteRec.Code != http.StatusOK {
		t.Fatalf("expected delete status %d, got %d", http.StatusOK, deleteRec.Code)
	}

	list, _ = fotos.ListByImovel(context.Background(), imovelID)
	if len(list) != 0 {
		t.Errorf("expected 0 fotos after removal, got %d", len(list))
	}
}

func uploadSampleFoto(t *testing.T, router http.Handler, cookies []*http.Cookie, imovelID int64) *httptest.ResponseRecorder {
	t.Helper()

	img := image.NewRGBA(image.Rect(0, 0, 600, 400))
	for y := 0; y < 400; y++ {
		for x := 0; x < 600; x++ {
			img.Set(x, y, color.RGBA{R: uint8(x % 256), G: uint8(y % 256), B: 80, A: 255})
		}
	}
	var imgBuf bytes.Buffer
	if err := jpeg.Encode(&imgBuf, img, &jpeg.Options{Quality: 90}); err != nil {
		t.Fatalf("encoding sample JPEG: %v", err)
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("fotos", "foto.jpg")
	if err != nil {
		t.Fatalf("creating form file: %v", err)
	}
	if _, err := part.Write(imgBuf.Bytes()); err != nil {
		t.Fatalf("writing form file: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("closing multipart writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/admin/imoveis/%d/fotos", imovelID), &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	for _, c := range cookies {
		req.AddCookie(c)
	}

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}
