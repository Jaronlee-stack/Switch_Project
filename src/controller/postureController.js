import fs from "fs";
import path from "path";
import pool from "../../dbConfig.js";
import { detectPose } from "../services/poseService.js";
import {
    saveDetection,
    getLatestDetection,
    getHistory,
    getHistoryById,
    getConsecutiveBadCount
} from "../models/postureModel.js";
import { findRuleByStatus } from "../models/rulesModel.js";

/* ------------------------------------------------------------
 * Classification thresholds (env-tunable)
 * ------------------------------------------------------------ */
const GOOD_NECK_MIN     = Number(process.env.GOOD_NECK_MIN || 150);   // degrees
const GOOD_TRUNK_MAX    = Number(process.env.GOOD_TRUNK_MAX || 10);   // degrees from vertical
const GOOD_HEAD_MAX_PX  = Number(process.env.GOOD_HEAD_MAX_PX || 10); // px

/** consecutive bad frames before escalating to 'prolonged_slouching' */
const PROLONGED_THRESHOLD = Number(process.env.PROLONGED_THRESHOLD || 30);

/* optionally persist decoded frames to disk (set FRAMES_DIR to enable) */
const FRAMES_DIR = process.env.FRAMES_DIR || null;

function classifyPosture({ neck_angle, trunk_lean, head_offset_px }) {
    if (
        neck_angle >= GOOD_NECK_MIN &&
        trunk_lean <= GOOD_TRUNK_MAX &&
        head_offset_px <= GOOD_HEAD_MAX_PX
    ) {
        return { status: "good", score: 100, issue: null };
    }

    const issues = [];
    if (neck_angle < GOOD_NECK_MIN)    issues.push("head_forward");
    if (trunk_lean > GOOD_TRUNK_MAX)   issues.push("slouching");

    // score degrades as angles worsen
    const score = Math.max(
        0,
        Math.round(
            100 -
            (GOOD_NECK_MIN - Math.min(neck_angle, GOOD_NECK_MIN)) -
            (Math.max(trunk_lean, GOOD_TRUNK_MAX) - GOOD_TRUNK_MAX) * 2 -
            Math.max(0, head_offset_px - GOOD_HEAD_MAX_PX)
        )
    );

    return { status: "slouching", score, issue: issues.join(", ") || "slouching" };
}

function saveFrameToDisk(frameId, buffer) {
    if (!FRAMES_DIR) return;
    try {
        if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });
        fs.writeFileSync(path.join(FRAMES_DIR, `frame_${frameId}.jpg`), buffer);
    } catch (err) {
        console.error("Frame disk save failed:", err.message);
    }
}

/**
 * POST /api/frame
 *
 * camera.py sends: { frame_id, user_id, session_id, image (base64 jpeg) }
 *
 * Pipeline: decode base64 -> MediaPipe -> classify -> match rule ->
 *           store in transaction (+ auto-purge every 500 frames) -> respond
 */
export async function ingestFrame(req, res) {
    try {
        const { frame_id, user_id, session_id, image } = req.body;

        if (!frame_id || !user_id || !session_id || !image) {
            return res.status(400).json({
                message: "frame_id, user_id, session_id and image are required"
            });
        }

        // 1. Decode base64 -> binary (validate it's real image data)
        const imageBuffer = Buffer.from(image, "base64");
        if (!imageBuffer.length || imageBuffer.length < 100) {
            return res.status(400).json({ message: "Invalid base64 image" });
        }
        saveFrameToDisk(frame_id, imageBuffer);

        // 2. MediaPipe pose detection
        let pose;
        try {
            pose = await detectPose(image);
        } catch (err) {
            console.error("Pose service error:", err.message);
            return res.status(502).json({
                message: "Pose detection service unavailable",
                detail: err.message
            });
        }

        if (!pose.person_detected) {
            return res.status(200).json({
                frame_id,
                posture_status: "no_person",
                stored: false
            });
        }

        // 3. Classify
        const { status, score, issue } = classifyPosture(pose);

        // 4. Escalate slouching -> prolonged_slouching on streak
        let finalStatus = status;
        if (status === "slouching") {
            const streak = await getConsecutiveBadCount(user_id, session_id);
            if (streak + 1 >= PROLONGED_THRESHOLD) finalStatus = "prolonged_slouching";
        }

        // 5. Match a rule (by status name, e.g. rules_table row 'slouching')
        const rule = await findRuleByStatus(finalStatus);

        // 6. Store + auto-purge (single transaction)
        const { detection, purged } = await saveDetection({
            frame_id,
            user_id,
            session_id,
            detected_at: new Date(),
            posture_status: finalStatus,
            posture_score: score,
            issue,
            neck_angle: Math.round(pose.neck_angle * 10) / 10,
            trunk_lean: Math.round(pose.trunk_lean * 10) / 10,
            head_offset_px: Math.round(pose.head_offset_px * 10) / 10,
            view: req.body.view || "side",
            matched_rule_id: rule ? rule.rule_id : null
        });

        return res.status(201).json({
            frame_id,
            posture_status: finalStatus,
            posture_score: score,
            issue,
            rule: rule ? rule.recommendation_text : null,
            purged_frames: purged,
            stored: true
        });

    } catch (error) {
        console.error("ingestFrame error:", error);
        return res.status(500).json({ message: "Failed to process frame" });
    }
}

/**
 * GET /api/posture/latest?session_id=...
 */
export async function getLatest(req, res) {
    try {
        const detection = await getLatestDetection(
            req.user?.userId || req.query.user_id,
            req.query.session_id || null
        );
        if (!detection) return res.status(404).json({ message: "No detections yet" });
        return res.status(200).json({ detection });
    } catch (error) {
        console.error("getLatest error:", error);
        return res.status(500).json({ message: "Failed to fetch latest posture" });
    }
}

/**
 * GET /api/posture/stream  (Server-Sent Events for LiveCoach)
 *
 * Pushes the user's latest detection every second. The browser
 * uses:  const es = new EventSource('/api/posture/stream')
 */
export function streamPosture(req, res) {
    const userId = req.user?.userId || req.query.user_id;
    const sessionId = req.query.session_id || null;

    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
    });
    res.write(`data: ${JSON.stringify({ connected: true })}\n\n`);

    const interval = setInterval(async () => {
        try {
            const detection = await getLatestDetection(userId, sessionId);
            res.write(`data: ${JSON.stringify({ detection })}\n\n`);
        } catch (err) {
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        }
    }, 1000);

    req.on("close", () => clearInterval(interval));
}

/**
 * GET /api/history?limit=&offset=&status=
 */
export async function getHistoryList(req, res) {
    try {
        const data = await getHistory({
            userId: req.user.userId,
            limit:  Math.min(Number(req.query.limit)  || 50, 200),
            offset: Number(req.query.offset) || 0,
            status: req.query.status || null
        });
        return res.status(200).json(data);
    } catch (error) {
        console.error("getHistoryList error:", error);
        return res.status(500).json({ message: "Failed to fetch history" });
    }
}

/**
 * GET /api/history/:detection_id
 */
export async function getHistoryDetail(req, res) {
    try {
        const detection = await getHistoryById(req.user.userId, req.params.detection_id);
        if (!detection) return res.status(404).json({ message: "Detection not found" });
        return res.status(200).json({ detection });
    } catch (error) {
        console.error("getHistoryDetail error:", error);
        return res.status(500).json({ message: "Failed to fetch detection" });
    }
}