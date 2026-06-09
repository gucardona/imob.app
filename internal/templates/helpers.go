package templates

import (
	"regexp"

	"github.com/gucardona/imob.app/internal/repo"
)

var hexColorRe = regexp.MustCompile(`^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$`)

func colorStyle(cfg repo.Configuracao) string {
	s := ""
	if hexColorRe.MatchString(cfg.CorPrimaria) {
		s += "--color-primary:" + cfg.CorPrimaria + ";"
	}
	if hexColorRe.MatchString(cfg.CorSecundaria) {
		s += "--color-secondary:" + cfg.CorSecundaria + ";"
	}
	return s
}
