package auth_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gucardona/imob.app/internal/auth"
)

func TestSessions_IssueThenVerify_ReturnsAdminID(t *testing.T) {
	sessions := auth.NewSessionManager("test-secret-do-not-use-in-prod", 7*24*time.Hour, false)

	rec := httptest.NewRecorder()
	sessions.Issue(rec, 42)

	cookie := firstCookie(t, rec)

	req := httptest.NewRequest(http.MethodGet, "/admin/imoveis", nil)
	req.AddCookie(cookie)

	adminID, ok := sessions.Verify(req)
	if !ok {
		t.Fatal("expected Verify to accept a freshly issued cookie")
	}
	if adminID != 42 {
		t.Errorf("expected admin id 42, got %d", adminID)
	}
}

func TestSessions_Verify_RejectsTamperedCookie(t *testing.T) {
	sessions := auth.NewSessionManager("test-secret-do-not-use-in-prod", 7*24*time.Hour, false)

	rec := httptest.NewRecorder()
	sessions.Issue(rec, 42)
	cookie := firstCookie(t, rec)
	cookie.Value = cookie.Value + "tampered"

	req := httptest.NewRequest(http.MethodGet, "/admin/imoveis", nil)
	req.AddCookie(cookie)

	if _, ok := sessions.Verify(req); ok {
		t.Error("expected Verify to reject a tampered cookie")
	}
}

func TestSessions_Verify_RejectsExpiredCookie(t *testing.T) {
	sessions := auth.NewSessionManager("test-secret-do-not-use-in-prod", -1*time.Hour, false)

	rec := httptest.NewRecorder()
	sessions.Issue(rec, 42)
	cookie := firstCookie(t, rec)

	req := httptest.NewRequest(http.MethodGet, "/admin/imoveis", nil)
	req.AddCookie(cookie)

	if _, ok := sessions.Verify(req); ok {
		t.Error("expected Verify to reject an expired cookie")
	}
}

func TestSessions_Verify_RejectsMissingCookie(t *testing.T) {
	sessions := auth.NewSessionManager("test-secret-do-not-use-in-prod", 7*24*time.Hour, false)

	req := httptest.NewRequest(http.MethodGet, "/admin/imoveis", nil)

	if _, ok := sessions.Verify(req); ok {
		t.Error("expected Verify to reject a request without a session cookie")
	}
}

func TestSessions_Clear_RemovesCookie(t *testing.T) {
	sessions := auth.NewSessionManager("test-secret-do-not-use-in-prod", 7*24*time.Hour, false)

	rec := httptest.NewRecorder()
	sessions.Clear(rec)

	cookie := firstCookie(t, rec)
	if cookie.MaxAge >= 0 {
		t.Errorf("expected Clear to set a negative MaxAge, got %d", cookie.MaxAge)
	}
	if cookie.Value != "" {
		t.Errorf("expected Clear to set an empty cookie value, got %q", cookie.Value)
	}
}

func firstCookie(t *testing.T, rec *httptest.ResponseRecorder) *http.Cookie {
	t.Helper()
	cookies := rec.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatal("expected a Set-Cookie header, got none")
	}
	return cookies[0]
}
