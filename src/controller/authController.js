import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import {
    findUserByUsername,
    findUserById,
    createUser,
    updatePassword
} from "../models/authModel.js";

const JWT_SECRET = process.env.JWT_SECRET;

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in .env");
}

/**
 * Generate JWT.
 */
function generateToken(user) {
    return jwt.sign(
        {
            userId: user.user_id,
            username: user.username,
            role: user.role
        },
        JWT_SECRET,
        {
            expiresIn: JWT_EXPIRES_IN
        }
    );
}

/**
 * Cookie configuration.
 */
function setAuthCookie(res, token) {
    res.cookie("accessToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production"
            ? "none"
            : "lax",
        maxAge: 24 * 60 * 60 * 1000
    });
}

/**
 * POST /api/auth/register
 */
export async function register(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const username = email.trim().toLowerCase();

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        const existingUser = await findUserByUsername(username);

        if (existingUser) {
            return res.status(409).json({
                message: "An account with this email already exists"
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await createUser(
            username,
            passwordHash,
            "user"
        );

        const token = generateToken(user);

        setAuthCookie(res, token);

        return res.status(201).json({
            message: "Account created successfully",
            user
        });

    } catch (error) {
        console.error("Register error:", error);

        return res.status(500).json({
            message: "Failed to create account"
        });
    }
}

/**
 * POST /api/auth/login
 */
export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const username = email.trim().toLowerCase();

        const user = await findUserByUsername(username);

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = generateToken(user);

        setAuthCookie(res, token);

        return res.status(200).json({
            message: "Login successful",
            user: {
                user_id: user.user_id,
                username: user.username,
                role: user.role,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Failed to login"
        });
    }
}

/**
 * POST /api/auth/logout
 */
export function logout(req, res) {
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production"
            ? "none"
            : "lax"
    });

    return res.status(200).json({
        message: "Logged out successfully"
    });
}

/**
 * GET /api/user/me
 */
export async function getMe(req, res) {
    try {
        const user = await findUserById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            user
        });

    } catch (error) {
        console.error("Get user error:", error);

        return res.status(500).json({
            message: "Failed to retrieve user"
        });
    }
}

/**
 * PUT /api/user/password
 */
export async function changePassword(req, res) {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Current password and new password are required"
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                message: "New password must be at least 8 characters"
            });
        }

        const user = await findUserByUsername(req.user.username);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const passwordMatches = await bcrypt.compare(
            currentPassword,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Current password is incorrect"
            });
        }

        const newPasswordHash = await bcrypt.hash(
            newPassword,
            12
        );

        await updatePassword(
            req.user.userId,
            newPasswordHash
        );

        return res.status(200).json({
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error("Change password error:", error);

        return res.status(500).json({
            message: "Failed to change password"
        });
    }
}