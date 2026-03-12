/**
 * sanitize.js — Input sanitization and validation helpers.
 */

/**
 * Sanitize a string: trim, strip HTML, enforce max length.
 */
function sanitize(str, maxLen = 200) {
    if (typeof str !== 'string') return '';
    const trimmed = str.trim();
    if (!trimmed) return '';
    const escaped = trimmed
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    return escaped.substring(0, maxLen);
}

/**
 * Sanitize a player display name.
 * Must be 2–20 chars after trimming.
 */
function sanitizeName(name) {
    const clean = sanitize(name, 20);
    if (clean.length < 2) return null; // invalid
    return clean;
}

/**
 * Validate an avatar data object.
 */
function validateAvatar(avatar) {
    if (!avatar || typeof avatar !== 'object') {
        return { hat: null, expression: null };
    }
    return {
        hat: typeof avatar.hat === 'string' ? avatar.hat.substring(0, 200) : null,
        expression: typeof avatar.expression === 'string' ? avatar.expression.substring(0, 200) : null,
    };
}

module.exports = { sanitize, sanitizeName, validateAvatar };
