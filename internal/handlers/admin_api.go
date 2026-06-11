package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/disintegration/imaging"
	"github.com/gucardona/imob.app/internal/auth"
	"github.com/gucardona/imob.app/internal/images"
	"github.com/gucardona/imob.app/internal/repo"
)

const maxUploadBytes = 32 << 20  // 32 MiB — fotos de imóveis
const maxLogoBytes   = 2 << 20   // 2 MiB  — logo
const maxHeroImageBytes = 5 << 20  // 5 MiB — hero image

// dummyHash equalises login timing for unknown-email attempts.
var dummyHash, _ = auth.HashPassword("dummy-constant-timing")

type adminAPIHandlers struct {
	uploadsDir string
	sessions   auth.SessionManager
	admins     repo.AdminRepo
	imoveis    repo.ImovelRepo
	fotos      repo.FotoRepo
	cfg        repo.ConfiguracaoRepo
}

func newAdminAPIHandlers(
	uploadsDir string,
	sessions auth.SessionManager,
	admins repo.AdminRepo,
	imoveis repo.ImovelRepo,
	fotos repo.FotoRepo,
	cfg repo.ConfiguracaoRepo,
) adminAPIHandlers {
	return adminAPIHandlers{
		uploadsDir: uploadsDir,
		sessions:   sessions,
		admins:     admins,
		imoveis:    imoveis,
		fotos:      fotos,
		cfg:        cfg,
	}
}

// ── Auth ─────────────────────────────────────────────────────────────────────

func (h adminAPIHandlers) me(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value(adminIDContextKey).(int64)
	admin, err := h.admins.FindByID(r.Context(), adminID)
	if err != nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	writeJSON(w, map[string]string{"email": admin.Email})
}

func (h adminAPIHandlers) login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
		Senha string `json:"senha"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONError(w, "invalid body", http.StatusBadRequest)
		return
	}

	admin, findErr := h.admins.FindByEmail(r.Context(), body.Email)
	hashToCheck := dummyHash
	if findErr == nil {
		hashToCheck = admin.SenhaHash
	}
	if !auth.VerifyPassword(hashToCheck, body.Senha) || findErr != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":"credenciais inválidas"}`))
		return
	}

	h.sessions.Issue(w, admin.ID)
	writeJSON(w, map[string]bool{"ok": true})
}

func (h adminAPIHandlers) logout(w http.ResponseWriter, r *http.Request) {
	h.sessions.Clear(w)
	writeJSON(w, map[string]bool{"ok": true})
}

// ── Imóveis ───────────────────────────────────────────────────────────────────

type imovelBody struct {
	Titulo       string  `json:"Titulo"`
	Descricao    string  `json:"Descricao"`
	Tipo         string  `json:"Tipo"`
	Finalidade   string  `json:"Finalidade"`
	Cidade       string  `json:"Cidade"`
	Bairro       string  `json:"Bairro"`
	Endereco     string  `json:"Endereco"`
	Preco        float64 `json:"Preco"`
	AreaM2       float64 `json:"AreaM2"`
	Quartos      int     `json:"Quartos"`
	Banheiros    int     `json:"Banheiros"`
	VagasGaragem int     `json:"VagasGaragem"`
	Status       string  `json:"Status"`
	Destaque     bool    `json:"Destaque"`
}

type adminImovelResp struct {
	Imovel repo.Imovel `json:"Imovel"`
	Fotos  []repo.Foto `json:"Fotos"`
}

func (h adminAPIHandlers) imovelList(w http.ResponseWriter, r *http.Request) {
	list, err := h.imoveis.List(r.Context())
	if err != nil {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	if list == nil {
		list = []repo.Imovel{}
	}
	writeJSON(w, list)
}

func (h adminAPIHandlers) imovelGet(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDPathValue(r, "id")
	if err != nil {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	imovel, err := h.imoveis.Get(r.Context(), id)
	if errors.Is(err, repo.ErrNotFound) {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	fotos, err := h.fotos.ListByImovel(r.Context(), id)
	if err != nil || fotos == nil {
		fotos = []repo.Foto{}
	}
	writeJSON(w, adminImovelResp{Imovel: imovel, Fotos: fotos})
}

func (h adminAPIHandlers) imovelCreate(w http.ResponseWriter, r *http.Request) {
	var body imovelBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONError(w, "invalid body", http.StatusBadRequest)
		return
	}
	imovel := repo.Imovel{
		Titulo: body.Titulo, Descricao: body.Descricao, Tipo: body.Tipo,
		Finalidade: body.Finalidade, Cidade: body.Cidade, Bairro: body.Bairro,
		Endereco: body.Endereco, Preco: body.Preco, AreaM2: body.AreaM2,
		Quartos: body.Quartos, Banheiros: body.Banheiros, VagasGaragem: body.VagasGaragem,
		Status: body.Status, Destaque: body.Destaque,
	}
	id, err := h.imoveis.Create(r.Context(), imovel)
	if err != nil {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	imovel.ID = id
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(imovel)
}

func (h adminAPIHandlers) imovelUpdate(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDPathValue(r, "id")
	if err != nil {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	var body imovelBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONError(w, "invalid body", http.StatusBadRequest)
		return
	}
	imovel := repo.Imovel{
		ID:           id,
		Titulo:       body.Titulo, Descricao: body.Descricao, Tipo: body.Tipo,
		Finalidade:   body.Finalidade, Cidade: body.Cidade, Bairro: body.Bairro,
		Endereco:     body.Endereco, Preco: body.Preco, AreaM2: body.AreaM2,
		Quartos:      body.Quartos, Banheiros: body.Banheiros, VagasGaragem: body.VagasGaragem,
		Status:       body.Status, Destaque: body.Destaque,
	}
	if err := h.imoveis.Update(r.Context(), imovel); err != nil {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	writeJSON(w, imovel)
}

func (h adminAPIHandlers) imovelDelete(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDPathValue(r, "id")
	if err != nil {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	if err := h.imoveis.Delete(r.Context(), id); err != nil {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	_ = os.RemoveAll(filepath.Join(h.uploadsDir, strconv.FormatInt(id, 10)))
	writeJSON(w, map[string]bool{"ok": true})
}

func (h adminAPIHandlers) imovelToggleDestaque(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDPathValue(r, "id")
	if err != nil {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	imovel, err := h.imoveis.Get(r.Context(), id)
	if errors.Is(err, repo.ErrNotFound) {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	if err := h.imoveis.SetDestaque(r.Context(), id, !imovel.Destaque); err != nil {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	imovel.Destaque = !imovel.Destaque
	writeJSON(w, imovel)
}

// ── Fotos ─────────────────────────────────────────────────────────────────────

func (h adminAPIHandlers) fotoUpload(w http.ResponseWriter, r *http.Request) {
	imovelID, err := parseIDPathValue(r, "id")
	if err != nil {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	if _, err := h.imoveis.Get(r.Context(), imovelID); err != nil {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		writeJSONError(w, "files too large", http.StatusBadRequest)
		return
	}
	files := r.MultipartForm.File["fotos"]
	existing, err := h.fotos.ListByImovel(r.Context(), imovelID)
	if err != nil {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	nextOrdem := len(existing)
	destDir := filepath.Join(h.uploadsDir, strconv.FormatInt(imovelID, 10))

	for i, header := range files {
		file, err := header.Open()
		if err != nil {
			writeJSONError(w, "bad file", http.StatusBadRequest)
			return
		}
		data := make([]byte, header.Size)
		_, err = io.ReadFull(file, data)
		file.Close()
		if err != nil {
			writeJSONError(w, "bad file", http.StatusBadRequest)
			return
		}
		baseName := fmt.Sprintf("foto-%d-%d", nextOrdem+i+1, time.Now().UnixNano())
		paths, err := images.SaveVariants(data, destDir, baseName)
		if err != nil {
			writeJSONError(w, "bad image", http.StatusBadRequest)
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
			writeJSONError(w, "internal", http.StatusInternalServerError)
			return
		}
	}
	h.writeFotosJSON(w, r, imovelID)
}

func (h adminAPIHandlers) fotoPrincipal(w http.ResponseWriter, r *http.Request) {
	imovelID, err := parseIDPathValue(r, "id")
	if err != nil {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	fotoID, err := parseIDPathValue(r, "fotoID")
	if err != nil {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	if err := h.fotos.SetPrincipal(r.Context(), imovelID, fotoID); err != nil {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	h.writeFotosJSON(w, r, imovelID)
}

func (h adminAPIHandlers) fotoDelete(w http.ResponseWriter, r *http.Request) {
	imovelID, err := parseIDPathValue(r, "id")
	if err != nil {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	fotoID, err := parseIDPathValue(r, "fotoID")
	if err != nil {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	foto, err := h.fotos.GetByID(r.Context(), imovelID, fotoID)
	if err != nil {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	if err := h.fotos.Delete(r.Context(), imovelID, fotoID); err != nil {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	for _, rel := range []string{foto.CaminhoOriginal, foto.CaminhoThumb, foto.CaminhoGrande} {
		_ = os.Remove(filepath.Join(h.uploadsDir, rel))
	}
	h.writeFotosJSON(w, r, imovelID)
}

func (h adminAPIHandlers) writeFotosJSON(w http.ResponseWriter, r *http.Request, imovelID int64) {
	fotos, err := h.fotos.ListByImovel(r.Context(), imovelID)
	if err != nil {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	if fotos == nil {
		fotos = []repo.Foto{}
	}
	writeJSON(w, fotos)
}

// ── Configuração ──────────────────────────────────────────────────────────────

func (h adminAPIHandlers) configGet(w http.ResponseWriter, r *http.Request) {
	cfg, err := h.cfg.Get(r.Context())
	if errors.Is(err, repo.ErrNotFound) {
		writeJSON(w, repo.Configuracao{})
		return
	}
	if err != nil {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	writeJSON(w, cfg)
}

func (h adminAPIHandlers) configUpdate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	existing, err := h.cfg.Get(ctx)
	if err != nil && !errors.Is(err, repo.ErrNotFound) {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxLogoBytes+1<<20)
	if err := r.ParseMultipartForm(maxLogoBytes); err != nil {
		if err2 := r.ParseForm(); err2 != nil {
			writeJSONError(w, "invalid form", http.StatusBadRequest)
			return
		}
	}
	cfg := repo.Configuracao{
		NomeImobiliaria:   r.FormValue("nome_imobiliaria"),
		CorPrimaria:       r.FormValue("cor_primaria"),
		CorSecundaria:     r.FormValue("cor_secundaria"),
		Endereco:          r.FormValue("endereco"),
		Telefone:          r.FormValue("telefone"),
		Whatsapp:          r.FormValue("whatsapp"),
		Email:             r.FormValue("email"),
		InstagramURL:      r.FormValue("instagram_url"),
		TextoSobre:        r.FormValue("texto_sobre"),
		HeroImageURL:      r.FormValue("hero_image_url"),
		HeroTitulo:        r.FormValue("hero_titulo"),
		HeroSubtitulo:     r.FormValue("hero_subtitulo"),
		CtaTexto:          r.FormValue("cta_texto"),
		CtaLink:           r.FormValue("cta_link"),
		MsgWhatsappPadrao: r.FormValue("msg_whatsapp_padrao"),
		MsgWhatsappImovel: r.FormValue("msg_whatsapp_imovel"),
		LogoPath:          existing.LogoPath,
		HeroMode:          r.FormValue("hero_mode"),
		HeroImagePath:     existing.HeroImagePath,
	}
	file, _, err := r.FormFile("logo")
	if err == nil {
		defer file.Close()
		data, err := io.ReadAll(file)
		if err != nil {
			writeJSONError(w, "bad logo", http.StatusBadRequest)
			return
		}
		logoPath, err := saveLogo(h.uploadsDir, data)
		if err != nil {
			writeJSONError(w, "bad logo", http.StatusInternalServerError)
			return
		}
		cfg.LogoPath = logoPath
	}
	if err := h.cfg.Update(ctx, cfg); err != nil {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	writeJSON(w, cfg)
}

func (h adminAPIHandlers) configResetBranding(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	existing, err := h.cfg.Get(ctx)
	if err != nil && !errors.Is(err, repo.ErrNotFound) {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	existing.CorPrimaria = "#8B1538"
	existing.CorSecundaria = ""
	if err := h.cfg.Update(ctx, existing); err != nil {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	writeJSON(w, existing)
}

func (h adminAPIHandlers) configRemoveLogo(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	existing, err := h.cfg.Get(ctx)
	if err != nil && !errors.Is(err, repo.ErrNotFound) {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	if existing.LogoPath != "" {
		os.Remove(filepath.Join(h.uploadsDir, existing.LogoPath))
	}
	os.Remove(filepath.Join(h.uploadsDir, "logo", "logo.jpg"))
	existing.LogoPath = ""
	if err := h.cfg.Update(ctx, existing); err != nil {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	writeJSON(w, existing)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func parseIDPathValue(r *http.Request, name string) (int64, error) {
	return strconv.ParseInt(r.PathValue(name), 10, 64)
}

// saveHeroImage decodes image data, resizes to max 2400 px wide, saves as JPEG.
func saveHeroImage(uploadsDir string, data []byte) (string, error) {
	if len(data) > maxHeroImageBytes {
		return "", fmt.Errorf("imagem muito grande: máximo 5 MB")
	}
	ct := http.DetectContentType(data)
	switch ct {
	case "image/jpeg", "image/png", "image/gif", "image/webp":
	default:
		return "", fmt.Errorf("tipo de imagem não suportado: %s", ct)
	}
	img, err := imaging.Decode(bytes.NewReader(data), imaging.AutoOrientation(true))
	if err != nil {
		return "", err
	}
	if img.Bounds().Dx() > 2400 {
		img = imaging.Resize(img, 2400, 0, imaging.Lanczos)
	}
	destDir := filepath.Join(uploadsDir, "hero")
	if err := os.MkdirAll(destDir, 0o755); err != nil {
		return "", err
	}
	dest := filepath.Join(destDir, "hero.jpg")
	if err := imaging.Save(img, dest); err != nil {
		return "", err
	}
	return "hero/hero.jpg", nil
}

// saveLogo decodes image data, resizes to max 600 px wide, saves as PNG to preserve transparency.
func saveLogo(uploadsDir string, data []byte) (string, error) {
	if len(data) > maxLogoBytes {
		return "", fmt.Errorf("logo muito grande: máximo 2 MB")
	}
	ct := http.DetectContentType(data)
	switch ct {
	case "image/jpeg", "image/png", "image/gif", "image/webp":
	default:
		return "", fmt.Errorf("tipo de imagem não suportado: %s", ct)
	}
	img, err := imaging.Decode(bytes.NewReader(data), imaging.AutoOrientation(true))
	if err != nil {
		return "", err
	}
	if img.Bounds().Dx() > 600 {
		img = imaging.Resize(img, 600, 0, imaging.Lanczos)
	}
	destDir := filepath.Join(uploadsDir, "logo")
	if err := os.MkdirAll(destDir, 0o755); err != nil {
		return "", err
	}
	dest := filepath.Join(destDir, "logo.png")
	if err := imaging.Save(img, dest); err != nil {
		return "", err
	}
	return "logo/logo.png", nil
}
