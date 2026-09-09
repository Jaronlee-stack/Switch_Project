import { getSummary, getTrends } from "../models/analyticsModel.js";

export async function getAnalyticsSummary(req, res) {
    try {
        const summary = await getSummary(req.user.userId);
        return res.status(200).json({ summary });
    } catch (error) {
        console.error("getAnalyticsSummary error:", error);
        return res.status(500).json({ message: "Failed to fetch analytics summary" });
    }
}

export async function getAnalyticsTrends(req, res) {
    try {
        const days = Math.min(Number(req.query.days) || 7, 90);
        const trends = await getTrends(req.user.userId, days);
        return res.status(200).json({ days, trends });
    } catch (error) {
        console.error("getAnalyticsTrends error:", error);
        return res.status(500).json({ message: "Failed to fetch analytics trends" });
    }
}