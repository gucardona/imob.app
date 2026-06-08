package handlers

import (
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
	// stub — implemented in Task 7
	http.NotFound(w, r)
}
