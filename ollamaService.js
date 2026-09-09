import {
    getDetectionsWithoutRecommendations,
    insertRecommendation
} from "../models/postureModel.js";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";
const POLL_INTERVAL_MS = Number(process.env.OLLAMA_POLL_MS || 5000);

let running = false;

async function generateAdvice(detection) {
    const prompt =
        `You are a posture coach. A user was detected with status "${detection.posture_status}" ` +
        `(issue: ${detection.issue || "none"}). Measured angles: neck ${detection.neck_angle}°, ` +
        `trunk lean ${detection.trunk_lean}°, head offset ${detection.head_offset_px}px. ` +
        `Give one short, actionable correction tip (max 2 sentences).`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            prompt,
            stream: false,
            options: { temperature: 0.4 }
        })
    });

    if (!response.ok) throw new Error(`Ollama responded ${response.status}`);
    const data = await response.json();
    return data.response?.trim() || null;
}

async function processPending() {
    if (running) return;          // skip a tick if the previous one is slow
    running = true;
    try {
        const pending = await getDetectionsWithoutRecommendations(3);
        for (const detection of pending) {
            try {
                const advice = await generateAdvice(detection);
                if (advice) {
                    await insertRecommendation({
                        detection_id: detection.detection_id,
                        recommendation_text: advice,
                        model_used: OLLAMA_MODEL
                    });
                }
            } catch (err) {
                console.error("Ollama generation failed:", err.message);
            }
        }
    } catch (err) {
        console.error("Ollama poller error:", err.message);
    } finally {
        running = false;
    }
}

/**
 * Call once at server startup. Set ENABLE_OLLAMA=true to activate.
 */
export function startOllamaPoller() {
    if (process.env.ENABLE_OLLAMA !== "true") {
        console.log("Ollama service disabled (set ENABLE_OLLAMA=true to enable)");
        return;
    }
    console.log(`Ollama poller started (${OLLAMA_MODEL} @ ${OLLAMA_URL}, every ${POLL_INTERVAL_MS}ms)`);
    setInterval(processPending, POLL_INTERVAL_MS);
}