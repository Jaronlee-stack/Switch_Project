import { OllamaClient } from '../llm/ollamaClient.js';
import { DatabaseClient } from '../db/client.js';
import { AveragedPosture, PostureAdvice, AgentConfig } from '../types/index.js';
export declare class PostureAgent {
    private ollamaClient;
    private dbClient;
    private sopCache;
    private config;
    constructor(ollamaClient: OllamaClient, dbClient: DatabaseClient, config: AgentConfig);
    initialize(): Promise<void>;
    private warmUpCache;
    generate(posture: AveragedPosture): Promise<PostureAdvice>;
    private callGenerator;
    private callReflector;
    private buildUserPrompt;
    private formatPostureForPrompt;
    private formatSOPRules;
    private parseGeneratorResponse;
    private parseReflectorResponse;
    private getFallbackAdvice;
    pollAndProcess(): Promise<void>;
    private averageFrames;
}
//# sourceMappingURL=PostureAgent.d.ts.map