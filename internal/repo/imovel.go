package repo

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"unicode"
)

type Imovel struct {
	ID           int64   `json:"ID"`
	Slug         string  `json:"Slug"`
	Titulo       string  `json:"Titulo"`
	Descricao    string  `json:"Descricao"`
	Tipo         string  `json:"Tipo"`
	Finalidade   string  `json:"Finalidade"`
	Cidade       string  `json:"Cidade"`
	Bairro       string  `json:"Bairro"`
	Endereco     string  `json:"Endereco"`
	Preco        float64 `json:"Preco"`
	AreaM2       float64 `json:"AreaM2"`
	Quartos      int     `json:"Quartos"`
	Banheiros    int     `json:"Banheiros"`
	VagasGaragem int     `json:"VagasGaragem"`
	Status       string  `json:"Status"`
	Destaque     bool    `json:"Destaque"`
	ThumbURL     string  `json:"ThumbURL"`
}

type ImovelRepo struct {
	conn *sql.DB
}

func NewImovelRepo(conn *sql.DB) ImovelRepo {
	return ImovelRepo{conn: conn}
}

func (r ImovelRepo) List(ctx context.Context) ([]Imovel, error) {
	rows, err := r.conn.QueryContext(ctx, `
		SELECT id, slug, titulo, descricao, tipo, finalidade, cidade, bairro, endereco,
		       preco, area_m2, quartos, banheiros, vagas_garagem, status, destaque,
		       (SELECT COALESCE(caminho_grande, caminho_thumb) FROM fotos WHERE imovel_id = imoveis.id ORDER BY principal DESC, ordem ASC LIMIT 1)
		FROM imoveis
		ORDER BY criado_em DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Imovel
	for rows.Next() {
		imovel, err := scanImovel(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, imovel)
	}
	return list, rows.Err()
}

func (r ImovelRepo) Get(ctx context.Context, id int64) (Imovel, error) {
	row := r.conn.QueryRowContext(ctx, `
		SELECT id, slug, titulo, descricao, tipo, finalidade, cidade, bairro, endereco,
		       preco, area_m2, quartos, banheiros, vagas_garagem, status, destaque,
		       (SELECT COALESCE(caminho_grande, caminho_thumb) FROM fotos WHERE imovel_id = imoveis.id ORDER BY principal DESC, ordem ASC LIMIT 1)
		FROM imoveis
		WHERE id = ?
	`, id)

	imovel, err := scanImovel(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Imovel{}, ErrNotFound
	}
	if err != nil {
		return Imovel{}, err
	}
	return imovel, nil
}

func (r ImovelRepo) Create(ctx context.Context, imovel Imovel) (int64, error) {
	result, err := r.conn.ExecContext(ctx, `
		INSERT INTO imoveis (
			slug, titulo, descricao, tipo, finalidade, cidade, bairro, endereco,
			preco, area_m2, quartos, banheiros, vagas_garagem, status, destaque
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		Slugify(imovel.Titulo), imovel.Titulo, imovel.Descricao, imovel.Tipo, imovel.Finalidade,
		imovel.Cidade, imovel.Bairro, imovel.Endereco, imovel.Preco, imovel.AreaM2,
		imovel.Quartos, imovel.Banheiros, imovel.VagasGaragem, imovel.Status, imovel.Destaque,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (r ImovelRepo) Update(ctx context.Context, imovel Imovel) error {
	_, err := r.conn.ExecContext(ctx, `
		UPDATE imoveis SET
			slug = ?, titulo = ?, descricao = ?, tipo = ?, finalidade = ?,
			cidade = ?, bairro = ?, endereco = ?, preco = ?, area_m2 = ?,
			quartos = ?, banheiros = ?, vagas_garagem = ?, status = ?, destaque = ?,
			atualizado_em = datetime('now')
		WHERE id = ?
	`,
		Slugify(imovel.Titulo), imovel.Titulo, imovel.Descricao, imovel.Tipo, imovel.Finalidade,
		imovel.Cidade, imovel.Bairro, imovel.Endereco, imovel.Preco, imovel.AreaM2,
		imovel.Quartos, imovel.Banheiros, imovel.VagasGaragem, imovel.Status, imovel.Destaque,
		imovel.ID,
	)
	return err
}

func (r ImovelRepo) SetDestaque(ctx context.Context, id int64, destaque bool) error {
	_, err := r.conn.ExecContext(ctx,
		`UPDATE imoveis SET destaque = ?, atualizado_em = datetime('now') WHERE id = ?`,
		destaque, id,
	)
	return err
}

func (r ImovelRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.conn.ExecContext(ctx, `DELETE FROM imoveis WHERE id = ?`, id)
	return err
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanImovel(row rowScanner) (Imovel, error) {
	var imovel Imovel
	var thumb sql.NullString

	err := row.Scan(
		&imovel.ID, &imovel.Slug, &imovel.Titulo, &imovel.Descricao, &imovel.Tipo, &imovel.Finalidade,
		&imovel.Cidade, &imovel.Bairro, &imovel.Endereco, &imovel.Preco, &imovel.AreaM2,
		&imovel.Quartos, &imovel.Banheiros, &imovel.VagasGaragem, &imovel.Status, &imovel.Destaque,
		&thumb,
	)

	if thumb.Valid && thumb.String != "" {
		imovel.ThumbURL = "/uploads/" + thumb.String
	}

	return imovel, err
}

type ImovelFilter struct {
	Tipo         string
	Finalidade   string
	Cidade       string
	Q            string
	OnlyDestaque bool
}

func (r ImovelRepo) GetBySlug(ctx context.Context, slug string) (Imovel, error) {
	row := r.conn.QueryRowContext(ctx, `
		SELECT id, slug, titulo, descricao, tipo, finalidade, cidade, bairro, endereco,
		       preco, area_m2, quartos, banheiros, vagas_garagem, status, destaque,
		       (SELECT COALESCE(caminho_grande, caminho_thumb) FROM fotos WHERE imovel_id = imoveis.id ORDER BY principal DESC, ordem ASC LIMIT 1)
		FROM imoveis
		WHERE slug = ?
	`, slug)
	imovel, err := scanImovel(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Imovel{}, ErrNotFound
	}
	return imovel, err
}

func (r ImovelRepo) ListPublic(ctx context.Context, f ImovelFilter) ([]Imovel, error) {
	q := `SELECT id, slug, titulo, descricao, tipo, finalidade, cidade, bairro, endereco,
	             preco, area_m2, quartos, banheiros, vagas_garagem, status, destaque,
	             (SELECT COALESCE(caminho_grande, caminho_thumb) FROM fotos WHERE imovel_id = imoveis.id ORDER BY principal DESC, ordem ASC LIMIT 1)
	      FROM imoveis
	      WHERE status = 'disponivel'`
	var args []any
	if f.Tipo != "" {
		q += ` AND tipo = ?`
		args = append(args, f.Tipo)
	}
	if f.Finalidade != "" {
		q += ` AND finalidade = ?`
		args = append(args, f.Finalidade)
	}
	if f.Cidade != "" {
		q += ` AND cidade LIKE ?`
		args = append(args, "%"+f.Cidade+"%")
	}
	if f.Q != "" {
		like := "%" + f.Q + "%"
		q += ` AND (titulo LIKE ? OR cidade LIKE ? OR bairro LIKE ? OR endereco LIKE ?)`
		args = append(args, like, like, like, like)
	}
	if f.OnlyDestaque {
		q += ` AND destaque = 1`
	}
	q += ` ORDER BY criado_em DESC`

	rows, err := r.conn.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Imovel
	for rows.Next() {
		imovel, err := scanImovel(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, imovel)
	}
	return list, rows.Err()
}

var accentReplacer = strings.NewReplacer(
	"á", "a", "à", "a", "ã", "a", "â", "a", "ä", "a",
	"é", "e", "è", "e", "ê", "e", "ë", "e",
	"í", "i", "ì", "i", "î", "i", "ï", "i",
	"ó", "o", "ò", "o", "õ", "o", "ô", "o", "ö", "o",
	"ú", "u", "ù", "u", "û", "u", "ü", "u",
	"ç", "c", "ñ", "n",
)

func Slugify(s string) string {
	s = strings.ToLower(s)
	s = accentReplacer.Replace(s)

	var b strings.Builder
	lastWasHyphen := true
	for _, r := range s {
		switch {
		case unicode.IsLetter(r) && r <= unicode.MaxASCII, unicode.IsDigit(r):
			b.WriteRune(r)
			lastWasHyphen = false
		default:
			if !lastWasHyphen {
				b.WriteByte('-')
				lastWasHyphen = true
			}
		}
	}

	return strings.Trim(b.String(), "-")
}
