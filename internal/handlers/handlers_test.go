package handlers_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
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

func TestRouter_AdminMe_RequiresAuth(t *testing.T) {
	router := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/api/admin/me", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("expected JSON content-type, got %q", ct)
	}
}

func TestRouter_AdminImoveisList_RequiresAuth(t *testing.T) {
	router := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/api/admin/imoveis", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("expected JSON content-type, got %q", ct)
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

	body, _ := json.Marshal(map[string]string{"email": "admin@example.com", "senha": "senha-segura"})
	req := httptest.NewRequest(http.MethodPost, "/api/admin/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected login status 200, got %d: %s", rec.Code, rec.Body.String())
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
	jsonBody := func(v any) io.Reader {
		b, _ := json.Marshal(v)
		return bytes.NewReader(b)
	}

	payload := map[string]any{
		"Titulo": "Casa de Praia", "Descricao": "Bem perto do mar.",
		"Tipo": "casa", "Finalidade": "venda",
		"Cidade": "Florianópolis", "Bairro": "Jurerê", "Endereco": "Av. Beira Mar, 1",
		"Preco": 1200000.0, "AreaM2": 220.0, "Quartos": 4, "Banheiros": 3,
		"VagasGaragem": 2, "Status": "disponivel", "Destaque": true,
	}

	// Create → 201
	createRec := authedRequest(http.MethodPost, "/api/admin/imoveis", jsonBody(payload), "application/json")
	if createRec.Code != http.StatusCreated {
		t.Fatalf("expected create status 201, got %d: %s", createRec.Code, createRec.Body.String())
	}
	var created struct{ ID int64 }
	if err := json.NewDecoder(createRec.Body).Decode(&created); err != nil {
		t.Fatalf("decoding create response: %v", err)
	}
	if created.ID == 0 {
		t.Fatal("expected non-zero ID from create response")
	}
	imovelID := created.ID

	// List → contains new imovel
	listRec := authedRequest(http.MethodGet, "/api/admin/imoveis", nil, "")
	if listRec.Code != http.StatusOK {
		t.Fatalf("expected list status 200, got %d", listRec.Code)
	}
	if !strings.Contains(listRec.Body.String(), "Casa de Praia") {
		t.Errorf("expected list to contain the new imóvel, got: %s", listRec.Body.String())
	}

	// Get single → 200, returns {Imovel, Fotos}
	getRec := authedRequest(http.MethodGet, fmt.Sprintf("/api/admin/imoveis/%d", imovelID), nil, "")
	if getRec.Code != http.StatusOK {
		t.Fatalf("expected get status 200, got %d: %s", getRec.Code, getRec.Body.String())
	}
	if !strings.Contains(getRec.Body.String(), "Casa de Praia") {
		t.Errorf("expected get response to contain titulo, got: %s", getRec.Body.String())
	}

	// Update → 200
	payload["Titulo"] = "Casa de Praia Reformada"
	updateRec := authedRequest(http.MethodPut, fmt.Sprintf("/api/admin/imoveis/%d", imovelID), jsonBody(payload), "application/json")
	if updateRec.Code != http.StatusOK {
		t.Fatalf("expected update status 200, got %d: %s", updateRec.Code, updateRec.Body.String())
	}

	listRec = authedRequest(http.MethodGet, "/api/admin/imoveis", nil, "")
	if !strings.Contains(listRec.Body.String(), "Casa de Praia Reformada") {
		t.Errorf("expected list to reflect the update, got: %s", listRec.Body.String())
	}

	// Toggle destaque (created with Destaque:true → toggles to false)
	destaqueRec := authedRequest(http.MethodPost, fmt.Sprintf("/api/admin/imoveis/%d/destaque", imovelID), nil, "")
	if destaqueRec.Code != http.StatusOK {
		t.Fatalf("expected destaque toggle status 200, got %d", destaqueRec.Code)
	}
	imoveis := repo.NewImovelRepo(conn)
	updated, err := imoveis.Get(context.Background(), imovelID)
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if updated.Destaque {
		t.Error("expected destaque to be toggled off")
	}

	// Delete → 200
	deleteRec := authedRequest(http.MethodDelete, fmt.Sprintf("/api/admin/imoveis/%d", imovelID), nil, "")
	if deleteRec.Code != http.StatusOK {
		t.Fatalf("expected delete status 200, got %d", deleteRec.Code)
	}

	listRec = authedRequest(http.MethodGet, "/api/admin/imoveis", nil, "")
	if strings.Contains(listRec.Body.String(), "Casa de Praia Reformada") {
		t.Errorf("expected deleted imóvel to be gone from list, got: %s", listRec.Body.String())
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
		t.Fatalf("expected upload status 200, got %d: %s", uploadRec.Code, uploadRec.Body.String())
	}
	if ct := uploadRec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("expected JSON content-type on upload, got %q", ct)
	}

	var fotosResp []repo.Foto
	if err := json.NewDecoder(uploadRec.Body).Decode(&fotosResp); err != nil {
		t.Fatalf("decoding fotos response: %v", err)
	}
	if len(fotosResp) != 1 {
		t.Fatalf("expected 1 foto in response, got %d", len(fotosResp))
	}
	fotoID := fotosResp[0].ID
	imgSrc := "/uploads/" + fotosResp[0].CaminhoOriginal

	if !strings.HasPrefix(imgSrc, fmt.Sprintf("/uploads/%d/", imovelID)) {
		t.Errorf("expected img src to be /uploads/%d/..., got %q", imovelID, imgSrc)
	}
	if strings.Contains(imgSrc, uploadsDir) {
		t.Errorf("expected img src %q to be decoupled from uploadsDir %q", imgSrc, uploadsDir)
	}

	imgReq := httptest.NewRequest(http.MethodGet, imgSrc, nil)
	imgRec := httptest.NewRecorder()
	router.ServeHTTP(imgRec, imgReq)
	if imgRec.Code != http.StatusOK {
		t.Fatalf("expected GET %s status 200, got %d", imgSrc, imgRec.Code)
	}
	if ct := imgRec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "image/") {
		t.Errorf("expected GET %s Content-Type to start with image/, got %q", imgSrc, ct)
	}

	// Set principal
	principalReq := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/admin/imoveis/%d/fotos/%d/principal", imovelID, fotoID), nil)
	for _, c := range cookies {
		principalReq.AddCookie(c)
	}
	principalRec := httptest.NewRecorder()
	router.ServeHTTP(principalRec, principalReq)
	if principalRec.Code != http.StatusOK {
		t.Fatalf("expected principal toggle status 200, got %d", principalRec.Code)
	}

	fotos := repo.NewFotoRepo(conn)
	list, err := fotos.ListByImovel(context.Background(), imovelID)
	if err != nil {
		t.Fatalf("ListByImovel returned error: %v", err)
	}
	if !list[0].Principal {
		t.Error("expected foto to be marked principal")
	}

	// Delete foto
	deleteReq := httptest.NewRequest(http.MethodDelete, fmt.Sprintf("/api/admin/imoveis/%d/fotos/%d", imovelID, fotoID), nil)
	for _, c := range cookies {
		deleteReq.AddCookie(c)
	}
	deleteRec := httptest.NewRecorder()
	router.ServeHTTP(deleteRec, deleteReq)
	if deleteRec.Code != http.StatusOK {
		t.Fatalf("expected delete status 200, got %d", deleteRec.Code)
	}

	list, _ = fotos.ListByImovel(context.Background(), imovelID)
	if len(list) != 0 {
		t.Errorf("expected 0 fotos after removal, got %d", len(list))
	}
}

func samplePublicImovel() repo.Imovel {
	return repo.Imovel{
		Titulo:       "Casa com Vista para o Mar",
		Descricao:    "Linda casa.",
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

func TestRouter_PublicImoveis_ListsDisponivel(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")
	conn, err := db.Open(dbPath)
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	if err := db.Migrate(conn); err != nil {
		t.Fatalf("Migrate returned error: %v", err)
	}
	cfg := config.Config{SessionSecret: "test-secret", UploadsDir: t.TempDir()}
	router := handlers.NewRouter(handlers.Deps{Conn: conn, Config: cfg})

	ir := repo.NewImovelRepo(conn)
	ctx := context.Background()

	disponivel := samplePublicImovel()
	if _, err := ir.Create(ctx, disponivel); err != nil {
		t.Fatalf("Create disponivel returned error: %v", err)
	}

	vendido := samplePublicImovel()
	vendido.Titulo = "Casa Vendida"
	vendido.Status = "vendido"
	if _, err := ir.Create(ctx, vendido); err != nil {
		t.Fatalf("Create vendido returned error: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/imoveis", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
	body := rec.Body.String()
	if !strings.Contains(body, disponivel.Titulo) {
		t.Errorf("expected body to contain disponivel imovel %q", disponivel.Titulo)
	}
	if strings.Contains(body, "Casa Vendida") {
		t.Errorf("expected body to not contain vendido imovel")
	}
}

func TestRouter_PublicImoveis_FilterByFinalidade(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")
	conn, err := db.Open(dbPath)
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	if err := db.Migrate(conn); err != nil {
		t.Fatalf("Migrate returned error: %v", err)
	}
	cfg := config.Config{SessionSecret: "test-secret", UploadsDir: t.TempDir()}
	router := handlers.NewRouter(handlers.Deps{Conn: conn, Config: cfg})

	ir := repo.NewImovelRepo(conn)
	ctx := context.Background()

	venda := samplePublicImovel()
	venda.Finalidade = "venda"
	if _, err := ir.Create(ctx, venda); err != nil {
		t.Fatalf("Create venda returned error: %v", err)
	}

	aluguel := samplePublicImovel()
	aluguel.Titulo = "Casa para Alugar"
	aluguel.Finalidade = "aluguel"
	if _, err := ir.Create(ctx, aluguel); err != nil {
		t.Fatalf("Create aluguel returned error: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/imoveis?finalidade=venda", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
	body := rec.Body.String()
	if !strings.Contains(body, venda.Titulo) {
		t.Errorf("expected body to contain venda imovel %q", venda.Titulo)
	}
	if strings.Contains(body, "Casa para Alugar") {
		t.Errorf("expected body to not contain aluguel imovel when filtering by venda")
	}
}

func TestRouter_PublicImovelDetail_BySlug(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")
	conn, err := db.Open(dbPath)
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	if err := db.Migrate(conn); err != nil {
		t.Fatalf("Migrate returned error: %v", err)
	}
	cfg := config.Config{SessionSecret: "test-secret", UploadsDir: t.TempDir()}
	router := handlers.NewRouter(handlers.Deps{Conn: conn, Config: cfg})

	ir := repo.NewImovelRepo(conn)
	ctx := context.Background()

	im := samplePublicImovel()
	if _, err := ir.Create(ctx, im); err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/imoveis/casa-com-vista-para-o-mar", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), im.Titulo) {
		t.Errorf("expected body to contain imovel titulo %q", im.Titulo)
	}
}

func TestRouter_PublicImovelDetail_NotFound(t *testing.T) {
	router := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/api/imoveis/slug-inexistente", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", rec.Code)
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

	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/admin/imoveis/%d/fotos", imovelID), &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	for _, c := range cookies {
		req.AddCookie(c)
	}

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}
