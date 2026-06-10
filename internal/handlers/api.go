package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gucardona/imob.app/internal/repo"
)

type apiHandlers struct {
	imoveis repo.ImovelRepo
	fotos   repo.FotoRepo
	cfg     repo.ConfiguracaoRepo
}

func newAPIHandlers(imoveis repo.ImovelRepo, fotos repo.FotoRepo, cfg repo.ConfiguracaoRepo) *apiHandlers {
	return &apiHandlers{imoveis: imoveis, fotos: fotos, cfg: cfg}
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func writeJSONError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_, _ = w.Write([]byte(`{"error":"` + msg + `"}`))
}

func (h *apiHandlers) configuracao(w http.ResponseWriter, r *http.Request) {
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

// imovelListItem embeds Imovel and adds the resolved thumbnail URL.
type imovelListItem struct {
	repo.Imovel
	ThumbURL string `json:"ThumbURL"`
}

func (h *apiHandlers) imovelList(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := repo.ImovelFilter{
		Finalidade:   q.Get("finalidade"),
		Tipo:         q.Get("tipo"),
		Cidade:       q.Get("cidade"),
		OnlyDestaque: q.Get("destaque") == "1",
	}
	list, err := h.imoveis.ListPublic(r.Context(), filter)
	if err != nil {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	result := make([]imovelListItem, len(list))
	for i, im := range list {
		item := imovelListItem{Imovel: im}
		if f, err := h.fotos.GetPrincipal(r.Context(), im.ID); err == nil {
			item.ThumbURL = "/uploads/" + f.CaminhoThumb
		}
		result[i] = item
	}
	writeJSON(w, result)
}

type imovelDetailResp struct {
	Imovel repo.Imovel `json:"imovel"`
	Fotos  []repo.Foto `json:"fotos"`
}

func (h *apiHandlers) imovelDetail(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	imovel, err := h.imoveis.GetBySlug(r.Context(), slug)
	if errors.Is(err, repo.ErrNotFound) {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	fotos, err := h.fotos.ListByImovel(r.Context(), imovel.ID)
	if err != nil || fotos == nil {
		fotos = []repo.Foto{}
	}
	writeJSON(w, imovelDetailResp{Imovel: imovel, Fotos: fotos})
}
