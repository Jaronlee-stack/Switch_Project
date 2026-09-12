/* ==============================================
   api.js  —  shared fetch utility
   All pages import this via <script src="api.js">
   before their own script tag.
============================================== */

const API_BASE = "/api";

/**
 * Thin wrapper around fetch that:
 *  - always sends credentials (cookie-based JWT)
 *  - redirects to login on 401
 *  - returns parsed JSON or null on failure
 */
async function apiFetch(path, options = {}) {

    const res = await fetch(`${API_BASE}${path}`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        },
        ...options
    });

    if (res.status === 401) {
        window.location.href = "/auth/SignIn.html?mode=signin";
        return null;
    }

    if (!res.ok) {
        console.warn(`[api] ${options.method || "GET"} ${path} → ${res.status}`);
        return null;
    }

    return res.json();
}

/* Convenience helpers */
const api = {
    get:    (path)          => apiFetch(path),
    post:   (path, body)    => apiFetch(path, { method: "POST",   body: JSON.stringify(body) }),
    put:    (path, body)    => apiFetch(path, { method: "PUT",    body: JSON.stringify(body) }),
    delete: (path)          => apiFetch(path, { method: "DELETE" })
};
