package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const cookieName = "imob_session"

type SessionManager struct {
	secret []byte
	ttl    time.Duration
}

func NewSessionManager(secret string, ttl time.Duration) SessionManager {
	return SessionManager{secret: []byte(secret), ttl: ttl}
}

func (m SessionManager) Issue(w http.ResponseWriter, adminID int64) {
	expires := time.Now().Add(m.ttl)
	payload := fmt.Sprintf("%d.%d", adminID, expires.Unix())
	value := payload + "." + m.sign(payload)

	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Expires:  expires,
	})
}

func (m SessionManager) Verify(r *http.Request) (int64, bool) {
	cookie, err := r.Cookie(cookieName)
	if err != nil {
		return 0, false
	}

	lastDot := strings.LastIndex(cookie.Value, ".")
	if lastDot == -1 {
		return 0, false
	}
	payload, signature := cookie.Value[:lastDot], cookie.Value[lastDot+1:]

	if !hmac.Equal([]byte(signature), []byte(m.sign(payload))) {
		return 0, false
	}

	parts := strings.SplitN(payload, ".", 2)
	if len(parts) != 2 {
		return 0, false
	}

	adminID, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return 0, false
	}
	expiresUnix, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return 0, false
	}

	if time.Now().Unix() > expiresUnix {
		return 0, false
	}

	return adminID, true
}

func (m SessionManager) Clear(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

func (m SessionManager) sign(payload string) string {
	mac := hmac.New(sha256.New, m.secret)
	mac.Write([]byte(payload))
	return hex.EncodeToString(mac.Sum(nil))
}
