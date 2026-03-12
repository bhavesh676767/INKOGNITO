/**
 * settingsValidator.js — Validates and clamps room settings.
 * Rejects invalid values, returns clean settings object.
 */

const VALID_MODES = ['Final Verdict', 'Investigation'];
const VALID_LANGUAGES = ['EN', 'ES', 'FR', 'DE', 'PT', 'TR'];

const LIMITS = {
    maxPlayers:         { min: 4, max: 10, default: 6 },
    turnDuration:       { min: 3, max: 60, default: 5 },
    brushSize:          { min: 1, max: 10, default: 3 },
    inkLimit:           { min: 10, max: 200, default: 50 },
    voteTime:           { min: 10, max: 120, default: 30 },
    numberOfImposters:  { min: 1, max: 3, default: 1 },
};

/**
 * Returns default settings object.
 */
function getDefaultSettings() {
    return {
        maxPlayers: LIMITS.maxPlayers.default,
        turnDuration: LIMITS.turnDuration.default,
        brushSize: LIMITS.brushSize.default,
        inkLimit: LIMITS.inkLimit.default,
        voteTime: LIMITS.voteTime.default,
        language: 'EN',
        mode: 'Final Verdict',
        slowMoReplay: false,
        numberOfImposters: LIMITS.numberOfImposters.default,
        allowVoiceChat: false,
        anonymousVote: false,
        customWordsEnabled: false,
        customWords: [],
    };
}

/**
 * Validate and merge incoming settings changes onto existing settings.
 * Returns { valid: true, settings } or { valid: false, errors: [...] }.
 */
function validateSettings(existing, incoming) {
    if (!incoming || typeof incoming !== 'object') {
        return { valid: false, errors: ['Settings must be an object.'] };
    }

    const errors = [];
    const merged = { ...existing };

    // Numeric clamping
    for (const [key, limits] of Object.entries(LIMITS)) {
        if (key in incoming) {
            const val = parseInt(incoming[key], 10);
            if (isNaN(val)) {
                errors.push(`${key} must be a number.`);
            } else {
                merged[key] = Math.max(limits.min, Math.min(limits.max, val));
            }
        }
    }

    // Enum validations
    if ('mode' in incoming) {
        if (VALID_MODES.includes(incoming.mode)) {
            merged.mode = incoming.mode;
        } else {
            errors.push(`Invalid mode: ${incoming.mode}`);
        }
    }

    if ('language' in incoming) {
        if (VALID_LANGUAGES.includes(incoming.language)) {
            merged.language = incoming.language;
        } else {
            errors.push(`Invalid language: ${incoming.language}`);
        }
    }

    // Boolean toggles
    const boolFields = ['slowMoReplay', 'allowVoiceChat', 'anonymousVote', 'customWordsEnabled'];
    for (const key of boolFields) {
        if (key in incoming) {
            merged[key] = !!incoming[key];
        }
    }

    // Custom words — only allow array of strings, max 20 words, max 30 chars each
    if ('customWords' in incoming) {
        if (Array.isArray(incoming.customWords)) {
            merged.customWords = incoming.customWords
                .filter(w => typeof w === 'string' && w.trim().length > 0)
                .map(w => w.trim().substring(0, 30))
                .slice(0, 20);
        }
    }

    // Ensure imposters doesn't exceed half the player count
    if (merged.numberOfImposters >= merged.maxPlayers / 2) {
        merged.numberOfImposters = Math.max(1, Math.floor(merged.maxPlayers / 2) - 1);
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    return { valid: true, settings: merged };
}

module.exports = { getDefaultSettings, validateSettings, LIMITS };
