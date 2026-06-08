package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"

	"golang.org/x/term"

	"github.com/gucardona/imob.app/internal/auth"
	"github.com/gucardona/imob.app/internal/config"
	"github.com/gucardona/imob.app/internal/db"
	"github.com/gucardona/imob.app/internal/repo"
)

func runAdminCommand(args []string) {
	if len(args) != 2 || args[0] != "create" {
		log.Fatal("usage: imob-app admin create <email>")
	}
	email := args[1]

	password, err := promptPassword("Senha: ")
	if err != nil {
		log.Fatalf("reading password: %v", err)
	}
	if password == "" {
		log.Fatal("senha não pode ser vazia")
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		log.Fatalf("hashing password: %v", err)
	}

	cfg := config.Load()
	conn, err := db.Open(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("opening database: %v", err)
	}
	defer conn.Close()

	if err := db.Migrate(conn); err != nil {
		log.Fatalf("running migrations: %v", err)
	}

	admins := repo.NewAdminRepo(conn)
	id, err := admins.Create(context.Background(), email, hash)
	if err != nil {
		log.Fatalf("creating admin: %v", err)
	}

	fmt.Printf("admin criado: id=%d email=%s\n", id, email)
}

func promptPassword(prompt string) (string, error) {
	fmt.Fprint(os.Stdout, prompt)
	bytes, err := term.ReadPassword(int(os.Stdin.Fd()))
	fmt.Fprintln(os.Stdout)
	if err != nil {
		if errors.Is(err, os.ErrClosed) {
			return "", err
		}
		return "", err
	}
	return string(bytes), nil
}
