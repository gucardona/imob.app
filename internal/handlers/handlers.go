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
