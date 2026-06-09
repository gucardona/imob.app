# Public Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public-facing pages — home (destaque cards), imóvel listing with filters, and imóvel detail with photo gallery.

**Architecture:** Add `GetBySlug`/`ListPublic(ImovelFilter)` to `ImovelRepo` and `GetPrincipal` to `FotoRepo`; new `ConfiguracaoRepo` reads the single `configuracao` row; `publicHandlers` struct (home/list/detail) added to the existing `handlers` package; four new templ templates (`public_layout`, `public_imovel_card`, `public_imoveis_list`, `public_imovel_detail`) plus an updated `home.templ`; existing `handleHome` function replaced by `publicHandlers.home`.

**Tech Stack:** Go 1.26.4, `database/sql` + SQLite, `github.com/a-h/templ v0.3.1020`, Tailwind CSS (via `./tailwindcss`); `make generate` → `make test`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `internal/repo/configuracao.go` | `Configuracao` struct + `ConfiguracaoRepo.Get` |
| Create | `internal/repo/configuracao_test.go` | test `Get` returns migration defaults |
| Modify | `internal/repo/imovel.go` | add `ImovelFilter`, `GetBySlug`, `ListPublic` |
| Modify | `internal/repo/imovel_test.go` | tests for new methods |
| Modify | `internal/repo/foto.go` | add `GetPrincipal` |
| Modify | `internal/repo/foto_test.go` | test `GetPrincipal` |
| Create | `internal/templates/public_layout.templ` | nav header + footer with `Configuracao` |
| Create | `internal/templates/public_imovel_card.templ` | reusable card component |
| Modify | `internal/templates/home.templ` | use `PublicLayout`, show destaque cards |
| Create | `internal/templates/public_imoveis_list.templ` | filter bar + card grid |
| Create | `internal/templates/public_imovel_detail.templ` | photo gallery + detail + contact |
| Create | `internal/handlers/public_home.go` | `publicHandlers` struct, `home` method, `buildThumbURLs` helper |
| Create | `internal/handlers/public_imoveis.go` | `list` and `detail` methods on `publicHandlers` |
| Modify | `internal/handlers/handlers.go` | remove `handleHome`, register 3 public routes |
| Modify | `internal/handlers/handlers_test.go` | public route integration tests |

---

### Task 1: ConfiguracaoRepo

**Files:**
- Create: `internal/repo/configuracao.go`
- Create: `internal/repo/configuracao_test.go`

- [ ] **Step 1: Write the failing test**

```go
// internal/repo/configuracao_test.go
package repo_test

import (
	"context"
	"testing"

	"github.com/gucardona/imob.app/internal/repo"
)

func TestConfiguracaoRepo_Get_ReturnsDefaults(t *testing.T) {
	conn := newTestDB(t)
	r := repo.NewConfiguracaoRepo(conn)

	cfg, err := r.Get(context.Background())
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if cfg.CorPrimaria != "#1d4ed8" {
		t.Errorf("expected default CorPrimaria %q, got %q", "#1d4ed8", cfg.CorPrimaria)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gustavo/gupa.dev/imob.app && go test ./internal/repo/... -run TestConfiguracaoRepo -v
```

Expected: `FAIL` — `undefined: repo.NewConfiguracaoRepo`

- [ ] **Step 3: Write implementation**

```go
// internal/repo/configuracao.go
package repo

import (
	"context"
	"database/sql"
)

type Configuracao struct {
	NomeImobiliaria string
	LogoPath        string
	CorPrimaria     string
	CorSecundaria   string
	Endereco        string
	Telefone        string
	Whatsapp        string
	Email           string
	InstagramURL    string
	TextoSobre      string
	TextoHome       string
}

type ConfiguracaoRepo struct {
	conn *sql.DB
}

func NewConfiguracaoRepo(conn *sql.DB) ConfiguracaoRepo {
	return ConfiguracaoRepo{conn: conn}
}

func (r ConfiguracaoRepo) Get(ctx context.Context) (Configuracao, error) {
	var c Configuracao
	err := r.conn.QueryRowContext(ctx, `
		SELECT nome_imobiliaria, logo_path, cor_primaria, cor_secundaria,
		       endereco, telefone, whatsapp, email, instagram_url, texto_sobre, texto_home
		FROM configuracao WHERE id = 1
	`).Scan(
		&c.NomeImobiliaria, &c.LogoPath, &c.CorPrimaria, &c.CorSecundaria,
		&c.Endereco, &c.Telefone, &c.Whatsapp, &c.Email,
		&c.InstagramURL, &c.TextoSobre, &c.TextoHome,
	)
	return c, err
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/gustavo/gupa.dev/imob.app && go test ./internal/repo/... -run TestConfiguracaoRepo -v
```

Expected: `PASS`

- [ ] **Step 5: Commit**

```bash
git add internal/repo/configuracao.go internal/repo/configuracao_test.go
git commit -m "feat: ConfiguracaoRepo.Get — reads single configuracao row"
```

---

### Task 2: ImovelRepo — GetBySlug + ListPublic

**Files:**
- Modify: `internal/repo/imovel.go`
- Modify: `internal/repo/imovel_test.go`

- [ ] **Step 1: Write the failing tests**

Append to `internal/repo/imovel_test.go`:

```go
func TestImovelRepo_GetBySlug_ReturnsImovel(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)

	id, err := imoveis.Create(ctx, sampleImovel())
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	got, err := imoveis.GetBySlug(ctx, "casa-com-vista-para-o-mar")
	if err != nil {
		t.Fatalf("GetBySlug returned error: %v", err)
	}
	if got.ID != id {
		t.Errorf("expected ID %d, got %d", id, got.ID)
	}
}

func TestImovelRepo_GetBySlug_NotFound(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)

	_, err := imoveis.GetBySlug(ctx, "slug-que-nao-existe")
	if !errors.Is(err, repo.ErrNotFound) {
		t.Errorf("expected repo.ErrNotFound, got %v", err)
	}
}

func TestImovelRepo_ListPublic_OnlyDisponivel(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)

	disponivel := sampleImovel()
	disponivel.Status = "disponivel"
	if _, err := imoveis.Create(ctx, disponivel); err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	vendido := sampleImovel()
	vendido.Titulo = "Casa Vendida"
	vendido.Status = "vendido"
	if _, err := imoveis.Create(ctx, vendido); err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	list, err := imoveis.ListPublic(ctx, repo.ImovelFilter{})
	if err != nil {
		t.Fatalf("ListPublic returned error: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 disponivel imovel, got %d", len(list))
	}
	if list[0].Status != "disponivel" {
		t.Errorf("expected status disponivel, got %q", list[0].Status)
	}
}

func TestImovelRepo_ListPublic_FilterByFinalidade(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)

	venda := sampleImovel()
	venda.Finalidade = "venda"
	if _, err := imoveis.Create(ctx, venda); err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	aluguel := sampleImovel()
	aluguel.Titulo = "Casa para Alugar"
	aluguel.Finalidade = "aluguel"
	if _, err := imoveis.Create(ctx, aluguel); err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	list, err := imoveis.ListPublic(ctx, repo.ImovelFilter{Finalidade: "venda"})
	if err != nil {
		t.Fatalf("ListPublic returned error: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 venda imovel, got %d", len(list))
	}
	if list[0].Finalidade != "venda" {
		t.Errorf("expected finalidade venda, got %q", list[0].Finalidade)
	}
}

func TestImovelRepo_ListPublic_OnlyDestaque(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)

	regular := sampleImovel()
	regular.Destaque = false
	if _, err := imoveis.Create(ctx, regular); err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	destaque := sampleImovel()
	destaque.Titulo = "Casa em Destaque"
	destaque.Destaque = true
	if _, err := imoveis.Create(ctx, destaque); err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	list, err := imoveis.ListPublic(ctx, repo.ImovelFilter{OnlyDestaque: true})
	if err != nil {
		t.Fatalf("ListPublic returned error: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 destaque imovel, got %d", len(list))
	}
	if !list[0].Destaque {
		t.Error("expected Destaque to be true")
	}
}
```

Also add `"errors"` to the import block in `imovel_test.go`:
```go
import (
	"context"
	"errors"
	"testing"

	"github.com/gucardona/imob.app/internal/repo"
)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/gustavo/gupa.dev/imob.app && go test ./internal/repo/... -run "TestImovelRepo_GetBySlug|TestImovelRepo_ListPublic" -v
```

Expected: `FAIL` — `undefined: repo.ImovelFilter` / `imoveis.GetBySlug undefined`

- [ ] **Step 3: Write implementation**

Append to `internal/repo/imovel.go` (before the `Slugify` function):

```go
// ImovelFilter restricts ListPublic results. Zero value = no filter.
type ImovelFilter struct {
	Tipo         string // "" = any
	Finalidade   string // "" = any
	Cidade       string // "" = any; partial LIKE match
	OnlyDestaque bool   // if true, only destaque=1
}

func (r ImovelRepo) GetBySlug(ctx context.Context, slug string) (Imovel, error) {
	row := r.conn.QueryRowContext(ctx, `
		SELECT id, slug, titulo, descricao, tipo, finalidade, cidade, bairro, endereco,
		       preco, area_m2, quartos, banheiros, vagas_garagem, status, destaque
		FROM imoveis WHERE slug = ?
	`, slug)
	imovel, err := scanImovel(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Imovel{}, ErrNotFound
	}
	return imovel, err
}

func (r ImovelRepo) ListPublic(ctx context.Context, f ImovelFilter) ([]Imovel, error) {
	q := `SELECT id, slug, titulo, descricao, tipo, finalidade, cidade, bairro, endereco,
	             preco, area_m2, quartos, banheiros, vagas_garagem, status, destaque
	      FROM imoveis WHERE status = 'disponivel'`
	var args []any
	if f.Tipo != "" {
		q += ` AND tipo = ?`
		args = append(args, f.Tipo)
	}
	if f.Finalidade != "" {
		q += ` AND finalidade = ?`
		args = append(args, f.Finalidade)
	}
	if f.Cidade != "" {
		q += ` AND cidade LIKE ?`
		args = append(args, "%"+f.Cidade+"%")
	}
	if f.OnlyDestaque {
		q += ` AND destaque = 1`
	}
	q += ` ORDER BY criado_em DESC`

	rows, err := r.conn.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Imovel
	for rows.Next() {
		imovel, err := scanImovel(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, imovel)
	}
	return list, rows.Err()
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/gustavo/gupa.dev/imob.app && go test ./internal/repo/... -run "TestImovelRepo_GetBySlug|TestImovelRepo_ListPublic" -v
```

Expected: all `PASS`

- [ ] **Step 5: Commit**

```bash
git add internal/repo/imovel.go internal/repo/imovel_test.go
git commit -m "feat: ImovelRepo — GetBySlug and ListPublic with ImovelFilter"
```

---

### Task 3: FotoRepo.GetPrincipal

**Files:**
- Modify: `internal/repo/foto.go`
- Modify: `internal/repo/foto_test.go`

- [ ] **Step 1: Write the failing test**

Append to `internal/repo/foto_test.go`:

```go
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
```

Check the existing imports in `foto_test.go` — add `"errors"` if not present.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gustavo/gupa.dev/imob.app && go test ./internal/repo/... -run TestFotoRepo_GetPrincipal -v
```

Expected: `FAIL` — `fotos.GetPrincipal undefined`

- [ ] **Step 3: Write implementation**

Append to `internal/repo/foto.go` (before the final closing brace of the file):

```go
func (r FotoRepo) GetPrincipal(ctx context.Context, imovelID int64) (Foto, error) {
	var f Foto
	err := r.conn.QueryRowContext(ctx,
		`SELECT id, imovel_id, caminho_original, caminho_thumb, caminho_grande, principal, ordem
		 FROM fotos WHERE imovel_id = ? AND principal = 1 LIMIT 1`,
		imovelID,
	).Scan(&f.ID, &f.ImovelID, &f.CaminhoOriginal, &f.CaminhoThumb, &f.CaminhoGrande, &f.Principal, &f.Ordem)
	if errors.Is(err, sql.ErrNoRows) {
		return Foto{}, ErrNotFound
	}
	return f, err
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/gustavo/gupa.dev/imob.app && go test ./internal/repo/... -run TestFotoRepo_GetPrincipal -v
```

Expected: `PASS`

- [ ] **Step 5: Run full repo test suite**

```bash
cd /home/gustavo/gupa.dev/imob.app && go test ./internal/repo/... -v
```

Expected: all `PASS`

- [ ] **Step 6: Commit**

```bash
git add internal/repo/foto.go internal/repo/foto_test.go
git commit -m "feat: FotoRepo.GetPrincipal — returns principal foto or ErrNotFound"
```

---

### Task 4: Public layout and card templates

**Files:**
- Create: `internal/templates/public_layout.templ`
- Create: `internal/templates/public_imovel_card.templ`

- [ ] **Step 1: Create the public layout template**

```go
// internal/templates/public_layout.templ
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
		<body class="min-h-screen bg-white text-slate-900">
			<header class="bg-primary text-white">
				<div class="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
					<a href="/" class="text-xl font-bold">{ cfg.NomeImobiliaria }</a>
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
				</div>
			</footer>
		</body>
	</html>
}
```

- [ ] **Step 2: Create the imovel card component**

```go
// internal/templates/public_imovel_card.templ
package templates

import (
	"fmt"
	"github.com/gucardona/imob.app/internal/repo"
)

templ ImovelCard(imovel repo.Imovel, thumbURL string) {
	<a href={ templ.SafeURL("/imoveis/" + imovel.Slug) } class="block rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
		if thumbURL != "" {
			<img src={ thumbURL } alt={ imovel.Titulo } class="w-full h-48 object-cover"/>
		} else {
			<div class="w-full h-48 bg-slate-100 flex items-center justify-center text-slate-400 text-sm">Sem foto</div>
		}
		<div class="p-4">
			<p class="text-xs text-slate-500 uppercase tracking-wide mb-1">{ imovel.Tipo } — { imovel.Finalidade }</p>
			<h3 class="font-semibold text-slate-900 mb-1">{ imovel.Titulo }</h3>
			<p class="text-sm text-slate-500 mb-2">{ imovel.Cidade }, { imovel.Bairro }</p>
			<p class="text-primary font-bold">{ fmt.Sprintf("R$ %.0f", imovel.Preco) }</p>
		</div>
	</a>
}
```

- [ ] **Step 3: Generate and build**

```bash
cd /home/gustavo/gupa.dev/imob.app && make generate && go build ./...
```

Expected: no errors (templates compile, build succeeds)

- [ ] **Step 4: Commit**

```bash
git add internal/templates/public_layout.templ internal/templates/public_imovel_card.templ
git commit -m "feat: public layout and imovel card templ components"
```

---

### Task 5: Home handler

**Files:**
- Modify: `internal/templates/home.templ`
- Create: `internal/handlers/public_home.go`
- Modify: `internal/handlers/handlers.go`
- Modify: `internal/handlers/handlers_test.go`

- [ ] **Step 1: Update existing home test to reflect new behavior**

In `internal/handlers/handlers_test.go`, replace `TestRouter_Home_RendersWelcomePage`:

```go
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gustavo/gupa.dev/imob.app && make generate && go test ./internal/handlers/... -run TestRouter_Home_RendersPage -v
```

Expected: `FAIL` — old `handleHome` renders "Bem-vindo" without the nav, so `strings.Contains(body, "Imóveis")` is false.

- [ ] **Step 3: Update home.templ**

Replace the entire contents of `internal/templates/home.templ`:

```go
package templates

import "github.com/gucardona/imob.app/internal/repo"

templ Home(destaques []repo.Imovel, thumbURLs map[int64]string, cfg repo.Configuracao) {
	@PublicLayout("Início", cfg) {
		<main class="mx-auto max-w-5xl px-4 py-12">
			if cfg.TextoHome != "" {
				<p class="text-lg text-slate-700 mb-10">{ cfg.TextoHome }</p>
			}
			if len(destaques) > 0 {
				<h2 class="text-2xl font-bold mb-6">Imóveis em Destaque</h2>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					for _, im := range destaques {
						@ImovelCard(im, thumbURLs[im.ID])
					}
				</div>
			} else {
				<p class="text-slate-600">
					Nenhum imóvel em destaque.
					<a href="/imoveis" class="text-primary underline">Ver todos os imóveis</a>.
				</p>
			}
		</main>
	}
}
```

- [ ] **Step 4: Create public_home.go**

```go
// internal/handlers/public_home.go
package handlers

import (
	"context"
	"net/http"

	"github.com/gucardona/imob.app/internal/repo"
	"github.com/gucardona/imob.app/internal/templates"
)

type publicHandlers struct {
	uploadsURL   string
	imoveis      repo.ImovelRepo
	fotos        repo.FotoRepo
	configuracao repo.ConfiguracaoRepo
}

func newPublicHandlers(uploadsDir string, imoveis repo.ImovelRepo, fotos repo.FotoRepo, cfg repo.ConfiguracaoRepo) publicHandlers {
	return publicHandlers{
		uploadsURL:   "/uploads",
		imoveis:      imoveis,
		fotos:        fotos,
		configuracao: cfg,
	}
}

func (h publicHandlers) home(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	cfg, err := h.configuracao.Get(ctx)
	if err != nil {
		http.Error(w, "erro interno", http.StatusInternalServerError)
		return
	}

	destaques, err := h.imoveis.ListPublic(ctx, repo.ImovelFilter{OnlyDestaque: true})
	if err != nil {
		http.Error(w, "erro interno", http.StatusInternalServerError)
		return
	}

	thumbURLs := buildThumbURLs(ctx, h.fotos, h.uploadsURL, destaques)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = templates.Home(destaques, thumbURLs, cfg).Render(ctx, w)
}

// buildThumbURLs returns a map of imovelID → full thumb URL for each imovel
// that has a principal foto. Imoveis with no principal foto are omitted (empty string default).
func buildThumbURLs(ctx context.Context, fotos repo.FotoRepo, uploadsURL string, imoveis []repo.Imovel) map[int64]string {
	urls := make(map[int64]string, len(imoveis))
	for _, im := range imoveis {
		f, err := fotos.GetPrincipal(ctx, im.ID)
		if err != nil {
			continue
		}
		urls[im.ID] = uploadsURL + "/" + f.CaminhoThumb
	}
	return urls
}
```

- [ ] **Step 5: Update handlers.go**

In `internal/handlers/handlers.go`:

1. Remove the `handleHome` function entirely (lines containing `func handleHome` and its body).

2. Inside `NewRouter`, add after `fotos := repo.NewFotoRepo(deps.Conn)`:
```go
cfgRepo := repo.NewConfiguracaoRepo(deps.Conn)
pub := newPublicHandlers(deps.Config.UploadsDir, imoveis, fotos, cfgRepo)
```

3. Replace:
```go
mux.HandleFunc("GET /{$}", handleHome)
```
With:
```go
mux.HandleFunc("GET /{$}", pub.home)
```

- [ ] **Step 6: Generate, build, and test**

```bash
cd /home/gustavo/gupa.dev/imob.app && make generate && go test ./internal/handlers/... -run TestRouter_Home_RendersPage -v
```

Expected: `PASS`

- [ ] **Step 7: Commit**

```bash
git add internal/templates/home.templ internal/handlers/public_home.go internal/handlers/handlers.go internal/handlers/handlers_test.go
git commit -m "feat: home page uses PublicLayout with destaque imoveis"
```

---

### Task 6: Listing handler

**Files:**
- Create: `internal/templates/public_imoveis_list.templ`
- Create: `internal/handlers/public_imoveis.go`
- Modify: `internal/handlers/handlers.go`
- Modify: `internal/handlers/handlers_test.go`

- [ ] **Step 1: Write the failing tests**

Append to `internal/handlers/handlers_test.go`:

```go
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

	req := httptest.NewRequest(http.MethodGet, "/imoveis", nil)
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

	req := httptest.NewRequest(http.MethodGet, "/imoveis?finalidade=venda", nil)
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/gustavo/gupa.dev/imob.app && make generate && go test ./internal/handlers/... -run "TestRouter_PublicImoveis" -v
```

Expected: `FAIL` — 404 (no `/imoveis` route yet)

- [ ] **Step 3: Create the listing template**

```go
// internal/templates/public_imoveis_list.templ
package templates

import "github.com/gucardona/imob.app/internal/repo"

templ ImovelList(imoveis []repo.Imovel, thumbURLs map[int64]string, filter repo.ImovelFilter, cfg repo.Configuracao) {
	@PublicLayout("Imóveis", cfg) {
		<main class="mx-auto max-w-5xl px-4 py-8">
			<h1 class="text-2xl font-bold mb-6">Imóveis</h1>
			<form method="GET" action="/imoveis" class="flex flex-wrap gap-3 mb-8">
				<select name="finalidade" class="border border-slate-300 rounded px-3 py-2 text-sm">
					<option value="">Finalidade</option>
					<option value="venda" selected?={ filter.Finalidade == "venda" }>Venda</option>
					<option value="aluguel" selected?={ filter.Finalidade == "aluguel" }>Aluguel</option>
				</select>
				<select name="tipo" class="border border-slate-300 rounded px-3 py-2 text-sm">
					<option value="">Tipo</option>
					<option value="casa" selected?={ filter.Tipo == "casa" }>Casa</option>
					<option value="apartamento" selected?={ filter.Tipo == "apartamento" }>Apartamento</option>
					<option value="terreno" selected?={ filter.Tipo == "terreno" }>Terreno</option>
					<option value="comercial" selected?={ filter.Tipo == "comercial" }>Comercial</option>
					<option value="rural" selected?={ filter.Tipo == "rural" }>Rural</option>
				</select>
				<input
					type="text"
					name="cidade"
					value={ filter.Cidade }
					placeholder="Cidade"
					class="border border-slate-300 rounded px-3 py-2 text-sm"
				/>
				<button type="submit" class="bg-primary text-white rounded px-4 py-2 text-sm">Filtrar</button>
				if filter.Tipo != "" || filter.Finalidade != "" || filter.Cidade != "" {
					<a href="/imoveis" class="text-sm text-slate-500 underline self-center">Limpar filtros</a>
				}
			</form>
			if len(imoveis) == 0 {
				<p class="text-slate-600">Nenhum imóvel encontrado.</p>
			} else {
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					for _, im := range imoveis {
						@ImovelCard(im, thumbURLs[im.ID])
					}
				</div>
			}
		</main>
	}
}
```

- [ ] **Step 4: Create public_imoveis.go with list handler**

```go
// internal/handlers/public_imoveis.go
package handlers

import (
	"errors"
	"net/http"

	"github.com/gucardona/imob.app/internal/repo"
	"github.com/gucardona/imob.app/internal/templates"
)

func (h publicHandlers) list(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	q := r.URL.Query()

	filter := repo.ImovelFilter{
		Tipo:       q.Get("tipo"),
		Finalidade: q.Get("finalidade"),
		Cidade:     q.Get("cidade"),
	}

	cfg, err := h.configuracao.Get(ctx)
	if err != nil {
		http.Error(w, "erro interno", http.StatusInternalServerError)
		return
	}

	imoveis, err := h.imoveis.ListPublic(ctx, filter)
	if err != nil {
		http.Error(w, "erro interno", http.StatusInternalServerError)
		return
	}

	thumbURLs := buildThumbURLs(ctx, h.fotos, h.uploadsURL, imoveis)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = templates.ImovelList(imoveis, thumbURLs, filter, cfg).Render(ctx, w)
}

func (h publicHandlers) detail(w http.ResponseWriter, r *http.Request) {
	// implemented in Task 7
	http.NotFound(w, r)
}
```

- [ ] **Step 5: Register /imoveis route in handlers.go**

In `internal/handlers/handlers.go`, after `mux.HandleFunc("GET /{$}", pub.home)`, add:

```go
mux.HandleFunc("GET /imoveis", pub.list)
```

- [ ] **Step 6: Generate, build, and test**

```bash
cd /home/gustavo/gupa.dev/imob.app && make generate && go test ./internal/handlers/... -run "TestRouter_PublicImoveis" -v
```

Expected: all `PASS`

- [ ] **Step 7: Commit**

```bash
git add internal/templates/public_imoveis_list.templ internal/handlers/public_imoveis.go internal/handlers/handlers.go internal/handlers/handlers_test.go
git commit -m "feat: public /imoveis listing page with tipo/finalidade/cidade filters"
```

---

### Task 7: Detail handler

**Files:**
- Create: `internal/templates/public_imovel_detail.templ`
- Modify: `internal/handlers/public_imoveis.go`
- Modify: `internal/handlers/handlers.go`
- Modify: `internal/handlers/handlers_test.go`

- [ ] **Step 1: Write the failing tests**

Append to `internal/handlers/handlers_test.go`:

```go
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

	req := httptest.NewRequest(http.MethodGet, "/imoveis/casa-com-vista-para-o-mar", nil)
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

	req := httptest.NewRequest(http.MethodGet, "/imoveis/slug-inexistente", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", rec.Code)
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/gustavo/gupa.dev/imob.app && make generate && go test ./internal/handlers/... -run "TestRouter_PublicImovelDetail" -v
```

Expected: `FAIL` — stub `detail` handler always returns 404, so `BySlug` fails.

- [ ] **Step 3: Create the detail template**

```go
// internal/templates/public_imovel_detail.templ
package templates

import (
	"fmt"
	"github.com/gucardona/imob.app/internal/repo"
)

templ ImovelDetail(imovel repo.Imovel, fotos []repo.Foto, cfg repo.Configuracao, uploadsURL string) {
	@PublicLayout(imovel.Titulo, cfg) {
		<main class="mx-auto max-w-5xl px-4 py-8">
			if len(fotos) > 0 {
				<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
					for _, f := range fotos {
						<a href={ templ.SafeURL(uploadsURL + "/" + f.CaminhoGrande) } target="_blank">
							<img
								src={ uploadsURL + "/" + f.CaminhoThumb }
								alt={ imovel.Titulo }
								class="w-full h-40 object-cover rounded"
							/>
						</a>
					}
				</div>
			}
			<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
				<div class="md:col-span-2">
					<p class="text-xs text-slate-500 uppercase tracking-wide mb-1">{ imovel.Tipo } — { imovel.Finalidade }</p>
					<h1 class="text-3xl font-bold mb-2">{ imovel.Titulo }</h1>
					<p class="text-slate-600 mb-4">{ imovel.Cidade }, { imovel.Bairro }</p>
					if imovel.Descricao != "" {
						<p class="text-slate-700 mb-6">{ imovel.Descricao }</p>
					}
					<table class="text-sm w-full border-collapse">
						<tbody>
							if imovel.AreaM2 > 0 {
								<tr class="border-b border-slate-100">
									<td class="py-2 text-slate-500 w-40">Área</td>
									<td class="py-2 font-medium">{ fmt.Sprintf("%.0f m²", imovel.AreaM2) }</td>
								</tr>
							}
							if imovel.Quartos > 0 {
								<tr class="border-b border-slate-100">
									<td class="py-2 text-slate-500">Quartos</td>
									<td class="py-2 font-medium">{ fmt.Sprintf("%d", imovel.Quartos) }</td>
								</tr>
							}
							if imovel.Banheiros > 0 {
								<tr class="border-b border-slate-100">
									<td class="py-2 text-slate-500">Banheiros</td>
									<td class="py-2 font-medium">{ fmt.Sprintf("%d", imovel.Banheiros) }</td>
								</tr>
							}
							if imovel.VagasGaragem > 0 {
								<tr class="border-b border-slate-100">
									<td class="py-2 text-slate-500">Vagas</td>
									<td class="py-2 font-medium">{ fmt.Sprintf("%d", imovel.VagasGaragem) }</td>
								</tr>
							}
						</tbody>
					</table>
				</div>
				<div class="bg-slate-50 rounded-lg p-6 h-fit">
					<p class="text-2xl font-bold text-primary mb-4">{ fmt.Sprintf("R$ %.0f", imovel.Preco) }</p>
					if cfg.Whatsapp != "" {
						<a
							href={ templ.SafeURL("https://wa.me/" + cfg.Whatsapp) }
							target="_blank"
							class="block w-full bg-green-500 text-white text-center rounded px-4 py-3 font-medium hover:bg-green-600"
						>
							Contato via WhatsApp
						</a>
					}
					if cfg.Telefone != "" {
						<p class="text-center text-sm text-slate-600 mt-3">{ cfg.Telefone }</p>
					}
				</div>
			</div>
		</main>
	}
}
```

- [ ] **Step 4: Replace stub detail handler in public_imoveis.go**

Replace the `detail` method stub with:

```go
func (h publicHandlers) detail(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	slug := r.PathValue("slug")

	imovel, err := h.imoveis.GetBySlug(ctx, slug)
	if errors.Is(err, repo.ErrNotFound) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		http.Error(w, "erro interno", http.StatusInternalServerError)
		return
	}

	cfg, err := h.configuracao.Get(ctx)
	if err != nil {
		http.Error(w, "erro interno", http.StatusInternalServerError)
		return
	}

	fotos, err := h.fotos.ListByImovel(ctx, imovel.ID)
	if err != nil {
		http.Error(w, "erro interno", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = templates.ImovelDetail(imovel, fotos, cfg, h.uploadsURL).Render(ctx, w)
}
```

- [ ] **Step 5: Register /imoveis/{slug} route in handlers.go**

In `internal/handlers/handlers.go`, after `mux.HandleFunc("GET /imoveis", pub.list)`, add:

```go
mux.HandleFunc("GET /imoveis/{slug}", pub.detail)
```

- [ ] **Step 6: Generate, build, and test**

```bash
cd /home/gustavo/gupa.dev/imob.app && make generate && go test ./... -v 2>&1 | tail -30
```

Expected: all packages `PASS`

- [ ] **Step 7: Run full test suite one more time cleanly**

```bash
cd /home/gustavo/gupa.dev/imob.app && make test 2>&1 | tail -20
```

Expected: all `PASS`, no `FAIL`

- [ ] **Step 8: Commit**

```bash
git add internal/templates/public_imovel_detail.templ internal/handlers/public_imoveis.go internal/handlers/handlers.go internal/handlers/handlers_test.go
git commit -m "feat: public /imoveis/{slug} detail page with photo gallery and contact"
```

---

## Self-Review

**Spec coverage:**
- ✅ Home page with destaque imoveis → Task 5
- ✅ `/imoveis` listing with tipo/finalidade/cidade filters → Task 6
- ✅ `/imoveis/{slug}` detail page → Task 7
- ✅ Photo gallery using `fotos` table → Task 7 (ImovelDetail template)
- ✅ SEO-friendly slugs (already in repo) → GetBySlug in Task 2

**Placeholder scan:** No TBD/TODO/placeholder steps. All code blocks are complete.

**Type consistency:**
- `ImovelFilter` defined in Task 2, used in Task 5 (home, `OnlyDestaque: true`), Task 6 (list handler), and Task 6 (list template param).
- `Configuracao` defined in Task 1; `ConfiguracaoRepo` instantiated in Task 5 (handlers.go); passed to all public templates as `cfg repo.Configuracao`.
- `buildThumbURLs` defined in Task 5 (`public_home.go`), called in Task 5 and Task 6 (`public_imoveis.go`) — same package, accessible.
- `publicHandlers.detail` stub created in Task 6 (Step 4), replaced in Task 7 (Step 4) — no conflict.
- `FotoRepo.GetPrincipal` defined in Task 3, called in `buildThumbURLs` (Task 5).
- `ImovelCard(imovel repo.Imovel, thumbURL string)` defined in Task 4 — called as `@ImovelCard(im, thumbURLs[im.ID])` in both home.templ (Task 5) and public_imoveis_list.templ (Task 6). `thumbURLs[im.ID]` returns `""` for missing keys, which the card handles with the "Sem foto" placeholder.
