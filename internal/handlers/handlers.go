package handlers

import (
	"database/sql"
	"net/http"
	"time"

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
	imovelHandlers := newImovelHandlers(imoveis, fotos)
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
