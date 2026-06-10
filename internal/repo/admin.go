package repo

import (
	"context"
	"database/sql"
	"errors"
)

var ErrNotFound = errors.New("repo: not found")

type Admin struct {
	ID        int64
	Email     string
	SenhaHash string
}

type AdminRepo struct {
	conn *sql.DB
}

func NewAdminRepo(conn *sql.DB) AdminRepo {
	return AdminRepo{conn: conn}
}

func (r AdminRepo) FindByEmail(ctx context.Context, email string) (Admin, error) {
	var a Admin
	err := r.conn.QueryRowContext(ctx,
		`SELECT id, email, senha_hash FROM admins WHERE email = ?`, email,
	).Scan(&a.ID, &a.Email, &a.SenhaHash)

	if errors.Is(err, sql.ErrNoRows) {
		return Admin{}, ErrNotFound
	}
	if err != nil {
		return Admin{}, err
	}

	return a, nil
}

func (r AdminRepo) FindByID(ctx context.Context, id int64) (Admin, error) {
	var a Admin
	err := r.conn.QueryRowContext(ctx,
		`SELECT id, email, senha_hash FROM admins WHERE id = ?`, id,
	).Scan(&a.ID, &a.Email, &a.SenhaHash)
	if errors.Is(err, sql.ErrNoRows) {
		return Admin{}, ErrNotFound
	}
	if err != nil {
		return Admin{}, err
	}
	return a, nil
}

func (r AdminRepo) Create(ctx context.Context, email, senhaHash string) (int64, error) {
	result, err := r.conn.ExecContext(ctx,
		`INSERT INTO admins (email, senha_hash) VALUES (?, ?)`, email, senhaHash,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}
