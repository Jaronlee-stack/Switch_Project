package models

type PostureAdvice struct {
    Advice          string `json:"advice"`
    ConfidenceScore int    `json:"confidence_score"`
}