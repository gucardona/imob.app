package handlers

import (
	"net/http"

	"github.com/a-h/templ"

	"github.com/gucardona/imob.app/internal/auth"
	"github.com/gucardona/imob.app/internal/repo"
	"github.com/gucardona/imob.app/internal/templates"
)

// dummyHash is a pre-computed bcrypt hash used to equalize timing on unknown-email login attempts.
var dummyHash, _ = auth.HashPassword("dummy-constant-timing")

type authHandlers struct {
	sessions auth.SessionManager
	admins   repo.AdminRepo
}

func newAuthHandlers(sessions auth.SessionManager, admins repo.AdminRepo) authHandlers {
	return authHandlers{sessions: sessions, admins: admins}
}

func (h authHandlers) loginPage(w http.ResponseWriter, r *http.Request) {
	renderHTML(w, r, templates.AdminLogin(""))
}

func (h authHandlers) login(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		renderHTML(w, r, templates.AdminLogin("Não foi possível processar o formulário."))
		return
	}

	email := r.FormValue("email")
	senha := r.FormValue("senha")

	admin, findErr := h.admins.FindByEmail(r.Context(), email)
	hashToCheck := dummyHash
	if findErr == nil {
		hashToCheck = admin.SenhaHash
	}
	if !auth.VerifyPassword(hashToCheck, senha) || findErr != nil {
		w.WriteHeader(http.StatusUnauthorized)
		renderHTML(w, r, templates.AdminLogin("E-mail ou senha inválidos."))
		return
	}

	h.sessions.Issue(w, admin.ID)
	http.Redirect(w, r, "/admin/imoveis", http.StatusSeeOther)
}

func (h authHandlers) logout(w http.ResponseWriter, r *http.Request) {
	h.sessions.Clear(w)
	http.Redirect(w, r, "/admin/login", http.StatusSeeOther)
}

func renderHTML(w http.ResponseWriter, r *http.Request, component templ.Component) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = component.Render(r.Context(), w)
}
