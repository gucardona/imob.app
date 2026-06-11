# Hero Background Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggle in admin settings that switches the public homepage hero between a full-bleed image and a clean gradient layout.

**Architecture:** New DB columns `hero_mode` and `hero_image_path` are added via migration. Backend adds two dedicated upload/remove endpoints for the hero image (separate from the main config PUT, same pattern as logo). React admin UI gets a new "Fundo do Hero" section; `Home.jsx` renders hero conditionally based on `cfg.HeroMode`.

**Tech Stack:** Go (net/http, disintegration/imaging), SQLite, React + Vite, Tailwind CSS

---

### Task 1: DB Migration

**Files:**
- Create: `internal/db/migrations/0005_hero_mode.sql`

- [ ] **Step 1: Create migration file**

```sql
ALTER TABLE configuracao ADD COLUMN hero_mode TEXT NOT NULL DEFAULT 'image';
ALTER TABLE configuracao ADD COLUMN hero_image_path TEXT NOT NULL DEFAULT '';
```

- [ ] **Step 2: Verify migration runs on next app start**

The app auto-applies all migration files on startup. Confirm `internal/db/migrations/` is where existing migrations live:

```bash
ls internal/db/migrations/
```

Expected: files `0001_…sql` through `0004_…sql` present alongside the new `0005_hero_mode.sql`.

- [ ] **Step 3: Commit**

```bash
git add internal/db/migrations/0005_hero_mode.sql
git commit -m "feat: add hero_mode and hero_image_path columns"
```

---

### Task 2: Repo — Add Fields to Configuracao Struct

**Files:**
- Modify: `internal/repo/configuracao.go`

Current struct ends at `MsgWhatsappImovel string`. Add two fields after it.

- [ ] **Step 1: Add fields to struct**

In `internal/repo/configuracao.go`, update the `Configuracao` struct:

```go
type Configuracao struct {
	NomeImobiliaria   string
	LogoPath          string
	CorPrimaria       string
	CorSecundaria     string
	Endereco          string
	Telefone          string
	Whatsapp          string
	Email             string
	InstagramURL      string
	TextoSobre        string
	HeroImageURL      string
	HeroTitulo        string
	HeroSubtitulo     string
	CtaTexto          string
	CtaLink           string
	MsgWhatsappPadrao string
	MsgWhatsappImovel string
	HeroMode          string
	HeroImagePath     string
}
```

- [ ] **Step 2: Update SELECT query and Scan**

Replace the `Get` method body with:

```go
func (r ConfiguracaoRepo) Get(ctx context.Context) (Configuracao, error) {
	var c Configuracao
	err := r.conn.QueryRowContext(ctx, `
		SELECT nome_imobiliaria, logo_path, cor_primaria, cor_secundaria,
		       endereco, telefone, whatsapp, email, instagram_url,
		       texto_sobre, hero_image_url,
		       hero_titulo, hero_subtitulo, cta_texto, cta_link,
		       msg_whatsapp_padrao, msg_whatsapp_imovel,
		       hero_mode, hero_image_path
		FROM configuracao WHERE id = 1
	`).Scan(
		&c.NomeImobiliaria, &c.LogoPath, &c.CorPrimaria, &c.CorSecundaria,
		&c.Endereco, &c.Telefone, &c.Whatsapp, &c.Email,
		&c.InstagramURL, &c.TextoSobre, &c.HeroImageURL,
		&c.HeroTitulo, &c.HeroSubtitulo, &c.CtaTexto, &c.CtaLink,
		&c.MsgWhatsappPadrao, &c.MsgWhatsappImovel,
		&c.HeroMode, &c.HeroImagePath,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Configuracao{}, ErrNotFound
	}
	return c, err
}
```

- [ ] **Step 3: Update UPDATE query**

Replace the `Update` method body with:

```go
func (r ConfiguracaoRepo) Update(ctx context.Context, c Configuracao) error {
	_, err := r.conn.ExecContext(ctx, `
		UPDATE configuracao SET
			nome_imobiliaria = ?, logo_path = ?, cor_primaria = ?, cor_secundaria = ?,
			endereco = ?, telefone = ?, whatsapp = ?, email = ?,
			instagram_url = ?, texto_sobre = ?, hero_image_url = ?,
			hero_titulo = ?, hero_subtitulo = ?, cta_texto = ?, cta_link = ?,
			msg_whatsapp_padrao = ?, msg_whatsapp_imovel = ?,
			hero_mode = ?, hero_image_path = ?
		WHERE id = 1
	`,
		c.NomeImobiliaria, c.LogoPath, c.CorPrimaria, c.CorSecundaria,
		c.Endereco, c.Telefone, c.Whatsapp, c.Email,
		c.InstagramURL, c.TextoSobre, c.HeroImageURL,
		c.HeroTitulo, c.HeroSubtitulo, c.CtaTexto, c.CtaLink,
		c.MsgWhatsappPadrao, c.MsgWhatsappImovel,
		c.HeroMode, c.HeroImagePath,
	)
	return err
}
```

- [ ] **Step 4: Build to confirm no errors**

```bash
go build ./...
```

Expected: no output (clean build).

- [ ] **Step 5: Commit**

```bash
git add internal/repo/configuracao.go
git commit -m "feat: add HeroMode and HeroImagePath to Configuracao repo"
```

---

### Task 3: Backend — saveHeroImage Helper + Wire hero_mode into configUpdate

**Files:**
- Modify: `internal/handlers/admin_api.go`

- [ ] **Step 1: Add constant and saveHeroImage helper**

After the existing `maxLogoBytes` constant (line ~22), add:

```go
const maxHeroImageBytes = 5 << 20  // 5 MiB — hero image
```

After the `saveLogo` function (end of file), add:

```go
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
```

- [ ] **Step 2: Wire hero_mode and hero_image_path into configUpdate**

In `configUpdate`, the `cfg := repo.Configuracao{...}` block currently doesn't include `HeroMode` or `HeroImagePath`. Update it:

```go
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
    HeroMode:          r.FormValue("hero_mode"),
    LogoPath:          existing.LogoPath,
    HeroImagePath:     existing.HeroImagePath,
}
```

`HeroMode` comes from the form field; `HeroImagePath` is preserved from existing (same pattern as `LogoPath`).

- [ ] **Step 3: Build**

```bash
go build ./...
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add internal/handlers/admin_api.go
git commit -m "feat: saveHeroImage helper, wire hero_mode/hero_image_path into configUpdate"
```

---

### Task 4: Backend — Hero Image Upload/Remove Handlers + Routes

**Files:**
- Modify: `internal/handlers/admin_api.go`
- Modify: `internal/handlers/handlers.go`

- [ ] **Step 1: Add configHeroImageUpload handler**

In `admin_api.go`, after `configRemoveLogo` and before the helpers section, add:

```go
func (h adminAPIHandlers) configHeroImageUpload(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	existing, err := h.cfg.Get(ctx)
	if err != nil && !errors.Is(err, repo.ErrNotFound) {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxHeroImageBytes+1<<20)
	if err := r.ParseMultipartForm(maxHeroImageBytes); err != nil {
		writeJSONError(w, "files too large", http.StatusBadRequest)
		return
	}
	file, _, err := r.FormFile("hero_image")
	if err != nil {
		writeJSONError(w, "missing hero_image field", http.StatusBadRequest)
		return
	}
	defer file.Close()
	data, err := io.ReadAll(file)
	if err != nil {
		writeJSONError(w, "bad file", http.StatusBadRequest)
		return
	}
	heroPath, err := saveHeroImage(h.uploadsDir, data)
	if err != nil {
		writeJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}
	existing.HeroImagePath = heroPath
	if err := h.cfg.Update(ctx, existing); err != nil {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"HeroImagePath": heroPath})
}
```

- [ ] **Step 2: Add configRemoveHeroImage handler**

Immediately after the handler above, add:

```go
func (h adminAPIHandlers) configRemoveHeroImage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	existing, err := h.cfg.Get(ctx)
	if err != nil && !errors.Is(err, repo.ErrNotFound) {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	if existing.HeroImagePath != "" {
		os.Remove(filepath.Join(h.uploadsDir, existing.HeroImagePath))
	}
	existing.HeroImagePath = ""
	if err := h.cfg.Update(ctx, existing); err != nil {
		writeJSONError(w, "internal", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{})
}
```

- [ ] **Step 3: Register routes in handlers.go**

In `NewRouter`, after the existing `remove-logo` route, add:

```go
mux.Handle("POST /api/admin/configuracao/hero-image", requireAuth(http.HandlerFunc(adminAPI.configHeroImageUpload)))
mux.Handle("POST /api/admin/configuracao/remove-hero-image", requireAuth(http.HandlerFunc(adminAPI.configRemoveHeroImage)))
```

- [ ] **Step 4: Build**

```bash
go build ./...
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add internal/handlers/admin_api.go internal/handlers/handlers.go
git commit -m "feat: hero image upload/remove endpoints"
```

---

### Task 5: Frontend — api.js New Functions

**Files:**
- Modify: `frontend/src/admin/api.js`

- [ ] **Step 1: Add uploadHeroImage and removeHeroImage**

After the `removeLogo` export at the end of the Configuração section, add:

```js
export function uploadHeroImage(formData) {
  return apiFetch('/api/admin/configuracao/hero-image', {
    method: 'POST',
    body: formData,
  })
}

export function removeHeroImage() {
  return apiFetch('/api/admin/configuracao/remove-hero-image', { method: 'POST' })
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/admin/api.js
git commit -m "feat: uploadHeroImage and removeHeroImage api functions"
```

---

### Task 6: Admin UI — Hero Section in Configuracao.jsx

**Files:**
- Modify: `frontend/src/admin/pages/Configuracao.jsx`

This is the largest UI change. Work through it in sub-steps.

- [ ] **Step 1: Update imports**

At the top, add `uploadHeroImage` and `removeHeroImage` to the import:

```js
import { getConfig, updateConfig, resetBranding, removeLogo, uploadHeroImage, removeHeroImage } from '../api.js'
```

- [ ] **Step 2: Add hero_mode to EMPTY constant**

```js
const EMPTY = {
  nome_imobiliaria: '', cor_primaria: '', cor_secundaria: '',
  endereco: '', telefone: '', whatsapp: '', email: '',
  instagram_url: '', texto_sobre: '', hero_image_url: '',
  hero_titulo: '', hero_subtitulo: '', cta_texto: '', cta_link: '',
  msg_whatsapp_padrao: '', msg_whatsapp_imovel: '',
  hero_mode: 'image',
}
```

- [ ] **Step 3: Add heroImagePath and heroImage state**

In the `Configuracao` component, after the `logo` / `logoPath` state declarations, add:

```js
const [heroImage, setHeroImage] = useState(null)          // pending File
const [heroImagePath, setHeroImagePath] = useState('')     // saved path
const [uploadingHero, setUploadingHero] = useState(false)
```

- [ ] **Step 4: Load HeroMode and HeroImagePath from API**

In the `useEffect` `.then(cfg => { setFields({...` block, add the two new fields to `setFields` and call `setHeroImagePath`:

```js
setFields({
  // ... existing fields ...
  hero_mode: cfg.HeroMode ?? 'image',
})
setHeroImagePath(cfg.HeroImagePath ?? '')
```

The full updated setFields call (replacing existing):

```js
setFields({
  nome_imobiliaria: cfg.NomeImobiliaria ?? '',
  cor_primaria: cfg.CorPrimaria ?? '',
  cor_secundaria: cfg.CorSecundaria ?? '',
  endereco: cfg.Endereco ?? '',
  telefone: cfg.Telefone ?? '',
  whatsapp: cfg.Whatsapp ?? '',
  email: cfg.Email ?? '',
  instagram_url: cfg.InstagramURL ?? '',
  texto_sobre: cfg.TextoSobre ?? '',
  hero_image_url: cfg.HeroImageURL ?? '',
  hero_titulo: cfg.HeroTitulo ?? '',
  hero_subtitulo: cfg.HeroSubtitulo ?? '',
  cta_texto: cfg.CtaTexto ?? '',
  cta_link: cfg.CtaLink ?? '',
  msg_whatsapp_padrao: cfg.MsgWhatsappPadrao ?? '',
  msg_whatsapp_imovel: cfg.MsgWhatsappImovel ?? '',
  hero_mode: cfg.HeroMode ?? 'image',
})
setLogoPath(cfg.LogoPath ?? '')
setHeroImagePath(cfg.HeroImagePath ?? '')
```

- [ ] **Step 5: Add handleUploadHeroImage and handleRemoveHeroImage functions**

After `handleRemoveLogo`, add:

```js
async function handleUploadHeroImage(file) {
  if (!file) return
  setUploadingHero(true)
  const fd = new FormData()
  fd.append('hero_image', file)
  try {
    const res = await uploadHeroImage(fd)
    setHeroImagePath(res.HeroImagePath ?? '')
    setHeroImage(null)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  } catch {
    setError('Erro ao enviar imagem hero.')
  } finally {
    setUploadingHero(false)
  }
}

async function handleRemoveHeroImage() {
  setUploadingHero(true)
  try {
    await removeHeroImage()
    setHeroImagePath('')
    setHeroImage(null)
  } catch {
    setError('Erro ao remover imagem hero.')
  } finally {
    setUploadingHero(false)
  }
}
```

- [ ] **Step 6: Add the Hero section in JSX**

In the form, after the closing `</Section>` of "Página Inicial" and before the `<Section title="Sobre">`, insert the new hero section:

```jsx
{/* Fundo do Hero */}
<Section title="Fundo do Hero">
  {/* Toggle */}
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-semibold text-gray-700">Imagem de fundo</p>
      <p className="text-xs text-gray-400 mt-0.5">
        {fields.hero_mode === 'image' ? 'Exibe imagem cobrindo o hero' : 'Gradiente limpo com foco na busca'}
      </p>
    </div>
    <button
      type="button"
      onClick={() => set('hero_mode', fields.hero_mode === 'image' ? 'clean' : 'image')}
      className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 flex-shrink-0 ${
        fields.hero_mode === 'image' ? 'bg-[var(--color-brand)]' : 'bg-gray-200'
      }`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
        fields.hero_mode === 'image' ? 'translate-x-4' : 'translate-x-0'
      }`} />
    </button>
  </div>

  {fields.hero_mode === 'image' ? (
    <div className="space-y-4">
      {/* Uploaded image */}
      {heroImagePath ? (
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden aspect-video max-w-sm">
            <img src={`/uploads/${heroImagePath}`} alt="Hero atual" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2.5 bg-white hover:border-gray-400 transition-colors">
                <iconify-icon icon="lucide:upload" class="text-gray-400 text-base"></iconify-icon>
                <span className="text-sm text-gray-500">Substituir imagem</span>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files[0]
                  if (f) handleUploadHeroImage(f)
                  e.target.value = ''
                }}
              />
            </label>
            <button
              type="button"
              onClick={handleRemoveHeroImage}
              disabled={uploadingHero}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-red-100 rounded-xl text-sm text-red-400 hover:border-red-300 hover:text-red-600 transition-colors bg-white disabled:opacity-50"
            >
              <iconify-icon icon="lucide:trash-2" class="text-base"></iconify-icon>
              Remover
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Unsplash fallback preview hint */}
          <div className="rounded-xl overflow-hidden aspect-video max-w-sm relative">
            <img
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=40&w=600&auto=format&fit=crop"
              alt="Imagem padrão"
              className="w-full h-full object-cover opacity-70"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <span className="text-white text-xs font-semibold bg-black/40 px-3 py-1.5 rounded-full">Imagem padrão (Unsplash)</span>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-3 bg-white hover:border-gray-400 transition-colors">
              <iconify-icon icon="lucide:upload" class="text-gray-400 text-base"></iconify-icon>
              <span className="text-sm text-gray-500">
                {uploadingHero ? 'Enviando…' : 'Escolher imagem personalizada'}
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingHero}
              onChange={e => {
                const f = e.target.files[0]
                if (f) handleUploadHeroImage(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      )}
      <p className="text-[10px] text-gray-400">PNG, JPG ou WebP · máx. 5 MB</p>

      {/* Optional external URL fallback */}
      <Field label="Ou cole uma URL de imagem">
        <input
          value={fields.hero_image_url}
          onChange={e => set('hero_image_url', e.target.value)}
          className={inp}
          placeholder="https://…"
        />
      </Field>
    </div>
  ) : (
    /* Clean mode preview swatch */
    <div className="rounded-xl overflow-hidden border border-gray-100 max-w-sm aspect-video relative"
         style={{ background: 'linear-gradient(160deg, #ffffff 0%, #f5f5f5 100%)' }}>
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-[0.12] pointer-events-none"
           style={{ backgroundColor: 'var(--color-brand)' }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
        <div className="w-8 h-0.5 rounded-full" style={{ backgroundColor: 'var(--color-brand)' }} />
        <div className="h-3 bg-gray-200 rounded w-36" />
        <div className="h-2.5 bg-gray-100 rounded w-24" />
        <div className="h-6 w-20 rounded-lg mt-1" style={{ backgroundColor: 'var(--color-brand)', opacity: 0.8 }} />
      </div>
    </div>
  )}
</Section>
```

Also remove the old `<Field label="URL da Imagem Hero">` from the "Página Inicial" section (it's now inside the Hero section above).

- [ ] **Step 7: Start dev server and verify UI**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173/admin/configuracoes`. Confirm:
- New "Fundo do Hero" section appears between "Página Inicial" and "Sobre"
- Toggle switches between image and clean modes
- Image mode shows Unsplash preview when no upload, thumbnail when uploaded
- Clean mode shows gradient swatch
- File upload triggers immediate upload (no wait for Save button)
- "URL da Imagem Hero" is no longer in "Página Inicial" section (moved to Hero section)

- [ ] **Step 8: Commit**

```bash
git add frontend/src/admin/pages/Configuracao.jsx frontend/src/admin/api.js
git commit -m "feat: hero background mode admin UI"
```

---

### Task 7: Public Frontend — Conditional Hero in Home.jsx

**Files:**
- Modify: `frontend/src/pages/Home.jsx`

- [ ] **Step 1: Update heroImage derivation to include HeroImagePath**

The current line:
```js
const heroImage = cfg?.HeroImageURL || HERO_DEFAULT
```

Replace with:
```js
const heroImage = cfg?.HeroImagePath
  ? `/uploads/${cfg.HeroImagePath}`
  : (cfg?.HeroImageURL || HERO_DEFAULT)
```

- [ ] **Step 2: Add heroMode constant**

After the `heroImage` line, add:
```js
const heroMode = cfg?.HeroMode || 'image'
```

- [ ] **Step 3: Replace the hero section with conditional render**

The current `<section className="relative h-[75vh] w-full overflow-hidden">` block. Replace the entire hero `<section>` with:

```jsx
{heroMode === 'clean' ? (
  <section className="relative pt-28 sm:pt-36 pb-24 px-8 lg:px-16 overflow-hidden">
    <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(160deg, #ffffff 0%, #f5f5f5 100%)' }} />
    <div
      className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-[0.08] pointer-events-none"
      style={{ backgroundColor: 'var(--color-brand)' }}
    />
    <div className="relative max-w-4xl mx-auto text-center">
      <div className="w-12 h-0.5 mx-auto mb-6 rounded-full" style={{ backgroundColor: 'var(--color-brand)' }} />
      <h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight mb-4">
        {heroTitulo}
      </h1>
      {heroSubtitulo && (
        <p className="text-lg text-gray-500 mb-8 leading-snug">
          {heroSubtitulo}
        </p>
      )}
      <a
        href={ctaLink}
        className="inline-flex items-center gap-2 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all active:scale-95 hover:opacity-90"
        style={{ backgroundColor: 'var(--color-brand)' }}
      >
        {ctaTexto}
        <iconify-icon icon="lucide:arrow-right" className="text-base"></iconify-icon>
      </a>
    </div>
  </section>
) : (
  <section className="relative h-[75vh] w-full overflow-hidden">
    <img
      src={heroImage}
      alt="Imóvel de luxo"
      className="w-full h-full object-cover"
    />
    <div className="absolute inset-0 hero-gradient" />
    <div className="absolute bottom-20 left-8 lg:left-16 max-w-2xl">
      <h1
        className="text-5xl lg:text-7xl font-bold text-white tracking-tighter leading-[0.9] mb-4"
        style={{ textShadow: '0 2px 20px rgba(0,0,0,0.65), 0 1px 4px rgba(0,0,0,0.5)' }}
      >
        {heroTitulo}
      </h1>
      {heroSubtitulo && (
        <p
          className="text-lg text-white/85 font-medium mb-6 leading-snug"
          style={{ textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}
        >
          {heroSubtitulo}
        </p>
      )}
      <a
        href={ctaLink}
        className="inline-flex items-center gap-2 bg-white text-[var(--color-brand)] font-bold text-sm px-6 py-3 rounded-xl hover:bg-gray-100 transition-all active:scale-95"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
      >
        {ctaTexto}
        <iconify-icon icon="lucide:arrow-right" className="text-base"></iconify-icon>
      </a>
    </div>
  </section>
)}
```

- [ ] **Step 4: Update search bar overlap — remove -mt-12 in clean mode**

The current search bar wrapper:
```jsx
<div className="max-w-6xl mx-auto px-8 lg:px-0 relative z-10 -mt-12">
```

Replace with:
```jsx
<div className={`mx-auto px-8 lg:px-0 relative z-10 ${heroMode === 'clean' ? 'max-w-4xl mt-8' : 'max-w-6xl -mt-12'}`}>
```

- [ ] **Step 5: Test both modes in browser**

With dev server running, toggle hero mode in admin and reload the public homepage. Confirm:
- Image mode: full-bleed photo, dark gradient overlay, bottom-left headline, search bar overlapping hero bottom
- Clean mode: white→gray gradient, brand glow top-right, centered headline with brand accent line, search bar below with breathing room

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Home.jsx
git commit -m "feat: conditional hero render — image vs clean gradient mode"
```

---

### Task 8: Build and Final Smoke Test

- [ ] **Step 1: Build frontend**

```bash
cd frontend && npm run build
```

Expected: clean build, no errors.

- [ ] **Step 2: Build backend**

```bash
go build ./...
```

Expected: clean.

- [ ] **Step 3: Run app and apply migration**

```bash
go run ./cmd/server
```

On first start with new migration, the DB gains `hero_mode` and `hero_image_path` columns. Confirm in logs that migration `0005_hero_mode.sql` applied.

- [ ] **Step 4: End-to-end smoke test**

1. Open `/admin/configuracoes` — confirm Hero section present
2. Toggle OFF → Save → reload `/` — confirm clean gradient hero
3. Toggle ON → Save → reload `/` — confirm image hero (Unsplash default)
4. Upload custom hero image → confirm thumbnail appears, hero image updates on public site
5. Remove custom image → confirm Unsplash fallback returns
6. Existing logo, colors, and all other settings: confirm unchanged

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: hero background mode — image/clean toggle with upload support"
```
