package config

import "os"

type Config struct {
	Port         string
	DatabasePath string
}

func Load() Config {
	return Config{
		Port:         getEnvOrDefault("PORT", "8004"),
		DatabasePath: getEnvOrDefault("DATABASE_PATH", "imob.db"),
	}
}

func getEnvOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
