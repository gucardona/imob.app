package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io/fs"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gucardona/imob.app/internal/assets"
	"github.com/gucardona/imob.app/internal/auth"
	"github.com/gucardona/imob.app/internal/config"
	"github.com/gucardona/imob.app/internal/frontend"
	"github.com/gucardona/imob.app/internal/repo"
)

const sessionTTL = 7 * 24 * time.Hour

// Deps bundles every dependency the router and its handlers need.
type Deps struct {
	Conn   *sql.DB
	Config config.Config
}

func NewRouter(deps Deps) http.Handler {
	sessions := auth.NewSessionManager(deps.Config.SessionSecret, sessionTTL, deps.Config.SecureCookies)
	admins := repo.NewAdminRepo(deps.Conn)
	imoveis := repo.NewImovelRepo(deps.Conn)
	fotos := repo.NewFotoRepo(deps.Conn)
	cfgRepo := repo.NewConfiguracaoRepo(deps.Conn)

	api := newAPIHandlers(imoveis, fotos, cfgRepo)
	adminAPI := newAdminAPIHandlers(deps.Config.UploadsDir, sessions, admins, imoveis, fotos, cfgRepo)

	requireAuth := RequireAuth(sessions)

	mux := http.NewServeMux()

	// Infrastructure
	mux.HandleFunc("GET /healthz", handleHealth(deps.Conn))
	mux.Handle("GET /static/", http.FileServerFS(assets.Static))
	mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(deps.Config.UploadsDir))))

	// Public JSON API
	mux.HandleFunc("GET /api/configuracao", api.configuracao)
	mux.HandleFunc("GET /api/imoveis", api.imovelList)
	mux.HandleFunc("GET /api/imoveis/{slug}", api.imovelDetail)

	// Admin auth
	mux.HandleFunc("POST /api/admin/login", adminAPI.login)
	mux.Handle("POST /api/admin/logout", requireAuth(http.HandlerFunc(adminAPI.logout)))
	mux.Handle("GET /api/admin/me", requireAuth(http.HandlerFunc(adminAPI.me)))

	// Admin imóveis
	mux.Handle("GET /api/admin/imoveis", requireAuth(http.HandlerFunc(adminAPI.imovelList)))
	mux.Handle("POST /api/admin/imoveis", requireAuth(http.HandlerFunc(adminAPI.imovelCreate)))
	mux.Handle("GET /api/admin/imoveis/{id}", requireAuth(http.HandlerFunc(adminAPI.imovelGet)))
	mux.Handle("PUT /api/admin/imoveis/{id}", requireAuth(http.HandlerFunc(adminAPI.imovelUpdate)))
	mux.Handle("DELETE /api/admin/imoveis/{id}", requireAuth(http.HandlerFunc(adminAPI.imovelDelete)))
	mux.Handle("POST /api/admin/imoveis/{id}/destaque", requireAuth(http.HandlerFunc(adminAPI.imovelToggleDestaque)))

	// Admin fotos
	mux.Handle("POST /api/admin/imoveis/{id}/fotos", requireAuth(http.HandlerFunc(adminAPI.fotoUpload)))
	mux.Handle("PUT /api/admin/imoveis/{id}/fotos/ordem", requireAuth(http.HandlerFunc(adminAPI.fotoReorder)))
	mux.Handle("POST /api/admin/imoveis/{id}/fotos/{fotoID}/principal", requireAuth(http.HandlerFunc(adminAPI.fotoPrincipal)))
	mux.Handle("DELETE /api/admin/imoveis/{id}/fotos/{fotoID}", requireAuth(http.HandlerFunc(adminAPI.fotoDelete)))

	// Admin configuração
	mux.Handle("GET /api/admin/configuracao", requireAuth(http.HandlerFunc(adminAPI.configGet)))
	mux.Handle("PUT /api/admin/configuracao", requireAuth(http.HandlerFunc(adminAPI.configUpdate)))
	mux.Handle("POST /api/admin/configuracao/reset-branding", requireAuth(http.HandlerFunc(adminAPI.configResetBranding)))
	mux.Handle("POST /api/admin/configuracao/remove-logo", requireAuth(http.HandlerFunc(adminAPI.configRemoveLogo)))
	mux.Handle("POST /api/admin/configuracao/hero-image", requireAuth(http.HandlerFunc(adminAPI.configHeroImageUpload)))
	mux.Handle("POST /api/admin/configuracao/remove-hero-image", requireAuth(http.HandlerFunc(adminAPI.configRemoveHeroImage)))

	// React SPA — catch-all (serves index.html for all /admin/* page loads too)
	distFS, _ := fs.Sub(frontend.Dist, "dist")
	mux.Handle("/", newSPAHandler(distFS, cfgRepo))

	return mux
}

func newSPAHandler(fsys fs.FS, cfgRepo repo.ConfiguracaoRepo) http.Handler {
	fileServer := http.FileServerFS(fsys)
	indexHTML, _ := fs.ReadFile(fsys, "index.html")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" || path == "index.html" {
			serveIndexWithCfg(w, r, indexHTML, cfgRepo)
			return
		}
		f, err := fsys.Open(path)
		if err != nil {
			serveIndexWithCfg(w, r, indexHTML, cfgRepo)
			return
		}
		f.Close()
		fileServer.ServeHTTP(w, r)
	})
}

func serveIndexWithCfg(w http.ResponseWriter, r *http.Request, indexHTML []byte, cfgRepo repo.ConfiguracaoRepo) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")

	cfg, err := cfgRepo.Get(r.Context())
	if err != nil {
		_, _ = w.Write(indexHTML)
		return
	}

	cfgJSON, _ := json.Marshal(cfg)

	brand := cfg.CorPrimaria
	if brand == "" {
		brand = "#8B1538"
	}
	dark := darkenHex(brand, 12)
	ri, gi, bi := hexRGB(brand)

	script := fmt.Sprintf(
		`<script>window.__CFG__=%s;(function(c){if(!c)return;`+
			`var e=document.documentElement;`+
			`e.style.setProperty('--color-brand','%s');`+
			`e.style.setProperty('--color-brand-dark','%s');`+
			`e.style.setProperty('--color-brand-light','rgba(%d,%d,%d,0.1)');`+
			`e.style.setProperty('--color-secondary',c.CorSecundaria||'#1A1A1A');`+
			`if(c.NomeImobiliaria)document.title=c.NomeImobiliaria;`+
			`if(c.LogoPath){var l=document.querySelector("link[rel*='icon']");`+
			`if(!l){l=document.createElement('link');l.rel='icon';document.head.appendChild(l);}`+
			`l.type='image/png';l.href='/uploads/'+c.LogoPath;}`+
			`})(window.__CFG__);</script>`,
		cfgJSON, brand, dark, ri, gi, bi,
	)

	const skeletonCSS = `<style>
@keyframes _sk{50%{opacity:.5}}
._sk{animation:_sk 2s cubic-bezier(.4,0,.6,1) infinite}
._sk-wrap{min-height:100vh;background:#fff}
._sk-hdr{position:fixed;top:0;left:0;width:100%;height:64px;background:#fff;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between;padding:0 32px;box-sizing:border-box;z-index:50}
._sk-b{background:#e5e7eb;border-radius:8px}
._sk-b2{background:#f3f4f6;border-radius:8px}
._sk-hero{height:75vh;background:#e2e8f0;margin-top:64px;position:relative;overflow:hidden}
._sk-ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.25),transparent)}
._sk-hc{position:absolute;bottom:80px;left:64px;display:flex;flex-direction:column;gap:16px}
._sk-card{background:#fff;border-radius:16px;padding:16px;margin:-48px 32px 0;display:flex;gap:16px;align-items:center;box-shadow:0 4px 24px rgba(0,0,0,.07)}
._sk-cols{display:flex;flex:1;gap:0}
._sk-col{flex:1;padding:12px 24px;display:flex;flex-direction:column;gap:10px}
</style>`

	const skeletonHTML = `<div class="_sk-wrap _sk">
<div class="_sk-hdr">
<div class="_sk-b" style="width:128px;height:32px"></div>
<div class="_sk-b" style="width:40px;height:40px;border-radius:50%"></div>
</div>
<div class="_sk-hero">
<div class="_sk-ov"></div>
<div class="_sk-hc">
<div class="_sk-b" style="width:460px;max-width:80vw;height:68px;background:rgba(255,255,255,.25)"></div>
<div class="_sk-b" style="width:340px;max-width:65vw;height:68px;background:rgba(255,255,255,.25)"></div>
<div class="_sk-b" style="width:260px;max-width:55vw;height:16px;background:rgba(255,255,255,.2)"></div>
<div class="_sk-b" style="width:160px;height:48px;background:rgba(255,255,255,.25)"></div>
</div>
</div>
<div class="_sk-card">
<div class="_sk-cols">
<div class="_sk-col"><div class="_sk-b2" style="height:8px;width:80px"></div><div class="_sk-b2" style="height:16px;width:130px"></div></div>
<div class="_sk-col"><div class="_sk-b2" style="height:8px;width:80px"></div><div class="_sk-b2" style="height:16px;width:130px"></div></div>
<div class="_sk-col"><div class="_sk-b2" style="height:8px;width:80px"></div><div class="_sk-b2" style="height:16px;width:130px"></div></div>
</div>
<div class="_sk-b" style="width:140px;height:56px;flex-shrink:0"></div>
</div>
</div>`

	title := cfg.NomeImobiliaria
	if title == "" {
		title = "Imóveis"
	}

	html := string(indexHTML)
	html = strings.Replace(html, "<title>Imóveis</title>", "<title>"+title+"</title>", 1)
	html = strings.Replace(html, "</head>", skeletonCSS+script+"</head>", 1)
	html = strings.Replace(html, `<div id="root"></div>`, `<div id="root">`+skeletonHTML+`</div>`, 1)
	_, _ = w.Write([]byte(html))
}

func darkenHex(hex string, pct float64) string {
	hex = strings.TrimPrefix(hex, "#")
	if len(hex) == 3 {
		hex = string([]byte{hex[0], hex[0], hex[1], hex[1], hex[2], hex[2]})
	}
	if len(hex) != 6 {
		return "#" + hex
	}
	ri, _ := strconv.ParseInt(hex[0:2], 16, 64)
	gi, _ := strconv.ParseInt(hex[2:4], 16, 64)
	bi, _ := strconv.ParseInt(hex[4:6], 16, 64)
	r, g, b := float64(ri)/255, float64(gi)/255, float64(bi)/255
	mx := math.Max(math.Max(r, g), b)
	mn := math.Min(math.Min(r, g), b)
	h, s, l := 0.0, 0.0, (mx+mn)/2
	if mx != mn {
		d := mx - mn
		if l > 0.5 {
			s = d / (2 - mx - mn)
		} else {
			s = d / (mx + mn)
		}
		switch mx {
		case r:
			h = (g - b) / d
			if g < b {
				h += 6
			}
			h /= 6
		case g:
			h = ((b-r)/d + 2) / 6
		case b:
			h = ((r-g)/d + 4) / 6
		}
	}
	l = math.Max(0, l-pct/100)
	var r2, g2, b2 float64
	if s == 0 {
		r2, g2, b2 = l, l, l
	} else {
		q := l + s - l*s
		if l < 0.5 {
			q = l * (1 + s)
		}
		p := 2*l - q
		r2 = hue2rgb(p, q, h+1.0/3)
		g2 = hue2rgb(p, q, h)
		b2 = hue2rgb(p, q, h-1.0/3)
	}
	return fmt.Sprintf("#%02x%02x%02x",
		int(math.Round(r2*255)),
		int(math.Round(g2*255)),
		int(math.Round(b2*255)),
	)
}

func hue2rgb(p, q, t float64) float64 {
	if t < 0 {
		t++
	}
	if t > 1 {
		t--
	}
	switch {
	case t < 1.0/6:
		return p + (q-p)*6*t
	case t < 0.5:
		return q
	case t < 2.0/3:
		return p + (q-p)*(2.0/3-t)*6
	}
	return p
}

func hexRGB(hex string) (int, int, int) {
	hex = strings.TrimPrefix(hex, "#")
	if len(hex) == 3 {
		hex = string([]byte{hex[0], hex[0], hex[1], hex[1], hex[2], hex[2]})
	}
	if len(hex) != 6 {
		return 139, 21, 56
	}
	ri, _ := strconv.ParseInt(hex[0:2], 16, 64)
	gi, _ := strconv.ParseInt(hex[2:4], 16, 64)
	bi, _ := strconv.ParseInt(hex[4:6], 16, 64)
	return int(ri), int(gi), int(bi)
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
