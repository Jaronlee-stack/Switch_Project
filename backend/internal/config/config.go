package config

import (
	"log"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Database DatabaseConfig
	Agent    AgentConfig
	Server   ServerConfig
}

type DatabaseConfig struct {
	Host              string
	Port              int
	Database          string
	User              string
	Password          string
	MaxConns          int
	IdleTimeoutMillis int
	ConnTimeoutMillis int
}

type AgentConfig struct {
	Model      string
	BaseURL    string
	MaxRetries int
	TimeoutMs  int
}

type ServerConfig struct {
	Port         string
	PollInterval time.Duration
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	dbPort, _ := strconv.Atoi(getEnv("DB_PORT", "5432"))
	maxConns, _ := strconv.Atoi(getEnv("DB_MAX_CONNS", "10"))
	idleTimeout, _ := strconv.Atoi(getEnv("DB_IDLE_TIMEOUT", "30000"))
	connTimeout, _ := strconv.Atoi(getEnv("DB_CONN_TIMEOUT", "5000"))
	maxRetries, _ := strconv.Atoi(getEnv("OLLAMA_MAX_RETRIES", "2"))
	timeoutMs, _ := strconv.Atoi(getEnv("OLLAMA_TIMEOUT_MS", "5000"))
	pollInterval, _ := strconv.Atoi(getEnv("POLL_INTERVAL_MS", "5000"))

	return &Config{
		Database: DatabaseConfig{
			Host:              getEnv("DB_HOST", "localhost"),
			Port:              dbPort,
			Database:          getEnv("DB_NAME", "posture_db"),
			User:              getEnv("DB_USER", "postgres"),
			Password:          getEnv("DB_PASSWORD", "postgres"),
			MaxConns:          maxConns,
			IdleTimeoutMillis: idleTimeout,
			ConnTimeoutMillis: connTimeout,
		},
		Agent: AgentConfig{
			Model:      getEnv("OLLAMA_MODEL", "llama3.2"),
			BaseURL:    getEnv("OLLAMA_BASE_URL", "http://localhost:11434"),
			MaxRetries: maxRetries,
			TimeoutMs:  timeoutMs,
		},
		Server: ServerConfig{
			Port:         getEnv("SERVER_PORT", "8080"),
			PollInterval: time.Duration(pollInterval) * time.Millisecond,
		},
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
