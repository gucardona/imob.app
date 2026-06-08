package templates_test

import (
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/gucardona/imob.app/internal/repo"
	"github.com/gucardona/imob.app/internal/templates"
)

func TestHome_RendersWelcomeMessage(t *testing.T) {
	var buf bytes.Buffer

	if err := templates.Home(nil, map[int64]string{}, repo.Configuracao{}).Render(context.Background(), &buf); err != nil {
		t.Fatalf("Render returned error: %v", err)
	}

	html := buf.String()
	if !strings.Contains(html, "Início") {
		t.Errorf("expected rendered HTML to contain %q, got: %s", "Início", html)
	}
	if !strings.Contains(html, "<!doctype html>") {
		t.Errorf("expected rendered HTML to be valid HTML document, got: %s", html)
	}
}
