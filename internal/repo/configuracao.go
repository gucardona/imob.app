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
	HeroImageURL    string
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
		       endereco, telefone, whatsapp, email, instagram_url,
		       texto_sobre, texto_home, hero_image_url
		FROM configuracao WHERE id = 1
	`).Scan(
		&c.NomeImobiliaria, &c.LogoPath, &c.CorPrimaria, &c.CorSecundaria,
		&c.Endereco, &c.Telefone, &c.Whatsapp, &c.Email,
		&c.InstagramURL, &c.TextoSobre, &c.TextoHome, &c.HeroImageURL,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Configuracao{}, ErrNotFound
	}
	return c, err
}

func (r ConfiguracaoRepo) Update(ctx context.Context, c Configuracao) error {
	_, err := r.conn.ExecContext(ctx, `
		UPDATE configuracao SET
			nome_imobiliaria = ?, logo_path = ?, cor_primaria = ?, cor_secundaria = ?,
			endereco = ?, telefone = ?, whatsapp = ?, email = ?,
			instagram_url = ?, texto_sobre = ?, texto_home = ?, hero_image_url = ?
		WHERE id = 1
	`,
		c.NomeImobiliaria, c.LogoPath, c.CorPrimaria, c.CorSecundaria,
		c.Endereco, c.Telefone, c.Whatsapp, c.Email,
		c.InstagramURL, c.TextoSobre, c.TextoHome, c.HeroImageURL,
	)
	return err
}
