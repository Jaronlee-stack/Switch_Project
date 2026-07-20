// side_view_posture.js
// --------------------
// Posture logic for side view camera.
// Detects: neck angle (head forward) and trunk lean (body leaning).
// Used by posture_server.js — no camera or drawing code here.

const { angleBetweenPoints, angleFromVertical, THRESHOLDS } = require('./posture_utils');

// ── Pick the 3 landmarks for the correct camera side ─────────────────────────

function pickSideLandmarks(pts, side) {
  if (side === 'left') {
    return {
      ear:      pts['left_ear'],
      shoulder: pts['left_shoulder'],
      hip:      pts['left_hip'],
    };
  }
  return {
    ear:      pts['right_ear'],
    shoulder: pts['right_shoulder'],
    hip:      pts['right_hip'],
  };
}

// ── Analyse posture from 3 points ─────────────────────────────────────────────

function analyzeSidePosture(pts) {
  const { ear, shoulder, hip } = pts;

  // Neck angle: at shoulder, between ear and hip
  // ~180 = upright, below 150 = head too far forward
  const neckAngle = angleBetweenPoints(ear, shoulder, hip);

  // Trunk lean: how much shoulder->hip tilts from vertical
  // above 10 = leaning forward / slouching
  const trunkLean = angleFromVertical(shoulder, hip);

  // How far the ear is in front of the shoulder (positive = leaning forward)
  const headOffsetPx = shoulder[0] - ear[0];

  const issues = [];
  if (neckAngle < THRESHOLDS.neck_angle_bad) {
    issues.push(`Slouching — neck ${Math.round(neckAngle)}°`);
  }
  if (trunkLean > THRESHOLDS.trunk_lean_bad) {
    issues.push(`Leaning forward — ${Math.round(trunkLean)}° off vertical`);
  }

  const metrics = { neckAngle, trunkLean, headOffsetPx, issues };
  return { metrics, issues };
}

module.exports = { pickSideLandmarks, analyzeSidePosture };
