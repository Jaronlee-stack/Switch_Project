package models

type SOPRule struct {
	RuleName       string  `json:"rule_name"`
	MinAngle       float64 `json:"min_angle"`
	MaxAngle       float64 `json:"max_angle"`
	Result         string  `json:"result"`
	Recommendation string  `json:"recommendation"`
	RobotAction    string  `json:"robot_action"`
}

type PostureFrame struct {
	NeckAngle           float64 `json:"neck_angle"`
	BackAngle           float64 `json:"back_angle"`
	HeadForwardDistance float64 `json:"head_forward_distance"`
}

type AveragedPosture struct {
	NeckAngle           float64 `json:"neck_angle"`
	BackAngle           float64 `json:"back_angle"`
	HeadForwardDistance float64 `json:"head_forward_distance"`
}

type PostureAdvice struct {
	Advice            string  `json:"advice"`
	ConfidenceScore   float64 `json:"confidence_score"`
}

type GeneratorOutput struct {
	Steps     []string `json:"steps"`
	Reasoning string   `json:"reasoning"`
}

type ReflectorOutput struct {
	Steps           []string `json:"steps"`
	Reasoning       string   `json:"reasoning"`
	ConfidenceScore int      `json:"confidence_score"`
}

type OllamaMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OllamaChatRequest struct {
	Model    string          `json:"model"`
	Messages []OllamaMessage `json:"messages"`
	Stream   bool            `json:"stream"`
}

type OllamaChatResponse struct {
	Message OllamaMessage `json:"message"`
}