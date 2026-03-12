// generateRoomCode.js
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // TODO: A really robust system would check if 'result' is already in use
    return result;
}

module.exports = { generateRoomCode };
