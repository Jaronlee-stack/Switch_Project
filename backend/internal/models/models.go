package models

import "time"

type CameraFrameRequest struct {
	FrameID string `json:"frame_id"`
	Image   string `json:"image,omitempty"`
}

type PostureFrame struct {
	Timestamp           time.Time `json:"timestamp"`
	DetectedAt          time.Time `json:"detected_at"`
	NeckAngle           float64   `json:"neck_angle"`
	BackAngle           float64   `json:"back_angle"`
	HeadForwardDistance float64   `json:"head_forward_distance"`
	PostureResult       string    `json:"posture_result"`
}

type AveragedPosture struct {
	NeckAngle           float64
	BackAngle           float64
	HeadForwardDistance float64
}

type SOPRule struct {
	RuleName       string
	MinAngle       float64
	MaxAngle       float64
	Result         string
	Recommendation string
}

type PostureAdvice struct {
	Advice          string  `json:"advice"`
	ConfidenceScore float64 `json:"confidence_score"`
}

type OllamaMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OllamaChatRequest struct {
	Model    string           `json:"model"`
	Messages []OllamaMessage  `json:"messages"`
	Format   string           `json:"format,omitempty"`
	Stream   bool             `json:"stream"`
	Options  struct {
		Temperature float64 `json:"temperature"`
	} `json:"options,omitempty"`
}

type OllamaChatResponse struct {
	Message OllamaMessage `json:"message"`
	Done    bool          `json:"done"`
}

type GeneratorOutput struct {
	Steps     []string `json:"steps"`
	Reasoning string   `json:"reasoning"`
}

type ReflectorOutput struct {
	Steps             []string `json:"steps"`
	Reasoning         string   `json:"reasoning"`
	ConfidenceScore   int      `json:"confidence_score"`
}