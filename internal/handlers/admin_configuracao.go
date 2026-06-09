package handlers

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/disintegration/imaging"
	"github.com/gucardona/imob.app/internal/repo"
	"github.com/gucardona/imob.app/internal/templates"
)

type configHandlers struct {
	uploadsDir   string
	configuracao repo.ConfiguracaoRepo
}

func newConfigHandlers(uploadsDir string, cfg repo.ConfiguracaoRepo) configHandlers {
	return configHandlers{uploadsDir: uploadsDir, configuracao: cfg}
}

func (h configHandlers) showForm(w http.ResponseWriter, r *http.Request) {
	cfg, err := h.configuracao.Get(r.Context())
	if err != nil && !errors.Is(err, repo.ErrNotFound) {
		http.Error(w, "erro interno", http.StatusInternalServerError)
		return
	}
	renderHTML(w, r, templates.AdminConfiguracao(cfg))
}

func (h configHandlers) update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	existing, err := h.configuracao.Get(ctx)
	if err != nil && !errors.Is(err, repo.ErrNotFound) {
		http.Error(w, "erro interno", http.StatusInternalServerError)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 11<<20)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		if err2 := r.ParseForm(); err2 != nil {
			http.Error(w, "erro ao processar formulário", http.StatusBadRequest)
			return
		}
	}

	cfg := repo.Configuracao{
		NomeImobiliaria: r.FormValue("nome_imobiliaria"),
		CorPrimaria:     r.FormValue("cor_primaria"),
		CorSecundaria:   r.FormValue("cor_secundaria"),
		Endereco:        r.FormValue("endereco"),
		Telefone:        r.FormValue("telefone"),
		Whatsapp:        r.FormValue("whatsapp"),
		Email:           r.FormValue("email"),
		InstagramURL:    r.FormValue("instagram_url"),
		TextoSobre:      r.FormValue("texto_sobre"),
		TextoHome:       r.FormValue("texto_home"),
		LogoPath:        existing.LogoPath,
	}

	file, _, err := r.FormFile("logo")
	if err == nil {
		defer file.Close()
		data, err := io.ReadAll(file)
		if err != nil {
			http.Error(w, "erro ao ler logo", http.StatusBadRequest)
			return
		}
		logoPath, err := saveLogo(h.uploadsDir, data)
		if err != nil {
			http.Error(w, "erro ao salvar logo", http.StatusInternalServerError)
			return
		}
		cfg.LogoPath = logoPath
	}

	if err := h.configuracao.Update(ctx, cfg); err != nil {
		http.Error(w, "erro ao salvar configurações", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/admin/configuracao", http.StatusSeeOther)
}

// saveLogo decodes image data, resizes to max 400 px wide, saves as JPEG to
// $uploadsDir/logo/logo.jpg, and returns the relative path "logo/logo.jpg".
func saveLogo(uploadsDir string, data []byte) (string, error) {
	ct := http.DetectContentType(data)
	switch ct {
	case "image/jpeg", "image/png", "image/gif":
		// ok
	default:
		return "", fmt.Errorf("tipo de imagem não suportado: %s", ct)
	}
	img, err := imaging.Decode(bytes.NewReader(data), imaging.AutoOrientation(true))
	if err != nil {
		return "", err
	}
	if img.Bounds().Dx() > 400 {
		img = imaging.Resize(img, 400, 0, imaging.Lanczos)
	}
	destDir := filepath.Join(uploadsDir, "logo")
	if err := os.MkdirAll(destDir, 0o755); err != nil {
		return "", err
	}
	dest := filepath.Join(destDir, "logo.jpg")
	if err := imaging.Save(img, dest, imaging.JPEGQuality(85)); err != nil {
		return "", err
	}
	return "logo/logo.jpg", nil
}
