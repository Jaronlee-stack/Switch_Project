export interface PostureFrame {
  neck_angle: number;
  back_angle: number;
  head_forward_distance: number;
  detected_at: Date;
}

export interface AveragedPosture {
  neck_angle: number;
  back_angle: number;
  head_forward_distance: number;
}

export interface SOPRule {
  rule_id: number;
  rule_name: string;
  min_angle: number;
  max_angle: number;
  result: string;
  recommendation: string;
  robot_action?: string;
}

export interface AgentConfig {
  model: string;
  baseUrl: string;
  maxRetries: number;
  timeoutMs: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

export interface GeneratorOutput {
  steps: string[];
  reasoning: string;
}

export interface ReflectorOutput {
  steps: string[];
  reasoning: string;
  confidence_score: number;
}

export interface PostureAdvice {
  advice: string;
  confidence_score: number;
}

export interface FallbackAdvice {
  advice: string;
  confidence_score: number;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  format: 'json';
  stream: boolean;
  options: {
    temperature: number;
  };
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
}