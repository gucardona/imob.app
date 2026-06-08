package repo

import (
	"context"
	"database/sql"
	"errors"
)

type Configuracao struct {
	NomeImobiliaria string
	LogoPath        string
	CorPrimaria     string
	CorSecundaria   string
	Endereco        string
	Telefone        string
	Whatsapp        string
	Email           string
	InstagramURL    string
	TextoSobre      string
	TextoHome       string
}

type ConfiguracaoRepo struct {
	conn *sql.DB
}

func NewConfiguracaoRepo(conn *sql.DB) ConfiguracaoRepo {
	return ConfiguracaoRepo{conn: conn}
}

func (r ConfiguracaoRepo) Get(ctx context.Context) (Configuracao, error) {
	var c Configuracao
	err := r.conn.QueryRowContext(ctx, `
		SELECT nome_imobiliaria, logo_path, cor_primaria, cor_secundaria,
		       endereco, telefone, whatsapp, email, instagram_url, texto_sobre, texto_home
		FROM configuracao WHERE id = 1
	`).Scan(
		&c.NomeImobiliaria, &c.LogoPath, &c.CorPrimaria, &c.CorSecundaria,
		&c.Endereco, &c.Telefone, &c.Whatsapp, &c.Email,
		&c.InstagramURL, &c.TextoSobre, &c.TextoHome,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Configuracao{}, ErrNotFound
	}
	return c, err
}
