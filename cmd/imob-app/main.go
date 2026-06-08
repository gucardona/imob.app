package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gucardona/imob.app/internal/config"
	"github.com/gucardona/imob.app/internal/db"
	"github.com/gucardona/imob.app/internal/handlers"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "admin" {
		runAdminCommand(os.Args[2:])
		return
	}

	runServer()
}

func runServer() {
	cfg := config.Load()

	conn, err := db.Open(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("opening database: %v", err)
	}
	defer conn.Close()

	if err := db.Migrate(conn); err != nil {
		log.Fatalf("running migrations: %v", err)
	}

	router := handlers.NewRouter(handlers.Deps{
		Conn:   conn,
		Config: cfg,
	})

	log.Printf("listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, router); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
