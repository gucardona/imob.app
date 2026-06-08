package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gucardona/imob.app/internal/repo"
	"github.com/gucardona/imob.app/internal/templates"
)

type imovelHandlers struct {
	uploadsDir string
	imoveis    repo.ImovelRepo
	fotos      repo.FotoRepo
}

func newImovelHandlers(uploadsDir string, imoveis repo.ImovelRepo, fotos repo.FotoRepo) imovelHandlers {
	return imovelHandlers{uploadsDir: uploadsDir, imoveis: imoveis, fotos: fotos}
}

func (h imovelHandlers) list(w http.ResponseWriter, r *http.Request) {
	list, err := h.imoveis.List(r.Context())
	if err != nil {
		http.Error(w, "erro ao carregar imóveis", http.StatusInternalServerError)
		return
	}

	renderHTML(w, r, templates.AdminImoveisList(list))
}

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

	// Remove the imóvel's upload directory — ignore errors (directory may not exist)
	_ = os.RemoveAll(filepath.Join(h.uploadsDir, strconv.FormatInt(id, 10)))

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
	areaM2, err := parseOptionalFloat(r.FormValue("area_m2"))
	if err != nil {
		return repo.Imovel{}, fmt.Errorf("área inválida")
	}
	quartos, err := parseOptionalInt(r.FormValue("quartos"))
	if err != nil {
		return repo.Imovel{}, fmt.Errorf("número de quartos inválido")
	}
	banheiros, err := parseOptionalInt(r.FormValue("banheiros"))
	if err != nil {
		return repo.Imovel{}, fmt.Errorf("número de banheiros inválido")
	}
	vagas, err := parseOptionalInt(r.FormValue("vagas_garagem"))
	if err != nil {
		return repo.Imovel{}, fmt.Errorf("número de vagas inválido")
	}

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

func parseOptionalFloat(s string) (float64, error) {
	if s == "" {
		return 0, nil
	}
	return strconv.ParseFloat(s, 64)
}

func parseOptionalInt(s string) (int, error) {
	if s == "" {
		return 0, nil
	}
	return strconv.Atoi(s)
}
