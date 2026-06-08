package handlers

import (
	"context"
	"net/http"

	"github.com/gucardona/imob.app/internal/auth"
)

type contextKey string

const adminIDContextKey contextKey = "adminID"

// RequireAuth verifies the session cookie, redirecting to the login page when
// absent or invalid, renews the session on every authenticated request (per
// spec's "renovação por atividade"), and stores the admin id in the request context.
func RequireAuth(sessions auth.SessionManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			adminID, ok := sessions.Verify(r)
			if !ok {
				http.Redirect(w, r, "/admin/login", http.StatusSeeOther)
				return
			}

			sessions.Issue(w, adminID)

			ctx := context.WithValue(r.Context(), adminIDContextKey, adminID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
