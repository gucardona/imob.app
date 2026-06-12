package repo

import (
	"context"
	"database/sql"
	"errors"
)

type Configuracao struct {
	NomeImobiliaria   string
	LogoPath          string
	CorPrimaria       string
	CorSecundaria     string
	Endereco          string
	Telefone          string
	Whatsapp          string
	Email             string
	InstagramURL      string
	FacebookURL       string
	LinkedinURL       string
	XURL              string
	TiktokURL         string
	YoutubeURL        string
	PinterestURL      string
	WhatsappURL       string
	TelegramURL       string
	TextoSobre        string
	HeroImageURL      string
	HeroTitulo        string
	HeroSubtitulo     string
	CtaTexto          string
	CtaLink           string
	MsgWhatsappPadrao string
	MsgWhatsappImovel string
	HeroMode          string
	HeroImagePath     string
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
		       endereco, telefone, whatsapp, email,
		       instagram_url, facebook_url, linkedin_url, x_url,
		       tiktok_url, youtube_url, pinterest_url, whatsapp_url, telegram_url,
		       texto_sobre, hero_image_url,
		       hero_titulo, hero_subtitulo, cta_texto, cta_link,
		       msg_whatsapp_padrao, msg_whatsapp_imovel, hero_mode, hero_image_path
		FROM configuracao WHERE id = 1
	`).Scan(
		&c.NomeImobiliaria, &c.LogoPath, &c.CorPrimaria, &c.CorSecundaria,
		&c.Endereco, &c.Telefone, &c.Whatsapp, &c.Email,
		&c.InstagramURL, &c.FacebookURL, &c.LinkedinURL, &c.XURL,
		&c.TiktokURL, &c.YoutubeURL, &c.PinterestURL, &c.WhatsappURL, &c.TelegramURL,
		&c.TextoSobre, &c.HeroImageURL,
		&c.HeroTitulo, &c.HeroSubtitulo, &c.CtaTexto, &c.CtaLink,
		&c.MsgWhatsappPadrao, &c.MsgWhatsappImovel, &c.HeroMode, &c.HeroImagePath,
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
			instagram_url = ?, facebook_url = ?, linkedin_url = ?, x_url = ?,
			tiktok_url = ?, youtube_url = ?, pinterest_url = ?, whatsapp_url = ?, telegram_url = ?,
			texto_sobre = ?, hero_image_url = ?,
			hero_titulo = ?, hero_subtitulo = ?, cta_texto = ?, cta_link = ?,
			msg_whatsapp_padrao = ?, msg_whatsapp_imovel = ?, hero_mode = ?, hero_image_path = ?
		WHERE id = 1
	`,
		c.NomeImobiliaria, c.LogoPath, c.CorPrimaria, c.CorSecundaria,
		c.Endereco, c.Telefone, c.Whatsapp, c.Email,
		c.InstagramURL, c.FacebookURL, c.LinkedinURL, c.XURL,
		c.TiktokURL, c.YoutubeURL, c.PinterestURL, c.WhatsappURL, c.TelegramURL,
		c.TextoSobre, c.HeroImageURL,
		c.HeroTitulo, c.HeroSubtitulo, c.CtaTexto, c.CtaLink,
		c.MsgWhatsappPadrao, c.MsgWhatsappImovel, c.HeroMode, c.HeroImagePath,
	)
	return err
}
