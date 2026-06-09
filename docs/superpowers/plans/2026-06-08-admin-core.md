# Admin Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin panel core: email/password login w/ signed-cookie sessions, a CLI to create admins, full Imóveis CRUD (list/create/edit/delete/destaque), and htmx-driven multi-photo upload w/ resized variants and per-photo management.

**Architecture:** New `internal/auth` package handles bcrypt hashing and HMAC-SHA256 signed session cookies (no server-side session storage, per spec). New `internal/repo` package wraps `database/sql` access for `admins`, `imoveis`, `fotos` behind small structs/functions (no ORM). New `internal/images` package generates resized JPEG variants via `disintegration/imaging`. Admin HTTP handlers live alongside the existing public ones in `internal/handlers`, gated by an auth middleware, and render new `templ` admin templates. A new `admin` CLI subcommand in `cmd/imob-app` creates admins directly via the repo (bcrypt hash, hidden password prompt via `golang.org/x/term`).

**Tech Stack:** Go stdlib (`net/http`, `database/sql`, `crypto/hmac`, `crypto/sha256`, `mime/multipart`), `golang.org/x/crypto/bcrypt`, `golang.org/x/term`, `github.com/disintegration/imaging`, `templ`, htmx (already wired via Plan 1's static pipeline — no new JS framework).

---

## File Structure

```
go.mod                                       (modify — add bcrypt, term, imaging deps)
cmd/imob-app/main.go                         (modify — dispatch CLI subcommands)
cmd/imob-app/admin.go                        (new — `admin create` subcommand)
internal/config/config.go                    (modify — SessionSecret, UploadsDir)
internal/auth/password.go                    (new — bcrypt hash/verify)
internal/auth/password_test.go
internal/auth/session.go                     (new — signed cookie issue/verify/clear)
internal/auth/session_test.go
internal/repo/admin.go                       (new — Admin struct, FindByEmail, Create)
internal/repo/admin_test.go
internal/repo/imovel.go                      (new — Imovel struct + CRUD + slugify)
internal/repo/imovel_test.go
internal/repo/foto.go                        (new — Foto struct, list/create/principal/delete)
internal/repo/foto_test.go
internal/images/images.go                    (new — resize pipeline, JPEG variants)
internal/images/images_test.go
internal/handlers/middleware.go              (new — RequireAuth)
internal/handlers/admin_auth.go              (new — login/logout handlers)
internal/handlers/admin_imoveis.go           (new — imóveis list/form/CRUD handlers)
internal/handlers/admin_fotos.go             (new — upload/principal/remove handlers)
internal/handlers/handlers.go                (modify — wire admin routes + deps)
internal/handlers/handlers_test.go           (modify — newTestRouter gains deps)
internal/templates/admin_layout.templ        (new — admin shell w/ nav + logout)
internal/templates/admin_login.templ         (new — login form)
internal/templates/admin_imoveis_list.templ  (new — imóveis table)
internal/templates/admin_imovel_form.templ   (new — create/edit form + photo grid)
internal/templates/admin_fotos_fragment.templ (new — htmx photo grid fragment)
```

---

## Design notes (locked in before tasks)

- **Session cookie name:** `imob_session`. **Secret env var:** `SESSION_SECRET` (required at startup in production; tests pass an explicit secret).
- **Cookie format:** `payload.signature` where `payload = "<adminID>.<expiresUnixSeconds>"` (both base10 ints joined by `.`), and `signature = hex(HMAC-SHA256(secret, payload))`. Verify recomputes HMAC and compares with `hmac.Equal`, then checks `expiresUnix > now`. TTL = 7 days, renewed (re-issued) on every authenticated request.
- **Imóvel delete:** included as a normal CRUD action (table's "ações" column implies it; spec's "fora de escopo" list does not exclude it).
- **Slugs:** generated server-side from `título` on create (and regenerated on update if título changes) — admin never edits the slug directly. Lowercase, accents stripped to ASCII, non-alphanumerics collapsed to single hyphens.
- **Uploads:** new config field `UPLOADS_DIR` (default `uploads`), directory `<uploads>/<imovel_id>/`. Stored DB paths are web-servable relative paths like `uploads/3/foto-1-original.jpg`; Plan 3 (Public Site) wires up serving them — this plan only needs them resolvable on disk for the admin photo grid (served via the same `/uploads/` static mount this plan adds, since the admin needs to preview thumbnails immediately).
- **Image variants:** `thumb` width ~400px, `grande` width ~1600px, both via `imaging.Resize(img, width, 0, imaging.Lanczos)` (height 0 = preserve aspect ratio), saved as JPEG quality 85. Original kept as-is (re-encoded to JPEG for consistency, since `imaging.Decode` already auto-orients).
- **Routes added:**
  - `GET /admin/login`, `POST /admin/login`, `POST /admin/logout`
  - `GET /admin/imoveis` (list), `GET /admin/imoveis/novo` (create form), `POST /admin/imoveis` (create)
  - `GET /admin/imoveis/{id}/editar` (edit form), `POST /admin/imoveis/{id}` (update), `POST /admin/imoveis/{id}/excluir` (delete)
  - `POST /admin/imoveis/{id}/destaque` (toggle destaque, htmx)
  - `POST /admin/imoveis/{id}/fotos` (upload, htmx, returns fragment)
  - `POST /admin/imoveis/{id}/fotos/{fotoID}/principal` (htmx, returns fragment)
  - `POST /admin/imoveis/{id}/fotos/{fotoID}/excluir` (htmx, returns fragment)
  - `GET /uploads/` (static file serving of the uploads directory, needed so admin photo previews load)
- All `/admin/*` routes except `/admin/login` are wrapped by `RequireAuth`.

---

### Task 1: Add new dependencies

**Files:**
- Modify: `go.mod`, `go.sum`

- [ ] **Step 1: Fetch the three new dependencies**

Run:
```bash
go get golang.org/x/crypto@v0.52.0
go get golang.org/x/term@v0.43.0
go get github.com/disintegration/imaging@v1.6.2
```
Expected: `go.mod`/`go.sum` gain `golang.org/x/crypto`, `golang.org/x/term`, `github.com/disintegration/imaging` (+ transitive `golang.org/x/image`).

- [ ] **Step 2: Verify the module still builds**

Run: `go build ./...`
Expected: exits 0, no errors (nothing imports the new deps yet — this just confirms resolution).

- [ ] **Step 3: Commit**

```bash
git add go.mod go.sum
git commit -m "chore: add bcrypt, terminal, and image-resize dependencies"
```

---

### Task 2: Password hashing

**Files:**
- Create: `internal/auth/password.go`
- Test: `internal/auth/password_test.go`

- [ ] **Step 1: Write the failing test**

Create `internal/auth/password_test.go`:

```go
package auth_test

import (
	"testing"

	"github.com/gucardona/imob.app/internal/auth"
)

func TestHashPassword_VerifyPassword_RoundTrip(t *testing.T) {
	hash, err := auth.HashPassword("correct horse battery staple")
	if err != nil {
		t.Fatalf("HashPassword returned error: %v", err)
	}

	if hash == "correct horse battery staple" {
		t.Error("expected hash to differ from plaintext password")
	}
	if !auth.VerifyPassword(hash, "correct horse battery staple") {
		t.Error("expected VerifyPassword to accept the correct password")
	}
	if auth.VerifyPassword(hash, "wrong password") {
		t.Error("expected VerifyPassword to reject an incorrect password")
	}
}

func TestHashPassword_ProducesDifferentHashesForSameInput(t *testing.T) {
	hashA, err := auth.HashPassword("same password")
	if err != nil {
		t.Fatalf("HashPassword returned error: %v", err)
	}
	hashB, err := auth.HashPassword("same password")
	if err != nil {
		t.Fatalf("HashPassword returned error: %v", err)
	}

	if hashA == hashB {
		t.Error("expected bcrypt to salt hashes so repeated calls differ")
	}
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `go test ./internal/auth/...`
Expected: FAIL — `no required module provides package github.com/gucardona/imob.app/internal/auth`

- [ ] **Step 3: Write the implementation**

Create `internal/auth/password.go`:

```go
package auth

import "golang.org/x/crypto/bcrypt"

func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func VerifyPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `go test ./internal/auth/...`
Expected: `ok  	github.com/gucardona/imob.app/internal/auth`

- [ ] **Step 5: Commit**

```bash
git add internal/auth/password.go internal/auth/password_test.go
git commit -m "feat: add bcrypt password hashing helpers"
```

---

### Task 3: Signed session cookies

**Files:**
- Create: `internal/auth/session.go`
- Test: `internal/auth/session_test.go`

- [ ] **Step 1: Write the failing tests**

Create `internal/auth/session_test.go`:

```go
package auth_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gucardona/imob.app/internal/auth"
)

func TestSessions_IssueThenVerify_ReturnsAdminID(t *testing.T) {
	sessions := auth.NewSessionManager("test-secret-do-not-use-in-prod", 7*24*time.Hour)

	rec := httptest.NewRecorder()
	sessions.Issue(rec, 42)

	cookie := firstCookie(t, rec)

	req := httptest.NewRequest(http.MethodGet, "/admin/imoveis", nil)
	req.AddCookie(cookie)

	adminID, ok := sessions.Verify(req)
	if !ok {
		t.Fatal("expected Verify to accept a freshly issued cookie")
	}
	if adminID != 42 {
		t.Errorf("expected admin id 42, got %d", adminID)
	}
}

func TestSessions_Verify_RejectsTamperedCookie(t *testing.T) {
	sessions := auth.NewSessionManager("test-secret-do-not-use-in-prod", 7*24*time.Hour)

	rec := httptest.NewRecorder()
	sessions.Issue(rec, 42)
	cookie := firstCookie(t, rec)
	cookie.Value = cookie.Value + "tampered"

	req := httptest.NewRequest(http.MethodGet, "/admin/imoveis", nil)
	req.AddCookie(cookie)

	if _, ok := sessions.Verify(req); ok {
		t.Error("expected Verify to reject a tampered cookie")
	}
}

func TestSessions_Verify_RejectsExpiredCookie(t *testing.T) {
	sessions := auth.NewSessionManager("test-secret-do-not-use-in-prod", -1*time.Hour)

	rec := httptest.NewRecorder()
	sessions.Issue(rec, 42)
	cookie := firstCookie(t, rec)

	req := httptest.NewRequest(http.MethodGet, "/admin/imoveis", nil)
	req.AddCookie(cookie)

	if _, ok := sessions.Verify(req); ok {
		t.Error("expected Verify to reject an expired cookie")
	}
}

func TestSessions_Verify_RejectsMissingCookie(t *testing.T) {
	sessions := auth.NewSessionManager("test-secret-do-not-use-in-prod", 7*24*time.Hour)

	req := httptest.NewRequest(http.MethodGet, "/admin/imoveis", nil)

	if _, ok := sessions.Verify(req); ok {
		t.Error("expected Verify to reject a request without a session cookie")
	}
}

func TestSessions_Clear_RemovesCookie(t *testing.T) {
	sessions := auth.NewSessionManager("test-secret-do-not-use-in-prod", 7*24*time.Hour)

	rec := httptest.NewRecorder()
	sessions.Clear(rec)

	cookie := firstCookie(t, rec)
	if cookie.MaxAge >= 0 {
		t.Errorf("expected Clear to set a negative MaxAge, got %d", cookie.MaxAge)
	}
	if cookie.Value != "" {
		t.Errorf("expected Clear to set an empty cookie value, got %q", cookie.Value)
	}
}

func firstCookie(t *testing.T, rec *httptest.ResponseRecorder) *http.Cookie {
	t.Helper()
	cookies := rec.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatal("expected a Set-Cookie header, got none")
	}
	return cookies[0]
}
```

- [ ] **Step 2: Run them to verify they fail**

Run: `go test ./internal/auth/...`
Expected: FAIL — `undefined: auth.NewSessionManager`

- [ ] **Step 3: Write the implementation**

Create `internal/auth/session.go`:

```go
package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const cookieName = "imob_session"

type SessionManager struct {
	secret []byte
	ttl    time.Duration
}

func NewSessionManager(secret string, ttl time.Duration) SessionManager {
	return SessionManager{secret: []byte(secret), ttl: ttl}
}

func (m SessionManager) Issue(w http.ResponseWriter, adminID int64) {
	expires := time.Now().Add(m.ttl)
	payload := fmt.Sprintf("%d.%d", adminID, expires.Unix())
	value := payload + "." + m.sign(payload)

	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Expires:  expires,
	})
}

func (m SessionManager) Verify(r *http.Request) (int64, bool) {
	cookie, err := r.Cookie(cookieName)
	if err != nil {
		return 0, false
	}

	lastDot := strings.LastIndex(cookie.Value, ".")
	if lastDot == -1 {
		return 0, false
	}
	payload, signature := cookie.Value[:lastDot], cookie.Value[lastDot+1:]

	if !hmac.Equal([]byte(signature), []byte(m.sign(payload))) {
		return 0, false
	}

	parts := strings.SplitN(payload, ".", 2)
	if len(parts) != 2 {
		return 0, false
	}

	adminID, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return 0, false
	}
	expiresUnix, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return 0, false
	}

	if time.Now().Unix() > expiresUnix {
		return 0, false
	}

	return adminID, true
}

func (m SessionManager) Clear(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

func (m SessionManager) sign(payload string) string {
	mac := hmac.New(sha256.New, m.secret)
	mac.Write([]byte(payload))
	return hex.EncodeToString(mac.Sum(nil))
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `go test ./internal/auth/...`
Expected: `ok  	github.com/gucardona/imob.app/internal/auth`

- [ ] **Step 5: Commit**

```bash
git add internal/auth/session.go internal/auth/session_test.go
git commit -m "feat: add HMAC-signed session cookie issue/verify/clear"
```

---

### Task 4: Admin repository

**Files:**
- Create: `internal/repo/admin.go`
- Test: `internal/repo/admin_test.go`

- [ ] **Step 1: Write the failing test**

Create `internal/repo/admin_test.go`:

```go
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `go test ./internal/repo/...`
Expected: FAIL — `no required module provides package github.com/gucardona/imob.app/internal/repo`

- [ ] **Step 3: Write the implementation**

Create `internal/repo/admin.go`:

```go
package repo

import (
	"context"
	"database/sql"
	"errors"
)

var ErrNotFound = errors.New("repo: not found")

type Admin struct {
	ID        int64
	Email     string
	SenhaHash string
}

type AdminRepo struct {
	conn *sql.DB
}

func NewAdminRepo(conn *sql.DB) AdminRepo {
	return AdminRepo{conn: conn}
}

func (r AdminRepo) FindByEmail(ctx context.Context, email string) (Admin, error) {
	var a Admin
	err := r.conn.QueryRowContext(ctx,
		`SELECT id, email, senha_hash FROM admins WHERE email = ?`, email,
	).Scan(&a.ID, &a.Email, &a.SenhaHash)

	if errors.Is(err, sql.ErrNoRows) {
		return Admin{}, ErrNotFound
	}
	if err != nil {
		return Admin{}, err
	}

	return a, nil
}

func (r AdminRepo) Create(ctx context.Context, email, senhaHash string) (int64, error) {
	result, err := r.conn.ExecContext(ctx,
		`INSERT INTO admins (email, senha_hash) VALUES (?, ?)`, email, senhaHash,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `go test ./internal/repo/...`
Expected: `ok  	github.com/gucardona/imob.app/internal/repo`

- [ ] **Step 5: Commit**

```bash
git add internal/repo/admin.go internal/repo/admin_test.go
git commit -m "feat: add admin repository with FindByEmail and Create"
```

---

### Task 5: Config additions (session secret, uploads dir)

**Files:**
- Modify: `internal/config/config.go`, `internal/config/config_test.go`

- [ ] **Step 1: Extend the failing test**

Add these two test functions to `internal/config/config_test.go` (keep the existing two):

```go
func TestLoad_SessionSecretAndUploadsDir_Defaults(t *testing.T) {
	t.Setenv("SESSION_SECRET", "")
	t.Setenv("UPLOADS_DIR", "")

	cfg := config.Load()

	if cfg.SessionSecret != "" {
		t.Errorf("expected empty default session secret, got %q", cfg.SessionSecret)
	}
	if cfg.UploadsDir != "uploads" {
		t.Errorf("expected default uploads dir %q, got %q", "uploads", cfg.UploadsDir)
	}
}

func TestLoad_SessionSecretAndUploadsDir_FromEnv(t *testing.T) {
	t.Setenv("SESSION_SECRET", "super-secret-value")
	t.Setenv("UPLOADS_DIR", "/var/data/uploads")

	cfg := config.Load()

	if cfg.SessionSecret != "super-secret-value" {
		t.Errorf("expected session secret %q, got %q", "super-secret-value", cfg.SessionSecret)
	}
	if cfg.UploadsDir != "/var/data/uploads" {
		t.Errorf("expected uploads dir %q, got %q", "/var/data/uploads", cfg.UploadsDir)
	}
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `go test ./internal/config/...`
Expected: FAIL — `cfg.SessionSecret undefined` / `cfg.UploadsDir undefined`

- [ ] **Step 3: Update the implementation**

In `internal/config/config.go`, add the two fields to the struct and load them:

```go
type Config struct {
	Port          string
	DatabasePath  string
	SessionSecret string
	UploadsDir    string
}

func Load() Config {
	return Config{
		Port:          getEnvOrDefault("PORT", "8004"),
		DatabasePath:  getEnvOrDefault("DATABASE_PATH", "imob.db"),
		SessionSecret: getEnvOrDefault("SESSION_SECRET", ""),
		UploadsDir:    getEnvOrDefault("UPLOADS_DIR", "uploads"),
	}
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `go test ./internal/config/...`
Expected: `ok  	github.com/gucardona/imob.app/internal/config`

- [ ] **Step 5: Commit**

```bash
git add internal/config/config.go internal/config/config_test.go
git commit -m "feat: add session secret and uploads dir to config"
```

---

### Task 6: CLI `admin create` subcommand

**Files:**
- Modify: `cmd/imob-app/main.go`
- Create: `cmd/imob-app/admin.go`

- [ ] **Step 1: Add subcommand dispatch to main**

Replace the contents of `cmd/imob-app/main.go`:

```go
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gucardona/imob.app/internal/config"
	"github.com/gucardona/imob.app/internal/db"
	"github.com/gucardona/imob.app/internal/handlers"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "admin" {
		runAdminCommand(os.Args[2:])
		return
	}

	runServer()
}

func runServer() {
	cfg := config.Load()

	conn, err := db.Open(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("opening database: %v", err)
	}
	defer conn.Close()

	if err := db.Migrate(conn); err != nil {
		log.Fatalf("running migrations: %v", err)
	}

	router := handlers.NewRouter(handlers.Deps{
		Conn:   conn,
		Config: cfg,
	})

	log.Printf("listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, router); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
```

- [ ] **Step 2: Write the `admin create` subcommand**

Create `cmd/imob-app/admin.go`:

```go
package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"

	"golang.org/x/term"

	"github.com/gucardona/imob.app/internal/auth"
	"github.com/gucardona/imob.app/internal/config"
	"github.com/gucardona/imob.app/internal/db"
	"github.com/gucardona/imob.app/internal/repo"
)

func runAdminCommand(args []string) {
	if len(args) != 2 || args[0] != "create" {
		log.Fatal("usage: imob-app admin create <email>")
	}
	email := args[1]

	password, err := promptPassword("Senha: ")
	if err != nil {
		log.Fatalf("reading password: %v", err)
	}
	if password == "" {
		log.Fatal("senha não pode ser vazia")
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		log.Fatalf("hashing password: %v", err)
	}

	cfg := config.Load()
	conn, err := db.Open(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("opening database: %v", err)
	}
	defer conn.Close()

	if err := db.Migrate(conn); err != nil {
		log.Fatalf("running migrations: %v", err)
	}

	admins := repo.NewAdminRepo(conn)
	id, err := admins.Create(context.Background(), email, hash)
	if err != nil {
		log.Fatalf("creating admin: %v", err)
	}

	fmt.Printf("admin criado: id=%d email=%s\n", id, email)
}

func promptPassword(prompt string) (string, error) {
	fmt.Fprint(os.Stdout, prompt)
	bytes, err := term.ReadPassword(int(os.Stdin.Fd()))
	fmt.Fprintln(os.Stdout)
	if err != nil {
		if errors.Is(err, os.ErrClosed) {
			return "", err
		}
		return "", err
	}
	return string(bytes), nil
}
```

- [ ] **Step 3: Commit**

Note: `cmd/imob-app` will not compile yet — `main.go` now references `handlers.Deps`/`handlers.NewRouter(handlers.Deps{...})`, which don't exist until Task 10 rewrites `internal/handlers/handlers.go`. That's expected; commit anyway (a package-level compile error doesn't block `git commit`, and Task 10 resolves it — its Step 7 test run plus a `go build ./...` there confirms `cmd/imob-app` compiles too).

```bash
git add cmd/imob-app/main.go cmd/imob-app/admin.go
git commit -m "feat: add 'admin create' CLI subcommand with hidden password prompt"
```

```bash
git add cmd/imob-app/main.go cmd/imob-app/admin.go
git commit -m "feat: add 'admin create' CLI subcommand with hidden password prompt"
```

---

### Task 7: Imóvel repository

**Files:**
- Create: `internal/repo/imovel.go`
- Test: `internal/repo/imovel_test.go`

- [ ] **Step 1: Write the failing test**

Create `internal/repo/imovel_test.go`:

```go
package repo_test

import (
	"context"
	"testing"

	"github.com/gucardona/imob.app/internal/repo"
)

func sampleImovel() repo.Imovel {
	return repo.Imovel{
		Titulo:       "Casa com Vista para o Mar",
		Descricao:    "Linda casa de três quartos.",
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

func TestImovelRepo_CreateGeneratesSlugFromTitulo(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)

	id, err := imoveis.Create(ctx, sampleImovel())
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	got, err := imoveis.Get(ctx, id)
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if got.Slug != "casa-com-vista-para-o-mar" {
		t.Errorf("expected slug %q, got %q", "casa-com-vista-para-o-mar", got.Slug)
	}
	if got.Titulo != "Casa com Vista para o Mar" {
		t.Errorf("expected titulo to round-trip, got %q", got.Titulo)
	}
}

func TestImovelRepo_List_ReturnsCreatedImoveis(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)

	first := sampleImovel()
	first.Titulo = "Primeiro Imóvel"
	second := sampleImovel()
	second.Titulo = "Segundo Imóvel"

	if _, err := imoveis.Create(ctx, first); err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if _, err := imoveis.Create(ctx, second); err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	list, err := imoveis.List(ctx)
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(list) != 2 {
		t.Fatalf("expected 2 imóveis, got %d", len(list))
	}
}

func TestImovelRepo_UpdateChangesFieldsAndRegeneratesSlug(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)

	id, err := imoveis.Create(ctx, sampleImovel())
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	updated := sampleImovel()
	updated.ID = id
	updated.Titulo = "Casa Reformada"
	updated.Preco = 900000

	if err := imoveis.Update(ctx, updated); err != nil {
		t.Fatalf("Update returned error: %v", err)
	}

	got, err := imoveis.Get(ctx, id)
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if got.Titulo != "Casa Reformada" {
		t.Errorf("expected updated titulo, got %q", got.Titulo)
	}
	if got.Slug != "casa-reformada" {
		t.Errorf("expected regenerated slug %q, got %q", "casa-reformada", got.Slug)
	}
	if got.Preco != 900000 {
		t.Errorf("expected updated preco 900000, got %v", got.Preco)
	}
}

func TestImovelRepo_SetDestaque_TogglesFlag(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)

	id, err := imoveis.Create(ctx, sampleImovel())
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	if err := imoveis.SetDestaque(ctx, id, true); err != nil {
		t.Fatalf("SetDestaque(true) returned error: %v", err)
	}
	got, err := imoveis.Get(ctx, id)
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if !got.Destaque {
		t.Error("expected destaque to be true after SetDestaque(true)")
	}

	if err := imoveis.SetDestaque(ctx, id, false); err != nil {
		t.Fatalf("SetDestaque(false) returned error: %v", err)
	}
	got, err = imoveis.Get(ctx, id)
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if got.Destaque {
		t.Error("expected destaque to be false after SetDestaque(false)")
	}
}

func TestImovelRepo_Delete_RemovesImovel(t *testing.T) {
	conn := newTestDB(t)
	ctx := context.Background()
	imoveis := repo.NewImovelRepo(conn)

	id, err := imoveis.Create(ctx, sampleImovel())
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	if err := imoveis.Delete(ctx, id); err != nil {
		t.Fatalf("Delete returned error: %v", err)
	}

	if _, err := imoveis.Get(ctx, id); err == nil {
		t.Error("expected Get to fail after Delete")
	}
}

func TestSlugify_NormalizesAccentsAndPunctuation(t *testing.T) {
	cases := map[string]string{
		"Casa com Vista para o Mar": "casa-com-vista-para-o-mar",
		"Apartamento - 2 Quartos!!": "apartamento-2-quartos",
		"  Espaços   Múltiplos  ":   "espacos-multiplos",
	}

	for input, want := range cases {
		if got := repo.Slugify(input); got != want {
			t.Errorf("Slugify(%q) = %q, want %q", input, got, want)
		}
	}
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `go test ./internal/repo/...`
Expected: FAIL — `undefined: repo.Imovel`

- [ ] **Step 3: Write the implementation**

Create `internal/repo/imovel.go`:

```go
package repo

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"unicode"
)

type Imovel struct {
	ID           int64
	Slug         string
	Titulo       string
	Descricao    string
	Tipo         string
	Finalidade   string
	Cidade       string
	Bairro       string
	Endereco     string
	Preco        float64
	AreaM2       float64
	Quartos      int
	Banheiros    int
	VagasGaragem int
	Status       string
	Destaque     bool
}

type ImovelRepo struct {
	conn *sql.DB
}

func NewImovelRepo(conn *sql.DB) ImovelRepo {
	return ImovelRepo{conn: conn}
}

func (r ImovelRepo) List(ctx context.Context) ([]Imovel, error) {
	rows, err := r.conn.QueryContext(ctx, `
		SELECT id, slug, titulo, descricao, tipo, finalidade, cidade, bairro, endereco,
		       preco, area_m2, quartos, banheiros, vagas_garagem, status, destaque
		FROM imoveis
		ORDER BY criado_em DESC
	`)
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

func (r ImovelRepo) Get(ctx context.Context, id int64) (Imovel, error) {
	row := r.conn.QueryRowContext(ctx, `
		SELECT id, slug, titulo, descricao, tipo, finalidade, cidade, bairro, endereco,
		       preco, area_m2, quartos, banheiros, vagas_garagem, status, destaque
		FROM imoveis
		WHERE id = ?
	`, id)

	imovel, err := scanImovel(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Imovel{}, ErrNotFound
	}
	if err != nil {
		return Imovel{}, err
	}
	return imovel, nil
}

func (r ImovelRepo) Create(ctx context.Context, imovel Imovel) (int64, error) {
	result, err := r.conn.ExecContext(ctx, `
		INSERT INTO imoveis (
			slug, titulo, descricao, tipo, finalidade, cidade, bairro, endereco,
			preco, area_m2, quartos, banheiros, vagas_garagem, status, destaque
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		Slugify(imovel.Titulo), imovel.Titulo, imovel.Descricao, imovel.Tipo, imovel.Finalidade,
		imovel.Cidade, imovel.Bairro, imovel.Endereco, imovel.Preco, imovel.AreaM2,
		imovel.Quartos, imovel.Banheiros, imovel.VagasGaragem, imovel.Status, imovel.Destaque,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (r ImovelRepo) Update(ctx context.Context, imovel Imovel) error {
	_, err := r.conn.ExecContext(ctx, `
		UPDATE imoveis SET
			slug = ?, titulo = ?, descricao = ?, tipo = ?, finalidade = ?,
			cidade = ?, bairro = ?, endereco = ?, preco = ?, area_m2 = ?,
			quartos = ?, banheiros = ?, vagas_garagem = ?, status = ?, destaque = ?,
			atualizado_em = datetime('now')
		WHERE id = ?
	`,
		Slugify(imovel.Titulo), imovel.Titulo, imovel.Descricao, imovel.Tipo, imovel.Finalidade,
		imovel.Cidade, imovel.Bairro, imovel.Endereco, imovel.Preco, imovel.AreaM2,
		imovel.Quartos, imovel.Banheiros, imovel.VagasGaragem, imovel.Status, imovel.Destaque,
		imovel.ID,
	)
	return err
}

func (r ImovelRepo) SetDestaque(ctx context.Context, id int64, destaque bool) error {
	_, err := r.conn.ExecContext(ctx,
		`UPDATE imoveis SET destaque = ?, atualizado_em = datetime('now') WHERE id = ?`,
		destaque, id,
	)
	return err
}

func (r ImovelRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.conn.ExecContext(ctx, `DELETE FROM imoveis WHERE id = ?`, id)
	return err
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanImovel(row rowScanner) (Imovel, error) {
	var imovel Imovel
	err := row.Scan(
		&imovel.ID, &imovel.Slug, &imovel.Titulo, &imovel.Descricao, &imovel.Tipo, &imovel.Finalidade,
		&imovel.Cidade, &imovel.Bairro, &imovel.Endereco, &imovel.Preco, &imovel.AreaM2,
		&imovel.Quartos, &imovel.Banheiros, &imovel.VagasGaragem, &imovel.Status, &imovel.Destaque,
	)
	return imovel, err
}

var accentReplacer = strings.NewReplacer(
	"á", "a", "à", "a", "ã", "a", "â", "a", "ä", "a",
	"é", "e", "è", "e", "ê", "e", "ë", "e",
	"í", "i", "ì", "i", "î", "i", "ï", "i",
	"ó", "o", "ò", "o", "õ", "o", "ô", "o", "ö", "o",
	"ú", "u", "ù", "u", "û", "u", "ü", "u",
	"ç", "c", "ñ", "n",
)

// Slugify converts free text into a URL-safe slug: lowercase ASCII,
// accents stripped, runs of non-alphanumeric characters collapsed to single hyphens.
func Slugify(s string) string {
	s = strings.ToLower(s)
	s = accentReplacer.Replace(s)

	var b strings.Builder
	lastWasHyphen := true // suppress leading hyphens
	for _, r := range s {
		switch {
		case unicode.IsLetter(r) && r <= unicode.MaxASCII, unicode.IsDigit(r):
			b.WriteRune(r)
			lastWasHyphen = false
		default:
			if !lastWasHyphen {
				b.WriteByte('-')
				lastWasHyphen = true
			}
		}
	}

	return strings.Trim(b.String(), "-")
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `go test ./internal/repo/...`
Expected: `ok  	github.com/gucardona/imob.app/internal/repo`

- [ ] **Step 5: Commit**

```bash
git add internal/repo/imovel.go internal/repo/imovel_test.go
git commit -m "feat: add imóvel repository with CRUD, slug generation, and destaque toggle"
```

---

### Task 8: Foto repository

**Files:**
- Create: `internal/repo/foto.go`
- Test: `internal/repo/foto_test.go`

- [ ] **Step 1: Write the failing test**

Create `internal/repo/foto_test.go`:

```go
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `go test ./internal/repo/...`
Expected: FAIL — `undefined: repo.Foto`

- [ ] **Step 3: Write the implementation**

Create `internal/repo/foto.go`:

```go
package repo

import (
	"context"
	"database/sql"
)

type Foto struct {
	ID              int64
	ImovelID        int64
	CaminhoOriginal string
	CaminhoThumb    string
	CaminhoGrande   string
	Principal       bool
	Ordem           int
}

type FotoRepo struct {
	conn *sql.DB
}

func NewFotoRepo(conn *sql.DB) FotoRepo {
	return FotoRepo{conn: conn}
}

func (r FotoRepo) ListByImovel(ctx context.Context, imovelID int64) ([]Foto, error) {
	rows, err := r.conn.QueryContext(ctx, `
		SELECT id, imovel_id, caminho_original, caminho_thumb, caminho_grande, principal, ordem
		FROM fotos
		WHERE imovel_id = ?
		ORDER BY ordem ASC
	`, imovelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Foto
	for rows.Next() {
		var f Foto
		if err := rows.Scan(&f.ID, &f.ImovelID, &f.CaminhoOriginal, &f.CaminhoThumb, &f.CaminhoGrande, &f.Principal, &f.Ordem); err != nil {
			return nil, err
		}
		list = append(list, f)
	}
	return list, rows.Err()
}

func (r FotoRepo) Create(ctx context.Context, foto Foto) (int64, error) {
	result, err := r.conn.ExecContext(ctx, `
		INSERT INTO fotos (imovel_id, caminho_original, caminho_thumb, caminho_grande, principal, ordem)
		VALUES (?, ?, ?, ?, ?, ?)
	`, foto.ImovelID, foto.CaminhoOriginal, foto.CaminhoThumb, foto.CaminhoGrande, foto.Principal, foto.Ordem)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// SetPrincipal marks the given foto as the imóvel's principal photo and
// unmarks any other photo of the same imóvel, keeping the "only one principal" invariant.
func (r FotoRepo) SetPrincipal(ctx context.Context, imovelID, fotoID int64) error {
	tx, err := r.conn.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `UPDATE fotos SET principal = 0 WHERE imovel_id = ?`, imovelID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE fotos SET principal = 1 WHERE id = ? AND imovel_id = ?`, fotoID, imovelID); err != nil {
		return err
	}

	return tx.Commit()
}

func (r FotoRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.conn.ExecContext(ctx, `DELETE FROM fotos WHERE id = ?`, id)
	return err
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `go test ./internal/repo/...`
Expected: `ok  	github.com/gucardona/imob.app/internal/repo`

- [ ] **Step 5: Commit**

```bash
git add internal/repo/foto.go internal/repo/foto_test.go
git commit -m "feat: add foto repository with ordered listing and exclusive principal toggle"
```

---

### Task 9: Image resize pipeline

**Files:**
- Create: `internal/images/images.go`
- Test: `internal/images/images_test.go`

- [ ] **Step 1: Write the failing test**

Create `internal/images/images_test.go`:

```go
package images_test

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"os"
	"path/filepath"
	"testing"

	"github.com/gucardona/imob.app/internal/images"
)

func sampleJPEG(t *testing.T, width, height int) []byte {
	t.Helper()

	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, color.RGBA{R: uint8(x % 256), G: uint8(y % 256), B: 100, A: 255})
		}
	}

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 90}); err != nil {
		t.Fatalf("encoding sample JPEG: %v", err)
	}
	return buf.Bytes()
}

func decodeDimensions(t *testing.T, path string) (int, int) {
	t.Helper()

	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("opening %s: %v", path, err)
	}
	defer f.Close()

	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		t.Fatalf("decoding config of %s: %v", path, err)
	}
	return cfg.Width, cfg.Height
}

func TestSaveVariants_WritesOriginalThumbAndGrande(t *testing.T) {
	dir := t.TempDir()
	data := sampleJPEG(t, 2000, 1000)

	paths, err := images.SaveVariants(data, dir, "foto-1")
	if err != nil {
		t.Fatalf("SaveVariants returned error: %v", err)
	}

	for _, p := range []string{paths.Original, paths.Thumb, paths.Grande} {
		if _, err := os.Stat(filepath.Join(dir, filepath.Base(p))); err != nil {
			t.Errorf("expected file for %q to exist: %v", p, err)
		}
	}

	thumbW, _ := decodeDimensions(t, filepath.Join(dir, filepath.Base(paths.Thumb)))
	if thumbW != 400 {
		t.Errorf("expected thumb width 400, got %d", thumbW)
	}

	grandeW, _ := decodeDimensions(t, filepath.Join(dir, filepath.Base(paths.Grande)))
	if grandeW != 1600 {
		t.Errorf("expected grande width 1600, got %d", grandeW)
	}
}

func TestSaveVariants_DoesNotUpscaleSmallerImages(t *testing.T) {
	dir := t.TempDir()
	data := sampleJPEG(t, 300, 200)

	paths, err := images.SaveVariants(data, dir, "foto-pequena")
	if err != nil {
		t.Fatalf("SaveVariants returned error: %v", err)
	}

	thumbW, _ := decodeDimensions(t, filepath.Join(dir, filepath.Base(paths.Thumb)))
	if thumbW != 300 {
		t.Errorf("expected thumb to keep original width 300 (no upscale), got %d", thumbW)
	}
}

func TestSaveVariants_RejectsInvalidImageData(t *testing.T) {
	dir := t.TempDir()

	if _, err := images.SaveVariants([]byte("not an image"), dir, "bad"); err == nil {
		t.Error("expected an error for invalid image data")
	}
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `go test ./internal/images/...`
Expected: FAIL — `no required module provides package github.com/gucardona/imob.app/internal/images`

- [ ] **Step 3: Write the implementation**

Create `internal/images/images.go`:

```go
package images

import (
	"bytes"
	"fmt"
	"image"
	"os"
	"path/filepath"

	"github.com/disintegration/imaging"
)

const (
	thumbWidth  = 400
	grandeWidth = 1600
	jpegQuality = 85
)

// Paths holds the on-disk file names (relative to the destination directory)
// of the three variants produced for an uploaded photo.
type Paths struct {
	Original string
	Thumb    string
	Grande   string
}

// SaveVariants decodes image data, writes the original (re-encoded as JPEG for
// consistency) plus "thumb" (~400px wide) and "grande" (~1600px wide) resized
// variants into destDir, named "<baseName>-<variant>.jpg". Images narrower than
// a variant's target width are kept at their original size (no upscaling).
func SaveVariants(data []byte, destDir, baseName string) (Paths, error) {
	img, err := imaging.Decode(bytes.NewReader(data), imaging.AutoOrientation(true))
	if err != nil {
		return Paths{}, fmt.Errorf("decoding image: %w", err)
	}

	paths := Paths{
		Original: baseName + "-original.jpg",
		Thumb:    baseName + "-thumb.jpg",
		Grande:   baseName + "-grande.jpg",
	}

	if err := saveResized(img, destDir, paths.Original, img.Bounds().Dx()); err != nil {
		return Paths{}, err
	}
	if err := saveResized(img, destDir, paths.Thumb, thumbWidth); err != nil {
		return Paths{}, err
	}
	if err := saveResized(img, destDir, paths.Grande, grandeWidth); err != nil {
		return Paths{}, err
	}

	return paths, nil
}

func saveResized(img image.Image, destDir, fileName string, targetWidth int) error {
	resized := img
	if img.Bounds().Dx() > targetWidth {
		resized = imaging.Resize(img, targetWidth, 0, imaging.Lanczos)
	}

	if err := os.MkdirAll(destDir, 0o755); err != nil {
		return fmt.Errorf("creating directory %s: %w", destDir, err)
	}

	dest := filepath.Join(destDir, fileName)
	if err := imaging.Save(resized, dest, imaging.JPEGQuality(jpegQuality)); err != nil {
		return fmt.Errorf("saving %s: %w", dest, err)
	}

	return nil
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `go test ./internal/images/...`
Expected: `ok  	github.com/gucardona/imob.app/internal/images`

- [ ] **Step 5: Commit**

```bash
git add internal/images/images.go internal/images/images_test.go
git commit -m "feat: add image resize pipeline producing thumb and grande JPEG variants"
```

---

### Task 10: Auth middleware, login/logout handlers, and login template

**Files:**
- Create: `internal/handlers/middleware.go`
- Create: `internal/handlers/admin_auth.go`
- Create: `internal/templates/admin_login.templ`
- Modify: `internal/handlers/handlers.go`, `internal/handlers/handlers_test.go`

This task introduces the `Deps` struct and rewrites `NewRouter`'s signature — every later admin task builds on it.

- [ ] **Step 1: Write the login page template**

Create `internal/templates/admin_login.templ`:

```templ
package templates

templ AdminLogin(errorMessage string) {
	@Layout("Entrar") {
		<main class="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
			<h1 class="text-2xl font-bold text-primary">Painel administrativo</h1>
			if errorMessage != "" {
				<p class="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{ errorMessage }</p>
			}
			<form method="POST" action="/admin/login" class="mt-6 flex flex-col gap-4">
				<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
					E-mail
					<input type="email" name="email" required autofocus class="rounded border border-slate-300 px-3 py-2"/>
				</label>
				<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
					Senha
					<input type="password" name="senha" required class="rounded border border-slate-300 px-3 py-2"/>
				</label>
				<button type="submit" class="rounded bg-primary px-4 py-2 font-medium text-white">Entrar</button>
			</form>
		</main>
	}
}
```

- [ ] **Step 2: Generate templ code**

Run: `templ generate`
Expected: creates `internal/templates/admin_login_templ.go`, prints a summary ending in `... generated`.

- [ ] **Step 3: Introduce `Deps` and rewrite `NewRouter`'s signature**

Replace the contents of `internal/handlers/handlers.go`:

```go
package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gucardona/imob.app/internal/assets"
	"github.com/gucardona/imob.app/internal/auth"
	"github.com/gucardona/imob.app/internal/config"
	"github.com/gucardona/imob.app/internal/repo"
	"github.com/gucardona/imob.app/internal/templates"
)

const sessionTTL = 7 * 24 * time.Hour

// Deps bundles every dependency the router and its handlers need.
type Deps struct {
	Conn   *sql.DB
	Config config.Config
}

func NewRouter(deps Deps) http.Handler {
	sessions := auth.NewSessionManager(deps.Config.SessionSecret, sessionTTL)
	admins := repo.NewAdminRepo(deps.Conn)
	imoveis := repo.NewImovelRepo(deps.Conn)
	fotos := repo.NewFotoRepo(deps.Conn)

	authHandlers := newAuthHandlers(sessions, admins)
	imovelHandlers := newImovelHandlers(imoveis)
	fotoHandlers := newFotoHandlers(deps.Config.UploadsDir, imoveis, fotos)

	requireAuth := RequireAuth(sessions)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /{$}", handleHome)
	mux.HandleFunc("GET /healthz", handleHealth(deps.Conn))
	mux.Handle("GET /static/", http.FileServerFS(assets.Static))
	mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(deps.Config.UploadsDir))))

	mux.HandleFunc("GET /admin/login", authHandlers.loginPage)
	mux.HandleFunc("POST /admin/login", authHandlers.login)
	mux.Handle("POST /admin/logout", requireAuth(http.HandlerFunc(authHandlers.logout)))

	mux.Handle("GET /admin/imoveis", requireAuth(http.HandlerFunc(imovelHandlers.list)))
	mux.Handle("GET /admin/imoveis/novo", requireAuth(http.HandlerFunc(imovelHandlers.newForm)))
	mux.Handle("POST /admin/imoveis", requireAuth(http.HandlerFunc(imovelHandlers.create)))
	mux.Handle("GET /admin/imoveis/{id}/editar", requireAuth(http.HandlerFunc(imovelHandlers.editForm)))
	mux.Handle("POST /admin/imoveis/{id}", requireAuth(http.HandlerFunc(imovelHandlers.update)))
	mux.Handle("POST /admin/imoveis/{id}/excluir", requireAuth(http.HandlerFunc(imovelHandlers.delete)))
	mux.Handle("POST /admin/imoveis/{id}/destaque", requireAuth(http.HandlerFunc(imovelHandlers.toggleDestaque)))

	mux.Handle("POST /admin/imoveis/{id}/fotos", requireAuth(http.HandlerFunc(fotoHandlers.upload)))
	mux.Handle("POST /admin/imoveis/{id}/fotos/{fotoID}/principal", requireAuth(http.HandlerFunc(fotoHandlers.setPrincipal)))
	mux.Handle("POST /admin/imoveis/{id}/fotos/{fotoID}/excluir", requireAuth(http.HandlerFunc(fotoHandlers.delete)))

	return mux
}

func handleHome(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = templates.Home().Render(r.Context(), w)
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

Add `"time"` to the import block (used by `sessionTTL`).

- [ ] **Step 4: Write the auth handlers**

Create `internal/handlers/admin_auth.go`:

```go
package handlers

import (
	"net/http"

	"github.com/gucardona/imob.app/internal/auth"
	"github.com/gucardona/imob.app/internal/repo"
	"github.com/gucardona/imob.app/internal/templates"
)

type authHandlers struct {
	sessions auth.SessionManager
	admins   repo.AdminRepo
}

func newAuthHandlers(sessions auth.SessionManager, admins repo.AdminRepo) authHandlers {
	return authHandlers{sessions: sessions, admins: admins}
}

func (h authHandlers) loginPage(w http.ResponseWriter, r *http.Request) {
	renderHTML(w, r, templates.AdminLogin(""))
}

func (h authHandlers) login(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		renderHTML(w, r, templates.AdminLogin("Não foi possível processar o formulário."))
		return
	}

	email := r.FormValue("email")
	senha := r.FormValue("senha")

	admin, err := h.admins.FindByEmail(r.Context(), email)
	if err != nil || !auth.VerifyPassword(admin.SenhaHash, senha) {
		w.WriteHeader(http.StatusUnauthorized)
		renderHTML(w, r, templates.AdminLogin("E-mail ou senha inválidos."))
		return
	}

	h.sessions.Issue(w, admin.ID)
	http.Redirect(w, r, "/admin/imoveis", http.StatusSeeOther)
}

func (h authHandlers) logout(w http.ResponseWriter, r *http.Request) {
	h.sessions.Clear(w)
	http.Redirect(w, r, "/admin/login", http.StatusSeeOther)
}

func renderHTML(w http.ResponseWriter, r *http.Request, component templ.Component) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = component.Render(r.Context(), w)
}
```

Add the import `"github.com/a-h/templ"` to the import block (needed for the `templ.Component` parameter type in `renderHTML`).

- [ ] **Step 5: Write the auth middleware**

Create `internal/handlers/middleware.go`:

```go
package handlers

import (
	"context"
	"net/http"

	"github.com/gucardona/imob.app/internal/auth"
)

type contextKey string

const adminIDContextKey contextKey = "adminID"

// RequireAuth verifies the session cookie, redirecting to the login page when
// absent or invalid, renews the session on every authenticated request (per
// spec's "renovação por atividade"), and stores the admin id in the request context.
func RequireAuth(sessions auth.SessionManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			adminID, ok := sessions.Verify(r)
			if !ok {
				http.Redirect(w, r, "/admin/login", http.StatusSeeOther)
				return
			}

			sessions.Issue(w, adminID)

			ctx := context.WithValue(r.Context(), adminIDContextKey, adminID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
```

- [ ] **Step 6: Update the test router to build `Deps`**

In `internal/handlers/handlers_test.go`, replace the `newTestRouter` helper:

```go
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
```

Add `"github.com/gucardona/imob.app/internal/config"` to the import block.

- [ ] **Step 7: Run the full handlers test suite and confirm the whole module builds**

Run:
```bash
go test ./internal/handlers/...
go build ./...
```
Expected: first command — `ok  	github.com/gucardona/imob.app/internal/handlers` (existing home/healthz tests still pass against the new `Deps`-based router); second command — exits 0 (confirms `cmd/imob-app`, left half-wired since Task 6, now compiles against the real `handlers.Deps`/`handlers.NewRouter`).

- [ ] **Step 8: Commit**

```bash
git add internal/handlers/handlers.go internal/handlers/handlers_test.go internal/handlers/middleware.go internal/handlers/admin_auth.go internal/templates/admin_login.templ
git commit -m "feat: add login/logout handlers, auth middleware, and Deps-based router wiring"
```

---

### Task 11: Admin layout and imóveis list page

**Files:**
- Create: `internal/templates/admin_layout.templ`
- Create: `internal/templates/admin_imoveis_list.templ`
- Create: `internal/handlers/admin_imoveis.go` (list handler only — form/CRUD handlers added in Task 12)

- [ ] **Step 1: Write the admin layout component**

Create `internal/templates/admin_layout.templ`:

```templ
package templates

templ AdminLayout(title string) {
	@Layout(title) {
		<div class="min-h-screen bg-slate-50">
			<header class="border-b border-slate-200 bg-white">
				<div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
					<span class="text-lg font-bold text-primary">Painel administrativo</span>
					<nav class="flex items-center gap-4 text-sm">
						<a href="/admin/imoveis" class="text-slate-700 hover:text-primary">Imóveis</a>
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

- [ ] **Step 2: Write the imóveis list component**

Create `internal/templates/admin_imoveis_list.templ`:

```templ
package templates

import (
	"fmt"

	"github.com/gucardona/imob.app/internal/repo"
)

templ AdminImoveisList(imoveis []repo.Imovel) {
	@AdminLayout("Imóveis") {
		<div class="flex items-center justify-between">
			<h1 class="text-2xl font-bold text-slate-900">Imóveis</h1>
			<a href="/admin/imoveis/novo" class="rounded bg-primary px-4 py-2 text-sm font-medium text-white">Novo imóvel</a>
		</div>
		<table class="mt-6 w-full table-auto border-collapse overflow-hidden rounded bg-white text-left text-sm shadow-sm">
			<thead class="bg-slate-100 text-slate-600">
				<tr>
					<th class="px-4 py-2">Título</th>
					<th class="px-4 py-2">Cidade / Bairro</th>
					<th class="px-4 py-2">Tipo</th>
					<th class="px-4 py-2">Finalidade</th>
					<th class="px-4 py-2">Preço</th>
					<th class="px-4 py-2">Status</th>
					<th class="px-4 py-2">Destaque</th>
					<th class="px-4 py-2">Ações</th>
				</tr>
			</thead>
			<tbody>
				for _, imovel := range imoveis {
					<tr class="border-t border-slate-100">
						<td class="px-4 py-2 font-medium text-slate-900">{ imovel.Titulo }</td>
						<td class="px-4 py-2 text-slate-600">{ imovel.Cidade } / { imovel.Bairro }</td>
						<td class="px-4 py-2 text-slate-600">{ imovel.Tipo }</td>
						<td class="px-4 py-2 text-slate-600">{ imovel.Finalidade }</td>
						<td class="px-4 py-2 text-slate-600">{ fmt.Sprintf("%.2f", imovel.Preco) }</td>
						<td class="px-4 py-2 text-slate-600">{ imovel.Status }</td>
						<td class="px-4 py-2">
							<form method="POST" action={ templ.URL(fmt.Sprintf("/admin/imoveis/%d/destaque", imovel.ID)) }>
								if imovel.Destaque {
									<button type="submit" class="text-amber-500" title="Remover destaque">★</button>
								} else {
									<button type="submit" class="text-slate-300" title="Marcar como destaque">★</button>
								}
							</form>
						</td>
						<td class="px-4 py-2">
							<div class="flex gap-3">
								<a href={ templ.URL(fmt.Sprintf("/admin/imoveis/%d/editar", imovel.ID)) } class="text-primary hover:underline">Editar</a>
								<form method="POST" action={ templ.URL(fmt.Sprintf("/admin/imoveis/%d/excluir", imovel.ID)) } onsubmit="return confirm('Excluir este imóvel?')">
									<button type="submit" class="text-red-600 hover:underline">Excluir</button>
								</form>
							</div>
						</td>
					</tr>
				}
			</tbody>
		</table>
		if len(imoveis) == 0 {
			<p class="mt-6 text-slate-500">Nenhum imóvel cadastrado ainda.</p>
		}
	}
}
```

- [ ] **Step 3: Generate templ code**

Run: `templ generate`
Expected: creates `internal/templates/admin_layout_templ.go` and `internal/templates/admin_imoveis_list_templ.go`.

- [ ] **Step 4: Write the list handler**

Create `internal/handlers/admin_imoveis.go`:

```go
package handlers

import (
	"net/http"

	"github.com/gucardona/imob.app/internal/repo"
	"github.com/gucardona/imob.app/internal/templates"
)

type imovelHandlers struct {
	imoveis repo.ImovelRepo
}

func newImovelHandlers(imoveis repo.ImovelRepo) imovelHandlers {
	return imovelHandlers{imoveis: imoveis}
}

func (h imovelHandlers) list(w http.ResponseWriter, r *http.Request) {
	list, err := h.imoveis.List(r.Context())
	if err != nil {
		http.Error(w, "erro ao carregar imóveis", http.StatusInternalServerError)
		return
	}

	renderHTML(w, r, templates.AdminImoveisList(list))
}
```

- [ ] **Step 5: Add a router test for the list page**

Append to `internal/handlers/handlers_test.go`:

```go
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
```

(A logged-in-session test for this page is added in Task 12 alongside the create flow, once there's an imóvel to assert on.)

- [ ] **Step 6: Run the tests**

Run: `go test ./internal/handlers/...`
Expected: `ok  	github.com/gucardona/imob.app/internal/handlers`

- [ ] **Step 7: Commit**

```bash
git add internal/templates/admin_layout.templ internal/templates/admin_imoveis_list.templ internal/handlers/admin_imoveis.go internal/handlers/handlers_test.go
git commit -m "feat: add admin layout and imóveis list page"
```

---

### Task 12: Imóvel create/edit form, update, delete, and destaque toggle handlers

**Files:**
- Create: `internal/templates/admin_imovel_form.templ`
- Modify: `internal/handlers/admin_imoveis.go`, `internal/handlers/handlers_test.go`

- [ ] **Step 1: Write the form template**

Create `internal/templates/admin_imovel_form.templ`:

```templ
package templates

import (
	"fmt"

	"github.com/gucardona/imob.app/internal/repo"
)

templ AdminImovelForm(imovel repo.Imovel, fotos []repo.Foto, isNew bool) {
	@AdminLayout(formTitle(isNew)) {
		<h1 class="text-2xl font-bold text-slate-900">{ formTitle(isNew) }</h1>
		<form
			method="POST"
			if isNew {
				action="/admin/imoveis"
			} else {
				action={ templ.URL(fmt.Sprintf("/admin/imoveis/%d", imovel.ID)) }
			}
			class="mt-6 grid max-w-3xl gap-4"
		>
			<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
				Título
				<input type="text" name="titulo" required value={ imovel.Titulo } class="rounded border border-slate-300 px-3 py-2"/>
			</label>
			<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
				Descrição
				<textarea name="descricao" rows="4" class="rounded border border-slate-300 px-3 py-2">{ imovel.Descricao }</textarea>
			</label>
			<div class="grid grid-cols-2 gap-4">
				<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
					Tipo
					<select name="tipo" class="rounded border border-slate-300 px-3 py-2">
						@tipoOption("casa", imovel.Tipo)
						@tipoOption("apartamento", imovel.Tipo)
						@tipoOption("terreno", imovel.Tipo)
						@tipoOption("comercial", imovel.Tipo)
						@tipoOption("rural", imovel.Tipo)
					</select>
				</label>
				<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
					Finalidade
					<select name="finalidade" class="rounded border border-slate-300 px-3 py-2">
						@finalidadeOption("venda", imovel.Finalidade)
						@finalidadeOption("aluguel", imovel.Finalidade)
					</select>
				</label>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
					Cidade
					<input type="text" name="cidade" required value={ imovel.Cidade } class="rounded border border-slate-300 px-3 py-2"/>
				</label>
				<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
					Bairro
					<input type="text" name="bairro" required value={ imovel.Bairro } class="rounded border border-slate-300 px-3 py-2"/>
				</label>
			</div>
			<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
				Endereço
				<input type="text" name="endereco" value={ imovel.Endereco } class="rounded border border-slate-300 px-3 py-2"/>
			</label>
			<div class="grid grid-cols-4 gap-4">
				<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
					Preço
					<input type="number" step="0.01" name="preco" required value={ fmt.Sprintf("%.2f", imovel.Preco) } class="rounded border border-slate-300 px-3 py-2"/>
				</label>
				<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
					Área (m²)
					<input type="number" step="0.01" name="area_m2" value={ fmt.Sprintf("%.2f", imovel.AreaM2) } class="rounded border border-slate-300 px-3 py-2"/>
				</label>
				<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
					Quartos
					<input type="number" name="quartos" value={ fmt.Sprintf("%d", imovel.Quartos) } class="rounded border border-slate-300 px-3 py-2"/>
				</label>
				<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
					Banheiros
					<input type="number" name="banheiros" value={ fmt.Sprintf("%d", imovel.Banheiros) } class="rounded border border-slate-300 px-3 py-2"/>
				</label>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
					Vagas de garagem
					<input type="number" name="vagas_garagem" value={ fmt.Sprintf("%d", imovel.VagasGaragem) } class="rounded border border-slate-300 px-3 py-2"/>
				</label>
				<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
					Status
					<select name="status" class="rounded border border-slate-300 px-3 py-2">
						@statusOption("disponivel", imovel.Status)
						@statusOption("vendido", imovel.Status)
						@statusOption("alugado", imovel.Status)
					</select>
				</label>
			</div>
			<label class="flex items-center gap-2 text-sm font-medium text-slate-700">
				<input type="checkbox" name="destaque" value="1" checked?={ imovel.Destaque }/>
				Destaque
			</label>
			<button type="submit" class="mt-2 w-fit rounded bg-primary px-6 py-2 font-medium text-white">Salvar</button>
		</form>
		if !isNew {
			<section class="mt-10 max-w-3xl">
				<h2 class="text-lg font-bold text-slate-900">Fotos</h2>
				<form
					hx-post={ fmt.Sprintf("/admin/imoveis/%d/fotos", imovel.ID) }
					hx-target="#fotos-grid"
					hx-swap="outerHTML"
					hx-encoding="multipart/form-data"
					class="mt-3"
				>
					<input type="file" name="fotos" multiple accept="image/*" class="text-sm"/>
					<button type="submit" class="ml-3 rounded bg-primary px-4 py-2 text-sm font-medium text-white">Enviar fotos</button>
				</form>
				@AdminFotosFragment(imovel.ID, fotos)
			</section>
		}
	}
}

func formTitle(isNew bool) string {
	if isNew {
		return "Novo imóvel"
	}
	return "Editar imóvel"
}

templ tipoOption(value, selected string) {
	<option value={ value } selected?={ value == selected }>{ value }</option>
}

templ finalidadeOption(value, selected string) {
	<option value={ value } selected?={ value == selected }>{ value }</option>
}

templ statusOption(value, selected string) {
	<option value={ value } selected?={ value == selected }>{ value }</option>
}
```

- [ ] **Step 2: Generate templ code**

Run: `templ generate`
Expected: creates/updates `internal/templates/admin_imovel_form_templ.go`. (This references `AdminFotosFragment`, written in Task 13 — `templ generate` will fail until that component exists. **Hold off running this step until Task 13's template is in place; for now just save the file and continue to Step 3.**)

- [ ] **Step 3: Extend the imóvel handlers with form/CRUD actions**

Append to `internal/handlers/admin_imoveis.go` (keep the existing `imovelHandlers`/`newImovelHandlers`/`list`):

```go
func (h imovelHandlers) newForm(w http.ResponseWriter, r *http.Request) {
	renderHTML(w, r, templates.AdminImovelForm(repo.Imovel{Status: "disponivel"}, nil, true))
}

func (h imovelHandlers) create(w http.ResponseWriter, r *http.Request) {
	imovel, err := parseImovelForm(r, 0)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id, err := h.imoveis.Create(r.Context(), imovel)
	if err != nil {
		http.Error(w, "erro ao criar imóvel", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, fmt.Sprintf("/admin/imoveis/%d/editar", id), http.StatusSeeOther)
}

func (h imovelHandlers) editForm(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDPathValue(r, "id")
	if err != nil {
		http.NotFound(w, r)
		return
	}

	imovel, err := h.imoveis.Get(r.Context(), id)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	fotos, err := h.fotos.ListByImovel(r.Context(), id)
	if err != nil {
		http.Error(w, "erro ao carregar fotos", http.StatusInternalServerError)
		return
	}

	renderHTML(w, r, templates.AdminImovelForm(imovel, fotos, false))
}

func (h imovelHandlers) update(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDPathValue(r, "id")
	if err != nil {
		http.NotFound(w, r)
		return
	}

	imovel, err := parseImovelForm(r, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.imoveis.Update(r.Context(), imovel); err != nil {
		http.Error(w, "erro ao atualizar imóvel", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, fmt.Sprintf("/admin/imoveis/%d/editar", id), http.StatusSeeOther)
}

func (h imovelHandlers) delete(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDPathValue(r, "id")
	if err != nil {
		http.NotFound(w, r)
		return
	}

	if err := h.imoveis.Delete(r.Context(), id); err != nil {
		http.Error(w, "erro ao excluir imóvel", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/admin/imoveis", http.StatusSeeOther)
}

func (h imovelHandlers) toggleDestaque(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDPathValue(r, "id")
	if err != nil {
		http.NotFound(w, r)
		return
	}

	imovel, err := h.imoveis.Get(r.Context(), id)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	if err := h.imoveis.SetDestaque(r.Context(), id, !imovel.Destaque); err != nil {
		http.Error(w, "erro ao atualizar destaque", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/admin/imoveis", http.StatusSeeOther)
}

func parseImovelForm(r *http.Request, id int64) (repo.Imovel, error) {
	if err := r.ParseForm(); err != nil {
		return repo.Imovel{}, fmt.Errorf("não foi possível processar o formulário")
	}

	preco, err := strconv.ParseFloat(r.FormValue("preco"), 64)
	if err != nil {
		return repo.Imovel{}, fmt.Errorf("preço inválido")
	}
	areaM2, _ := strconv.ParseFloat(r.FormValue("area_m2"), 64)
	quartos, _ := strconv.Atoi(r.FormValue("quartos"))
	banheiros, _ := strconv.Atoi(r.FormValue("banheiros"))
	vagas, _ := strconv.Atoi(r.FormValue("vagas_garagem"))

	return repo.Imovel{
		ID:           id,
		Titulo:       r.FormValue("titulo"),
		Descricao:    r.FormValue("descricao"),
		Tipo:         r.FormValue("tipo"),
		Finalidade:   r.FormValue("finalidade"),
		Cidade:       r.FormValue("cidade"),
		Bairro:       r.FormValue("bairro"),
		Endereco:     r.FormValue("endereco"),
		Preco:        preco,
		AreaM2:       areaM2,
		Quartos:      quartos,
		Banheiros:    banheiros,
		VagasGaragem: vagas,
		Status:       r.FormValue("status"),
		Destaque:     r.FormValue("destaque") == "1",
	}, nil
}

func parseIDPathValue(r *http.Request, name string) (int64, error) {
	return strconv.ParseInt(r.PathValue(name), 10, 64)
}
```

Update the import block at the top of `internal/handlers/admin_imoveis.go` to:

```go
import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gucardona/imob.app/internal/repo"
	"github.com/gucardona/imob.app/internal/templates"
)
```

And update `imovelHandlers`/`newImovelHandlers` to also hold the foto repo (needed by `editForm`):

```go
type imovelHandlers struct {
	imoveis repo.ImovelRepo
	fotos   repo.FotoRepo
}

func newImovelHandlers(imoveis repo.ImovelRepo, fotos repo.FotoRepo) imovelHandlers {
	return imovelHandlers{imoveis: imoveis, fotos: fotos}
}
```

Update the call site in `internal/handlers/handlers.go`:

```go
imovelHandlers := newImovelHandlers(imoveis, fotos)
```

- [ ] **Step 4: Add an end-to-end create→list→edit→update→destaque→delete test**

Append to `internal/handlers/handlers_test.go`:

```go
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
```

Add `"context"`, `"database/sql"`, `"io"`, `"net/url"`, `"strings"`, `"github.com/gucardona/imob.app/internal/auth"`, and `"github.com/gucardona/imob.app/internal/repo"` to the import block of `internal/handlers/handlers_test.go`.

- [ ] **Step 5: Run the tests**

Run: `go test ./internal/handlers/...`
Expected: FAIL at this point — `templates.AdminFotosFragment` doesn't exist yet (referenced from `admin_imovel_form.templ`, which doesn't compile without it). **This is expected — Task 13 completes the wiring.** Confirm the failure is specifically about the missing `AdminFotosFragment`/generated code, not anything else, then proceed to Task 13 before attempting a passing run.

- [ ] **Step 6: Commit**

```bash
git add internal/templates/admin_imovel_form.templ internal/handlers/admin_imoveis.go internal/handlers/handlers.go internal/handlers/handlers_test.go
git commit -m "feat: add imóvel create/edit form with update, delete, and destaque toggle handlers"
```

---

### Task 13: Foto upload, principal toggle, and removal (htmx fragment handlers)

**Files:**
- Create: `internal/templates/admin_fotos_fragment.templ`
- Create: `internal/handlers/admin_fotos.go`
- Modify: `internal/handlers/handlers_test.go`

This task supplies the `AdminFotosFragment` component the form template references, completing Task 11/12's `templ generate` chain.

- [ ] **Step 1: Write the fotos fragment template**

Create `internal/templates/admin_fotos_fragment.templ`:

```templ
package templates

import (
	"fmt"

	"github.com/gucardona/imob.app/internal/repo"
)

templ AdminFotosFragment(imovelID int64, fotos []repo.Foto) {
	<div id="fotos-grid" class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
		for _, foto := range fotos {
			<div class="relative overflow-hidden rounded border border-slate-200 bg-white">
				<img src={ "/" + foto.CaminhoThumb } alt="Foto do imóvel" class="aspect-square w-full object-cover"/>
				<div class="flex items-center justify-between gap-2 px-2 py-1 text-sm">
					if foto.Principal {
						<span class="text-amber-500" title="Foto principal">⭐</span>
					} else {
						<button
							hx-post={ fmt.Sprintf("/admin/imoveis/%d/fotos/%d/principal", imovelID, foto.ID) }
							hx-target="#fotos-grid"
							hx-swap="outerHTML"
							class="text-slate-400 hover:text-amber-500"
							title="Tornar principal"
						>⭐</button>
					}
					<button
						hx-post={ fmt.Sprintf("/admin/imoveis/%d/fotos/%d/excluir", imovelID, foto.ID) }
						hx-target="#fotos-grid"
						hx-swap="outerHTML"
						hx-confirm="Remover esta foto?"
						class="text-slate-400 hover:text-red-600"
						title="Remover"
					>🗑</button>
				</div>
			</div>
		}
		if len(fotos) == 0 {
			<p class="col-span-full text-sm text-slate-500">Nenhuma foto enviada ainda.</p>
		}
	</div>
}
```

- [ ] **Step 2: Generate templ code**

Run: `templ generate`
Expected: creates `internal/templates/admin_fotos_fragment_templ.go` and (now that `AdminFotosFragment` exists) successfully regenerates `internal/templates/admin_imovel_form_templ.go`. Prints a summary ending in `... generated`, no errors.

- [ ] **Step 3: Write the foto handlers**

Create `internal/handlers/admin_fotos.go`:

```go
package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"

	"github.com/gucardona/imob.app/internal/images"
	"github.com/gucardona/imob.app/internal/repo"
	"github.com/gucardona/imob.app/internal/templates"
)

const maxUploadBytes = 32 << 20 // 32 MiB across all files in one request

type fotoHandlers struct {
	uploadsDir string
	imoveis    repo.ImovelRepo
	fotos      repo.FotoRepo
}

func newFotoHandlers(uploadsDir string, imoveis repo.ImovelRepo, fotos repo.FotoRepo) fotoHandlers {
	return fotoHandlers{uploadsDir: uploadsDir, imoveis: imoveis, fotos: fotos}
}

func (h fotoHandlers) upload(w http.ResponseWriter, r *http.Request) {
	imovelID, err := parseIDPathValue(r, "id")
	if err != nil {
		http.NotFound(w, r)
		return
	}
	if _, err := h.imoveis.Get(r.Context(), imovelID); err != nil {
		http.NotFound(w, r)
		return
	}

	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		http.Error(w, "arquivo(s) muito grande(s)", http.StatusBadRequest)
		return
	}

	files := r.MultipartForm.File["fotos"]
	existing, err := h.fotos.ListByImovel(r.Context(), imovelID)
	if err != nil {
		http.Error(w, "erro ao carregar fotos", http.StatusInternalServerError)
		return
	}
	nextOrdem := len(existing)

	destDir := filepath.Join(h.uploadsDir, strconv.FormatInt(imovelID, 10))

	for i, header := range files {
		file, err := header.Open()
		if err != nil {
			http.Error(w, "erro ao ler arquivo enviado", http.StatusBadRequest)
			return
		}

		data := make([]byte, header.Size)
		if _, err := io.ReadFull(file, data); err != nil {
			file.Close()
			http.Error(w, "erro ao ler arquivo enviado", http.StatusBadRequest)
			return
		}
		file.Close()

		baseName := fmt.Sprintf("foto-%d-%d", nextOrdem+i+1, time.Now().UnixNano())
		paths, err := images.SaveVariants(data, destDir, baseName)
		if err != nil {
			http.Error(w, "não foi possível processar a imagem enviada", http.StatusBadRequest)
			return
		}

		relDir := strconv.FormatInt(imovelID, 10)
		_, err = h.fotos.Create(r.Context(), repo.Foto{
			ImovelID:        imovelID,
			CaminhoOriginal: filepath.ToSlash(filepath.Join(h.uploadsDir, relDir, paths.Original)),
			CaminhoThumb:    filepath.ToSlash(filepath.Join(h.uploadsDir, relDir, paths.Thumb)),
			CaminhoGrande:   filepath.ToSlash(filepath.Join(h.uploadsDir, relDir, paths.Grande)),
			Ordem:           nextOrdem + i,
		})
		if err != nil {
			http.Error(w, "erro ao salvar foto", http.StatusInternalServerError)
			return
		}
	}

	h.renderFragment(w, r, imovelID)
}

func (h fotoHandlers) setPrincipal(w http.ResponseWriter, r *http.Request) {
	imovelID, err := parseIDPathValue(r, "id")
	if err != nil {
		http.NotFound(w, r)
		return
	}
	fotoID, err := parseIDPathValue(r, "fotoID")
	if err != nil {
		http.NotFound(w, r)
		return
	}

	if err := h.fotos.SetPrincipal(r.Context(), imovelID, fotoID); err != nil {
		http.Error(w, "erro ao definir foto principal", http.StatusInternalServerError)
		return
	}

	h.renderFragment(w, r, imovelID)
}

func (h fotoHandlers) delete(w http.ResponseWriter, r *http.Request) {
	imovelID, err := parseIDPathValue(r, "id")
	if err != nil {
		http.NotFound(w, r)
		return
	}
	fotoID, err := parseIDPathValue(r, "fotoID")
	if err != nil {
		http.NotFound(w, r)
		return
	}

	if err := h.fotos.Delete(r.Context(), fotoID); err != nil {
		http.Error(w, "erro ao remover foto", http.StatusInternalServerError)
		return
	}

	h.renderFragment(w, r, imovelID)
}

func (h fotoHandlers) renderFragment(w http.ResponseWriter, r *http.Request, imovelID int64) {
	fotos, err := h.fotos.ListByImovel(r.Context(), imovelID)
	if err != nil {
		http.Error(w, "erro ao carregar fotos", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = templates.AdminFotosFragment(imovelID, fotos).Render(r.Context(), w)
}
```

Add `"io"` and `"time"` to the import block.

> **Note on stored paths:** `CaminhoOriginal`/`CaminhoThumb`/`CaminhoGrande` are stored as the full relative path including `h.uploadsDir` (e.g. `uploads/3/foto-1-...-thumb.jpg`), and the admin template renders `<img src="/{{caminho}}">`, which the router's `GET /uploads/` mount serves correctly **only when `UploadsDir` is `uploads`** (the default). If `UPLOADS_DIR` is overridden to an absolute path, this scheme breaks — that's an acceptable known limitation for this plan (single-admin, same-host deploy per spec's Operação section uses the default). Plan 3 (Public Site) revisits photo path handling when wiring public detail pages; do not over-engineer a configurable URL prefix here.

- [ ] **Step 4: Update the foto repo test fixtures to use real temp-file paths**

The `foto_test.go` fixtures from Task 8 use plain literal strings like `"a-original.jpg"` for `CaminhoOriginal` etc. — that's fine, they exercise the repo directly and don't touch the filesystem. No changes needed there.

- [ ] **Step 5: Add an end-to-end upload→principal→delete test**

Append to `internal/handlers/handlers_test.go`:

```go
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
```

Add `"bytes"`, `"fmt"`, `"image"`, `"image/color"`, `"image/jpeg"`, and `"mime/multipart"` to the import block of `internal/handlers/handlers_test.go`.

- [ ] **Step 6: Run the full handlers test suite**

Run: `go test ./internal/handlers/...`
Expected: `ok  	github.com/gucardona/imob.app/internal/handlers` — every router test (home, healthz, admin redirect, full CRUD flow, foto upload/principal/remove flow) passes.

- [ ] **Step 7: Commit**

```bash
git add internal/templates/admin_fotos_fragment.templ internal/handlers/admin_fotos.go internal/handlers/handlers_test.go internal/templates/admin_imovel_form_templ.go internal/templates/admin_fotos_fragment_templ.go internal/templates/admin_imoveis_list_templ.go internal/templates/admin_layout_templ.go internal/templates/admin_login_templ.go
git commit -m "feat: add htmx-driven photo upload, principal toggle, and removal"
```

---

### Task 14: End-to-end manual verification

**Files:** none (manual verification only)

- [ ] **Step 1: Run the full test suite**

Run: `make test`
Expected: `ok` for every package — `internal/auth`, `internal/config`, `internal/db`, `internal/handlers`, `internal/images`, `internal/repo`, `internal/templates` — no failures.

- [ ] **Step 2: Build and create a test admin**

Run:
```bash
make build
SESSION_SECRET=local-dev-secret DATABASE_PATH=/tmp/imob-admin-verify.db UPLOADS_DIR=/tmp/imob-admin-verify-uploads ./imob-app admin create owner@example.com
```
Expected: prompts `Senha: ` (hidden input), then prints `admin criado: id=1 email=owner@example.com`.

- [ ] **Step 3: Run the server and walk through the admin flow in a browser**

Run (in one terminal):
```bash
SESSION_SECRET=local-dev-secret DATABASE_PATH=/tmp/imob-admin-verify.db UPLOADS_DIR=/tmp/imob-admin-verify-uploads PORT=8004 ./imob-app
```

In a browser, visit `http://localhost:8004/admin/imoveis` — expected: redirected to `/admin/login`. Log in with `owner@example.com` / the password you typed. Expected: redirected to the (empty) imóveis list.

Click "Novo imóvel", fill the form, save — expected: redirected to the edit page for the new imóvel, which now appears in `/admin/imoveis`. Toggle the ★ destaque button from the list — expected: star fills/empties without a full page reload issue (redirect-based, page reloads — that's fine, htmx is reserved for the photo grid per spec). On the edit page, use the file input to upload 1-2 photos — expected: thumbnail grid appears below without a page reload; click ⭐ on a non-principal photo — expected: grid re-renders with that photo marked principal and the previous principal unmarked; click 🗑 on a photo — expected: it disappears from the grid. Click "Excluir" on the imóvel from the list — expected: confirmation prompt, then removal from the list.

Inspect `/tmp/imob-admin-verify-uploads/<imovel-id>/` — expected: three files per uploaded photo (`*-original.jpg`, `*-thumb.jpg`, `*-grande.jpg`).

Stop the server with Ctrl-C, then clean up:
```bash
rm -f /tmp/imob-admin-verify.db
rm -rf /tmp/imob-admin-verify-uploads
```

- [ ] **Step 4: No commit for this task** — it's verification-only. If you find a bug, fix it as part of the task where the bug was introduced (amend that task's commit only if it hasn't been pushed/reviewed yet — otherwise add a small fix-up commit), then re-run this verification.

---

## Spec Coverage Check

This plan covers the entire **"Painel administrativo"** section of the design spec (`docs/superpowers/specs/2026-06-08-imob-app-design.md`):
- **Autenticação**: Tasks 2, 3, 4, 10 (bcrypt + signed-cookie sessions, login/logout, no UI signup).
- **CLI `admin create`**: Task 6 (hidden password prompt, no default credentials/wizard).
- **Gestão de imóveis**: Tasks 7, 11, 12 (list table w/ all spec'd columns, create/edit form w/ all model fields, destaque toggle, delete as natural CRUD).
- **Upload de fotos**: Tasks 9, 13 (multi-file `<input>`, htmx thumbnail grid, ⭐/🗑 per-photo actions, no reload, thumb ~400px + grande ~1600px variants + original).

**Out of scope here (per the 5-plan breakdown)**: public-facing pages and photo serving for visitors (Plan 3), `configuracao` admin form (Plan 4), `seed`/`backup`/`restore` CLI commands and deploy (Plan 5).
