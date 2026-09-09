import {
    getDetectionsWithoutRecommendations,
    insertRecommendation
} from "../models/postureModel.js";

/**
 * Ollama background poller.
 *
 * It is started explicitly by app.js and is disabled unless
 * ENABLE_OLLAMA=true is set.
 */

let running = false;

function getOllamaUrl() {
    return (
        process.env.OLLAMA_URL ||
        process.env.OLLAMA_BASE_URL ||
        "http://localhost:11434"
    );
}

function getOllamaModel() {
    return process.env.OLLAMA_MODEL || "llama3.2";
}

function getPollIntervalMs() {
    return Number(process.env.POLL_INTERVAL_MS || 5000);
}

async function generateAdvice(detection) {
    const ollamaUrl = getOllamaUrl();
    const ollamaModel = getOllamaModel();

    const prompt =
        `You are a posture coach. A user was detected with status "${detection.posture_status}" ` +
        `(issue: ${detection.issue || "none"}). Measured angles: neck ${detection.neck_angle}°, ` +
        `trunk lean ${detection.trunk_lean}°, head offset ${detection.head_offset_px}px. ` +
        `Give one short, actionable correction tip (max 2 sentences).`;

    const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: ollamaModel,
            prompt,
            stream: false,
            options: {
                temperature: 0.4
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Ollama responded ${response.status}`);
    }

    const data = await response.json();

    return data.response?.trim() || null;
}

async function processPending() {
    if (running) return;

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
                        model_used: getOllamaModel()
                    });
                }
            } catch (err) {
                console.error(
                    "Ollama generation failed:",
                    err.message
                );
            }
        }
    } catch (err) {
        console.error(
            "Ollama poller error:",
            err.message
        );
    } finally {
        running = false;
    }
}

/**
 * Start the Ollama background poller.
 *
 * Ollama will only run when:
 *
 * ENABLE_OLLAMA=true
 */
export function startOllamaPoller() {
    if (process.env.ENABLE_OLLAMA !== "true") {
        console.log(
            "Ollama service disabled (set ENABLE_OLLAMA=true to enable)"
        );
        return;
    }

    const ollamaUrl = getOllamaUrl();
    const ollamaModel = getOllamaModel();
    const pollIntervalMs = getPollIntervalMs();

    console.log(
        `Ollama poller started (${ollamaModel} @ ${ollamaUrl}, ` +
        `every ${pollIntervalMs}ms)`
    );

    // Run immediately.
    processPending();

    // Then continue polling.
    setInterval(processPending, pollIntervalMs);
}