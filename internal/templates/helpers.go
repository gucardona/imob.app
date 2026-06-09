package templates

import "github.com/gucardona/imob.app/internal/repo"

func colorStyle(cfg repo.Configuracao) string {
	if cfg.CorPrimaria == "" && cfg.CorSecundaria == "" {
		return ""
	}
	s := ""
	if cfg.CorPrimaria != "" {
		s += "--color-primary:" + cfg.CorPrimaria + ";"
	}
	if cfg.CorSecundaria != "" {
		s += "--color-secondary:" + cfg.CorSecundaria + ";"
	}
	return s
}
