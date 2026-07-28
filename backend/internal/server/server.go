package server

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"posture-backend/internal/agent"
	"posture-backend/internal/db"
	"posture-backend/internal/models"
)

type Server struct {
	db    *db.Client
	agent *agent.PostureAgent
	mux   *http.ServeMux
}

func New(dbClient *db.Client, postureAgent *agent.PostureAgent) *Server {
	s := &Server{
		db:    dbClient,
		agent: postureAgent,
		mux:   http.NewServeMux(),
	}
	s.routes()
	return s
}

func (s *Server) routes() {
	s.mux.HandleFunc("/api/health", s.handleHealth)
	s.mux.HandleFunc("/api/frame", s.handleFrame)
	s.mux.HandleFunc("/api/posture/latest", s.handleLatestPosture)
	s.mux.HandleFunc("/api/advice", s.handleAdvice)
	s.mux.HandleFunc("/api/posture/history", s.handleHistory)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (s *Server) handleFrame(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.CameraFrameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Placeholder detection — replace with real angles from MediaPipe
	frame := models.PostureFrame{
		Timestamp:           time.Now(),
		NeckAngle:           90,
		BackAngle:           90,
		HeadForwardDistance: 5,
		PostureResult:       "Good",
		DetectedAt:          time.Now(),
	}

	const defaultUserID = "550e8400-e29b-41d4-a716-446655440000"
	ctx := r.Context()
	if err := s.db.InsertDetection(ctx, defaultUserID, frame); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   "received",
		"frame_id": req.FrameID,
	})
}

func (s *Server) handleLatestPosture(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	frames, err := s.db.GetLatestFrames(r.Context(), 1)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if len(frames) == 0 {
		json.NewEncoder(w).Encode(map[string]interface{}{"data": nil})
		return
	}
	json.NewEncoder(w).Encode(map[string]interface{}{"data": frames[0]})
}

func (s *Server) handleAdvice(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	advice, err := s.db.GetLatestAdvice(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": advice})
}

func (s *Server) handleHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	limit := 50
	frames, err := s.db.GetLatestFrames(r.Context(), limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": frames})
}

func (s *Server) StartPoller(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for {
			select {
			case <-ticker.C:
				if err := s.agent.PollAndProcess(ctx); err != nil {
					log.Printf("Poll error: %v", err)
				}
			case <-ctx.Done():
				ticker.Stop()
				return
			}
		}
	}()
}

func (s *Server) Handler() http.Handler {
	return s.mux
}
