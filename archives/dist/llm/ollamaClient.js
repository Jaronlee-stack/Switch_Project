"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaClient = void 0;
exports.createOllamaClient = createOllamaClient;
const axios_1 = __importDefault(require("axios"));
class OllamaClient {
    config;
    baseUrl;
    constructor(config) {
        this.config = config;
        this.baseUrl = `${config.baseUrl}/api/chat`;
    }
    async chat(messages) {
        const request = {
            model: this.config.model,
            messages,
            format: 'json',
            stream: false,
            options: {
                temperature: 0.0,
            },
        };
        let lastError = null;
        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                const response = await axios_1.default.post(this.baseUrl, request, {
                    timeout: this.config.timeoutMs,
                    headers: { 'Content-Type': 'application/json' },
                });
                if (response.data.done && response.data.message) {
                    return response.data.message;
                }
                throw new Error('Invalid Ollama response: missing done or message');
            }
            catch (error) {
                lastError = error;
                if (attempt < this.config.maxRetries) {
                    await this.sleep(1000 * (attempt + 1));
                }
            }
        }
        throw lastError ?? new Error('Ollama request failed after retries');
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    static getFallbackAdvice() {
        return {
            advice: 'Sit up straight, pull your shoulders back, and adjust your monitor to eye level. Take a 30-second stretch break.',
            confidence_score: 60,
        };
    }
}
exports.OllamaClient = OllamaClient;
function createOllamaClient(config) {
    return new OllamaClient(config);
}
//# sourceMappingURL=ollamaClient.js.map