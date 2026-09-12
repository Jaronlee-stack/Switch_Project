import {
    listRules,
    createRule,
    updateRule,
    deleteRule
} from "../models/rulesModel.js";

function validateRuleBody(body) {
    const { rule_name, description, recommendation_text } = body;
    if (!rule_name || !description || !recommendation_text) {
        return "rule_name, description and recommendation_text are required";
    }
    if (rule_name.length > 120) return "rule_name is too long";
    return null;
}

export async function listRulesEndpoint(req, res) {
    try {
        const rules = await listRules({ activeOnly: req.query.active === "true" });
        return res.status(200).json({ rules });
    } catch (error) {
        console.error("listRules error:", error);
        return res.status(500).json({ message: "Failed to fetch rules" });
    }
}

export async function addRule(req, res) {
    try {
        const error = validateRuleBody(req.body);
        if (error) return res.status(400).json({ message: error });

        const rule = await createRule({
            rule_name: req.body.rule_name.trim(),
            description: req.body.description.trim(),
            recommendation_text: req.body.recommendation_text.trim(),
            robot_action: req.body.robot_action || null
        });
        return res.status(201).json({ rule });
    } catch (error) {
        console.error("addRule error:", error);
        return res.status(500).json({ message: "Failed to create rule" });
    }
}

export async function editRule(req, res) {
    try {
        const rule = await updateRule(req.params.id, {
            rule_name: req.body.rule_name?.trim(),
            description: req.body.description?.trim(),
            recommendation_text: req.body.recommendation_text?.trim(),
            robot_action: req.body.robot_action,
            active: typeof req.body.active === "boolean" ? req.body.active : null
        });
        if (!rule) return res.status(404).json({ message: "Rule not found" });
        return res.status(200).json({ rule });
    } catch (error) {
        console.error("editRule error:", error);
        return res.status(500).json({ message: "Failed to update rule" });
    }
}

export async function removeRule(req, res) {
    try {
        const removed = await deleteRule(req.params.id);
        if (!removed) return res.status(404).json({ message: "Rule not found" });
        return res.status(200).json({ message: "Rule deleted" });
    } catch (error) {
        console.error("removeRule error:", error);
        return res.status(500).json({ message: "Failed to delete rule" });
    }
}