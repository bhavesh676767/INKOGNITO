/**
 * RoomManager — In-memory room storage, CRUD, and state helpers.
 * 
 * Rooms Map is exported for iteration (disconnect handling).
 * All mutation goes through exported functions.
 */
const { getDefaultSettings } = require('./utils/settingsValidator');
const { PHASE } = require('./constants/events');

const rooms = new Map();

// ─── Socket → Room mapping for fast lookup on disconnect ───
const socketToRoom = new Map();  // socketId → roomCode

// ─── Player Session Tokens for reconnect ───
// sessionToken → { roomCode, playerId, socketId, disconnectedAt }
const disconnectedSessions = new Map();

// ────────────────────────────────────────────────────────
// Room CRUD
// ────────────────────────────────────────────────────────

function createRoom(roomCode, hostSocketId) {
    const room = {
        roomCode,
        hostId: hostSocketId,
        phase: PHASE.LOBBY,
        players: [],
        settings: getDefaultSettings(),
        chat: [],
        gameState: null,
        createdAt: Date.now(),
        lastActivity: Date.now(),
    };

    rooms.set(roomCode, room);
    return room;
}

function getRoom(roomCode) {
    return rooms.get(roomCode) || null;
}

function deleteRoom(roomCode) {
    rooms.delete(roomCode);
}

function getAllRoomCodes() {
    return Array.from(rooms.keys());
}

// ────────────────────────────────────────────────────────
// Player Management
// ────────────────────────────────────────────────────────

function addPlayer(roomCode, player) {
    const room = getRoom(roomCode);
    if (!room) return { error: 'ROOM_NOT_FOUND' };

    // Check if player already exists (by sessionToken for reconnect, or socketId)
    const existIdx = room.players.findIndex(
        p => p.sessionToken === player.sessionToken || p.id === player.id
    );

    if (existIdx !== -1) {
        // Reconnecting — update socket id while preserving game data
        const old = room.players[existIdx];
        const oldSocketId = old.id;
        room.players[existIdx] = {
            ...old,
            id: player.id,               // new socket id
            isConnected: true,
            lastSeenAt: Date.now(),
            name: player.name || old.name,
            avatar: player.avatar || old.avatar,
        };

        room.lastActivity = Date.now();
        socketToRoom.set(player.id, roomCode);
        return { room, oldSocketId };
    }

    if (room.players.length >= room.settings.maxPlayers) {
        return { error: 'ROOM_FULL' };
    }

    if (room.phase !== PHASE.LOBBY) {
        return { error: 'ROOM_IN_GAME' };
    }

    room.players.push(player);

    room.lastActivity = Date.now();
    socketToRoom.set(player.id, roomCode);

    return { room };
}

function removePlayer(roomCode, socketId) {
    const room = getRoom(roomCode);
    if (!room) return { action: 'noop' };

    const playerIdx = room.players.findIndex(p => p.id === socketId);
    if (playerIdx === -1) return { action: 'noop' };

    const removed = room.players[playerIdx];
    room.players.splice(playerIdx, 1);
    socketToRoom.delete(socketId);

    if (room.players.length === 0) {
        deleteRoom(roomCode);
        return { action: 'destroyed', room: null, player: removed };
    }

    // Host migration
    if (room.hostId === socketId) {
        const nextHost = room.players.find(p => p.isConnected);
        if (nextHost) {
            room.hostId = nextHost.id;
            nextHost.isHost = true;
            // Unset old isHost on everyone else
            room.players.forEach(p => {
                if (p.id !== nextHost.id) p.isHost = false;
            });
        }
    }

    room.lastActivity = Date.now();
    return { action: 'updated', room, player: removed };
}

function markDisconnected(roomCode, socketId) {
    const room = getRoom(roomCode);
    if (!room) return null;

    const player = room.players.find(p => p.id === socketId);
    if (!player) return null;

    player.isConnected = false;
    player.lastSeenAt = Date.now();

    // Store session for reconnect
    if (player.sessionToken) {
        disconnectedSessions.set(player.sessionToken, {
            roomCode,
            playerId: player.id,
            socketId,
            disconnectedAt: Date.now(),
        });
    }

    socketToRoom.delete(socketId);

    // Host migration if host disconnects
    // CRITICAL: Do NOT migrate host if we are in the middle of starting a game or playing
    // to prevent host role bouncing during page transitions
    const skipMigrationPhases = [PHASE.STARTING, PHASE.PROMPT, PHASE.DRAWING];
    if (room.hostId === socketId && !skipMigrationPhases.includes(room.phase)) {
        const nextHost = room.players.find(p => p.isConnected && p.id !== socketId);
        if (nextHost) {
            room.hostId = nextHost.id;
            nextHost.isHost = true;
            room.players.forEach(p => {
                if (p.id !== nextHost.id) p.isHost = false;
            });
        }
    }

    // If all disconnected, start cleanup timer
    const activePlayers = room.players.filter(p => p.isConnected).length;
    if (activePlayers === 0) {
        // Give 60s grace period then destroy
        setTimeout(() => {
            const r = getRoom(roomCode);
            if (r && r.players.filter(p => p.isConnected).length === 0) {
                deleteRoom(roomCode);
            }
        }, 60000);
    }

    room.lastActivity = Date.now();
    return { room, player };
}

// ────────────────────────────────────────────────────────
// Settings
// ────────────────────────────────────────────────────────

function updateSettings(roomCode, newSettings) {
    const room = getRoom(roomCode);
    if (!room) return null;

    room.settings = newSettings;
    room.lastActivity = Date.now();
    return room;
}

// ────────────────────────────────────────────────────────
// Chat
// ────────────────────────────────────────────────────────

const MAX_CHAT_HISTORY = 100;

function addChatMessage(roomCode, msgObj) {
    const room = getRoom(roomCode);
    if (!room) return null;

    room.chat.push(msgObj);
    if (room.chat.length > MAX_CHAT_HISTORY) {
        room.chat.shift();
    }
    return room;
}

function clearChatHistory(roomCode) {
    const room = getRoom(roomCode);
    if (!room) return null;

    room.chat = [];
    return room;
}

// ────────────────────────────────────────────────────────
// State Broadcasting Helpers
// ────────────────────────────────────────────────────────

/**
 * Build public room state — strips private data.
 * Never includes roles, prompt, custom words, or game internals.
 */
function getPublicRoomState(room) {
    if (!room) return null;

    const publicPlayers = room.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.isHost,
        isConnected: p.isConnected,
    }));

    const publicSettings = { ...room.settings };
    // Never expose custom words list to non-hosts
    delete publicSettings.customWords;

    const publicGameState = room.gameState ? {
        currentTurnIndex: room.gameState.currentTurnIndex,
        turnOrder: room.gameState.turnOrder,
        currentRound: room.gameState.currentRound,
        totalRounds: room.gameState.totalRounds,
        wrongVotes: room.gameState.wrongVotes,
        inkLeft: room.gameState.inkLeft,
        eliminatedPlayers: room.gameState.eliminatedPlayers || [],
        // Do NOT include: roles, prompt, votes (unless anonymous is off and phase allows)
    } : null;

    return {
        roomCode: room.roomCode,
        hostId: room.hostId,
        phase: room.phase,
        players: publicPlayers,
        settings: publicSettings,
        gameState: publicGameState,
    };
}

/**
 * Build host-only state — includes custom words.
 */
function getHostState(room) {
    if (!room) return null;
    return {
        customWords: room.settings.customWords || [],
    };
}

// ────────────────────────────────────────────────────────
// Socket Mapping Helpers
// ────────────────────────────────────────────────────────

function getRoomForSocket(socketId) {
    return socketToRoom.get(socketId) || null;
}

function setSocketRoom(socketId, roomCode) {
    socketToRoom.set(socketId, roomCode);
}

function clearSocketRoom(socketId) {
    socketToRoom.delete(socketId);
}

function getDisconnectedSession(sessionToken) {
    return disconnectedSessions.get(sessionToken) || null;
}

function clearDisconnectedSession(sessionToken) {
    disconnectedSessions.delete(sessionToken);
}

module.exports = {
    rooms,
    createRoom,
    getRoom,
    deleteRoom,
    getAllRoomCodes,
    addPlayer,
    removePlayer,
    markDisconnected,
    updateSettings,
    addChatMessage,
    clearChatHistory,
    getPublicRoomState,
    getHostState,
    getRoomForSocket,
    setSocketRoom,
    clearSocketRoom,
    getDisconnectedSession,
    clearDisconnectedSession,
};
