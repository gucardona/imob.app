package main

import (
	"log"
	"net/http"

	"github.com/gucardona/imob.app/internal/config"
	"github.com/gucardona/imob.app/internal/db"
	"github.com/gucardona/imob.app/internal/handlers"
)

func main() {
	cfg := config.Load()

	conn, err := db.Open(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("opening database: %v", err)
	}
	defer conn.Close()

	if err := db.Migrate(conn); err != nil {
		log.Fatalf("running migrations: %v", err)
	}

	router := handlers.NewRouter(conn)

	log.Printf("listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, router); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
