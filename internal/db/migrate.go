package db

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"sort"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func Migrate(conn *sql.DB) error {
	if _, err := conn.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY)`); err != nil {
		return fmt.Errorf("creating schema_migrations table: %w", err)
	}

	entries, err := fs.ReadDir(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("reading migrations directory: %w", err)
	}

	var names []string
	for _, entry := range entries {
		names = append(names, entry.Name())
	}
	sort.Strings(names)

	for _, name := range names {
		applied, err := isApplied(conn, name)
		if err != nil {
			return fmt.Errorf("checking migration %s: %w", name, err)
		}
		if applied {
			continue
		}

		if err := applyMigration(conn, name); err != nil {
			return err
		}
	}

	return nil
}

func isApplied(conn *sql.DB, name string) (bool, error) {
	var count int
	err := conn.QueryRow(`SELECT COUNT(*) FROM schema_migrations WHERE version = ?`, name).Scan(&count)
	return count > 0, err
}

func applyMigration(conn *sql.DB, name string) error {
	contents, err := fs.ReadFile(migrationsFS, "migrations/"+name)
	if err != nil {
		return fmt.Errorf("reading migration %s: %w", name, err)
	}

	tx, err := conn.Begin()
	if err != nil {
		return fmt.Errorf("starting transaction for %s: %w", name, err)
	}

	if _, err := tx.Exec(string(contents)); err != nil {
		tx.Rollback()
		return fmt.Errorf("applying migration %s: %w", name, err)
	}

	if _, err := tx.Exec(`INSERT INTO schema_migrations (version) VALUES (?)`, name); err != nil {
		tx.Rollback()
		return fmt.Errorf("recording migration %s: %w", name, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("committing migration %s: %w", name, err)
	}

	return nil
}
