package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"

	"posture-backend/internal/config"
	"posture-backend/internal/db"
	"posture-backend/internal/llm"
	"posture-backend/internal/models"
)

const systemPrompt = `You are a posture correction expert. Your task is to analyze posture data and provide a 3-step corrective action plan.

RULES:
- Output ONLY valid JSON with exactly these fields: "steps" (string array of 3 steps), "reasoning" (string), "confidence_score" (number 0-100)
- Steps must be practical, safe, and specific to the posture data
- Confidence score reflects how certain you are the advice is correct
- Be concise - each step under 15 words

Example output:
{
  "steps": [
    "Pull shoulders back and down",
    "Tuck chin slightly toward chest",
    "Raise monitor to eye level"
  ],
  "reasoning": "User has forward head posture (neck angle 45°) and rounded shoulders (back angle 30°). Monitor is too low causing neck strain.",
  "confidence_score": 85
}`

const reflectorPrompt = `You are a safety reviewer for posture advice. Review the generator's draft and improve it.

CRITIQUE CRITERIA:
1. Safety: Are steps physically safe? No harmful stretches.
2. Practicality: Can user do this at a desk?
3. Specificity: Does it address the exact posture angles?
4. Completeness: All 3 steps present and clear?

Output ONLY valid JSON with same format: "steps", "reasoning", "confidence_score".
If draft is good, keep it. If flawed, fix and explain in reasoning.`

type PostureAgent struct {
	llmClient *llm.Client
	dbClient  *db.Client
	sopCache  []models.SOPRule
	config    config.AgentConfig
}

func NewPostureAgent(llmClient *llm.Client, dbClient *db.Client, cfg config.AgentConfig) *PostureAgent {
	return &PostureAgent{
		llmClient: llmClient,
		dbClient:  dbClient,
		config:    cfg,
	}
}

func (a *PostureAgent) Initialize(ctx context.Context) error {
	rules, err := a.dbClient.GetSOPRules(ctx)
	if err != nil {
		return fmt.Errorf("load SOP rules: %w", err)
	}
	a.sopCache = rules

	// Warm-up cache with dummy call
	dummy := models.AveragedPosture{NeckAngle: 90, BackAngle: 90, HeadForwardDistance: 5}
	_ = a.warmUpCache(ctx, dummy)
	return nil
}

func (a *PostureAgent) warmUpCache(ctx context.Context, posture models.AveragedPosture) error {
	prompt := a.buildUserPrompt(posture)
	_, err := a.llmClient.Chat(ctx, []models.OllamaMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: prompt},
	})
	if err != nil {
		// Log but don't fail
	}
	return nil
}

func (a *PostureAgent) Generate(ctx context.Context, posture models.AveragedPosture) (models.PostureAdvice, error) {
	genOut, err := a.callGenerator(ctx, posture)
	if err != nil {
		return llm.GetFallbackAdvice(), fmt.Errorf("generator failed: %w", err)
	}

	refOut, err := a.callReflector(ctx, posture, genOut)
	if err != nil {
		return llm.GetFallbackAdvice(), fmt.Errorf("reflector failed: %w", err)
	}

	return models.PostureAdvice{
		Advice:          strings.Join(refOut.Steps, " | "),
		ConfidenceScore: float64(refOut.ConfidenceScore),
	}, nil
}

func (a *PostureAgent) callGenerator(ctx context.Context, posture models.AveragedPosture) (models.GeneratorOutput, error) {
	prompt := a.buildUserPrompt(posture)
	messages := []models.OllamaMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: prompt},
	}

	resp, err := a.llmClient.Chat(ctx, messages)
	if err != nil {
		return models.GeneratorOutput{}, err
	}

	return parseGeneratorResponse(resp.Content)
}

func (a *PostureAgent) callReflector(ctx context.Context, posture models.AveragedPosture, gen models.GeneratorOutput) (models.ReflectorOutput, error) {
	prompt := fmt.Sprintf(`%s

POSTURE DATA:
%s

SOP RULES:
%s

GENERATOR DRAFT:
Steps: %s
Reasoning: %s

Provide improved final version.`,
		reflectorPrompt,
		formatPosture(posture),
		formatSOPRules(a.sopCache),
		strings.Join(gen.Steps, " | "),
		gen.Reasoning,
	)

	messages := []models.OllamaMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: prompt},
	}

	resp, err := a.llmClient.Chat(ctx, messages)
	if err != nil {
		return models.ReflectorOutput{}, err
	}

	return parseReflectorResponse(resp.Content)
}

func (a *PostureAgent) buildUserPrompt(posture models.AveragedPosture) string {
	return fmt.Sprintf(`POSTURE DATA:
%s

SOP RULES:
%s

Generate a 3-step corrective action plan.`,
		formatPosture(posture),
		formatSOPRules(a.sopCache),
	)
}

func formatPosture(p models.AveragedPosture) string {
	return fmt.Sprintf(
		"Neck Angle: %.2f°\nBack Angle: %.2f°\nHead Forward Distance: %.2fcm",
		p.NeckAngle,
		p.BackAngle,
		p.HeadForwardDistance,
	)
}

func formatSOPRules(rules []models.SOPRule) string {
	if len(rules) == 0 {
		return "No SOP rules available."
	}

	var b strings.Builder

	for _, r := range rules {
		fmt.Fprintf(
			&b,
			"%s: %.0f°-%.0f° -> %s (%s)\n",
			r.RuleName,
			r.MinAngle,
			r.MaxAngle,
			r.Result,
			r.Recommendation,
		)
	}

	return b.String()
}

func parseGeneratorResponse(content string) (models.GeneratorOutput, error) {
	var out models.ReflectorOutput // same fields subset
	if err := json.Unmarshal([]byte(content), &out); err != nil {
		return models.GeneratorOutput{}, err
	}
	if len(out.Steps) > 3 {
		out.Steps = out.Steps[:3]
	}
	return models.GeneratorOutput{Steps: out.Steps, Reasoning: out.Reasoning}, nil
}

func parseReflectorResponse(content string) (models.ReflectorOutput, error) {
	var out models.ReflectorOutput
	if err := json.Unmarshal([]byte(content), &out); err != nil {
		return models.ReflectorOutput{}, err
	}
	if len(out.Steps) > 3 {
		out.Steps = out.Steps[:3]
	}
	out.ConfidenceScore = int(math.Max(0, math.Min(100, float64(out.ConfidenceScore))))
	return out, nil
}

func (a *PostureAgent) PollAndProcess(ctx context.Context) error {
	frames, err := a.dbClient.GetLatestFrames(ctx, 5)
	if err != nil {
		return fmt.Errorf("get frames: %w", err)
	}
	if len(frames) == 0 {
		return nil
	}

	averaged := averageFrames(frames)
	advice, err := a.Generate(ctx, averaged)
	if err != nil {
		return fmt.Errorf("generate advice: %w", err)
	}

	if err := a.dbClient.UpdateLatestAdvice(ctx, advice.Advice, advice.ConfidenceScore); err != nil {
		return fmt.Errorf("update advice: %w", err)
	}
	return nil
}

func averageFrames(frames []models.PostureFrame) models.AveragedPosture {
	if len(frames) == 0 {
		return models.AveragedPosture{}
	}
	var sumNeck, sumBack, sumHead float64
	for _, f := range frames {
		sumNeck += f.NeckAngle
		sumBack += f.BackAngle
		sumHead += f.HeadForwardDistance
	}
	n := float64(len(frames))
	return models.AveragedPosture{
		NeckAngle:           math.Round((sumNeck/n)*100) / 100,
		BackAngle:           math.Round((sumBack/n)*100) / 100,
		HeadForwardDistance: math.Round((sumHead/n)*100) / 100,
	}
}
