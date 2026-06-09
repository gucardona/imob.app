# Admin Configuração Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin settings screen at `GET/POST /admin/configuracao` so admins can edit the `configuracao` row (site name, contact info, logo, colors, content texts) through the UI instead of directly in the database.

**Architecture:** Add `ConfiguracaoRepo.Update`; new `configHandlers` with `showForm`/`update`/`saveLogo` in `internal/handlers/admin_configuracao.go`; one new templ template `admin_configuracao.templ`; update `admin_layout.templ` (nav link) and `public_layout.templ` (logo, instagram, dynamic brand colors); register 2 new auth-protected routes in `NewRouter`.

**Tech Stack:** Go 1.26.4, `database/sql` + SQLite, `github.com/a-h/templ v0.3.1020`, `github.com/disintegration/imaging` (already a dep — for logo resize), Tailwind CSS.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `internal/repo/configuracao.go` | add `Update` method |
| Modify | `internal/repo/configuracao_test.go` | test `Update` persists all fields |
| Create | `internal/templates/admin_configuracao.templ` | settings form (all fields + logo upload) |
| Create | `internal/templates/helpers.go` | `colorStyle(cfg)` helper used by public_layout |
| Modify | `internal/templates/public_layout.templ` | logo in nav, instagram in footer, dynamic colors |
| Modify | `internal/templates/admin_layout.templ` | add "Configurações" nav link |
| Create | `internal/handlers/admin_configuracao.go` | `configHandlers`, `showForm`, `update`, `saveLogo` |
| Modify | `internal/handlers/handlers.go` | build `configHandlers`, register 2 routes |
| Modify | `internal/handlers/handlers_test.go` | handler integration tests |

---

### Task 1: ConfiguracaoRepo.Update

**Files:**
- Modify: `internal/repo/configuracao.go`
- Modify: `internal/repo/configuracao_test.go`

- [ ] **Step 1: Write the failing test**

Append to `internal/repo/configuracao_test.go`:

```go
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/repo/... -run TestConfiguracaoRepo_Update -v
```

Expected: `FAIL` — `r.Update undefined`

- [ ] **Step 3: Implement Update**

Append to `internal/repo/configuracao.go` (after the `Get` method):

```go
func (r ConfiguracaoRepo) Update(ctx context.Context, c Configuracao) error {
	_, err := r.conn.ExecContext(ctx, `
		UPDATE configuracao SET
			nome_imobiliaria = ?, logo_path = ?, cor_primaria = ?, cor_secundaria = ?,
			endereco = ?, telefone = ?, whatsapp = ?, email = ?,
			instagram_url = ?, texto_sobre = ?, texto_home = ?
		WHERE id = 1
	`,
		c.NomeImobiliaria, c.LogoPath, c.CorPrimaria, c.CorSecundaria,
		c.Endereco, c.Telefone, c.Whatsapp, c.Email,
		c.InstagramURL, c.TextoSobre, c.TextoHome,
	)
	return err
}
```

No new imports needed — `context` is already imported.

- [ ] **Step 4: Run test to verify it passes**

```bash
go test ./internal/repo/... -run TestConfiguracaoRepo_Update -v
```

Expected: `PASS`

- [ ] **Step 5: Run full repo suite**

```bash
go test ./internal/repo/... -v
```

All must pass.

- [ ] **Step 6: Commit**

```bash
git add internal/repo/configuracao.go internal/repo/configuracao_test.go
git commit -m "feat: ConfiguracaoRepo.Update — persists all 11 configuracao fields"
```

---

### Task 2: Admin settings template

**Files:**
- Create: `internal/templates/admin_configuracao.templ`

- [ ] **Step 1: Create the template**

```
package templates

import "github.com/gucardona/imob.app/internal/repo"

templ AdminConfiguracao(cfg repo.Configuracao) {
	@AdminLayout("Configurações") {
		<div class="max-w-2xl">
			<h1 class="text-2xl font-bold mb-6">Configurações</h1>
			<form method="POST" action="/admin/configuracao" enctype="multipart/form-data" class="space-y-6">
				<fieldset class="border border-slate-200 rounded-lg p-4 space-y-4">
					<legend class="text-sm font-semibold text-slate-700 px-2">Identidade</legend>
					<div>
						<label class="block text-sm font-medium text-slate-700 mb-1">Nome da Imobiliária</label>
						<input type="text" name="nome_imobiliaria" value={ cfg.NomeImobiliaria } class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
					</div>
					<div>
						<label class="block text-sm font-medium text-slate-700 mb-1">Logo</label>
						if cfg.LogoPath != "" {
							<img src={ "/uploads/" + cfg.LogoPath } alt="Logo atual" class="h-12 mb-2 rounded"/>
						}
						<input type="file" name="logo" accept="image/*" class="block text-sm text-slate-600"/>
						<p class="text-xs text-slate-400 mt-1">JPEG, PNG ou WebP. Redimensionada para 400 px de largura.</p>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-slate-700 mb-1">Cor primária</label>
							<input type="text" name="cor_primaria" value={ cfg.CorPrimaria } placeholder="#1d4ed8" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono"/>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-700 mb-1">Cor secundária</label>
							<input type="text" name="cor_secundaria" value={ cfg.CorSecundaria } placeholder="#64748b" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono"/>
						</div>
					</div>
				</fieldset>
				<fieldset class="border border-slate-200 rounded-lg p-4 space-y-4">
					<legend class="text-sm font-semibold text-slate-700 px-2">Contato</legend>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
							<input type="text" name="telefone" value={ cfg.Telefone } class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-700 mb-1">WhatsApp (somente dígitos)</label>
							<input type="text" name="whatsapp" value={ cfg.Whatsapp } placeholder="5548999999999" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
						</div>
					</div>
					<div>
						<label class="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
						<input type="email" name="email" value={ cfg.Email } class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
					</div>
					<div>
						<label class="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
						<input type="text" name="endereco" value={ cfg.Endereco } class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
					</div>
					<div>
						<label class="block text-sm font-medium text-slate-700 mb-1">Instagram (URL completa)</label>
						<input type="url" name="instagram_url" value={ cfg.InstagramURL } placeholder="https://instagram.com/suaimobiliaria" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
					</div>
				</fieldset>
				<fieldset class="border border-slate-200 rounded-lg p-4 space-y-4">
					<legend class="text-sm font-semibold text-slate-700 px-2">Textos</legend>
					<div>
						<label class="block text-sm font-medium text-slate-700 mb-1">Texto da página inicial</label>
						<textarea name="texto_home" rows="3" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">{ cfg.TextoHome }</textarea>
					</div>
					<div>
						<label class="block text-sm font-medium text-slate-700 mb-1">Texto sobre a imobiliária</label>
						<textarea name="texto_sobre" rows="5" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">{ cfg.TextoSobre }</textarea>
					</div>
				</fieldset>
				<div>
					<button type="submit" class="bg-primary text-white rounded px-6 py-2 text-sm font-medium hover:opacity-90">Salvar</button>
				</div>
			</form>
		</div>
	}
}
```

- [ ] **Step 2: Generate and build**

```bash
$(go env GOPATH)/bin/templ generate && go build ./...
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add internal/templates/admin_configuracao.templ
git commit -m "feat: AdminConfiguracao templ — settings form with all fields and logo upload"
```

---

### Task 3: Admin settings handler + routes

**Files:**
- Create: `internal/handlers/admin_configuracao.go`
- Modify: `internal/handlers/handlers.go`
- Modify: `internal/templates/admin_layout.templ`
- Modify: `internal/handlers/handlers_test.go`

- [ ] **Step 1: Write failing tests**

Append to `internal/handlers/handlers_test.go`. These tests require the `loginAsTestAdmin` and `newTestRouter` helpers already present in the file — do NOT redefine them.

```go
func TestRouter_AdminConfiguracao_ShowFormRequiresAuth(t *testing.T) {
	router := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/admin/configuracao", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusSeeOther {
		t.Errorf("expected redirect %d, got %d", http.StatusSeeOther, rec.Code)
	}
	if loc := rec.Header().Get("Location"); loc != "/admin/login" {
		t.Errorf("expected redirect to /admin/login, got %q", loc)
	}
}

func TestRouter_AdminConfiguracao_ShowFormReturnsOK(t *testing.T) {
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
	cookies := loginAsTestAdmin(t, conn, router)

	req := httptest.NewRequest(http.MethodGet, "/admin/configuracao", nil)
	for _, c := range cookies {
		req.AddCookie(c)
	}
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Configurações") {
		t.Errorf("expected body to contain 'Configurações'")
	}
}

func TestRouter_AdminConfiguracao_UpdatePersistsTextFields(t *testing.T) {
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
	cookies := loginAsTestAdmin(t, conn, router)

	form := url.Values{
		"nome_imobiliaria": {"Imobiliária Litoral"},
		"telefone":         {"48 3333-3333"},
		"whatsapp":         {"5548999999999"},
		"email":            {"contato@litoral.com"},
		"endereco":         {"Av. Beira Mar, 500"},
		"instagram_url":    {"https://instagram.com/litoral"},
		"cor_primaria":     {"#1d4ed8"},
		"cor_secundaria":   {"#64748b"},
		"texto_home":       {"Bem-vindos à Imobiliária Litoral."},
		"texto_sobre":      {"Trabalhamos com imóveis desde 2000."},
	}
	req := httptest.NewRequest(http.MethodPost, "/admin/configuracao", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	for _, c := range cookies {
		req.AddCookie(c)
	}
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusSeeOther {
		t.Errorf("expected redirect %d, got %d: %s", http.StatusSeeOther, rec.Code, rec.Body.String())
	}

	// Verify persisted in DB
	saved, err := repo.NewConfiguracaoRepo(conn).Get(context.Background())
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if saved.NomeImobiliaria != "Imobiliária Litoral" {
		t.Errorf("expected NomeImobiliaria %q, got %q", "Imobiliária Litoral", saved.NomeImobiliaria)
	}
	if saved.Whatsapp != "5548999999999" {
		t.Errorf("expected Whatsapp %q, got %q", "5548999999999", saved.Whatsapp)
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
$(go env GOPATH)/bin/templ generate && go test ./internal/handlers/... -run "TestRouter_AdminConfiguracao" -v
```

Expected: `FAIL` — routes not registered yet (404 or missing).

- [ ] **Step 3: Create internal/handlers/admin_configuracao.go**

```go
package handlers

import (
	"bytes"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/disintegration/imaging"
	"github.com/gucardona/imob.app/internal/repo"
	"github.com/gucardona/imob.app/internal/templates"
)

type configHandlers struct {
	uploadsDir   string
	configuracao repo.ConfiguracaoRepo
}

func newConfigHandlers(uploadsDir string, cfg repo.ConfiguracaoRepo) configHandlers {
	return configHandlers{uploadsDir: uploadsDir, configuracao: cfg}
}

func (h configHandlers) showForm(w http.ResponseWriter, r *http.Request) {
	cfg, err := h.configuracao.Get(r.Context())
	if err != nil && !errors.Is(err, repo.ErrNotFound) {
		http.Error(w, "erro interno", http.StatusInternalServerError)
		return
	}
	renderHTML(w, r, templates.AdminConfiguracao(cfg))
}

func (h configHandlers) update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Load existing to preserve logo and colors if form omits them
	existing, err := h.configuracao.Get(ctx)
	if err != nil && !errors.Is(err, repo.ErrNotFound) {
		http.Error(w, "erro interno", http.StatusInternalServerError)
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		if err2 := r.ParseForm(); err2 != nil {
			http.Error(w, "erro ao processar formulário", http.StatusBadRequest)
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
		LogoPath:        existing.LogoPath, // preserved unless a new file is uploaded
	}

	file, _, err := r.FormFile("logo")
	if err == nil {
		defer file.Close()
		data, err := io.ReadAll(file)
		if err != nil {
			http.Error(w, "erro ao ler logo", http.StatusBadRequest)
			return
		}
		logoPath, err := saveLogo(h.uploadsDir, data)
		if err != nil {
			http.Error(w, "erro ao salvar logo", http.StatusInternalServerError)
			return
		}
		cfg.LogoPath = logoPath
	}

	if err := h.configuracao.Update(ctx, cfg); err != nil {
		http.Error(w, "erro ao salvar configurações", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/admin/configuracao", http.StatusSeeOther)
}

// saveLogo decodes image data, resizes to max 400 px wide, saves as JPEG to
// $uploadsDir/logo/logo.jpg, and returns the relative path "logo/logo.jpg".
func saveLogo(uploadsDir string, data []byte) (string, error) {
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

- [ ] **Step 4: Register routes in handlers.go**

In `internal/handlers/handlers.go`, inside `NewRouter`, after `fotoHandlers := newFotoHandlers(...)`, add:

```go
cfgHandlers := newConfigHandlers(deps.Config.UploadsDir, cfgRepo)
```

After the existing foto routes, add:

```go
mux.Handle("GET /admin/configuracao", requireAuth(http.HandlerFunc(cfgHandlers.showForm)))
mux.Handle("POST /admin/configuracao", requireAuth(http.HandlerFunc(cfgHandlers.update)))
```

- [ ] **Step 5: Add nav link to admin_layout.templ**

In `internal/templates/admin_layout.templ`, add a "Configurações" link after the "Imóveis" link:

```
package templates

templ AdminLayout(title string) {
	@Layout(title) {
		<div class="min-h-screen bg-slate-50">
			<header class="border-b border-slate-200 bg-white">
				<div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
					<span class="text-lg font-bold text-primary">Painel administrativo</span>
					<nav class="flex items-center gap-4 text-sm">
						<a href="/admin/imoveis" class="text-slate-700 hover:text-primary">Imóveis</a>
						<a href="/admin/configuracao" class="text-slate-700 hover:text-primary">Configurações</a>
						<form method="POST" action="/admin/logout">
							<button type="submit" class="text-slate-500 hover:text-red-600">Sair</button>
						</form>
					</nav>
				</div>
			</header>
			<main class="mx-auto max-w-6xl px-4 py-8">
				{ children... }
			</main>
		</div>
	}
}
```

- [ ] **Step 6: Generate, build, and run handler tests**

```bash
$(go env GOPATH)/bin/templ generate && go test ./internal/handlers/... -run "TestRouter_AdminConfiguracao" -v
```

Expected: all 3 `PASS`

- [ ] **Step 7: Run full test suite**

```bash
$(go env GOPATH)/bin/templ generate && go test ./... -v 2>&1 | tail -20
```

All must pass.

- [ ] **Step 8: Commit**

```bash
git add internal/handlers/admin_configuracao.go internal/handlers/handlers.go internal/templates/admin_layout.templ internal/handlers/handlers_test.go
git commit -m "feat: admin /configuracao settings form — update all fields + logo upload"
```

---

### Task 4: Public layout improvements (logo, instagram, dynamic colors)

**Files:**
- Create: `internal/templates/helpers.go`
- Modify: `internal/templates/public_layout.templ`

- [ ] **Step 1: Create internal/templates/helpers.go**

This file adds a package-level helper called from within `public_layout.templ`. It builds an inline CSS style string that overrides the Tailwind default brand colors at runtime (Tailwind v4 generates `var(--color-primary)` utilities, so setting the custom property on `<body>` takes effect immediately).

```go
package templates

import "github.com/gucardona/imob.app/internal/repo"

// colorStyle returns a CSS inline style value that overrides Tailwind's
// --color-primary and --color-secondary custom properties when the admin
// has set custom brand colors. Returns "" if both are unset (no-op).
func colorStyle(cfg repo.Configuracao) string {
	if cfg.CorPrimaria == "" && cfg.CorSecundaria == "" {
		return ""
	}
	s := ""
	if cfg.CorPrimaria != "" {
		s += "--color-primary:" + cfg.CorPrimaria + ";"
	}
	if cfg.CorSecundaria != "" {
		s += "--color-secondary:" + cfg.CorSecundaria + ";"
	}
	return s
}
```

- [ ] **Step 2: Update internal/templates/public_layout.templ**

Replace the entire file content:

```
package templates

import "github.com/gucardona/imob.app/internal/repo"

templ PublicLayout(title string, cfg repo.Configuracao) {
	<!DOCTYPE html>
	<html lang="pt-BR">
		<head>
			<meta charset="utf-8"/>
			<meta name="viewport" content="width=device-width, initial-scale=1"/>
			<title>{ title } — { cfg.NomeImobiliaria }</title>
			<link rel="stylesheet" href="/static/css/output.css"/>
		</head>
		<body class="min-h-screen bg-white text-slate-900" style={ colorStyle(cfg) }>
			<header class="bg-primary text-white">
				<div class="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
					<a href="/" class="flex items-center gap-2">
						if cfg.LogoPath != "" {
							<img src={ "/uploads/" + cfg.LogoPath } alt={ cfg.NomeImobiliaria } class="h-8 w-auto"/>
						}
						if cfg.NomeImobiliaria != "" {
							<span class="text-xl font-bold">{ cfg.NomeImobiliaria }</span>
						}
					</a>
					<nav class="flex gap-6 text-sm">
						<a href="/imoveis" class="hover:underline">Imóveis</a>
						if cfg.Whatsapp != "" {
							<a href={ templ.SafeURL("https://wa.me/" + cfg.Whatsapp) } target="_blank" class="hover:underline">WhatsApp</a>
						}
					</nav>
				</div>
			</header>
			{ children... }
			<footer class="bg-slate-100 mt-16">
				<div class="mx-auto max-w-5xl px-4 py-8 text-sm text-slate-600">
					<p class="font-semibold">{ cfg.NomeImobiliaria }</p>
					if cfg.Endereco != "" {
						<p>{ cfg.Endereco }</p>
					}
					if cfg.Telefone != "" {
						<p>Tel: { cfg.Telefone }</p>
					}
					if cfg.Email != "" {
						<p><a href={ templ.SafeURL("mailto:" + cfg.Email) } class="hover:underline">{ cfg.Email }</a></p>
					}
					if cfg.InstagramURL != "" {
						<p><a href={ templ.SafeURL(cfg.InstagramURL) } target="_blank" class="hover:underline">Instagram</a></p>
					}
				</div>
			</footer>
		</body>
	</html>
}
```

- [ ] **Step 3: Generate and build**

```bash
$(go env GOPATH)/bin/templ generate && go build ./...
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
$(go env GOPATH)/bin/templ generate && go test ./... -v 2>&1 | tail -20
```

All must pass.

- [ ] **Step 5: Commit**

```bash
git add internal/templates/helpers.go internal/templates/public_layout.templ
git commit -m "feat: public layout — logo in nav, instagram in footer, dynamic brand colors"
```

---

## Self-Review

**Spec coverage:**
- ✅ Admin can edit nome_imobiliaria → Task 3 (form field + update handler)
- ✅ Admin can upload logo → Task 3 (saveLogo, MultipartForm)
- ✅ Admin can set cor_primaria / cor_secundaria → Task 3 (form fields) + Task 4 (colorStyle applied at runtime)
- ✅ Admin can set telefone, whatsapp, email, endereco → Task 3
- ✅ Admin can set instagram_url → Task 3 (form field); Task 4 (shown in footer)
- ✅ Admin can set texto_home / texto_sobre → Task 3
- ✅ "Configurações" link in admin nav → Task 3
- ✅ Logo shown in public header → Task 4
- ✅ Instagram shown in public footer → Task 4
- ✅ Routes require auth → Task 3 (wrapped with requireAuth)
- ✅ Logo preserved when no file uploaded → Task 3 (existing.LogoPath fallback)

**Placeholder scan:** No TBD/TODO/placeholder steps. All code blocks are complete.

**Type consistency:**
- `AdminConfiguracao(cfg repo.Configuracao)` defined in Task 2 — called in Task 3 (`showForm`) as `templates.AdminConfiguracao(cfg)` ✅
- `configHandlers.update` calls `h.configuracao.Update(ctx, cfg)` — `Update` defined in Task 1 ✅
- `colorStyle(cfg repo.Configuracao) string` defined in Task 4 (`helpers.go`), called in `public_layout.templ` Task 4 ✅
- `saveLogo(uploadsDir string, data []byte) (string, error)` defined and called in Task 3 ✅
- `newConfigHandlers(uploadsDir string, cfg repo.ConfiguracaoRepo) configHandlers` — called in `handlers.go` Task 3 with `(deps.Config.UploadsDir, cfgRepo)` where `cfgRepo` was already declared earlier in `NewRouter` ✅
