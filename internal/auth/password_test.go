package auth_test

import (
	"testing"

	"github.com/gucardona/imob.app/internal/auth"
)

func TestHashPassword_VerifyPassword_RoundTrip(t *testing.T) {
	hash, err := auth.HashPassword("correct horse battery staple")
	if err != nil {
		t.Fatalf("HashPassword returned error: %v", err)
	}

	if hash == "correct horse battery staple" {
		t.Error("expected hash to differ from plaintext password")
	}
	if !auth.VerifyPassword(hash, "correct horse battery staple") {
		t.Error("expected VerifyPassword to accept the correct password")
	}
	if auth.VerifyPassword(hash, "wrong password") {
		t.Error("expected VerifyPassword to reject an incorrect password")
	}
}

func TestHashPassword_ProducesDifferentHashesForSameInput(t *testing.T) {
	hashA, err := auth.HashPassword("same password")
	if err != nil {
		t.Fatalf("HashPassword returned error: %v", err)
	}
	hashB, err := auth.HashPassword("same password")
	if err != nil {
		t.Fatalf("HashPassword returned error: %v", err)
	}

	if hashA == hashB {
		t.Error("expected bcrypt to salt hashes so repeated calls differ")
	}
}
