package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gucardona/imob.app/internal/assets"
	"github.com/gucardona/imob.app/internal/templates"
)

func NewRouter(conn *sql.DB) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /{$}", handleHome)
	mux.HandleFunc("GET /healthz", handleHealth(conn))
	mux.Handle("GET /static/", http.FileServerFS(assets.Static))

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
