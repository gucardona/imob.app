package handlers

import (
	"context"
	"errors"
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

func newPublicHandlers(uploadsURL string, imoveis repo.ImovelRepo, fotos repo.FotoRepo, cfg repo.ConfiguracaoRepo) publicHandlers {
	return publicHandlers{
		uploadsURL:   uploadsURL,
		imoveis:      imoveis,
		fotos:        fotos,
		configuracao: cfg,
	}
}

func (h publicHandlers) home(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	cfg, err := h.configuracao.Get(ctx)
	if err != nil && !errors.Is(err, repo.ErrNotFound) {
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

// buildThumbURLs returns imovelID → full thumb URL for imoveis that have a principal foto.
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
