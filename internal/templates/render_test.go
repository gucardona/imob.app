package templates_test

import (
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/gucardona/imob.app/internal/templates"
)

func TestHome_RendersWelcomeMessage(t *testing.T) {
	var buf bytes.Buffer

	if err := templates.Home().Render(context.Background(), &buf); err != nil {
		t.Fatalf("Render returned error: %v", err)
	}

	html := buf.String()
	if !strings.Contains(html, "Bem-vindo") {
		t.Errorf("expected rendered HTML to contain %q, got: %s", "Bem-vindo", html)
	}
	if !strings.Contains(html, "<title>Início</title>") {
		t.Errorf("expected rendered HTML to contain the page title, got: %s", html)
	}
}
