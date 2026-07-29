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
	log.Printf("Config: model=%s ollama=%s db=%s", cfg.Agent.Model, cfg.Agent.BaseURL, cfg.Database.Host)

	dbClient, err := db.NewClient(cfg.Database)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	defer dbClient.Close()

	llmClient := llm.NewClient(cfg.Agent)
	postureAgent := agent.NewPostureAgent(llmClient, dbClient, cfg.Agent)

	ctx := context.Background()
	if err := postureAgent.Initialize(ctx); err != nil {
		log.Fatalf("Agent initialization failed: %v", err)
	}
	log.Println("Agent initialized, SOP rules loaded")

	srv := server.New(dbClient, postureAgent)

	// Start background poller
	srv.StartPoller(ctx, cfg.Server.PollInterval)
	log.Printf("Poller started (interval=%s)", cfg.Server.PollInterval)

	// Start HTTP server
	addr := ":" + cfg.Server.Port
	httpServer := &http.Server{
		Addr:         addr,
		Handler:      srv.Handler(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("HTTP server listening on %s", addr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	<-done
	log.Println("Shutting down...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("HTTP shutdown error: %v", err)
	}
	log.Println("Server stopped")
}
