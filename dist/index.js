"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PostureAgent_js_1 = require("./agent/PostureAgent.js");
const ollamaClient_js_1 = require("./llm/ollamaClient.js");
const client_js_1 = require("./db/client.js");
function loadConfig() {
    return {
        agent: {
            model: process.env.OLLAMA_MODEL ?? 'llama3.2',
            baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
            maxRetries: 2,
            timeoutMs: 5000,
        },
        db: {
            host: process.env.DB_HOST ?? 'localhost',
            port: parseInt(process.env.DB_PORT ?? '5432', 10),
            database: process.env.DB_NAME ?? 'posture_db',
            user: process.env.DB_USER ?? 'postgres',
            password: process.env.DB_PASSWORD ?? 'postgres',
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        },
        pollInterval: parseInt(process.env.POLL_INTERVAL ?? '5000', 10),
    };
}
async function main() {
    console.log('Starting Posture Correction AI Module...');
    const config = loadConfig();
    console.log('Configuration:', {
        model: config.agent.model,
        ollamaUrl: config.agent.baseUrl,
        pollInterval: config.pollInterval,
        dbHost: config.db.host,
        dbName: config.db.database,
    });
    const dbClient = new client_js_1.DatabaseClient(config.db);
    const ollamaClient = new ollamaClient_js_1.OllamaClient(config.agent);
    const agent = new PostureAgent_js_1.PostureAgent(ollamaClient, dbClient, config.agent);
    try {
        await agent.initialize();
        console.log('PostureAgent initialized, SOP rules loaded');
    }
    catch (error) {
        console.error('Failed to initialize agent:', error);
        process.exit(1);
    }
    let isShuttingDown = false;
    const shutdown = async () => {
        if (isShuttingDown)
            return;
        isShuttingDown = true;
        console.log('\nShutting down...');
        await dbClient.close();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    console.log(`Starting poll loop (every ${config.pollInterval}ms)...`);
    while (!isShuttingDown) {
        const startTime = Date.now();
        try {
            await agent.pollAndProcess();
        }
        catch (error) {
            console.error('Poll cycle error:', error);
        }
        const elapsed = Date.now() - startTime;
        const waitTime = Math.max(0, config.pollInterval - elapsed);
        if (waitTime > 0) {
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
    }
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map