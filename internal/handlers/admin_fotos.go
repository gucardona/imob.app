package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

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
			CaminhoOriginal: filepath.ToSlash(filepath.Join(relDir, paths.Original)),
			CaminhoThumb:    filepath.ToSlash(filepath.Join(relDir, paths.Thumb)),
			CaminhoGrande:   filepath.ToSlash(filepath.Join(relDir, paths.Grande)),
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

	foto, err := h.fotos.GetByID(r.Context(), imovelID, fotoID)
	if err != nil {
		http.Error(w, "foto não encontrada", http.StatusNotFound)
		return
	}

	if err := h.fotos.Delete(r.Context(), imovelID, fotoID); err != nil {
		http.Error(w, "erro ao remover foto", http.StatusInternalServerError)
		return
	}

	// Remove files from disk — ignore errors (files may already be missing)
	for _, rel := range []string{foto.CaminhoOriginal, foto.CaminhoThumb, foto.CaminhoGrande} {
		_ = os.Remove(filepath.Join(h.uploadsDir, rel))
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
