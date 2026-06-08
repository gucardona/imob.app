package repo

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"unicode"
)

type Imovel struct {
	ID           int64
	Slug         string
	Titulo       string
	Descricao    string
	Tipo         string
	Finalidade   string
	Cidade       string
	Bairro       string
	Endereco     string
	Preco        float64
	AreaM2       float64
	Quartos      int
	Banheiros    int
	VagasGaragem int
	Status       string
	Destaque     bool
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
		       preco, area_m2, quartos, banheiros, vagas_garagem, status, destaque
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
		       preco, area_m2, quartos, banheiros, vagas_garagem, status, destaque
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
	err := row.Scan(
		&imovel.ID, &imovel.Slug, &imovel.Titulo, &imovel.Descricao, &imovel.Tipo, &imovel.Finalidade,
		&imovel.Cidade, &imovel.Bairro, &imovel.Endereco, &imovel.Preco, &imovel.AreaM2,
		&imovel.Quartos, &imovel.Banheiros, &imovel.VagasGaragem, &imovel.Status, &imovel.Destaque,
	)
	return imovel, err
}

var accentReplacer = strings.NewReplacer(
	"á", "a", "à", "a", "ã", "a", "â", "a", "ä", "a",
	"é", "e", "è", "e", "ê", "e", "ë", "e",
	"í", "i", "ì", "i", "î", "i", "ï", "i",
	"ó", "o", "ò", "o", "õ", "o", "ô", "o", "ö", "o",
	"ú", "u", "ù", "u", "û", "u", "ü", "u",
	"ç", "c", "ñ", "n",
)

// Slugify converts free text into a URL-safe slug: lowercase ASCII,
// accents stripped, runs of non-alphanumeric characters collapsed to single hyphens.
func Slugify(s string) string {
	s = strings.ToLower(s)
	s = accentReplacer.Replace(s)

	var b strings.Builder
	lastWasHyphen := true // suppress leading hyphens
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
