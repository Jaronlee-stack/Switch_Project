import axios from 'axios';
import { AgentConfig, OllamaChatRequest, OllamaChatResponse, OllamaMessage, FallbackAdvice } from '../types/index.js';

export class OllamaClient {
  private config: AgentConfig;
  private baseUrl: string;

  constructor(config: AgentConfig) {
    this.config = config;
    this.baseUrl = `${config.baseUrl}/api/chat`;
  }

  async chat(messages: OllamaMessage[]): Promise<OllamaMessage> {
    const request: OllamaChatRequest = {
      model: this.config.model,
      messages,
      format: 'json',
      stream: false,
      options: {
        temperature: 0.0,
      },
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await axios.post<OllamaChatResponse>(this.baseUrl, request, {
          timeout: this.config.timeoutMs,
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.data.done && response.data.message) {
          return response.data.message;
        }

        throw new Error('Invalid Ollama response: missing done or message');
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.config.maxRetries) {
          await this.sleep(1000 * (attempt + 1));
        }
      }
    }

    throw lastError ?? new Error('Ollama request failed after retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static getFallbackAdvice(): FallbackAdvice {
    return {
      advice: 'Sit up straight, pull your shoulders back, and adjust your monitor to eye level. Take a 30-second stretch break.',
      confidence_score: 60,
    };
  }
}

export function createOllamaClient(config: AgentConfig): OllamaClient {
  return new OllamaClient(config);
}