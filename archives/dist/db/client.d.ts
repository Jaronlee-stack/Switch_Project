import { DatabaseConfig, PostureFrame, SOPRule } from '../types/index.js';
export declare class DatabaseClient {
    private pool;
    private config;
    constructor(config: DatabaseConfig);
    query<T>(text: string, params?: unknown[]): Promise<T[]>;
    queryOne<T>(text: string, params?: unknown[]): Promise<T | null>;
    getLatestFrames(limit?: number): Promise<PostureFrame[]>;
    getSOPRules(): Promise<SOPRule[]>;
    updateLatestAdvice(advice: string, confidence: number): Promise<void>;
    healthCheck(): Promise<boolean>;
    close(): Promise<void>;
}
//# sourceMappingURL=client.d.ts.map