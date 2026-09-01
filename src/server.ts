// HTTP endpoint layer for the Node posture-correction backend.
//
// This gives the Node service (originally a DB-polling-only worker per
// Architecture.md) the same HTTP surface as the Go backend
// (backend/internal/server/server.go), using the field names already
// confirmed consistent across camera_frame.json, posture_result.json,
// backend/internal/models/models.go, and src/types/index.ts:
//   frame_id, timestamp, image_b64, user_id, neck_angle, back_angle,
//   head_forward_distance, posture_result, advice, confidence_score.
//
// No new npm dependency is introduced -- this uses Node's built-in `http`
// module, mirroring how the Go side uses net/http directly without a
// framework. See QA.md for a field-by-field comparison against the real
// Go source, including two pre-existing Go-side bugs found while writing
// this file.

import { createServer as createHttpServer, IncomingMessage, ServerResponse, Server } from 'http';
import { DatabaseClient } from './db/client.js';

export interface CreateServerOptions {
    /** user_id to attribute an incoming /api/frame post to when the request
     *  doesn't supply one. Defaults to the same placeholder id the Go
     *  backend's handleFrame uses today. */
  defaultUserId?: string;
}

const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5MB, generous for a base64 JPEG frame

function readJsonBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
          let size = 0;
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => {
                  size += chunk.length;
                  if (size > MAX_BODY_BYTES) {
                            reject(new Error('payload too large'));
                            req.destroy();
                            return;
                  }
                  chunks.push(chunk);
          });
          req.on('end', () => {
                  if (chunks.length === 0) {
                            resolve({});
                            return;
                  }
                  try {
                            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
                  } catch (err) {
                            reject(err);
                  }
          });
          req.on('error', reject);
    });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
    });
    res.end(payload);
}

// Placeholder detection values used until real MediaPipe pose extraction is
// wired into this service -- this mirrors the Go backend's handleFrame,
// which uses the same fixed placeholder today (see server.go: "Placeholder
// detection — replace with real angles from MediaPipe"). Tracked as a known
// limitation in QA.md, not something this endpoint silently invents a fix for.
const PLACEHOLDER_DETECTION = {
    neck_angle: 90,
    back_angle: 90,
    head_forward_distance: 5,
    posture_result: 'Good',
};

const DEFAULT_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

export function createServer(dbClient: DatabaseClient, options: CreateServerOptions = {}): Server {
    const defaultUserId = options.defaultUserId ?? DEFAULT_USER_ID;

  return createHttpServer(async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const path = url.pathname;

                              try {
                                      if (path === '/api/health' && req.method === 'GET') {
                                                sendJson(res, 200, { status: 'ok' });
                                                return;
                                      }

          if (path === '/api/frame') {
                    if (req.method !== 'POST') {
                                sendJson(res, 405, { error: 'method not allowed' });
                                return;
                    }

                                        let body: any;
                    try {
                                body = await readJsonBody(req);
                    } catch {
                                sendJson(res, 400, { error: 'invalid JSON body' });
                                return;
                    }

                                        if (typeof body.frame_id === 'undefined') {
                                                    sendJson(res, 400, { error: '"frame_id" is required' });
                                                    return;
                                        }

                                        const detectionId = await dbClient.insertDetection({
                                                    user_id: body.user_id ?? defaultUserId,
                                                    ...PLACEHOLDER_DETECTION,
                                                    detected_at: new Date(),
                                        });

                                        sendJson(res, 200, {
                                                    status: 'received',
                                                    frame_id: body.frame_id,
                                                    detection_id: detectionId,
                                        });
                    return;
          }

          if (path === '/api/posture/latest') {
                    if (req.method !== 'GET') {
                                sendJson(res, 405, { error: 'method not allowed' });
                                return;
                    }
                    const frames = await dbClient.getLatestFrames(1);
                    sendJson(res, 200, { data: frames[0] ?? null });
                    return;
          }

          if (path === '/api/advice') {
                    if (req.method !== 'GET') {
                                sendJson(res, 405, { error: 'method not allowed' });
                                return;
                    }
                    const advice = await dbClient.getLatestAdvice();
                    sendJson(res, 200, { data: advice });
                    return;
          }

          if (path === '/api/posture/history') {
                    if (req.method !== 'GET') {
                                sendJson(res, 405, { error: 'method not allowed' });
                                return;
                    }
                    const limitParam = Number(url.searchParams.get('limit'));
                    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50;
                    const frames = await dbClient.getLatestFrames(limit);
                    sendJson(res, 200, { data: frames });
                    return;
          }

          sendJson(res, 404, { error: 'not found' });
                              } catch (err) {
                                      console.error('Request handler error:', err);
                                      sendJson(res, 500, { error: 'internal server error' });
                              }
  });
}
