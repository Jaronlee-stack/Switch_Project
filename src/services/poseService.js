import axios from "axios";

const POSE_SERVICE_URL =
    process.env.POSE_SERVICE_URL || "http://localhost:5001/detect";

const POSE_TIMEOUT_MS = Number(process.env.POSE_TIMEOUT_MS || 10000);

/**
 * Send a base64-encoded JPEG to the MediaPipe pose microservice
 * and get back the extracted angles.
 *
 * Returns:
 *   { person_detected: true, neck_angle, trunk_lean, head_offset_px }
 * or
 *   { person_detected: false }
 *
 * Throws on network/timeout errors — caller decides whether to
 * reject the frame or store it as 'unknown'.
 */
export async function detectPose(base64Image) {
    const response = await axios.post(
        POSE_SERVICE_URL,
        { image: base64Image },
        {
            timeout: POSE_TIMEOUT_MS,
            headers: { "Content-Type": "application/json" },
            // large base64 payloads
            maxBodyLength: 15 * 1024 * 1024
        }
    );

    return response.data;
}