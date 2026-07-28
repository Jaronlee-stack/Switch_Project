"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostureAgent = void 0;
const ollamaClient_js_1 = require("../llm/ollamaClient.js");
const SYSTEM_PROMPT = `You are a posture correction expert. Your task is to analyze posture data and provide a 3-step corrective action plan.

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
}`;
const REFLECTOR_PROMPT = `You are a safety reviewer for posture advice. Review the generator's draft and improve it.

CRITIQUE CRITERIA:
1. Safety: Are steps physically safe? No harmful stretches.
2. Practicality: Can user do this at a desk?
3. Specificity: Does it address the exact posture angles?
4. Completeness: All 3 steps present and clear?

Output ONLY valid JSON with same format: "steps", "reasoning", "confidence_score".
If draft is good, keep it. If flawed, fix and explain in reasoning.`;
class PostureAgent {
    ollamaClient;
    dbClient;
    sopCache = [];
    config;
    constructor(ollamaClient, dbClient, config) {
        this.ollamaClient = ollamaClient;
        this.dbClient = dbClient;
        this.config = config;
    }
    async initialize() {
        this.sopCache = await this.dbClient.getSOPRules();
        await this.warmUpCache();
    }
    async warmUpCache() {
        const dummyPosture = { neck_angle: 90, back_angle: 90, head_forward_distance: 5 };
        const dummyPrompt = this.buildUserPrompt(dummyPosture);
        try {
            await this.ollamaClient.chat([
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: dummyPrompt },
            ]);
        }
        catch {
            console.warn('Ollama cache warmup failed, continuing anyway');
        }
    }
    async generate(posture) {
        try {
            const generatorOutput = await this.callGenerator(posture);
            const reflectorOutput = await this.callReflector(posture, generatorOutput);
            return {
                advice: reflectorOutput.steps.join(' | '),
                confidence_score: reflectorOutput.confidence_score,
            };
        }
        catch (error) {
            console.error('LLM generation failed, using fallback:', error);
            return this.getFallbackAdvice();
        }
    }
    async callGenerator(posture) {
        const userPrompt = this.buildUserPrompt(posture);
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
        ];
        const response = await this.ollamaClient.chat(messages);
        return this.parseGeneratorResponse(response.content);
    }
    async callReflector(posture, generatorOutput) {
        const reflectorPrompt = `${REFLECTOR_PROMPT}

POSTURE DATA:
${this.formatPostureForPrompt(posture)}

SOP RULES:
${this.formatSOPRules(this.sopCache)}

GENERATOR DRAFT:
Steps: ${generatorOutput.steps.join(' | ')}
Reasoning: ${generatorOutput.reasoning}

Provide improved final version.`;
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: reflectorPrompt },
        ];
        const response = await this.ollamaClient.chat(messages);
        return this.parseReflectorResponse(response.content);
    }
    buildUserPrompt(posture) {
        return `POSTURE DATA:
${this.formatPostureForPrompt(posture)}

SOP RULES:
${this.formatSOPRules(this.sopCache)}

Generate a 3-step corrective action plan.`;
    }
    formatPostureForPrompt(posture) {
        return `Neck Angle: ${posture.neck_angle}°
Back Angle: ${posture.back_angle}°
Head Forward Distance: ${posture.head_forward_distance}cm`;
    }
    formatSOPRules(rules) {
        if (rules.length === 0)
            return 'No SOP rules available.';
        return rules
            .map((r) => `${r.rule_name}: ${r.min_angle}°-${r.max_angle}° → ${r.result} (${r.recommendation})`)
            .join('\n');
    }
    parseGeneratorResponse(content) {
        try {
            const parsed = JSON.parse(content);
            return {
                steps: Array.isArray(parsed.steps) ? parsed.steps.slice(0, 3) : [],
                reasoning: parsed.reasoning ?? '',
            };
        }
        catch {
            throw new Error('Invalid JSON from Generator');
        }
    }
    parseReflectorResponse(content) {
        try {
            const parsed = JSON.parse(content);
            return {
                steps: Array.isArray(parsed.steps) ? parsed.steps.slice(0, 3) : [],
                reasoning: parsed.reasoning ?? '',
                confidence_score: Math.max(0, Math.min(100, Math.round(parsed.confidence_score ?? 0))),
            };
        }
        catch {
            throw new Error('Invalid JSON from Reflector');
        }
    }
    getFallbackAdvice() {
        const fallback = ollamaClient_js_1.OllamaClient.getFallbackAdvice();
        return {
            advice: fallback.advice,
            confidence_score: fallback.confidence_score,
        };
    }
    async pollAndProcess() {
        try {
            const frames = await this.dbClient.getLatestFrames(5);
            if (frames.length === 0) {
                console.log('No posture frames found, skipping cycle');
                return;
            }
            const averaged = this.averageFrames(frames);
            const advice = await this.generate(averaged);
            await this.dbClient.updateLatestAdvice(advice.advice, advice.confidence_score);
            console.log(`Advice written: ${advice.advice} (${advice.confidence_score}%)`);
        }
        catch (error) {
            console.error('Poll cycle error:', error);
        }
    }
    averageFrames(frames) {
        if (frames.length === 0) {
            return { neck_angle: 0, back_angle: 0, head_forward_distance: 0 };
        }
        const sum = frames.reduce((acc, f) => ({
            neck_angle: acc.neck_angle + f.neck_angle,
            back_angle: acc.back_angle + f.back_angle,
            head_forward_distance: acc.head_forward_distance + f.head_forward_distance,
        }), { neck_angle: 0, back_angle: 0, head_forward_distance: 0 });
        return {
            neck_angle: Math.round((sum.neck_angle / frames.length) * 100) / 100,
            back_angle: Math.round((sum.back_angle / frames.length) * 100) / 100,
            head_forward_distance: Math.round((sum.head_forward_distance / frames.length) * 100) / 100,
        };
    }
}
exports.PostureAgent = PostureAgent;
//# sourceMappingURL=PostureAgent.js.map