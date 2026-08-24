package llm

import "posture-backend/internal/models"

func GetFallbackAdvice() models.PostureAdvice {
	return models.PostureAdvice{
		Advice:          "Sit up straight, pull your shoulders back, and adjust your monitor to eye level. Take a 30-second stretch break.",
		ConfidenceScore: 60,
	}
}
