// posture_server.js
// -----------------
// Express server for Habit Coach posture detection.
//
// Receives a camera frame (base64 image in JSON) from Jaron's server,
// runs pose detection, returns posture result as JSON.
//
// How to run:
//   npm install
//   node posture_server.js
//
// URL: http://localhost:5000
// Main route: POST /frame
 
const express       = require('express');
const sharp         = require('sharp');
const { PoseLandmarker, FilesetResolver } = require('@mediapipe/tasks-vision');
 
const { extractLandmarks }            = require('./posture_utils');
const { pickSideLandmarks, analyzeSidePosture } = require('./side_view_posture');
 
// ── Config ────────────────────────────────────────────────────────────────────
 
const CAMERA_SIDE         = 'left';  // change to 'right' if camera is on the right
const PORT                = 5000;
const BAD_FRAME_THRESHOLD = 3;       // 3 bad frames x 2 sec = 6 sec = prolonged
 
// ── App setup ─────────────────────────────────────────────────────────────────
 
const app = express();
app.use(express.json({ limit: '10mb' }));  // images in base64 can be large
 
let landmarker          = null;
let consecutiveBadFrames = 0;
 
// Load the pose landmarker once at startup (slow to load, so only done once)
async function loadDetector() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
  );
  landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/pose_landmarker_full.task'
    },
    runningMode: 'IMAGE'
  });
  console.log('[INFO] MediaPipe Pose Landmarker loaded');
}
 
// ── Helper: convert base64 string into image data ──────────────────────────────
// This server owns decoding — Jaron's server just sends the base64 frame.
 
async function decodeImage(imageB64) {
  const buffer = Buffer.from(imageB64, 'base64');
  // Convert to raw pixel data using sharp
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const pixelData = await image.raw().toBuffer();
 
  return {
    width: metadata.width,
    height: metadata.height,
    pixelData: pixelData
  };
}
 
// ── Helper: decide posture state from issues list ─────────────────────────────
 
function issuesToState(issues) {
  if (issues.length === 0) {
    consecutiveBadFrames = 0;       // reset counter when posture is good
    return 'not_slouching';
  }
  consecutiveBadFrames++;
  if (consecutiveBadFrames >= BAD_FRAME_THRESHOLD) {
    return 'prolonged_slouching';   // bad for 6+ seconds
  }
  return 'slouching';               // bad this frame only
}
 
// ── Main route: POST /frame ───────────────────────────────────────────────────
 
app.post('/frame', async (req, res) => {
  const data = req.body;
 
  // Step 1: check the incoming JSON has what we need
  if (!data || !data.image_b64) {
    return res.status(400).json({ error: 'Missing field: image_b64' });
  }
 
  const frameId   = data.frame_id || 0;
  const timestamp = new Date().toISOString();
 
  // Step 2: convert base64 string back into a real image
  let imgData;
  try {
    imgData = await decodeImage(data.image_b64);
  } catch (e) {
    return res.status(400).json({ error: `Failed to decode image: ${e.message}` });
  }
 
  const { width, height, pixelData } = imgData;
 
  // Step 3: run pose detection on the image
  // Create an ImageData-like object that MediaPipe can consume
  // Sharp returns raw RGBA data by default
  const imageData = {
    data: new Uint8ClampedArray(pixelData),
    width: width,
    height: height
  };
 
  const results = await landmarker.detect(imageData);
 
  // Step 4: extract the landmark positions we need
  if (!results || !results.landmarks || results.landmarks.length === 0) {
    return res.status(200).json({
      frameId: frameId, timeStamp: timestamp,
      postureState: 'not_slouching', issue: [],
      neck_angle: null, trunk_lean: null, head_offset_px: null,
      view: 'side',
    });
  }
 
  const pts = extractLandmarks(results.landmarks[0], width, height);
  if (!pts) {
    return res.status(200).json({
      frameId: frameId, timeStamp: timestamp,
      postureState: 'not_slouching', issue: [],
      neck_angle: null, trunk_lean: null, head_offset_px: null,
      view: 'side',
    });
  }
 
  // Step 5: pick ear/shoulder/hip for the correct camera side, run analysis
  const sidePts             = pickSideLandmarks(pts, CAMERA_SIDE);
  const { metrics, issues } = analyzeSidePosture(sidePts);
  const postureState        = issuesToState(issues);
 
  // Step 6: send back the result
  return res.status(200).json({
    frameId:        frameId,
    timeStamp:      timestamp,
    postureState:   postureState,
    issue:          issues,
    neck_angle:     Math.round(metrics.neckAngle * 10) / 10,
    trunk_lean:     Math.round(metrics.trunkLean * 10) / 10,
    head_offset_px: Math.round(metrics.headOffsetPx),
  });
});
 
// ── Health check: GET / ───────────────────────────────────────────────────────
 
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Habit Coach — Posture Detection' });
});
 
// ── Start server ──────────────────────────────────────────────────────────────
 
loadDetector().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[INFO] Posture server running on port ${PORT}`);
    console.log(`[INFO] Camera side: ${CAMERA_SIDE}`);
    console.log(`[INFO] POST /frame — send a camera frame, get posture result`);
  });
});
