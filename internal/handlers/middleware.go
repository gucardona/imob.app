package handlers

import (
	"context"
	"net/http"

	"github.com/gucardona/imob.app/internal/auth"
)

type contextKey string

const adminIDContextKey contextKey = "adminID"

func RequireAuth(sessions auth.SessionManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			adminID, ok := sessions.Verify(r)
			if !ok {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`{"error":"unauthorized"}`))
				return
			}

			sessions.Issue(w, adminID)

			ctx := context.WithValue(r.Context(), adminIDContextKey, adminID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
