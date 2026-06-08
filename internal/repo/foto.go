package repo

import (
	"context"
	"database/sql"
	"errors"
)

type Foto struct {
	ID              int64
	ImovelID        int64
	CaminhoOriginal string
	CaminhoThumb    string
	CaminhoGrande   string
	Principal       bool
	Ordem           int
}

type FotoRepo struct {
	conn *sql.DB
}

func NewFotoRepo(conn *sql.DB) FotoRepo {
	return FotoRepo{conn: conn}
}

func (r FotoRepo) ListByImovel(ctx context.Context, imovelID int64) ([]Foto, error) {
	rows, err := r.conn.QueryContext(ctx, `
		SELECT id, imovel_id, caminho_original, caminho_thumb, caminho_grande, principal, ordem
		FROM fotos
		WHERE imovel_id = ?
		ORDER BY ordem ASC
	`, imovelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Foto
	for rows.Next() {
		var f Foto
		if err := rows.Scan(&f.ID, &f.ImovelID, &f.CaminhoOriginal, &f.CaminhoThumb, &f.CaminhoGrande, &f.Principal, &f.Ordem); err != nil {
			return nil, err
		}
		list = append(list, f)
	}
	return list, rows.Err()
}

func (r FotoRepo) Create(ctx context.Context, foto Foto) (int64, error) {
	result, err := r.conn.ExecContext(ctx, `
		INSERT INTO fotos (imovel_id, caminho_original, caminho_thumb, caminho_grande, principal, ordem)
		VALUES (?, ?, ?, ?, ?, ?)
	`, foto.ImovelID, foto.CaminhoOriginal, foto.CaminhoThumb, foto.CaminhoGrande, foto.Principal, foto.Ordem)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// SetPrincipal marks the given foto as the imóvel's principal photo and
// unmarks any other photo of the same imóvel, keeping the "only one principal" invariant.
func (r FotoRepo) SetPrincipal(ctx context.Context, imovelID, fotoID int64) error {
	tx, err := r.conn.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `UPDATE fotos SET principal = 0 WHERE imovel_id = ?`, imovelID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE fotos SET principal = 1 WHERE id = ? AND imovel_id = ?`, fotoID, imovelID); err != nil {
		return err
	}

	return tx.Commit()
}

func (r FotoRepo) GetByID(ctx context.Context, imovelID, fotoID int64) (Foto, error) {
	var f Foto
	err := r.conn.QueryRowContext(ctx,
		`SELECT id, imovel_id, caminho_original, caminho_thumb, caminho_grande, principal, ordem FROM fotos WHERE id = ? AND imovel_id = ?`,
		fotoID, imovelID,
	).Scan(&f.ID, &f.ImovelID, &f.CaminhoOriginal, &f.CaminhoThumb, &f.CaminhoGrande, &f.Principal, &f.Ordem)
	if errors.Is(err, sql.ErrNoRows) {
		return Foto{}, ErrNotFound
	}
	return f, err
}

func (r FotoRepo) Delete(ctx context.Context, imovelID, fotoID int64) error {
	_, err := r.conn.ExecContext(ctx, `DELETE FROM fotos WHERE id = ? AND imovel_id = ?`, fotoID, imovelID)
	return err
}

func (r FotoRepo) GetPrincipal(ctx context.Context, imovelID int64) (Foto, error) {
	var f Foto
	err := r.conn.QueryRowContext(ctx,
		`SELECT id, imovel_id, caminho_original, caminho_thumb, caminho_grande, principal, ordem
		 FROM fotos WHERE imovel_id = ? AND principal = 1 LIMIT 1`,
		imovelID,
	).Scan(&f.ID, &f.ImovelID, &f.CaminhoOriginal, &f.CaminhoThumb, &f.CaminhoGrande, &f.Principal, &f.Ordem)
	if errors.Is(err, sql.ErrNoRows) {
		return Foto{}, ErrNotFound
	}
	return f, err
}
