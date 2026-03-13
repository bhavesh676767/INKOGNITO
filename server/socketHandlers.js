/**
 * socketHandlers.js — Main Socket.IO event router.
 * 
 * All validation happens here before delegating to managers.
 * Never trusts client data. Always checks permissions.
 */
const crypto = require('crypto');
const { C2S, S2C, PHASE, ERR } = require('./constants/events');
const { sanitize, sanitizeName, validateAvatar } = require('./utils/sanitize');
const { validateSettings } = require('./utils/settingsValidator');
const { generateRoomCode } = require('./utils/generateRoomCode');
const gameLogic = require('./gameLogic');
const rm = require('./roomManager');

// ─── Rate Limiting ───
const chatRateLimits = new Map(); // socketId → { count, resetAt }

function isChatRateLimited(socketId) {
    const now = Date.now();
    let entry = chatRateLimits.get(socketId);
    if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + 5000 }; // 5-second window
        chatRateLimits.set(socketId, entry);
    }
    entry.count++;
    return entry.count > 5; // max 5 messages per 5 seconds
}

// ─── Helpers ───
function emitError(socket, code, message) {
    socket.emit(S2C.ROOM_ERROR, { code, message });
}

function genSessionToken() {
    return crypto.randomBytes(16).toString('hex');
}

function broadcastRoomState(io, roomCode) {
    const room = rm.getRoom(roomCode);
    if (!room) return;
    io.to(roomCode).emit(S2C.ROOM_UPDATE, rm.getPublicRoomState(room));
}

function broadcastSystemMessage(io, roomCode, text) {
    const msgObj = {
        id: Math.random().toString(36).substring(2, 9),
        senderId: '__system',
        senderName: 'SYSTEM',
        text,
        timestamp: Date.now(),
        isSystem: true,
    };
    rm.addChatMessage(roomCode, msgObj);
    io.to(roomCode).emit(S2C.CHAT_NEW_MESSAGE, msgObj);
}

/**
 * Updates game state (roles, turn order, ink) when a player's socket ID changes.
 */
function syncGameStateSocketId(room, oldSocketId, newSocketId) {
    if (!room || !room.gameState) return;
    const gs = room.gameState;

    // 1. Update roles mapping
    if (gs.roles && gs.roles[oldSocketId]) {
        gs.roles[newSocketId] = gs.roles[oldSocketId];
        delete gs.roles[oldSocketId];
    }

    // 2. Update turn order array
    if (gs.turnOrder) {
        const turnIdx = gs.turnOrder.indexOf(oldSocketId);
        if (turnIdx !== -1) {
            gs.turnOrder[turnIdx] = newSocketId;
        }
    }

    // 3. Update ink tracking
    if (gs.inkLeft && gs.inkLeft[oldSocketId] !== undefined) {
        gs.inkLeft[newSocketId] = gs.inkLeft[oldSocketId];
        delete gs.inkLeft[oldSocketId];
    }

    // 4. Update votes (if any)
    if (gs.votes) {
        if (gs.votes[oldSocketId]) {
            gs.votes[newSocketId] = gs.votes[oldSocketId];
            delete gs.votes[oldSocketId];
        }
        // Also update if someone voted FOR this player
        for (const voterId in gs.votes) {
            if (gs.votes[voterId] === oldSocketId) {
                gs.votes[voterId] = newSocketId;
            }
        }
    }
}

// ═══════════════════════════════════════════════════════
// Main Handler Setup
// ═══════════════════════════════════════════════════════

module.exports = function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log(`[CONNECT] ${socket.id}`);

        // ─────────────────────────────────────────────
        // ROOM: CREATE
        // ─────────────────────────────────────────────
        socket.on(C2S.ROOM_CREATE, (playerData) => {
            if (!playerData || typeof playerData !== 'object') {
                return emitError(socket, ERR.INVALID_INPUT, 'Invalid player data.');
            }

            const name = sanitizeName(playerData.name);
            if (!name) {
                return emitError(socket, ERR.INVALID_INPUT, 'Name must be 2-20 characters.');
            }

            const avatar = validateAvatar(playerData.avatar);
            const code = generateRoomCode();
            const sessionToken = genSessionToken();

            const room = rm.createRoom(code, socket.id);

            const player = {
                id: socket.id,
                sessionToken,
                name,
                avatar,
                isHost: true,
                isConnected: true,
                joinedAt: Date.now(),
                lastSeenAt: Date.now(),
            };

            rm.addPlayer(code, player);
            rm.setSocketRoom(socket.id, code);

            socket.join(code);
            socket.emit(S2C.ROOM_CREATED, { roomCode: code, sessionToken });
            broadcastRoomState(io, code);
            broadcastSystemMessage(io, code, 'Lobby created. Invite your friends!');

            // Send host-only data
            socket.emit(S2C.SETTINGS_UPDATED, {
                settings: room.settings, // host gets full settings including customWords
            });

            console.log(`[ROOM CREATE] ${code} by ${name}`);
        });

        // ─────────────────────────────────────────────
        // ROOM: JOIN
        // ─────────────────────────────────────────────
        socket.on(C2S.ROOM_JOIN, ({ roomCode, playerData }) => {
            if (!roomCode || typeof roomCode !== 'string') {
                return emitError(socket, ERR.INVALID_INPUT, 'Room code required.');
            }

            const code = roomCode.toUpperCase().trim();
            const room = rm.getRoom(code);

            if (!room) {
                return emitError(socket, ERR.ROOM_NOT_FOUND, 'Room not found.');
            }

            if (!playerData || typeof playerData !== 'object') {
                return emitError(socket, ERR.INVALID_INPUT, 'Invalid player data.');
            }

            const name = sanitizeName(playerData.name);
            if (!name) {
                return emitError(socket, ERR.INVALID_INPUT, 'Name must be 2-20 characters.');
            }

            const avatar = validateAvatar(playerData.avatar);
            const sessionToken = playerData.sessionToken || genSessionToken();

            const player = {
                id: socket.id,
                sessionToken,
                name,
                avatar,
                isHost: false,
                isConnected: true,
                joinedAt: Date.now(),
                lastSeenAt: Date.now(),
            };

            const result = rm.addPlayer(code, player);

            if (result.error) {
                const msg = result.error === 'ROOM_FULL' ? 'Room is full.'
                    : result.error === 'ROOM_IN_GAME' ? 'Game already in progress.'
                    : 'Cannot join room.';
                return emitError(socket, result.error, msg);
            }

            // If this was a reconnection/navigation, sync state
            if (result.oldSocketId) {
                syncGameStateSocketId(room, result.oldSocketId, socket.id);
                // Also update host reference if needed (though addPlayer/markDisconnected should handle it)
                if (room.hostId === result.oldSocketId) {
                    room.hostId = socket.id;
                }
            }

            rm.setSocketRoom(socket.id, code);
            socket.join(code);
            socket.emit(S2C.ROOM_JOINED, { roomCode: code, sessionToken });

            // Send chat history to new joiner
            socket.emit('chat:history', room.chat || []);

            broadcastRoomState(io, code);

            // If game is in progress, re-send role/prompt to this player
            if (room.gameState && room.phase !== PHASE.LOBBY) {
                const gs = room.gameState;
                const role = gs.roles[socket.id];
                if (role) {
                    // Collect impostor teammates
                    const impostors = room.players
                        .filter(p => gs.roles[p.id] === 'Inkognito')
                        .map(p => ({ id: p.id, name: p.name, avatar: p.avatar }));
                    
                    let teammates = null;
                    if (role === 'Inkognito' && impostors.length > 1) {
                        teammates = impostors.filter(imp => imp.id !== socket.id);
                    }

                    socket.emit(S2C.GAME_ROLE, {
                        role,
                        prompt: role === 'Artist' ? gs.prompt : null,
                        teammates,
                        message: role === 'Artist'
                            ? `You are an Artist. The secret word is: ${gs.prompt}`
                            : `You are the Inkognito! Try to blend in.`,
                    });
                }

                // If game is in starting/prompt phase, tell the client cinematic should play
                if (room.phase === PHASE.PROMPT || room.phase === PHASE.STARTING) {
                    socket.emit(S2C.GAME_STARTING, { message: 'Game is starting...' });
                }
            } else {
                broadcastSystemMessage(io, code, `${name} joined the room.`);
            }

            console.log(`[JOIN] ${name} → ${code}`);
        });

        // ─────────────────────────────────────────────
        // ROOM: RECONNECT
        // ─────────────────────────────────────────────
        socket.on(C2S.ROOM_RECONNECT, ({ sessionToken, roomCode }) => {
            if (!sessionToken || !roomCode) {
                return emitError(socket, ERR.INVALID_INPUT, 'Session token and room code required.');
            }

            const code = roomCode.toUpperCase().trim();
            const room = rm.getRoom(code);
            if (!room) {
                return emitError(socket, ERR.ROOM_NOT_FOUND, 'Room no longer exists.');
            }

            const existingPlayer = room.players.find(p => p.sessionToken === sessionToken);
            if (!existingPlayer) {
                return emitError(socket, ERR.NOT_IN_ROOM, 'Session not found in room.');
            }

            // Reclaim session
            const oldSocketId = existingPlayer.id;
            existingPlayer.id = socket.id;
            existingPlayer.isConnected = true;
            existingPlayer.lastSeenAt = Date.now();

            // Update host reference if this was the host
            if (room.hostId === oldSocketId) {
                room.hostId = socket.id;
            }

            rm.setSocketRoom(socket.id, code);
            rm.clearDisconnectedSession(sessionToken);

            // Sync state
            syncGameStateSocketId(room, oldSocketId, socket.id);

            socket.join(code);
            socket.emit(S2C.ROOM_JOINED, { roomCode: code, sessionToken });

            // Send chat history
            socket.emit('chat:history', room.chat || []);

            // Send private game data if game is in progress
            if (room.gameState && room.gameState.roles) {
                const role = room.gameState.roles[socket.id];
                if (role) {
                    socket.emit(S2C.GAME_ROLE, {
                        role,
                        prompt: role === 'Artist' ? room.gameState.prompt : null,
                        message: role === 'Artist'
                            ? `You are an Artist. The secret word is: ${room.gameState.prompt}`
                            : `You are the Inkognito! Try to blend in.`,
                    });
                }
            }

            broadcastRoomState(io, code);
            broadcastSystemMessage(io, code, `${existingPlayer.name} reconnected.`);

            console.log(`[RECONNECT] ${existingPlayer.name} → ${code}`);
        });

        // ─────────────────────────────────────────────
        // ROOM: LEAVE
        // ─────────────────────────────────────────────
        socket.on(C2S.ROOM_LEAVE, ({ roomCode }) => {
            if (!roomCode) return;
            const code = roomCode.toUpperCase().trim();

            const result = rm.removePlayer(code, socket.id);
            rm.clearSocketRoom(socket.id);
            socket.leave(code);

            if (result.action === 'updated') {
                broadcastRoomState(io, code);
                if (result.player) {
                    broadcastSystemMessage(io, code, `${result.player.name} left.`);
                }
                // If host changed, notify
                const room = rm.getRoom(code);
                if (room) {
                    const newHost = room.players.find(p => p.isHost);
                    if (newHost && result.player && result.player.isHost) {
                        broadcastSystemMessage(io, code, `${newHost.name} is the new host.`);
                    }
                }
            }

            console.log(`[LEAVE] ${socket.id} ← ${code}`);
        });

        // ─────────────────────────────────────────────
        // ROOM: REQUEST STATE (for refresh/sync)
        // ─────────────────────────────────────────────
        socket.on(C2S.ROOM_REQUEST_STATE, ({ roomCode }) => {
            if (!roomCode) return;
            const room = rm.getRoom(roomCode.toUpperCase().trim());
            if (!room) return emitError(socket, ERR.ROOM_NOT_FOUND, 'Room not found.');

            socket.emit(S2C.ROOM_UPDATE, rm.getPublicRoomState(room));

            // Host gets extra data
            if (socket.id === room.hostId) {
                socket.emit(S2C.SETTINGS_UPDATED, { settings: room.settings });
            }
        });

        // ─────────────────────────────────────────────
        // PLAYER: UPDATE PROFILE
        // ─────────────────────────────────────────────
        socket.on(C2S.PLAYER_UPDATE, ({ roomCode, name, avatar }) => {
            if (!roomCode) return;
            const code = roomCode.toUpperCase().trim();
            const room = rm.getRoom(code);
            if (!room) return;

            const player = room.players.find(p => p.id === socket.id);
            if (!player) return;

            if (name !== undefined) {
                const cleanName = sanitizeName(name);
                if (cleanName) player.name = cleanName;
            }
            if (avatar !== undefined) {
                player.avatar = validateAvatar(avatar);
            }

            player.lastSeenAt = Date.now();
            broadcastRoomState(io, code);
        });

        // ─────────────────────────────────────────────
        // SETTINGS: UPDATE (host only)
        // ─────────────────────────────────────────────
        socket.on(C2S.SETTINGS_UPDATE, ({ roomCode, settings }) => {
            if (!roomCode) return;
            const code = roomCode.toUpperCase().trim();
            const room = rm.getRoom(code);
            if (!room) return;

            // ── Host check ──
            if (socket.id !== room.hostId) {
                return emitError(socket, ERR.NOT_HOST, 'Only the host can change settings.');
            }

            // ── Phase check — settings only changeable in lobby ──
            if (room.phase !== PHASE.LOBBY) {
                return emitError(socket, ERR.INVALID_PHASE, 'Settings can only be changed in the lobby.');
            }

            const result = validateSettings(room.settings, settings);
            if (!result.valid) {
                return emitError(socket, ERR.INVALID_SETTINGS, result.errors.join(', '));
            }

            rm.updateSettings(code, result.settings);

            // Full settings to host, public settings to everyone else
            socket.emit(S2C.SETTINGS_UPDATED, { settings: result.settings });
            broadcastRoomState(io, code);
        });

        // ─────────────────────────────────────────────
        // CUSTOM WORDS (host only)
        // ─────────────────────────────────────────────
        socket.on(C2S.CUSTOM_WORD_ADD, ({ roomCode, word }) => {
            if (!roomCode) return;
            const code = roomCode.toUpperCase().trim();
            const room = rm.getRoom(code);
            if (!room) return;
            if (socket.id !== room.hostId) return;
            if (room.phase !== PHASE.LOBBY) return;

            const safeWord = sanitize(word, 30);
            if (!safeWord) return;

            if (!room.settings.customWords.includes(safeWord) && room.settings.customWords.length < 20) {
                room.settings.customWords.push(safeWord);
                // Only host needs to see it
                socket.emit(S2C.SETTINGS_UPDATED, { settings: room.settings });
                broadcastRoomState(io, code);
            }
        });

        socket.on(C2S.CUSTOM_WORD_REMOVE, ({ roomCode, word }) => {
            if (!roomCode) return;
            const code = roomCode.toUpperCase().trim();
            const room = rm.getRoom(code);
            if (!room) return;
            if (socket.id !== room.hostId) return;
            if (room.phase !== PHASE.LOBBY) return;

            room.settings.customWords = room.settings.customWords.filter(w => w !== word);
            socket.emit(S2C.SETTINGS_UPDATED, { settings: room.settings });
            broadcastRoomState(io, code);
        });

        // ─────────────────────────────────────────────
        // CHAT: SEND
        // ─────────────────────────────────────────────
        socket.on(C2S.CHAT_SEND, ({ roomCode, message }) => {
            if (!roomCode) return;
            const code = roomCode.toUpperCase().trim();
            const room = rm.getRoom(code);
            if (!room) return;

            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.isConnected) return;

            // Rate limiting
            if (isChatRateLimited(socket.id)) {
                return emitError(socket, ERR.RATE_LIMITED, 'Slow down! Too many messages.');
            }

            const text = sanitize(message, 120);
            if (!text) return;

            const msgObj = {
                id: Math.random().toString(36).substring(2, 9),
                senderId: player.id,
                senderName: player.name,
                text,
                timestamp: Date.now(),
                isSystem: false,
            };

            rm.addChatMessage(code, msgObj);
            io.to(code).emit(S2C.CHAT_NEW_MESSAGE, msgObj);
        });

        // ─────────────────────────────────────────────
        // GAME: START (host only)
        // ─────────────────────────────────────────────
        socket.on(C2S.GAME_START, ({ roomCode }) => {
            if (!roomCode) return;
            const code = roomCode.toUpperCase().trim();
            const room = rm.getRoom(code);
            if (!room) return emitError(socket, ERR.ROOM_NOT_FOUND, 'Room not found.');

            if (socket.id !== room.hostId) {
                return emitError(socket, ERR.NOT_HOST, 'Only the host can start the game.');
            }

            if (room.phase !== PHASE.LOBBY) {
                return emitError(socket, ERR.INVALID_PHASE, 'Game can only start from the lobby.');
            }

            const connected = room.players.filter(p => p.isConnected).length;
            if (connected < 4) {
                return emitError(socket, ERR.NOT_ENOUGH_PLAYERS, 'Minimum 4 players required.');
            }

            // Transition: show "starting" briefly
            room.phase = PHASE.STARTING;
            io.to(code).emit(S2C.GAME_STARTING, { message: 'Game is starting...' });
            broadcastRoomState(io, code);

            // After 1.5s, actually initialize game
            setTimeout(() => {
                const result = gameLogic.startGame(code, io);
                if (result && result.error) {
                    room.phase = PHASE.LOBBY;
                    broadcastRoomState(io, code);
                    emitError(socket, ERR.NOT_ENOUGH_PLAYERS, result.error);
                }
            }, 1500);
        });

        // ─────────────────────────────────────────────
        // GAME: RESTART (host only)
        // ─────────────────────────────────────────────
        socket.on(C2S.GAME_RESTART, ({ roomCode }) => {
            if (!roomCode) return;
            const code = roomCode.toUpperCase().trim();
            const room = rm.getRoom(code);
            if (!room) return;
            if (socket.id !== room.hostId) {
                return emitError(socket, ERR.NOT_HOST, 'Only the host can restart.');
            }
            if (room.phase !== PHASE.END) {
                return emitError(socket, ERR.INVALID_PHASE, 'Can only restart after game ends.');
            }

            room.phase = PHASE.STARTING;
            io.to(code).emit(S2C.GAME_STARTING, { message: 'Restarting...' });
            broadcastRoomState(io, code);

            setTimeout(() => {
                const result = gameLogic.restartGame(code, io);
                if (result && result.error) {
                    room.phase = PHASE.LOBBY;
                    broadcastRoomState(io, code);
                    emitError(socket, ERR.NOT_ENOUGH_PLAYERS, result.error);
                }
            }, 1500);
        });

        // ─────────────────────────────────────────────
        // GAME: RETURN TO LOBBY
        // ─────────────────────────────────────────────
        socket.on(C2S.GAME_RETURN_LOBBY, ({ roomCode }) => {
            if (!roomCode) return;
            const code = roomCode.toUpperCase().trim();
            const room = rm.getRoom(code);
            if (!room) return;

            const player = room.players.find(p => p.id === socket.id && p.isConnected);
            if (!player) {
                return emitError(socket, ERR.NOT_IN_ROOM, 'You are not in this room.');
            }

            if (room.phase !== PHASE.END && socket.id !== room.hostId) {
                return emitError(socket, ERR.NOT_HOST, 'Only the host can return to lobby right now.');
            }

            gameLogic.returnToLobby(code, io);
        });

        // ─────────────────────────────────────────────
        // DRAW: STROKE
        // ─────────────────────────────────────────────
        socket.on(C2S.DRAW_STROKE, ({ roomCode, stroke }) => {
            if (!roomCode || !stroke) return;
            const code = roomCode.toUpperCase().trim();
            const room = rm.getRoom(code);
            if (!room || room.phase !== PHASE.DRAWING || !room.gameState) return;

            // Validate it's this player's turn
            if (!gameLogic.isCurrentDrawer(code, socket.id)) return;

            // Validate stroke data
            if (!stroke.points || !Array.isArray(stroke.points)) return;
            if (stroke.points.length > 500) return; // reject absurdly long strokes

            // Relay to everyone else in room
            socket.to(code).emit(S2C.DRAW_STROKE, stroke);

            // Deduct ink
            const pts = stroke.points.length;
            const inkDeducted = Math.max(0.5, pts * 0.1);
            const remaining = gameLogic.decreaseInk(code, socket.id, inkDeducted);

            if (remaining <= 0) {
                socket.emit(S2C.GAME_OUT_OF_INK);
            }
        });

        // ─────────────────────────────────────────────
        // VOTE: SUBMIT
        // ─────────────────────────────────────────────
        socket.on(C2S.VOTE_SUBMIT, ({ roomCode, suspectId }) => {
            if (!roomCode || !suspectId) return;
            const code = roomCode.toUpperCase().trim();

            const success = gameLogic.submitVote(code, socket.id, suspectId, io);
            if (!success) {
                emitError(socket, ERR.INVALID_PHASE, 'Vote rejected.');
            }
        });

        // ═════════════════════════════════════════════
        // DISCONNECT HANDLING
        // ═════════════════════════════════════════════

        socket.on('disconnecting', () => {
            const socketRooms = Array.from(socket.rooms);
            for (const roomCode of socketRooms) {
                if (roomCode === socket.id) continue; // skip default room

                const room = rm.getRoom(roomCode);
                if (!room) continue;

                const player = room.players.find(p => p.id === socket.id);
                if (!player) continue;

                if (room.phase === PHASE.LOBBY) {
                    // In lobby: full removal
                    const result = rm.removePlayer(roomCode, socket.id);
                    if (result.action === 'updated') {
                        broadcastRoomState(io, roomCode);
                        broadcastSystemMessage(io, roomCode, `${player.name} left.`);

                        // Host migration notification
                        if (player.isHost) {
                            const newHost = result.room.players.find(p => p.isHost);
                            if (newHost) {
                                broadcastSystemMessage(io, roomCode, `${newHost.name} is now the host.`);
                            }
                        }
                    }
                } else {
                    // In-game: mark disconnected (allow reconnect)
                    const dcResult = rm.markDisconnected(roomCode, socket.id);
                    if (dcResult) {
                        broadcastRoomState(io, roomCode);
                        broadcastSystemMessage(io, roomCode, `${player.name} disconnected.`);

                        // If host changed
                        if (player.isHost) {
                            const newHost = dcResult.room.players.find(p => p.isHost);
                            if (newHost) {
                                broadcastSystemMessage(io, roomCode, `${newHost.name} is now the host.`);
                            }
                        }
                    }
                }
            }

            rm.clearSocketRoom(socket.id);
        });

        socket.on('disconnect', () => {
            chatRateLimits.delete(socket.id);
            console.log(`[DISCONNECT] ${socket.id}`);
        });
    });
};
