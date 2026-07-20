// posture_utils.js
// ----------------
// Shared helpers for posture detection.
// Used by side_view_posture.js and posture_server.js.

// ── Landmark indices (same numbering as MediaPipe Python) ─────────────────────
const LM = {
  left_ear:       7,
  right_ear:      8,
  left_shoulder:  11,
  right_shoulder: 12,
  left_hip:       23,
  right_hip:      24,
};

// ── Thresholds ────────────────────────────────────────────────────────────────
const THRESHOLDS = {
  neck_angle_bad: 150,  // below this = head too far forward / hunching
  trunk_lean_bad: 10,   // above this = whole torso leaning forward
};

// ── Geometry helpers ──────────────────────────────────────────────────────────

// Returns the angle (degrees) at point B between lines B->A and B->C
function angleBetweenPoints(a, b, c) {
  const ax = a[0] - b[0], ay = a[1] - b[1];
  const cx = c[0] - b[0], cy = c[1] - b[1];
  const dot    = ax * cx + ay * cy;
  const magA   = Math.hypot(ax, ay);
  const magC   = Math.hypot(cx, cy);
  if (magA === 0 || magC === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magC)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

// Returns how many degrees the line A->B tilts away from vertical
function angleFromVertical(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return (Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI;
}

// ── Landmark extraction ───────────────────────────────────────────────────────

// MediaPipe returns normalized coordinates [0, 1], so denormalize using frame dimensions
function extractLandmarks(keypoints, frameWidth, frameHeight) {
  if (!keypoints || keypoints.length === 0) return null;
  const pts = {};
  for (const [name, idx] of Object.entries(LM)) {
    const kp = keypoints[idx];
    if (!kp) return null;
    const x = Math.round(kp.x * frameWidth);
    const y = Math.round(kp.y * frameHeight);
    pts[name] = [x, y];
  }
  return pts;
}

module.exports = { LM, THRESHOLDS, angleBetweenPoints, angleFromVertical, extractLandmarks };
