package config

import "os"

type Config struct {
	Port          string
	DatabasePath  string
	SessionSecret string
	UploadsDir    string
}

func Load() Config {
	return Config{
		Port:          getEnvOrDefault("PORT", "8004"),
		DatabasePath:  getEnvOrDefault("DATABASE_PATH", "imob.db"),
		SessionSecret: getEnvOrDefault("SESSION_SECRET", ""),
		UploadsDir:    getEnvOrDefault("UPLOADS_DIR", "uploads"),
	}
}

func getEnvOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
