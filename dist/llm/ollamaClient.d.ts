import { AgentConfig, OllamaMessage, FallbackAdvice } from '../types/index.js';
export declare class OllamaClient {
    private config;
    private baseUrl;
    constructor(config: AgentConfig);
    chat(messages: OllamaMessage[]): Promise<OllamaMessage>;
    private sleep;
    static getFallbackAdvice(): FallbackAdvice;
}
export declare function createOllamaClient(config: AgentConfig): OllamaClient;
//# sourceMappingURL=ollamaClient.d.ts.map