# Admin React Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Go/Templ admin panel with a React SPA that communicates with new `/api/admin/*` JSON endpoints, deleting all Templ code.

**Architecture:** Admin lives in `frontend/src/admin/`, lazy-loaded into the existing Vite app. Go exposes `/api/admin/*` JSON endpoints behind cookie-session auth (`RequireAuth`). All Templ files, Templ handler files, and the `templ` Go dependency are removed.

**Tech Stack:** Go 1.22 (net/http), React 18 + Vite 5, React Router v6, Tailwind CSS 3, iconify-icon CDN, General Sans font.

---

## File Map

**Create:**
- `internal/handlers/admin_api.go` — all admin JSON handlers (auth, imoveis, fotos, config)

**Modify:**
- `internal/handlers/middleware.go` — `RequireAuth` returns 401 JSON instead of redirect
- `internal/handlers/handlers.go` — replace Templ routes with `/api/admin/*` JSON routes
- `internal/handlers/handlers_test.go` — rewrite for new JSON API
- `internal/repo/admin.go` — add `FindByID`
- `Makefile` — remove `templ generate`
- `frontend/src/App.jsx` — add lazy admin route

**Delete:**
- `internal/templates/` (entire directory — all `.templ` and `_templ.go` files)
- `internal/handlers/admin_auth.go`
- `internal/handlers/admin_imoveis.go`
- `internal/handlers/admin_fotos.go`
- `internal/handlers/admin_configuracao.go`

**Create (frontend):**
- `frontend/src/admin/api.js`
- `frontend/src/admin/AuthContext.jsx`
- `frontend/src/admin/AuthGuard.jsx`
- `frontend/src/admin/AdminLayout.jsx`
- `frontend/src/admin/AdminRouter.jsx`
- `frontend/src/admin/pages/Login.jsx`
- `frontend/src/admin/pages/ImoveisList.jsx`
- `frontend/src/admin/pages/ImovelForm.jsx`
- `frontend/src/admin/pages/Configuracao.jsx`
- `frontend/src/admin/components/StatusBadge.jsx`
- `frontend/src/admin/components/FotosGrid.jsx`

---

## Task 1: Update RequireAuth to return 401 JSON

**Files:**
- Modify: `internal/handlers/middleware.go`

- [ ] **Step 1: Update `RequireAuth` to return 401 JSON instead of redirect**

Replace the entire file content:

```go
package handlers

import (
	"context"
	"net/http"

	"github.com/gucardona/imob.app/internal/auth"
)

type contextKey string

const adminIDContextKey contextKey = "adminID"

// RequireAuth verifies the session cookie and returns 401 JSON if absent/invalid.
// Renews the session on every authenticated request and stores the admin ID in context.
func RequireAuth(sessions auth.SessionManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			adminID, ok := sessions.Verify(r)
			if !ok {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`{"error":"unauthorized"}`))
				return
			}

			sessions.Issue(w, adminID)

			ctx := context.WithValue(r.Context(), adminIDContextKey, adminID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add internal/handlers/middleware.go
git commit -m "refactor: RequireAuth returns 401 JSON for API routes"
```

---

## Task 2: Add AdminRepo.FindByID

**Files:**
- Modify: `internal/repo/admin.go`

- [ ] **Step 1: Add `FindByID` method to `AdminRepo`**

Append after the existing `FindByEmail` method in `internal/repo/admin.go`:

```go
func (r AdminRepo) FindByID(ctx context.Context, id int64) (Admin, error) {
	var a Admin
	err := r.conn.QueryRowContext(ctx,
		`SELECT id, email, senha_hash FROM admins WHERE id = ?`, id,
	).Scan(&a.ID, &a.Email, &a.SenhaHash)
	if errors.Is(err, sql.ErrNoRows) {
		return Admin{}, ErrNotFound
	}
	return a, err
}
```

- [ ] **Step 2: Run existing repo tests to verify no regression**

```bash
go test ./internal/repo/... -v
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add internal/repo/admin.go
git commit -m "feat: add AdminRepo.FindByID for /api/admin/me endpoint"
```

---

## Task 3: Create admin_api.go

**Files:**
- Create: `internal/handlers/admin_api.go`

This file contains all admin JSON handlers. It preserves `dummyHash`, `maxUploadBytes`, `saveLogo`, and `parseIDPathValue` from the files being deleted.

- [ ] **Step 1: Create `internal/handlers/admin_api.go`**

```go
package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/disintegration/imaging"
	"github.com/gucardona/imob.app/internal/auth"
	"github.com/gucardona/imob.app/internal/images"
	"github.com/gucardona/imob.app/internal/repo"
)

const maxUploadBytes = 32 << 20 // 32 MiB

// dummyHash equalises login timing for unknown-email attempts.
var dummyHash, _ = auth.HashPassword("dummy-constant-timing")

type adminAPIHandlers struct {
	uploadsDir string
	sessions   auth.SessionManager
	admins     repo.AdminRepo
	imoveis    repo.ImovelRepo
	fotos      repo.FotoRepo
	cfg        repo.ConfiguracaoRepo
}

func newAdminAPIHandlers(
	uploadsDir string,
	sessions auth.SessionManager,
	admins repo.AdminRepo,
	imoveis repo.ImovelRepo,
	fotos repo.FotoRepo,
	cfg repo.ConfiguracaoRepo,
) adminAPIHandlers {
	return adminAPIHandlers{
		uploadsDir: uploadsDir,
		sessions:   sessions,
		admins:     admins,
		imoveis:    imoveis,
		fotos:      fotos,
		cfg:        cfg,
	}
}

// ── Auth ─────────────────────────────────────────────────────────────────────

func (h adminAPIHandlers) me(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value(adminIDContextKey).(int64)
	admin, err := h.admins.FindByID(r.Context(), adminID)
	if err != nil {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}
	writeJSON(w, map[string]string{"email": admin.Email})
}

func (h adminAPIHandlers) login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
		Senha string `json:"senha"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	admin, findErr := h.admins.FindByEmail(r.Context(), body.Email)
	hashToCheck := dummyHash
	if findErr == nil {
		hashToCheck = admin.SenhaHash
	}
	if !auth.VerifyPassword(hashToCheck, body.Senha) || findErr != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":"credenciais inválidas"}`))
		return
	}

	h.sessions.Issue(w, admin.ID)
	writeJSON(w, map[string]bool{"ok": true})
}

func (h adminAPIHandlers) logout(w http.ResponseWriter, r *http.Request) {
	h.sessions.Clear(w)
	writeJSON(w, map[string]bool{"ok": true})
}

// ── Imóveis ───────────────────────────────────────────────────────────────────

type imovelBody struct {
	Titulo       string  `json:"Titulo"`
	Descricao    string  `json:"Descricao"`
	Tipo         string  `json:"Tipo"`
	Finalidade   string  `json:"Finalidade"`
	Cidade       string  `json:"Cidade"`
	Bairro       string  `json:"Bairro"`
	Endereco     string  `json:"Endereco"`
	Preco        float64 `json:"Preco"`
	AreaM2       float64 `json:"AreaM2"`
	Quartos      int     `json:"Quartos"`
	Banheiros    int     `json:"Banheiros"`
	VagasGaragem int     `json:"VagasGaragem"`
	Status       string  `json:"Status"`
	Destaque     bool    `json:"Destaque"`
}

type adminImovelResp struct {
	Imovel repo.Imovel `json:"Imovel"`
	Fotos  []repo.Foto `json:"Fotos"`
}

func (h adminAPIHandlers) imovelList(w http.ResponseWriter, r *http.Request) {
	list, err := h.imoveis.List(r.Context())
	if err != nil {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	if list == nil {
		list = []repo.Imovel{}
	}
	writeJSON(w, list)
}

func (h adminAPIHandlers) imovelGet(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDPathValue(r, "id")
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	imovel, err := h.imoveis.Get(r.Context(), id)
	if errors.Is(err, repo.ErrNotFound) {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	fotos, err := h.fotos.ListByImovel(r.Context(), id)
	if err != nil || fotos == nil {
		fotos = []repo.Foto{}
	}
	writeJSON(w, adminImovelResp{Imovel: imovel, Fotos: fotos})
}

func (h adminAPIHandlers) imovelCreate(w http.ResponseWriter, r *http.Request) {
	var body imovelBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}
	imovel := repo.Imovel{
		Titulo: body.Titulo, Descricao: body.Descricao, Tipo: body.Tipo,
		Finalidade: body.Finalidade, Cidade: body.Cidade, Bairro: body.Bairro,
		Endereco: body.Endereco, Preco: body.Preco, AreaM2: body.AreaM2,
		Quartos: body.Quartos, Banheiros: body.Banheiros, VagasGaragem: body.VagasGaragem,
		Status: body.Status, Destaque: body.Destaque,
	}
	id, err := h.imoveis.Create(r.Context(), imovel)
	if err != nil {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	imovel.ID = id
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, imovel)
}

func (h adminAPIHandlers) imovelUpdate(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDPathValue(r, "id")
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	var body imovelBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}
	imovel := repo.Imovel{
		ID:           id,
		Titulo:       body.Titulo, Descricao: body.Descricao, Tipo: body.Tipo,
		Finalidade:   body.Finalidade, Cidade: body.Cidade, Bairro: body.Bairro,
		Endereco:     body.Endereco, Preco: body.Preco, AreaM2: body.AreaM2,
		Quartos:      body.Quartos, Banheiros: body.Banheiros, VagasGaragem: body.VagasGaragem,
		Status:       body.Status, Destaque: body.Destaque,
	}
	if err := h.imoveis.Update(r.Context(), imovel); err != nil {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	writeJSON(w, imovel)
}

func (h adminAPIHandlers) imovelDelete(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDPathValue(r, "id")
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	if err := h.imoveis.Delete(r.Context(), id); err != nil {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	_ = os.RemoveAll(filepath.Join(h.uploadsDir, strconv.FormatInt(id, 10)))
	writeJSON(w, map[string]bool{"ok": true})
}

func (h adminAPIHandlers) imovelToggleDestaque(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDPathValue(r, "id")
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	imovel, err := h.imoveis.Get(r.Context(), id)
	if errors.Is(err, repo.ErrNotFound) {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	if err := h.imoveis.SetDestaque(r.Context(), id, !imovel.Destaque); err != nil {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	imovel.Destaque = !imovel.Destaque
	writeJSON(w, imovel)
}

// ── Fotos ─────────────────────────────────────────────────────────────────────

func (h adminAPIHandlers) fotoUpload(w http.ResponseWriter, r *http.Request) {
	imovelID, err := parseIDPathValue(r, "id")
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	if _, err := h.imoveis.Get(r.Context(), imovelID); err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		http.Error(w, `{"error":"files too large"}`, http.StatusBadRequest)
		return
	}
	files := r.MultipartForm.File["fotos"]
	existing, err := h.fotos.ListByImovel(r.Context(), imovelID)
	if err != nil {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	nextOrdem := len(existing)
	destDir := filepath.Join(h.uploadsDir, strconv.FormatInt(imovelID, 10))

	for i, header := range files {
		file, err := header.Open()
		if err != nil {
			http.Error(w, `{"error":"bad file"}`, http.StatusBadRequest)
			return
		}
		data := make([]byte, header.Size)
		_, err = io.ReadFull(file, data)
		file.Close()
		if err != nil {
			http.Error(w, `{"error":"bad file"}`, http.StatusBadRequest)
			return
		}
		baseName := fmt.Sprintf("foto-%d-%d", nextOrdem+i+1, time.Now().UnixNano())
		paths, err := images.SaveVariants(data, destDir, baseName)
		if err != nil {
			http.Error(w, `{"error":"bad image"}`, http.StatusBadRequest)
			return
		}
		relDir := strconv.FormatInt(imovelID, 10)
		_, err = h.fotos.Create(r.Context(), repo.Foto{
			ImovelID:        imovelID,
			CaminhoOriginal: filepath.ToSlash(filepath.Join(relDir, paths.Original)),
			CaminhoThumb:    filepath.ToSlash(filepath.Join(relDir, paths.Thumb)),
			CaminhoGrande:   filepath.ToSlash(filepath.Join(relDir, paths.Grande)),
			Ordem:           nextOrdem + i,
		})
		if err != nil {
			http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
			return
		}
	}
	h.writeFotosJSON(w, r, imovelID)
}

func (h adminAPIHandlers) fotoPrincipal(w http.ResponseWriter, r *http.Request) {
	imovelID, err := parseIDPathValue(r, "id")
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	fotoID, err := parseIDPathValue(r, "fotoID")
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	if err := h.fotos.SetPrincipal(r.Context(), imovelID, fotoID); err != nil {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	h.writeFotosJSON(w, r, imovelID)
}

func (h adminAPIHandlers) fotoDelete(w http.ResponseWriter, r *http.Request) {
	imovelID, err := parseIDPathValue(r, "id")
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	fotoID, err := parseIDPathValue(r, "fotoID")
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	foto, err := h.fotos.GetByID(r.Context(), imovelID, fotoID)
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	if err := h.fotos.Delete(r.Context(), imovelID, fotoID); err != nil {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	for _, rel := range []string{foto.CaminhoOriginal, foto.CaminhoThumb, foto.CaminhoGrande} {
		_ = os.Remove(filepath.Join(h.uploadsDir, rel))
	}
	h.writeFotosJSON(w, r, imovelID)
}

func (h adminAPIHandlers) writeFotosJSON(w http.ResponseWriter, r *http.Request, imovelID int64) {
	fotos, err := h.fotos.ListByImovel(r.Context(), imovelID)
	if err != nil {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	if fotos == nil {
		fotos = []repo.Foto{}
	}
	writeJSON(w, fotos)
}

// ── Configuração ──────────────────────────────────────────────────────────────

func (h adminAPIHandlers) configGet(w http.ResponseWriter, r *http.Request) {
	cfg, err := h.cfg.Get(r.Context())
	if errors.Is(err, repo.ErrNotFound) {
		writeJSON(w, repo.Configuracao{})
		return
	}
	if err != nil {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	writeJSON(w, cfg)
}

func (h adminAPIHandlers) configUpdate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	existing, err := h.cfg.Get(ctx)
	if err != nil && !errors.Is(err, repo.ErrNotFound) {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 11<<20)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		if err2 := r.ParseForm(); err2 != nil {
			http.Error(w, `{"error":"invalid form"}`, http.StatusBadRequest)
			return
		}
	}
	cfg := repo.Configuracao{
		NomeImobiliaria: r.FormValue("nome_imobiliaria"),
		CorPrimaria:     r.FormValue("cor_primaria"),
		CorSecundaria:   r.FormValue("cor_secundaria"),
		Endereco:        r.FormValue("endereco"),
		Telefone:        r.FormValue("telefone"),
		Whatsapp:        r.FormValue("whatsapp"),
		Email:           r.FormValue("email"),
		InstagramURL:    r.FormValue("instagram_url"),
		TextoSobre:      r.FormValue("texto_sobre"),
		TextoHome:       r.FormValue("texto_home"),
		HeroImageURL:    r.FormValue("hero_image_url"),
		LogoPath:        existing.LogoPath,
	}
	file, _, err := r.FormFile("logo")
	if err == nil {
		defer file.Close()
		data, err := io.ReadAll(file)
		if err != nil {
			http.Error(w, `{"error":"bad logo"}`, http.StatusBadRequest)
			return
		}
		logoPath, err := saveLogo(h.uploadsDir, data)
		if err != nil {
			http.Error(w, `{"error":"bad logo"}`, http.StatusInternalServerError)
			return
		}
		cfg.LogoPath = logoPath
	}
	if err := h.cfg.Update(ctx, cfg); err != nil {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	writeJSON(w, cfg)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func parseIDPathValue(r *http.Request, name string) (int64, error) {
	return strconv.ParseInt(r.PathValue(name), 10, 64)
}

// saveLogo decodes image data, resizes to max 400 px wide, saves as JPEG.
func saveLogo(uploadsDir string, data []byte) (string, error) {
	ct := http.DetectContentType(data)
	switch ct {
	case "image/jpeg", "image/png", "image/gif":
	default:
		return "", fmt.Errorf("tipo de imagem não suportado: %s", ct)
	}
	img, err := imaging.Decode(bytes.NewReader(data), imaging.AutoOrientation(true))
	if err != nil {
		return "", err
	}
	if img.Bounds().Dx() > 400 {
		img = imaging.Resize(img, 400, 0, imaging.Lanczos)
	}
	destDir := filepath.Join(uploadsDir, "logo")
	if err := os.MkdirAll(destDir, 0o755); err != nil {
		return "", err
	}
	dest := filepath.Join(destDir, "logo.jpg")
	if err := imaging.Save(img, dest, imaging.JPEGQuality(85)); err != nil {
		return "", err
	}
	return "logo/logo.jpg", nil
}
```

- [ ] **Step 2: Verify the file compiles (handlers.go still references old files — compile error is expected here)**

```bash
go build ./internal/handlers/ 2>&1 | head -20
```

Expected: errors about undefined symbols from `admin_auth.go` etc. This is expected — handlers.go still has old routes. Proceed to Task 4.

---

## Task 4: Rewrite handlers.go

**Files:**
- Modify: `internal/handlers/handlers.go`

- [ ] **Step 1: Replace entire `handlers.go` content**

```go
package handlers

import (
	"database/sql"
	"io/fs"
	"net/http"
	"strings"
	"time"

	"github.com/gucardona/imob.app/internal/assets"
	"github.com/gucardona/imob.app/internal/auth"
	"github.com/gucardona/imob.app/internal/config"
	"github.com/gucardona/imob.app/internal/frontend"
	"github.com/gucardona/imob.app/internal/repo"
)

const sessionTTL = 7 * 24 * time.Hour

// Deps bundles every dependency the router and its handlers need.
type Deps struct {
	Conn   *sql.DB
	Config config.Config
}

func NewRouter(deps Deps) http.Handler {
	sessions := auth.NewSessionManager(deps.Config.SessionSecret, sessionTTL, deps.Config.SecureCookies)
	admins := repo.NewAdminRepo(deps.Conn)
	imoveis := repo.NewImovelRepo(deps.Conn)
	fotos := repo.NewFotoRepo(deps.Conn)
	cfgRepo := repo.NewConfiguracaoRepo(deps.Conn)

	api := newAPIHandlers(imoveis, fotos, cfgRepo)
	adminAPI := newAdminAPIHandlers(deps.Config.UploadsDir, sessions, admins, imoveis, fotos, cfgRepo)

	requireAuth := RequireAuth(sessions)

	mux := http.NewServeMux()

	// Infrastructure
	mux.HandleFunc("GET /healthz", handleHealth(deps.Conn))
	mux.Handle("GET /static/", http.FileServerFS(assets.Static))
	mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(deps.Config.UploadsDir))))

	// Public JSON API
	mux.HandleFunc("GET /api/configuracao", api.configuracao)
	mux.HandleFunc("GET /api/imoveis", api.imovelList)
	mux.HandleFunc("GET /api/imoveis/{slug}", api.imovelDetail)

	// Admin auth
	mux.HandleFunc("POST /api/admin/login", adminAPI.login)
	mux.Handle("POST /api/admin/logout", requireAuth(http.HandlerFunc(adminAPI.logout)))
	mux.Handle("GET /api/admin/me", requireAuth(http.HandlerFunc(adminAPI.me)))

	// Admin imóveis
	mux.Handle("GET /api/admin/imoveis", requireAuth(http.HandlerFunc(adminAPI.imovelList)))
	mux.Handle("POST /api/admin/imoveis", requireAuth(http.HandlerFunc(adminAPI.imovelCreate)))
	mux.Handle("GET /api/admin/imoveis/{id}", requireAuth(http.HandlerFunc(adminAPI.imovelGet)))
	mux.Handle("PUT /api/admin/imoveis/{id}", requireAuth(http.HandlerFunc(adminAPI.imovelUpdate)))
	mux.Handle("DELETE /api/admin/imoveis/{id}", requireAuth(http.HandlerFunc(adminAPI.imovelDelete)))
	mux.Handle("POST /api/admin/imoveis/{id}/destaque", requireAuth(http.HandlerFunc(adminAPI.imovelToggleDestaque)))

	// Admin fotos
	mux.Handle("POST /api/admin/imoveis/{id}/fotos", requireAuth(http.HandlerFunc(adminAPI.fotoUpload)))
	mux.Handle("POST /api/admin/imoveis/{id}/fotos/{fotoID}/principal", requireAuth(http.HandlerFunc(adminAPI.fotoPrincipal)))
	mux.Handle("DELETE /api/admin/imoveis/{id}/fotos/{fotoID}", requireAuth(http.HandlerFunc(adminAPI.fotoDelete)))

	// Admin configuração
	mux.Handle("GET /api/admin/configuracao", requireAuth(http.HandlerFunc(adminAPI.configGet)))
	mux.Handle("PUT /api/admin/configuracao", requireAuth(http.HandlerFunc(adminAPI.configUpdate)))

	// React SPA — catch-all (serves index.html for all /admin/* page loads too)
	distFS, _ := fs.Sub(frontend.Dist, "dist")
	mux.Handle("/", newSPAHandler(distFS))

	return mux
}

func newSPAHandler(fsys fs.FS) http.Handler {
	fileServer := http.FileServerFS(fsys)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}
		f, err := fsys.Open(path)
		if err != nil {
			http.ServeFileFS(w, r, fsys, "index.html")
			return
		}
		f.Close()
		fileServer.ServeHTTP(w, r)
	})
}

func handleHealth(conn *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := conn.Ping(); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte("unavailable"))
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	}
}
```

- [ ] **Step 2: Verify build still fails (old handler files still exist with duplicate symbols)**

```bash
go build ./internal/handlers/ 2>&1 | head -20
```

Expected: errors about duplicate `parseIDPathValue`, `dummyHash`, `maxUploadBytes`, `saveLogo`.

---

## Task 5: Delete old files, update Makefile, run go mod tidy

**Files:**
- Delete: `internal/templates/` (entire directory)
- Delete: `internal/handlers/admin_auth.go`
- Delete: `internal/handlers/admin_imoveis.go`
- Delete: `internal/handlers/admin_fotos.go`
- Delete: `internal/handlers/admin_configuracao.go`
- Modify: `Makefile`

- [ ] **Step 1: Delete Templ templates directory**

```bash
rm -rf internal/templates/
```

- [ ] **Step 2: Delete old Templ handler files**

```bash
rm internal/handlers/admin_auth.go \
   internal/handlers/admin_imoveis.go \
   internal/handlers/admin_fotos.go \
   internal/handlers/admin_configuracao.go
```

- [ ] **Step 3: Update Makefile — remove `templ generate`**

Replace Makefile content with:

```makefile
.PHONY: generate build test run

TAILWIND := ./tailwindcss
CSS_IN := internal/assets/static/css/input.css
CSS_OUT := internal/assets/static/css/output.css

generate:
	$(TAILWIND) -i $(CSS_IN) -o $(CSS_OUT) --minify

build: generate
	cd frontend && npm run build
	go build -o imob-app ./cmd/imob-app

test: generate
	go test ./...

run: generate
	go run ./cmd/imob-app
```

- [ ] **Step 4: Verify Go build succeeds**

```bash
go build ./... 2>&1
```

Expected: no output (clean build).

- [ ] **Step 5: Remove templ from go.mod**

```bash
go mod tidy
```

- [ ] **Step 6: Verify build still passes after mod tidy**

```bash
go build ./...
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: replace Templ admin with JSON API, delete all Templ code"
```

---

## Task 6: Rewrite handlers_test.go

**Files:**
- Modify: `internal/handlers/handlers_test.go`

- [ ] **Step 1: Replace entire test file with tests for the new JSON API**

```go
package handlers_test

import (
	"bytes"
	"context"
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
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	if err := db.Migrate(conn); err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	cfg := config.Config{
		SessionSecret: "test-secret-do-not-use-in-prod",
		UploadsDir:    t.TempDir(),
	}
	return handlers.NewRouter(handlers.Deps{Conn: conn, Config: cfg})
}

func TestRouter_Healthz(t *testing.T) {
	router := newTestRouter(t)
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

func TestRouter_AdminMe_RequiresAuth(t *testing.T) {
	router := newTestRouter(t)
	req := httptest.NewRequest(http.MethodGet, "/api/admin/me", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestRouter_AdminImoveis_RequiresAuth(t *testing.T) {
	router := newTestRouter(t)
	req := httptest.NewRequest(http.MethodGet, "/api/admin/imoveis", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

// loginAsTestAdmin creates an admin user and returns the session cookies from a
// successful POST /api/admin/login.
func loginAsTestAdmin(t *testing.T, conn interface {
	ExecContext(ctx context.Context, query string, args ...any) (interface{ LastInsertId() (int64, error) }, error)
}, router http.Handler) []*http.Cookie {
	t.Helper()

	// Use repo directly to create admin
	dbPath := filepath.Join(t.TempDir(), "login-test.db")
	_ = dbPath // not used; conn is passed in
	hash, err := auth.HashPassword("senha-segura")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	// We receive conn as sql.DB — use repo
	return nil // placeholder; see actual implementation below
}

// loginAdmin creates an admin in conn and returns session cookies.
func loginAdmin(t *testing.T, conn interface{}, router http.Handler) []*http.Cookie {
	t.Helper()
	// This function is inlined in each test that needs it — see tests below.
	return nil
}

func TestRouter_AdminLogin_ValidCredentials(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")
	conn, err := db.Open(dbPath)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	if err := db.Migrate(conn); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	hash, err := auth.HashPassword("senha-segura")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	if _, err := repo.NewAdminRepo(conn).Create(context.Background(), "admin@example.com", hash); err != nil {
		t.Fatalf("Create admin: %v", err)
	}

	cfg := config.Config{SessionSecret: "test-secret", UploadsDir: t.TempDir()}
	router := handlers.NewRouter(handlers.Deps{Conn: conn, Config: cfg})

	body := `{"email":"admin@example.com","senha":"senha-segura"}`
	req := httptest.NewRequest(http.MethodPost, "/api/admin/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var resp map[string]bool
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !resp["ok"] {
		t.Errorf("expected ok:true, got %v", resp)
	}
	if len(rec.Result().Cookies()) == 0 {
		t.Error("expected session cookie to be set")
	}
}

func TestRouter_AdminLogin_InvalidCredentials(t *testing.T) {
	router := newTestRouter(t)

	body := `{"email":"nobody@example.com","senha":"wrong"}`
	req := httptest.NewRequest(http.MethodPost, "/api/admin/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestRouter_AdminImoveis_FullCRUDFlow(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")
	conn, err := db.Open(dbPath)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	if err := db.Migrate(conn); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	hash, _ := auth.HashPassword("senha-segura")
	repo.NewAdminRepo(conn).Create(context.Background(), "admin@example.com", hash)

	cfg := config.Config{SessionSecret: "test-secret", UploadsDir: t.TempDir()}
	router := handlers.NewRouter(handlers.Deps{Conn: conn, Config: cfg})

	// Login
	loginReq := httptest.NewRequest(http.MethodPost, "/api/admin/login",
		bytes.NewBufferString(`{"email":"admin@example.com","senha":"senha-segura"}`))
	loginReq.Header.Set("Content-Type", "application/json")
	loginRec := httptest.NewRecorder()
	router.ServeHTTP(loginRec, loginReq)
	if loginRec.Code != http.StatusOK {
		t.Fatalf("login failed: %d %s", loginRec.Code, loginRec.Body.String())
	}
	cookies := loginRec.Result().Cookies()

	authed := func(method, path string, body io.Reader, ct string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, body)
		if ct != "" {
			req.Header.Set("Content-Type", ct)
		}
		for _, c := range cookies {
			req.AddCookie(c)
		}
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		return rec
	}

	// Create
	createBody := `{"Titulo":"Casa de Praia","Descricao":"Perto do mar","Tipo":"casa","Finalidade":"venda","Cidade":"Florianópolis","Bairro":"Jurerê","Endereco":"Av. Beira Mar, 1","Preco":1200000,"AreaM2":220,"Quartos":4,"Banheiros":3,"VagasGaragem":2,"Status":"disponivel","Destaque":true}`
	createRec := authed(http.MethodPost, "/api/admin/imoveis", bytes.NewBufferString(createBody), "application/json")
	if createRec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", createRec.Code, createRec.Body.String())
	}
	var created repo.Imovel
	if err := json.Unmarshal(createRec.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode created: %v", err)
	}
	if created.ID == 0 {
		t.Fatal("expected non-zero ID")
	}
	if created.Titulo != "Casa de Praia" {
		t.Errorf("expected titulo 'Casa de Praia', got %q", created.Titulo)
	}

	// List
	listRec := authed(http.MethodGet, "/api/admin/imoveis", nil, "")
	if listRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", listRec.Code)
	}
	var list []repo.Imovel
	json.Unmarshal(listRec.Body.Bytes(), &list)
	if len(list) != 1 {
		t.Errorf("expected 1 imovel, got %d", len(list))
	}

	// Get
	getRec := authed(http.MethodGet, fmt.Sprintf("/api/admin/imoveis/%d", created.ID), nil, "")
	if getRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", getRec.Code)
	}

	// Update
	updateBody := fmt.Sprintf(`{"Titulo":"Casa de Praia Reformada","Descricao":"Perto do mar","Tipo":"casa","Finalidade":"venda","Cidade":"Florianópolis","Bairro":"Jurerê","Endereco":"Av. Beira Mar, 1","Preco":1300000,"AreaM2":220,"Quartos":4,"Banheiros":3,"VagasGaragem":2,"Status":"disponivel","Destaque":true}`)
	updateRec := authed(http.MethodPut, fmt.Sprintf("/api/admin/imoveis/%d", created.ID), bytes.NewBufferString(updateBody), "application/json")
	if updateRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", updateRec.Code, updateRec.Body.String())
	}

	// Destaque toggle
	destaqueRec := authed(http.MethodPost, fmt.Sprintf("/api/admin/imoveis/%d/destaque", created.ID), nil, "")
	if destaqueRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", destaqueRec.Code)
	}
	var toggled repo.Imovel
	json.Unmarshal(destaqueRec.Body.Bytes(), &toggled)
	if toggled.Destaque {
		t.Error("expected destaque to be toggled off (was true)")
	}

	// Delete
	deleteRec := authed(http.MethodDelete, fmt.Sprintf("/api/admin/imoveis/%d", created.ID), nil, "")
	if deleteRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", deleteRec.Code)
	}

	// Verify gone
	listRec2 := authed(http.MethodGet, "/api/admin/imoveis", nil, "")
	var list2 []repo.Imovel
	json.Unmarshal(listRec2.Body.Bytes(), &list2)
	if len(list2) != 0 {
		t.Errorf("expected 0 imoveis after delete, got %d", len(list2))
	}
}

func TestRouter_AdminFotos_UploadPrincipalDeleteFlow(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")
	conn, err := db.Open(dbPath)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	if err := db.Migrate(conn); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	hash, _ := auth.HashPassword("senha-segura")
	repo.NewAdminRepo(conn).Create(context.Background(), "admin@example.com", hash)

	uploadsDir := t.TempDir()
	cfg := config.Config{SessionSecret: "test-secret", UploadsDir: uploadsDir}
	router := handlers.NewRouter(handlers.Deps{Conn: conn, Config: cfg})

	// Login
	loginReq := httptest.NewRequest(http.MethodPost, "/api/admin/login",
		bytes.NewBufferString(`{"email":"admin@example.com","senha":"senha-segura"}`))
	loginReq.Header.Set("Content-Type", "application/json")
	loginRec := httptest.NewRecorder()
	router.ServeHTTP(loginRec, loginReq)
	cookies := loginRec.Result().Cookies()

	// Create imovel to attach fotos to
	imovelID, _ := repo.NewImovelRepo(conn).Create(context.Background(), repo.Imovel{
		Titulo: "Imóvel com Fotos", Tipo: "casa", Finalidade: "venda",
		Cidade: "Blumenau", Bairro: "Centro", Status: "disponivel", Preco: 500000,
	})

	authed := func(method, path string, body io.Reader, ct string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, body)
		if ct != "" {
			req.Header.Set("Content-Type", ct)
		}
		for _, c := range cookies {
			req.AddCookie(c)
		}
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		return rec
	}

	// Upload foto
	uploadRec := authed(http.MethodPost,
		fmt.Sprintf("/api/admin/imoveis/%d/fotos", imovelID),
		makeSampleFotoBody(t),
		sampleFotoContentType(t),
	)
	if uploadRec.Code != http.StatusOK {
		t.Fatalf("upload: expected 200, got %d: %s", uploadRec.Code, uploadRec.Body.String())
	}
	var fotos []repo.Foto
	json.Unmarshal(uploadRec.Body.Bytes(), &fotos)
	if len(fotos) != 1 {
		t.Fatalf("expected 1 foto after upload, got %d", len(fotos))
	}
	fotoID := fotos[0].ID

	// Set principal
	principalRec := authed(http.MethodPost,
		fmt.Sprintf("/api/admin/imoveis/%d/fotos/%d/principal", imovelID, fotoID),
		nil, "")
	if principalRec.Code != http.StatusOK {
		t.Fatalf("principal: expected 200, got %d", principalRec.Code)
	}
	var fotosAfterPrincipal []repo.Foto
	json.Unmarshal(principalRec.Body.Bytes(), &fotosAfterPrincipal)
	if !fotosAfterPrincipal[0].Principal {
		t.Error("expected foto to be marked principal")
	}

	// Delete foto
	deleteRec := authed(http.MethodDelete,
		fmt.Sprintf("/api/admin/imoveis/%d/fotos/%d", imovelID, fotoID),
		nil, "")
	if deleteRec.Code != http.StatusOK {
		t.Fatalf("delete foto: expected 200, got %d", deleteRec.Code)
	}
	var fotosAfterDelete []repo.Foto
	json.Unmarshal(deleteRec.Body.Bytes(), &fotosAfterDelete)
	if len(fotosAfterDelete) != 0 {
		t.Errorf("expected 0 fotos after delete, got %d", len(fotosAfterDelete))
	}
}

func TestRouter_PublicAPI_ImovelList(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")
	conn, err := db.Open(dbPath)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	db.Migrate(conn)

	ir := repo.NewImovelRepo(conn)
	ir.Create(context.Background(), repo.Imovel{
		Titulo: "Casa Disponível", Tipo: "casa", Finalidade: "venda",
		Cidade: "Florianópolis", Bairro: "Centro", Status: "disponivel", Preco: 500000,
	})
	ir.Create(context.Background(), repo.Imovel{
		Titulo: "Casa Vendida", Tipo: "casa", Finalidade: "venda",
		Cidade: "Florianópolis", Bairro: "Centro", Status: "vendido", Preco: 500000,
	})

	cfg := config.Config{SessionSecret: "test-secret", UploadsDir: t.TempDir()}
	router := handlers.NewRouter(handlers.Deps{Conn: conn, Config: cfg})

	req := httptest.NewRequest(http.MethodGet, "/api/imoveis", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var list []map[string]any
	json.Unmarshal(rec.Body.Bytes(), &list)
	if len(list) != 1 {
		t.Errorf("expected 1 disponivel imovel, got %d", len(list))
	}
}

func TestRouter_PublicAPI_ImovelDetail(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")
	conn, err := db.Open(dbPath)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	db.Migrate(conn)

	repo.NewImovelRepo(conn).Create(context.Background(), repo.Imovel{
		Titulo: "Casa com Vista para o Mar", Tipo: "casa", Finalidade: "venda",
		Cidade: "Florianópolis", Bairro: "Canasvieiras", Status: "disponivel", Preco: 850000,
	})

	cfg := config.Config{SessionSecret: "test-secret", UploadsDir: t.TempDir()}
	router := handlers.NewRouter(handlers.Deps{Conn: conn, Config: cfg})

	req := httptest.NewRequest(http.MethodGet, "/api/imoveis/casa-com-vista-para-o-mar", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestRouter_PublicAPI_ImovelDetail_NotFound(t *testing.T) {
	router := newTestRouter(t)
	req := httptest.NewRequest(http.MethodGet, "/api/imoveis/slug-inexistente", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rec.Code)
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

var _sampleBody *bytes.Buffer
var _sampleCT string

func makeSampleFotoBody(t *testing.T) io.Reader {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 600, 400))
	for y := range 400 {
		for x := range 600 {
			img.Set(x, y, color.RGBA{R: uint8(x % 256), G: uint8(y % 256), B: 80, A: 255})
		}
	}
	var imgBuf bytes.Buffer
	jpeg.Encode(&imgBuf, img, &jpeg.Options{Quality: 90})

	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	part, _ := w.CreateFormFile("fotos", "foto.jpg")
	part.Write(imgBuf.Bytes())
	w.Close()
	_sampleCT = w.FormDataContentType()
	return &body
}

func sampleFotoContentType(t *testing.T) string {
	t.Helper()
	return _sampleCT
}
```

- [ ] **Step 2: Run the tests**

```bash
go test ./internal/handlers/... -v -count=1 2>&1
```

Expected: all tests pass. Fix any compilation errors before proceeding.

- [ ] **Step 3: Commit**

```bash
git add internal/handlers/handlers_test.go
git commit -m "test: rewrite handlers tests for JSON admin API"
```

---

## Task 7: Create frontend/src/admin/api.js

**Files:**
- Create: `frontend/src/admin/api.js`

- [ ] **Step 1: Create the admin API client**

```js
const BASE = '/api/admin'

async function req(method, path, body) {
  const opts = { method, credentials: 'same-origin', headers: {} }
  if (body instanceof FormData) {
    opts.body = body
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(BASE + path, opts)
  if (res.status === 401) {
    const err = new Error('unauthorized')
    err.status = 401
    throw err
  }
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

export const adminApi = {
  // Auth
  me:     ()             => req('GET',  '/me'),
  login:  (email, senha) => req('POST', '/login', { email, senha }),
  logout: ()             => req('POST', '/logout'),

  // Imóveis
  getImoveis:      ()         => req('GET',    '/imoveis'),
  getImovel:       (id)       => req('GET',    `/imoveis/${id}`),
  createImovel:    (body)     => req('POST',   '/imoveis', body),
  updateImovel:    (id, body) => req('PUT',    `/imoveis/${id}`, body),
  deleteImovel:    (id)       => req('DELETE', `/imoveis/${id}`),
  toggleDestaque:  (id)       => req('POST',   `/imoveis/${id}/destaque`),

  // Fotos — all return updated []Foto
  uploadFotos:  (imovelID, fd)         => req('POST',   `/imoveis/${imovelID}/fotos`, fd),
  setPrincipal: (imovelID, fotoID)     => req('POST',   `/imoveis/${imovelID}/fotos/${fotoID}/principal`),
  deleteFoto:   (imovelID, fotoID)     => req('DELETE', `/imoveis/${imovelID}/fotos/${fotoID}`),

  // Configuração — PUT accepts FormData (logo upload)
  getConfig:    ()    => req('GET', '/configuracao'),
  updateConfig: (fd)  => req('PUT', '/configuracao', fd),
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/admin/api.js
git commit -m "feat: add admin API client"
```

---

## Task 8: Create AuthContext.jsx and AuthGuard.jsx

**Files:**
- Create: `frontend/src/admin/AuthContext.jsx`
- Create: `frontend/src/admin/AuthGuard.jsx`

- [ ] **Step 1: Create `frontend/src/admin/AuthContext.jsx`**

```jsx
import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined=loading, null=not authed, {email}=authed

  useEffect(() => {
    fetch('/api/admin/me', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null)
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  async function login(email, senha) {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    })
    if (!res.ok) throw new Error('credenciais inválidas')
    setUser({ email })
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

- [ ] **Step 2: Create `frontend/src/admin/AuthGuard.jsx`**

```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function AuthGuard({ children }) {
  const { user } = useAuth()

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8B1538] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user === null) return <Navigate to="/admin/login" replace />

  return children
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/admin/AuthContext.jsx frontend/src/admin/AuthGuard.jsx
git commit -m "feat: add admin AuthContext and AuthGuard"
```

---

## Task 9: Create AdminLayout.jsx, AdminRouter.jsx, update App.jsx

**Files:**
- Create: `frontend/src/admin/AdminLayout.jsx`
- Create: `frontend/src/admin/AdminRouter.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Create `frontend/src/admin/AdminLayout.jsx`**

```jsx
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function AdminLayout({ children }) {
  const { logout } = useAuth()
  const location = useLocation()

  function navClass({ isActive }) {
    return isActive
      ? 'sidebar-item active flex items-center gap-3 px-8 py-3 font-semibold'
      : 'sidebar-item flex items-center gap-3 px-8 py-3 text-gray-500 hover:text-[#8B1538]'
  }

  const pageTitle = location.pathname.includes('configuracao')
    ? 'Configurações'
    : location.pathname.includes('novo')
    ? 'Novo Imóvel'
    : location.pathname.includes('editar')
    ? 'Editar Imóvel'
    : 'Imóveis'

  return (
    <div className="min-h-screen flex bg-white">
      <aside className="w-64 border-r border-gray-100 flex flex-col fixed h-full z-40 bg-white">
        <div className="h-20 flex items-center px-8 border-b border-gray-50">
          <a href="/admin/imoveis" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#8B1538] flex items-center justify-center rounded-sm">
              <iconify-icon icon="lucide:home" class="text-white text-sm"></iconify-icon>
            </div>
            <span className="font-bold text-sm tracking-tight uppercase">Admin</span>
          </a>
        </div>
        <nav className="flex-1 py-8 flex flex-col gap-1">
          <NavLink to="/admin/imoveis" className={navClass}>
            <iconify-icon icon="lucide:building-2" class="text-xl"></iconify-icon>
            <span className="text-sm">Imóveis</span>
          </NavLink>
          <NavLink to="/admin/configuracao" className={navClass}>
            <iconify-icon icon="lucide:settings" class="text-xl"></iconify-icon>
            <span className="text-sm">Configurações</span>
          </NavLink>
          <div className="mt-auto mb-4">
            <button
              onClick={logout}
              className="sidebar-item w-full flex items-center gap-3 px-8 py-3 text-gray-500 hover:text-[#8B1538]"
            >
              <iconify-icon icon="lucide:log-out" class="text-xl"></iconify-icon>
              <span className="text-sm font-medium">Sair</span>
            </button>
          </div>
        </nav>
      </aside>
      <main className="flex-1 ml-64 flex flex-col">
        <header className="h-20 border-b border-gray-50 px-10 flex items-center justify-between sticky top-0 bg-white z-30">
          <p className="text-sm font-semibold text-gray-700">{pageTitle}</p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <iconify-icon icon="lucide:user" class="text-gray-400 text-lg"></iconify-icon>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold leading-none mb-0.5">Admin</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Painel</p>
            </div>
          </div>
        </header>
        <div className="p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/admin/AdminRouter.jsx`**

```jsx
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import AuthGuard from './AuthGuard'
import AdminLayout from './AdminLayout'
import Login from './pages/Login'
import ImoveisList from './pages/ImoveisList'
import ImovelForm from './pages/ImovelForm'
import Configuracao from './pages/Configuracao'

function ProtectedLayout() {
  return (
    <AuthGuard>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </AuthGuard>
  )
}

export default function AdminRouter() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route element={<ProtectedLayout />}>
          <Route index element={<Navigate to="imoveis" replace />} />
          <Route path="imoveis" element={<ImoveisList />} />
          <Route path="imoveis/novo" element={<ImovelForm />} />
          <Route path="imoveis/:id/editar" element={<ImovelForm />} />
          <Route path="configuracao" element={<Configuracao />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
```

- [ ] **Step 3: Update `frontend/src/App.jsx` to lazy-load admin**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect, Suspense, lazy } from 'react'
import { getConfiguracao } from './api'
import { setTheme } from './utils'
import Home from './pages/Home'
import List from './pages/List'
import Detail from './pages/Detail'

const Admin = lazy(() => import('./admin/AdminRouter'))

export default function App() {
  const [cfg, setCfg] = useState(null)

  useEffect(() => {
    getConfiguracao().then(data => {
      setCfg(data)
      setTheme(data)
    })
  }, [])

  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home cfg={cfg} />} />
          <Route path="/imoveis" element={<List cfg={cfg} />} />
          <Route path="/imoveis/:slug" element={<Detail cfg={cfg} />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
        <p className="text-gray-500 mb-6">Página não encontrada.</p>
        <a href="/" className="font-medium hover:underline" style={{ color: 'var(--color-brand)' }}>
          Voltar ao início
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/admin/AdminLayout.jsx frontend/src/admin/AdminRouter.jsx frontend/src/App.jsx
git commit -m "feat: add AdminLayout, AdminRouter, lazy-load admin in App"
```

---

## Task 10: Create Login.jsx

**Files:**
- Create: `frontend/src/admin/pages/Login.jsx`

- [ ] **Step 1: Create `frontend/src/admin/pages/Login.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/admin/imoveis" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, senha)
      navigate('/admin/imoveis', { replace: true })
    } catch {
      setError('E-mail ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm animate-in">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 bg-[#8B1538] flex items-center justify-center rounded-sm">
            <iconify-icon icon="lucide:home" class="text-white"></iconify-icon>
          </div>
          <span className="font-bold text-sm tracking-tight uppercase">Painel Admin</span>
        </div>
        <div className="space-y-1 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Bem-vindo de volta</h1>
          <p className="text-sm text-gray-400">Entre com suas credenciais de acesso.</p>
        </div>
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-center gap-2">
            <iconify-icon icon="lucide:alert-circle" class="text-red-500 flex-shrink-0"></iconify-icon>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">E-mail</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@imobiliaria.com"
              className="w-full px-0 py-2 border-b border-gray-200 bg-transparent text-sm font-medium transition-all focus:outline-none focus:border-[#8B1538]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full px-0 py-2 border-b border-gray-200 bg-transparent text-sm font-medium transition-all focus:outline-none focus:border-[#8B1538]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#8B1538] text-white py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg transition-all active:scale-95 hover:opacity-90 mt-2 disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/admin/pages/Login.jsx
git commit -m "feat: add admin Login page"
```

---

## Task 11: Create StatusBadge.jsx and ImoveisList.jsx

**Files:**
- Create: `frontend/src/admin/components/StatusBadge.jsx`
- Create: `frontend/src/admin/pages/ImoveisList.jsx`

- [ ] **Step 1: Create `frontend/src/admin/components/StatusBadge.jsx`**

```jsx
const map = {
  disponivel: { label: 'Disponível', cls: 'status-badge status-disponivel' },
  vendido:    { label: 'Vendido',    cls: 'status-badge status-vendido' },
  alugado:    { label: 'Alugado',    cls: 'status-badge status-alugado' },
}

export default function StatusBadge({ status }) {
  const { label, cls } = map[status] ?? { label: status, cls: 'status-badge status-draft' }
  return <span className={cls}>{label}</span>
}
```

- [ ] **Step 2: Create `frontend/src/admin/pages/ImoveisList.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminApi } from '../api'
import StatusBadge from '../components/StatusBadge'

export default function ImoveisList() {
  const [imoveis, setImoveis] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    adminApi.getImoveis()
      .then(data => setImoveis(data ?? []))
      .catch(e => { if (e.status === 401) navigate('/admin/login') })
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id) {
    if (!confirm('Excluir este imóvel?')) return
    try {
      await adminApi.deleteImovel(id)
      setImoveis(prev => prev.filter(i => i.ID !== id))
    } catch { /* stay */ }
  }

  async function handleToggleDestaque(id) {
    try {
      const updated = await adminApi.toggleDestaque(id)
      setImoveis(prev => prev.map(i => i.ID === id ? updated : i))
    } catch { /* stay */ }
  }

  const total      = imoveis.length
  const disponiveis = imoveis.filter(i => i.Status === 'disponivel').length
  const destaques   = imoveis.filter(i => i.Destaque).length
  const vendidos    = imoveis.filter(i => i.Status === 'vendido' || i.Status === 'alugado').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-[#8B1538] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Imóveis</h1>
          <p className="text-sm text-gray-400">{total} imóveis cadastrados.</p>
        </div>
        <Link
          to="/admin/imoveis/novo"
          className="flex items-center gap-2 bg-[#8B1538] text-white px-6 py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg transition-all active:scale-95 hover:opacity-90"
        >
          <iconify-icon icon="lucide:plus"></iconify-icon> Novo Imóvel
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-12">
        {[
          { icon: 'lucide:building', label: 'Total', value: total, colored: true },
          { icon: 'lucide:check-circle', label: 'Disponíveis', value: disponiveis, colored: true },
          { icon: 'lucide:star', label: 'Destaques', value: destaques, colored: true },
          { icon: 'lucide:tag', label: 'Vendidos/Alugados', value: vendidos, colored: false },
        ].map(({ icon, label, value, colored }) => (
          <div key={label} className="p-6 border border-gray-100 rounded-2xl custom-shadow space-y-4">
            <iconify-icon icon={icon} class={`text-2xl ${colored ? 'text-[#8B1538]' : 'text-gray-300'}`}></iconify-icon>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden custom-shadow">
        <div className="bg-gray-50/50 px-8 py-4 border-b border-gray-100">
          <span className="text-xs font-bold text-[#8B1538] border-b-2 border-[#8B1538] pb-1">Todos os Imóveis</span>
        </div>
        <table className="w-full text-left">
          <thead className="bg-white border-b border-gray-50">
            <tr className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
              <th className="px-8 py-5">Imóvel</th>
              <th className="px-6 py-5">Preço</th>
              <th className="px-6 py-5">Detalhes</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5">Destaque</th>
              <th className="px-8 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {imoveis.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-8 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-300">
                    <iconify-icon icon="lucide:building-2" class="text-4xl"></iconify-icon>
                    <p className="text-sm font-medium text-gray-400">Nenhum imóvel cadastrado ainda.</p>
                    <Link to="/admin/imoveis/novo" className="text-[#8B1538] text-xs font-bold hover:underline">
                      Cadastrar primeiro imóvel →
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              imoveis.map(im => (
                <tr key={im.ID} className="hover:bg-gray-50/50 transition-colors animate-in">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                        <iconify-icon icon="lucide:building-2" class="text-2xl text-gray-300"></iconify-icon>
                      </div>
                      <div>
                        <p className="text-sm font-bold">{im.Titulo}</p>
                        <p className="text-[11px] text-gray-400">{im.Cidade} · {im.Bairro}</p>
                        <p className="text-[10px] text-gray-300 uppercase font-bold tracking-wide mt-0.5">{im.Tipo} · {im.Finalidade}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold">R$ {im.Preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3 text-gray-400">
                      {im.Quartos > 0 && <span className="flex items-center gap-1 text-xs"><iconify-icon icon="lucide:bed"></iconify-icon>{im.Quartos}</span>}
                      {im.Banheiros > 0 && <span className="flex items-center gap-1 text-xs"><iconify-icon icon="lucide:bath"></iconify-icon>{im.Banheiros}</span>}
                      {im.AreaM2 > 0 && <span className="flex items-center gap-1 text-xs"><iconify-icon icon="lucide:maximize"></iconify-icon>{im.AreaM2}m²</span>}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge status={im.Status} />
                  </td>
                  <td className="px-6 py-5">
                    <button
                      onClick={() => handleToggleDestaque(im.ID)}
                      className={im.Destaque ? 'text-[#8B1538]' : 'text-gray-300 hover:text-[#8B1538] transition-colors'}
                      title={im.Destaque ? 'Remover destaque' : 'Marcar como destaque'}
                    >
                      <iconify-icon icon="lucide:star" class="text-lg"></iconify-icon>
                    </button>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/imoveis/${im.ID}/editar`}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:text-[#8B1538] transition-all border border-transparent hover:border-gray-100 text-gray-300"
                        title="Editar"
                      >
                        <iconify-icon icon="lucide:edit-2"></iconify-icon>
                      </Link>
                      <button
                        onClick={() => handleDelete(im.ID)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:text-red-600 transition-all border border-transparent hover:border-gray-100 text-gray-300"
                        title="Excluir"
                      >
                        <iconify-icon icon="lucide:trash-2"></iconify-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {imoveis.length > 0 && (
          <div className="px-8 py-4 border-t border-gray-50">
            <p className="text-[10px] uppercase font-bold text-gray-300 tracking-widest">{total} imóveis</p>
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/admin/components/StatusBadge.jsx frontend/src/admin/pages/ImoveisList.jsx
git commit -m "feat: add StatusBadge and ImoveisList admin pages"
```

---

## Task 12: Create FotosGrid.jsx and ImovelForm.jsx

**Files:**
- Create: `frontend/src/admin/components/FotosGrid.jsx`
- Create: `frontend/src/admin/pages/ImovelForm.jsx`

- [ ] **Step 1: Create `frontend/src/admin/components/FotosGrid.jsx`**

```jsx
import { useState, useRef } from 'react'
import { adminApi } from '../api'

export default function FotosGrid({ imovelID, initialFotos }) {
  const [fotos, setFotos] = useState(initialFotos || [])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef()

  async function handleUpload(e) {
    const files = e.target.files
    if (!files.length) return
    setUploading(true)
    const fd = new FormData()
    for (const file of files) fd.append('fotos', file)
    try {
      const updated = await adminApi.uploadFotos(imovelID, fd)
      setFotos(updated)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleSetPrincipal(fotoID) {
    const updated = await adminApi.setPrincipal(imovelID, fotoID)
    setFotos(updated)
  }

  async function handleDelete(fotoID) {
    if (!confirm('Remover esta foto?')) return
    const updated = await adminApi.deleteFoto(imovelID, fotoID)
    setFotos(updated)
  }

  return (
    <div>
      <div
        className="border-2 border-dashed border-gray-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-[#8B1538] hover:bg-gray-50/50 transition-all cursor-pointer group mb-4"
        onClick={() => inputRef.current?.click()}
      >
        <div className="w-12 h-12 rounded-full bg-gray-50 group-hover:bg-[#8B1538]/10 flex items-center justify-center text-gray-300 group-hover:text-[#8B1538] mb-3 transition-all">
          <iconify-icon icon="lucide:upload-cloud" class="text-2xl"></iconify-icon>
        </div>
        <p className="text-sm font-bold mb-1">{uploading ? 'Enviando...' : 'Clique para adicionar fotos'}</p>
        <p className="text-[10px] text-gray-400">JPEG, PNG ou WebP</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </div>
      {fotos.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {fotos.map(foto => (
            <div key={foto.ID} className="relative group rounded-xl overflow-hidden border border-gray-100">
              <img
                src={`/uploads/${foto.CaminhoThumb}`}
                alt="Foto do imóvel"
                className="w-full aspect-square object-cover"
              />
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleSetPrincipal(foto.ID)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all ${
                    foto.Principal
                      ? 'bg-[#8B1538] text-white'
                      : 'bg-white/90 text-gray-400 hover:text-[#8B1538]'
                  }`}
                  title="Foto principal"
                >
                  <iconify-icon icon="lucide:star" class="text-xs"></iconify-icon>
                </button>
                <button
                  onClick={() => handleDelete(foto.ID)}
                  className="w-7 h-7 rounded-full bg-white/90 text-gray-400 hover:text-red-600 flex items-center justify-center transition-all"
                  title="Remover"
                >
                  <iconify-icon icon="lucide:trash-2" class="text-xs"></iconify-icon>
                </button>
              </div>
              {foto.Principal && (
                <div className="absolute bottom-0 inset-x-0 bg-[#8B1538] text-white text-[9px] font-bold uppercase tracking-widest text-center py-1">
                  Principal
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/admin/pages/ImovelForm.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { adminApi } from '../api'
import FotosGrid from '../components/FotosGrid'

const EMPTY = {
  Titulo: '', Descricao: '', Tipo: 'casa', Finalidade: 'venda',
  Cidade: '', Bairro: '', Endereco: '', Preco: '',
  AreaM2: '', Quartos: '', Banheiros: '', VagasGaragem: '',
  Status: 'disponivel', Destaque: false,
}

export default function ImovelForm() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [fotos, setFotos] = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isNew) {
      adminApi.getImovel(id)
        .then(({ Imovel: data, Fotos: fts }) => {
          setForm({
            ...data,
            Preco: data.Preco?.toString() ?? '',
            AreaM2: data.AreaM2?.toString() ?? '',
            Quartos: data.Quartos?.toString() ?? '',
            Banheiros: data.Banheiros?.toString() ?? '',
            VagasGaragem: data.VagasGaragem?.toString() ?? '',
          })
          setFotos(fts || [])
          setLoading(false)
        })
        .catch(() => navigate('/admin/imoveis'))
    }
  }, [id])

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    const body = {
      Titulo:       form.Titulo,
      Descricao:    form.Descricao,
      Tipo:         form.Tipo,
      Finalidade:   form.Finalidade,
      Cidade:       form.Cidade,
      Bairro:       form.Bairro,
      Endereco:     form.Endereco,
      Preco:        parseFloat(form.Preco) || 0,
      AreaM2:       parseFloat(form.AreaM2) || 0,
      Quartos:      parseInt(form.Quartos) || 0,
      Banheiros:    parseInt(form.Banheiros) || 0,
      VagasGaragem: parseInt(form.VagasGaragem) || 0,
      Status:       form.Status,
      Destaque:     form.Destaque,
    }
    try {
      if (isNew) {
        const created = await adminApi.createImovel(body)
        navigate(`/admin/imoveis/${created.ID}/editar`)
      } else {
        await adminApi.updateImovel(id, body)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch { /* stay */ } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-[#8B1538] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const inputCls = "w-full px-0 py-2 border-b border-gray-200 bg-transparent text-sm font-medium transition-all focus:outline-none focus:border-[#8B1538]"
  const labelCls = "text-[10px] uppercase font-bold text-gray-400 tracking-widest"

  return (
    <>
      <div className="flex items-center justify-between mb-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{isNew ? 'Novo Imóvel' : 'Editar Imóvel'}</h1>
          <p className="text-sm text-gray-400">Preencha os dados do imóvel abaixo.</p>
        </div>
        <Link to="/admin/imoveis" className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">
          <iconify-icon icon="lucide:arrow-left"></iconify-icon> Voltar
        </Link>
      </div>

      {success && (
        <div className="mb-6 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 flex items-center gap-2">
          <iconify-icon icon="lucide:check-circle" class="text-green-500"></iconify-icon>
          Imóvel salvo com sucesso.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-10">
          {/* Left column */}
          <div className="space-y-8">
            <div className="p-8 border border-gray-100 rounded-2xl custom-shadow space-y-6">
              <h2 className={labelCls}>Informações Básicas</h2>
              <div className="space-y-2"><label className={labelCls}>Título</label>
                <input type="text" required value={form.Titulo} onChange={set('Titulo')} placeholder="Ex: Casa em condomínio" className={inputCls} /></div>
              <div className="space-y-2"><label className={labelCls}>Descrição</label>
                <textarea value={form.Descricao} onChange={set('Descricao')} rows={4} placeholder="Descreva o imóvel..." className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm transition-all resize-none focus:outline-none focus:border-[#8B1538] focus:ring-1 focus:ring-[#8B1538]" /></div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className={labelCls}>Tipo</label>
                  <select value={form.Tipo} onChange={set('Tipo')} className={inputCls + ' cursor-pointer'}>
                    {['casa','apartamento','terreno','comercial','rural'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select></div>
                <div className="space-y-2"><label className={labelCls}>Finalidade</label>
                  <select value={form.Finalidade} onChange={set('Finalidade')} className={inputCls + ' cursor-pointer'}>
                    <option value="venda">venda</option>
                    <option value="aluguel">aluguel</option>
                  </select></div>
              </div>
              <div className="space-y-2"><label className={labelCls}>Status</label>
                <select value={form.Status} onChange={set('Status')} className={inputCls + ' cursor-pointer'}>
                  <option value="disponivel">disponivel</option>
                  <option value="vendido">vendido</option>
                  <option value="alugado">alugado</option>
                </select></div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.Destaque} onChange={set('Destaque')} className="w-4 h-4 accent-[#8B1538]" />
                <span className="text-sm font-medium text-gray-700">Marcar como destaque</span>
              </label>
            </div>
            <div className="p-8 border border-gray-100 rounded-2xl custom-shadow space-y-6">
              <h2 className={labelCls}>Localização</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className={labelCls}>Cidade</label>
                  <input type="text" required value={form.Cidade} onChange={set('Cidade')} placeholder="Florianópolis" className={inputCls} /></div>
                <div className="space-y-2"><label className={labelCls}>Bairro</label>
                  <input type="text" required value={form.Bairro} onChange={set('Bairro')} placeholder="Centro" className={inputCls} /></div>
              </div>
              <div className="space-y-2"><label className={labelCls}>Endereço</label>
                <input type="text" value={form.Endereco} onChange={set('Endereco')} placeholder="Rua, número" className={inputCls} /></div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-8">
            <div className="p-8 border border-gray-100 rounded-2xl custom-shadow space-y-6">
              <h2 className={labelCls}>Valores e Metragem</h2>
              <div className="space-y-2"><label className={labelCls}>Preço (R$)</label>
                <input type="number" step="0.01" required value={form.Preco} onChange={set('Preco')} placeholder="500000.00" className={inputCls} /></div>
              <div className="space-y-2"><label className={labelCls}>Área (m²)</label>
                <input type="number" step="0.01" value={form.AreaM2} onChange={set('AreaM2')} placeholder="120.00" className={inputCls} /></div>
            </div>
            <div className="p-8 border border-gray-100 rounded-2xl custom-shadow space-y-6">
              <h2 className={labelCls}>Características</h2>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2"><label className={labelCls}>Quartos</label>
                  <input type="number" value={form.Quartos} onChange={set('Quartos')} placeholder="3" className={inputCls} /></div>
                <div className="space-y-2"><label className={labelCls}>Banheiros</label>
                  <input type="number" value={form.Banheiros} onChange={set('Banheiros')} placeholder="2" className={inputCls} /></div>
                <div className="space-y-2"><label className={labelCls}>Vagas</label>
                  <input type="number" value={form.VagasGaragem} onChange={set('VagasGaragem')} placeholder="1" className={inputCls} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <Link to="/admin/imoveis" className="px-8 py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">Cancelar</Link>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#8B1538] text-white px-10 py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg transition-all active:scale-95 hover:opacity-90 disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Salvar Imóvel'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {!isNew && (
        <section className="mt-12">
          <div className="p-8 border border-gray-100 rounded-2xl custom-shadow">
            <h2 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-6">Fotos do Imóvel</h2>
            <FotosGrid imovelID={id} initialFotos={fotos} />
          </div>
        </section>
      )}
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/admin/components/FotosGrid.jsx frontend/src/admin/pages/ImovelForm.jsx
git commit -m "feat: add FotosGrid and ImovelForm admin pages"
```

---

## Task 13: Create Configuracao.jsx

**Files:**
- Create: `frontend/src/admin/pages/Configuracao.jsx`

- [ ] **Step 1: Create `frontend/src/admin/pages/Configuracao.jsx`**

The GET response fields are PascalCase (matching Go struct). The PUT sends `multipart/form-data` with snake_case field names (matching `r.FormValue("nome_imobiliaria")`  etc. in the Go handler).

```jsx
import { useState, useEffect } from 'react'
import { adminApi } from '../api'

const EMPTY = {
  NomeImobiliaria: '', LogoPath: '', CorPrimaria: '', CorSecundaria: '',
  Telefone: '', Whatsapp: '', Email: '', Endereco: '',
  InstagramURL: '', TextoSobre: '', TextoHome: '', HeroImageURL: '',
}

export default function Configuracao() {
  const [form, setForm] = useState(EMPTY)
  const [logoFile, setLogoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    adminApi.getConfig().then(data => setForm({ ...EMPTY, ...data })).catch(() => {})
  }, [])

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    const fd = new FormData()
    fd.append('nome_imobiliaria', form.NomeImobiliaria)
    fd.append('cor_primaria',     form.CorPrimaria)
    fd.append('cor_secundaria',   form.CorSecundaria)
    fd.append('telefone',         form.Telefone)
    fd.append('whatsapp',         form.Whatsapp)
    fd.append('email',            form.Email)
    fd.append('endereco',         form.Endereco)
    fd.append('instagram_url',    form.InstagramURL)
    fd.append('texto_sobre',      form.TextoSobre)
    fd.append('texto_home',       form.TextoHome)
    fd.append('hero_image_url',   form.HeroImageURL)
    if (logoFile) fd.append('logo', logoFile)
    try {
      const updated = await adminApi.updateConfig(fd)
      setForm({ ...EMPTY, ...updated })
      setLogoFile(null)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch { /* stay */ } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full px-0 py-2 border-b border-gray-200 bg-transparent text-sm font-medium transition-all focus:outline-none focus:border-[#8B1538]"
  const labelCls = "text-[10px] uppercase font-bold text-gray-400 tracking-widest"

  return (
    <>
      <div className="flex items-center justify-between mb-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm text-gray-400">Identidade visual e informações de contato.</p>
        </div>
      </div>

      {success && (
        <div className="mb-6 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 flex items-center gap-2">
          <iconify-icon icon="lucide:check-circle" class="text-green-500"></iconify-icon>
          Configurações salvas com sucesso.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-10">
          {/* Left column */}
          <div className="space-y-8">
            <div className="p-8 border border-gray-100 rounded-2xl custom-shadow space-y-6">
              <h2 className={labelCls}>Identidade</h2>
              <div className="space-y-2"><label className={labelCls}>Nome da Imobiliária</label>
                <input type="text" value={form.NomeImobiliaria} onChange={set('NomeImobiliaria')} placeholder="Minha Imobiliária" className={inputCls} /></div>
              <div className="space-y-2">
                <label className={labelCls}>Logo</label>
                {form.LogoPath && <img src={`/uploads/${form.LogoPath}`} alt="Logo atual" className="h-12 mb-3 rounded-lg object-contain" />}
                <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0] || null)} className="block text-sm text-gray-500" />
                <p className="text-[10px] text-gray-400">JPEG, PNG ou WebP · máx 400 px</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className={labelCls}>Cor Primária</label>
                  <input type="text" value={form.CorPrimaria} onChange={set('CorPrimaria')} placeholder="#8B1538" className={inputCls + ' font-mono'} /></div>
                <div className="space-y-2"><label className={labelCls}>Cor Secundária</label>
                  <input type="text" value={form.CorSecundaria} onChange={set('CorSecundaria')} placeholder="#64748b" className={inputCls + ' font-mono'} /></div>
              </div>
            </div>
            <div className="p-8 border border-gray-100 rounded-2xl custom-shadow space-y-6">
              <h2 className={labelCls}>Textos do Site</h2>
              <div className="space-y-2"><label className={labelCls}>Texto da Página Inicial</label>
                <textarea value={form.TextoHome} onChange={set('TextoHome')} rows={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm transition-all resize-none focus:outline-none focus:border-[#8B1538]" /></div>
              <div className="space-y-2"><label className={labelCls}>Sobre a Imobiliária</label>
                <textarea value={form.TextoSobre} onChange={set('TextoSobre')} rows={5} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm transition-all resize-none focus:outline-none focus:border-[#8B1538]" /></div>
              <div className="space-y-2"><label className={labelCls}>URL da Imagem Hero</label>
                <input type="url" value={form.HeroImageURL} onChange={set('HeroImageURL')} placeholder="https://..." className={inputCls} />
                <p className="text-[10px] text-gray-400">Topo da página inicial. Deixe vazio para usar padrão.</p></div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-8">
            <div className="p-8 border border-gray-100 rounded-2xl custom-shadow space-y-6">
              <h2 className={labelCls}>Contato</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className={labelCls}>Telefone</label>
                  <input type="text" value={form.Telefone} onChange={set('Telefone')} placeholder="(48) 9999-9999" className={inputCls} /></div>
                <div className="space-y-2"><label className={labelCls}>WhatsApp</label>
                  <input type="text" value={form.Whatsapp} onChange={set('Whatsapp')} placeholder="5548999999999" className={inputCls} />
                  <p className="text-[10px] text-gray-400">Somente dígitos com DDI</p></div>
              </div>
              <div className="space-y-2"><label className={labelCls}>E-mail</label>
                <input type="email" value={form.Email} onChange={set('Email')} placeholder="contato@imobiliaria.com" className={inputCls} /></div>
              <div className="space-y-2"><label className={labelCls}>Endereço</label>
                <input type="text" value={form.Endereco} onChange={set('Endereco')} placeholder="Rua das Flores, 123" className={inputCls} /></div>
              <div className="space-y-2"><label className={labelCls}>Instagram</label>
                <input type="url" value={form.InstagramURL} onChange={set('InstagramURL')} placeholder="https://instagram.com/..." className={inputCls} /></div>
            </div>
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#8B1538] text-white px-10 py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg transition-all active:scale-95 hover:opacity-90 disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/admin/pages/Configuracao.jsx
git commit -m "feat: add Configuracao admin page"
```

---

## Task 14: Build and verify

- [ ] **Step 1: Run Go tests**

```bash
go test ./... -count=1 2>&1
```

Expected: all pass. Fix any failures before proceeding.

- [ ] **Step 2: Build frontend**

```bash
cd frontend && npm run build 2>&1
```

Expected: build succeeds with no errors. Bundle should include an `admin-*.js` chunk (code-split).

- [ ] **Step 3: Full Go build**

```bash
go build ./... 2>&1
```

Expected: no output.

- [ ] **Step 4: Rebuild admin CSS**

```bash
make generate
```

Expected: `tailwindcss` runs cleanly, `output.css` updated.

- [ ] **Step 5: Smoke test locally**

Start the server:
```bash
SESSION_SECRET=dev-secret-local go run ./cmd/imob-app
```

Verify:
- `curl http://localhost:8002/healthz` → `ok`
- `curl http://localhost:8002/api/admin/me` → `{"error":"unauthorized"}` with 401
- Visit `http://localhost:8002/admin` in browser → React loads, redirected to `/admin/login`
- Login with an existing admin account → lands on `/admin/imoveis`
- Create, edit, delete an imóvel → works
- Upload a foto on the edit page → foto appears
- Save configuracao → success message shown

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete admin React migration — all pages working"
```
