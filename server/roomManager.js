const rooms = new Map();

function createRoom(roomCode, hostId) {
    const defaultSettings = {
        maxPlayers: 6,
        turnDuration: 5,
        brushSize: 3,
        inkLimit: 50,
        voteTime: 30,
        language: "EN",
        mode: "Final Verdict",
        slowMoReplay: false,
        numberOfImposters: 1,
        allowVoiceChat: false,
        anonymousVote: false,
        customWordsEnabled: false,
        customWords: []
    };

    const room = {
        roomCode,
        hostId,
        phase: "lobby",
        players: [], // Array of player objects
        settings: defaultSettings,
        chat: []
    };

    rooms.set(roomCode, room);
    return room;
}

function getRoom(roomCode) {
    return rooms.get(roomCode);
}

function removeRoom(roomCode) {
    rooms.delete(roomCode);
}

function joinRoom(roomCode, player) {
    const room = getRoom(roomCode);
    if (!room) return null;
    
    // Check max players
    if (room.players.length >= room.settings.maxPlayers) {
        return { error: "Room is full" };
    }

    // Check if player is already in room
    const existingPlayerIndex = room.players.findIndex(p => p.id === player.id);
    if (existingPlayerIndex !== -1) {
        room.players[existingPlayerIndex] = player; // Update player details
    } else {
        room.players.push(player); // Add new player
    }

    return room;
}

function removePlayerFromRoom(roomCode, playerId) {
    const room = getRoom(roomCode);
    if (!room) return null;

    room.players = room.players.filter(p => p.id !== playerId);
    
    // If no players left, destroy room
    if (room.players.length === 0) {
        removeRoom(roomCode);
        return { action: 'destroyed', room: null };
    }

    // If host left, assign new host
    if (room.hostId === playerId) {
        room.hostId = room.players[0].id;
        room.players[0].isHost = true;
    }

    return { action: 'updated', room };
}

function updateSettings(roomCode, newSettings) {
    const room = getRoom(roomCode);
    if (!room) return null;

    room.settings = { ...room.settings, ...newSettings };
    return room;
}

function addCustomWord(roomCode, word) {
    const room = getRoom(roomCode);
    if (!room) return null;

    if (!room.settings.customWords.includes(word)) {
        room.settings.customWords.push(word);
    }
    return room;
}

function removeCustomWord(roomCode, word) {
    const room = getRoom(roomCode);
    if (!room) return null;

    room.settings.customWords = room.settings.customWords.filter(w => w !== word);
    return room;
}

function addChatMessage(roomCode, messageObj) {
    const room = getRoom(roomCode);
    if (!room) return null;

    room.chat.push(messageObj);
    // Keep max 100 messages to prevent memory issues
    if(room.chat.length > 100) {
        room.chat.shift();
    }
    return room;
}

module.exports = {
    createRoom,
    getRoom,
    removeRoom,
    joinRoom,
    removePlayerFromRoom,
    updateSettings,
    addCustomWord,
    removeCustomWord,
    addChatMessage
};
