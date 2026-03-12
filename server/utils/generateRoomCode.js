/**
 * generateRoomCode.js — Generates unique, short, uppercase room codes.
 */
const { getRoom } = require('../roomManager');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I,O,0,1 to avoid confusion
const CODE_LENGTH = 4;
const MAX_ATTEMPTS = 50;

function generateRoomCode() {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        let code = '';
        for (let i = 0; i < CODE_LENGTH; i++) {
            code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
        }
        // Ensure uniqueness
        if (!getRoom(code)) {
            return code;
        }
    }
    // Fallback: longer code
    let code = '';
    for (let i = 0; i < CODE_LENGTH + 2; i++) {
        code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    return code;
}

module.exports = { generateRoomCode };
