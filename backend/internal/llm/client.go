package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"posture-backend/internal/config"
	"posture-backend/internal/models"
)

type Client struct {
	config  config.AgentConfig
	baseURL string
	client  *http.Client
}

func NewClient(cfg config.AgentConfig) *Client {
	return &Client{
		config:  cfg,
		baseURL: fmt.Sprintf("%s/api/chat", cfg.BaseURL),
		client:  &http.Client{Timeout: time.Duration(cfg.TimeoutMs) * time.Millisecond},
	}
}

func (c *Client) Chat(ctx context.Context, messages []models.OllamaMessage) (*models.OllamaMessage, error) {
	reqBody := models.OllamaChatRequest{
		Model:    c.config.Model,
		Messages: messages,
		Format:   "json",
		Stream:   false,
		Options: struct {
			Temperature float64 `json:"temperature"`
		}{Temperature: 0.0},
	}

	var lastErr error
	for attempt := 0; attempt <= c.config.MaxRetries; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(attempt) * time.Second)
		}

		msg, err := c.doRequest(ctx, reqBody)
		if err == nil {
			return msg, nil
		}
		lastErr = err
	}

	return nil, fmt.Errorf("ollama request failed after %d retries: %w", c.config.MaxRetries, lastErr)
}

func (c *Client) doRequest(ctx context.Context, reqBody models.OllamaChatRequest) (*models.OllamaMessage, error) {
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ollama returned status %d", resp.StatusCode)
	}

	var ollamaResp models.OllamaChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&ollamaResp); err != nil {
		return nil, err
	}

	if !ollamaResp.Done || ollamaResp.Message.Content == "" {
		return nil, fmt.Errorf("invalid ollama response")
	}

	return &ollamaResp.Message, nil
}
