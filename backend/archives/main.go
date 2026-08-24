package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/lib/pq"

	"posture-backend/internal/agent"
	"posture-backend/internal/config"
	"posture-backend/internal/db"
	"posture-backend/internal/llm"
	"posture-backend/internal/server"
)

func main() {
	cfg := config.Load()

	log.Println("Starting Posture Correction Backend...")
	log.Printf(
		"Config: model=%s ollama=%s db=%s",
		cfg.Agent.Model,
		cfg.Agent.BaseURL,
		cfg.Database.Host,
	)

	// Connect to PostgreSQL
	dbClient, err := db.New(
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.Database,   // ✅
	)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	defer dbClient.Close()

	// Create Ollama client
	llmClient := llm.NewClient(cfg.Agent)

	// Create posture agent
	postureAgent := agent.NewPostureAgent(
		llmClient,
		dbClient,
		cfg.Agent,
	)

	ctx := context.Background()

	// Load SOP rules
	if err := postureAgent.Initialize(ctx); err != nil {
		log.Fatalf("Agent initialization failed: %v", err)
	}

	log.Println("Agent initialized successfully")

	// HTTP server
	srv := server.New(dbClient, postureAgent)

	// Background poller
	srv.StartPoller(ctx, cfg.Server.PollInterval)

	httpServer := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      srv.Handler(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("Server listening on :%s", cfg.Server.Port)

		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	<-stop

	log.Println("Shutting down...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("Shutdown error: %v", err)
	}

	log.Println("Server stopped")
}