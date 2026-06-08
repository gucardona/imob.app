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
