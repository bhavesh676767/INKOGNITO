/**
 * GameLogic — Server-authoritative game state machine.
 * 
 * Controls: role assignment, prompt selection, turn system,
 *           drawing ink, voting, win conditions, restart.
 * 
 * All timers are server-side. Clients never decide phase changes.
 */
const { getRoom } = require('./roomManager');
const { S2C, PHASE } = require('./constants/events');

// ─── Word Pool ───
const WORDS = [
    'Penguin', 'Spaceship', 'Dragon', 'Grandma', 'Robot', 'Castle',
    'Octopus', 'Volcano', 'Wizard', 'Ninja', 'Astronaut', 'Pizza',
    'Hamburger', 'Vampire', 'Unicorn', 'Mermaid', 'Guitar', 'Tornado',
    'Helicopter', 'Snowman', 'Pirate', 'Dinosaur', 'Rainbow', 'Skeleton',
    'Lighthouse', 'Cactus', 'Mushroom', 'Crown', 'Anchor', 'Campfire',
    'Submarine', 'Flamingo', 'Treasure', 'Waterfall', 'Compass', 'Comet',
];

// Active timer references for cleanup
const activeTimers = new Map(); // roomCode → { timerId, type }

// ────────────────────────────────────────────────────────
// Timer Management
// ────────────────────────────────────────────────────────

function setGameTimer(roomCode, callback, duration) {
    clearGameTimer(roomCode);
    const timerId = setTimeout(callback, duration);
    activeTimers.set(roomCode, { timerId, startedAt: Date.now(), duration });
}

function clearGameTimer(roomCode) {
    const entry = activeTimers.get(roomCode);
    if (entry) {
        clearTimeout(entry.timerId);
        activeTimers.delete(roomCode);
    }
}

// ────────────────────────────────────────────────────────
// Game Start
// ────────────────────────────────────────────────────────

function startGame(roomCode, io) {
    const room = getRoom(roomCode);
    if (!room) return { error: 'Room not found.' };

    const connectedPlayers = room.players.filter(p => p.isConnected);
    if (connectedPlayers.length < 4) {
        return { error: 'Minimum 4 players required to start.' };
    }

    // ── Phase: Prompt Assignment ──
    room.phase = PHASE.PROMPT;

    // Shuffle & assign roles
    const shuffled = [...connectedPlayers].sort(() => Math.random() - 0.5);
    const inkognitoCount = Math.min(
        room.settings.numberOfImposters || 1,
        Math.max(1, Math.floor(shuffled.length / 2) - 1)
    );

    const roles = {};
    shuffled.forEach((p, i) => {
        roles[p.id] = i < inkognitoCount ? 'Inkognito' : 'Artist';
    });

    // Pick prompt
    const pool = (room.settings.customWordsEnabled && room.settings.customWords.length > 0)
        ? room.settings.customWords
        : WORDS;
    const prompt = pool[Math.floor(Math.random() * pool.length)];

    // Build turn order & ink
    const turnOrder = shuffled.map(p => p.id);
    const inkLeft = {};
    const initialInk = room.settings.inkLimit || 50;
    turnOrder.forEach(id => { inkLeft[id] = initialInk; });

    room.gameState = {
        prompt,
        roles,
        turnOrder,
        currentTurnIndex: 0,
        currentRound: 1,
        totalRounds: 2,
        wrongVotes: 0,
        votes: {},
        inkLeft,
    };

    // ── Broadcast public state (no roles/prompt) ──
    const rm = require('./roomManager');
    io.to(roomCode).emit(S2C.ROOM_UPDATE, rm.getPublicRoomState(room));

    // ── Send private role to each player ──
    // Collect impostor info to share with other impostors
    const impostors = room.players.filter(p => roles[p.id] === 'Inkognito').map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar
    }));

    room.players.forEach(p => {
        const role = roles[p.id];
        if (!role) return; // disconnected players without role
        
        let teammates = null;
        if (role === 'Inkognito' && impostors.length > 1) {
            teammates = impostors.filter(imp => imp.id !== p.id);
        }

        const privatePayload = {
            role,
            prompt: role === 'Artist' ? prompt : null,
            teammates,
            message: role === 'Artist'
                ? `You are an Artist. The secret word is: ${prompt}`
                : `You are the Inkognito! Try to blend in.`,
        };
        io.to(p.id).emit(S2C.GAME_ROLE, privatePayload);
    });

    // System chat message
    const msgObj = {
        id: genId(),
        senderId: '__system',
        senderName: 'SYSTEM',
        text: 'The game has started! Roles have been assigned.',
        timestamp: Date.now(),
        isSystem: true,
    };
    rm.addChatMessage(roomCode, msgObj);
    io.to(roomCode).emit(S2C.CHAT_NEW_MESSAGE, msgObj);

    // ── Start first turn after cinematic sequence delay ──
    // 3s countdown + 3s role reveal + 3s word reveal = 9s total
    setGameTimer(roomCode, () => {
        startTurn(roomCode, io);
    }, 12000);

    return { success: true };
}

// ────────────────────────────────────────────────────────
// Turn System
// ────────────────────────────────────────────────────────

function startTurn(roomCode, io) {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return;

    room.phase = PHASE.DRAWING;
    const gs = room.gameState;
    const currentPlayerId = gs.turnOrder[gs.currentTurnIndex];

    // Skip disconnected players
    const player = room.players.find(p => p.id === currentPlayerId);
    if (!player || !player.isConnected) {
        advanceTurn(roomCode, io);
        return;
    }

    const duration = room.settings.turnDuration || 20;

    // Broadcast turn start
    io.to(roomCode).emit(S2C.GAME_TURN_START, {
        activePlayerId: currentPlayerId,
        activePlayerName: player.name,
        duration,
        round: gs.currentRound,
    });

    // Update public state
    const rm = require('./roomManager');
    io.to(roomCode).emit(S2C.ROOM_UPDATE, rm.getPublicRoomState(room));

    // Timer to end turn
    setGameTimer(roomCode, () => {
        io.to(roomCode).emit(S2C.GAME_TURN_END, { activePlayerId: currentPlayerId });
        advanceTurn(roomCode, io);
    }, duration * 1000);
}

function advanceTurn(roomCode, io) {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return;

    const gs = room.gameState;
    gs.currentTurnIndex++;

    // Did everyone draw this round?
    if (gs.currentTurnIndex >= gs.turnOrder.length) {
        gs.currentTurnIndex = 0;

        if (room.settings.mode === 'Investigation') {
            startVoting(roomCode, io);
        } else {
            // Final Verdict — keep drawing until totalRounds done
            gs.currentRound++;
            if (gs.currentRound > gs.totalRounds) {
                startVoting(roomCode, io);
            } else {
                startTurn(roomCode, io);
            }
        }
    } else {
        startTurn(roomCode, io);
    }
}

// ────────────────────────────────────────────────────────
// Voting
// ────────────────────────────────────────────────────────

function startVoting(roomCode, io) {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return;

    room.phase = PHASE.VOTING;
    room.gameState.votes = {};

    const voteTime = room.settings.voteTime || 30;

    io.to(roomCode).emit(S2C.GAME_VOTE_START, { duration: voteTime });
    const rm = require('./roomManager');
    io.to(roomCode).emit(S2C.ROOM_UPDATE, rm.getPublicRoomState(room));

    setGameTimer(roomCode, () => {
        endVoting(roomCode, io);
    }, voteTime * 1000);
}

function submitVote(roomCode, voterId, suspectId, io) {
    const room = getRoom(roomCode);
    if (!room || room.phase !== PHASE.VOTING || !room.gameState) return false;

    // Validate voter is in room
    const voter = room.players.find(p => p.id === voterId && p.isConnected);
    if (!voter) return false;

    // Validate suspect is in room
    const suspect = room.players.find(p => p.id === suspectId);
    if (!suspect) return false;

    // Cannot vote for yourself
    if (voterId === suspectId) return false;

    room.gameState.votes[voterId] = suspectId;

    const connectedPlayers = room.players.filter(p => p.isConnected).length;
    const submittedVotes = Object.keys(room.gameState.votes).length;
    if (io && submittedVotes >= connectedPlayers) {
        endVoting(roomCode, io);
    }

    return true;
}

function endVoting(roomCode, io) {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return;

    clearGameTimer(roomCode);

    const gs = room.gameState;
    const votes = gs.votes;

    // Tally
    const counts = {};
    let maxVotes = 0;
    let suspectedId = null;
    let tie = false;

    for (const vId in votes) {
        const sId = votes[vId];
        counts[sId] = (counts[sId] || 0) + 1;
        if (counts[sId] > maxVotes) {
            maxVotes = counts[sId];
            suspectedId = sId;
            tie = false;
        } else if (counts[sId] === maxVotes) {
            tie = true;
        }
    }

    const wasInkognitoVotedOut = !tie && suspectedId && gs.roles[suspectedId] === 'Inkognito';

    if (room.settings.mode === 'Investigation') {
        if (wasInkognitoVotedOut) {
            endGame(roomCode, io, 'Artists', 'The Inkognito was correctly identified!');
        } else {
            gs.wrongVotes++;
            if (gs.wrongVotes >= 3) {
                endGame(roomCode, io, 'Inkognito', '3 wrong votes! Inkognito escapes.');
            } else {
                gs.currentRound++;
                if (gs.currentRound > gs.totalRounds) {
                    endGame(roomCode, io, 'Inkognito', 'Artists ran out of rounds.');
                } else {
                    // Show result then continue
                    io.to(roomCode).emit(S2C.GAME_VOTE_RESULT, {
                        suspectedId,
                        tie,
                        wrongVotes: gs.wrongVotes,
                        correct: false,
                    });
                    setGameTimer(roomCode, () => {
                        startTurn(roomCode, io);
                    }, 7000);
                }
            }
        }
    } else {
        // Final Verdict
        if (wasInkognitoVotedOut) {
            endGame(roomCode, io, 'Artists', 'The Artists correctly caught the Inkognito!');
        } else {
            endGame(roomCode, io, 'Inkognito', 'The Inkognito fooled everyone!');
        }
    }
}

// ────────────────────────────────────────────────────────
// End Game
// ────────────────────────────────────────────────────────

function endGame(roomCode, io, winner, reason) {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return;

    clearGameTimer(roomCode);
    room.phase = PHASE.END;

    // Now it's OK to reveal roles and prompt
    io.to(roomCode).emit(S2C.GAME_END, {
        winner,
        reason,
        roles: room.gameState.roles,
        prompt: room.gameState.prompt,
    });

    const rm = require('./roomManager');
    io.to(roomCode).emit(S2C.ROOM_UPDATE, rm.getPublicRoomState(room));

    // System message
    const msgObj = {
        id: genId(),
        senderId: '__system',
        senderName: 'SYSTEM',
        text: `Game Over! ${winner} win — ${reason}`,
        timestamp: Date.now(),
        isSystem: true,
    };
    rm.addChatMessage(roomCode, msgObj);
    io.to(roomCode).emit(S2C.CHAT_NEW_MESSAGE, msgObj);
}

// ────────────────────────────────────────────────────────
// Restart / Return to Lobby
// ────────────────────────────────────────────────────────

function returnToLobby(roomCode, io) {
    const room = getRoom(roomCode);
    if (!room) return;

    clearGameTimer(roomCode);
    room.phase = PHASE.LOBBY;
    room.gameState = null;

    const rm = require('./roomManager');
    io.to(roomCode).emit(S2C.ROOM_UPDATE, rm.getPublicRoomState(room));

    const msgObj = {
        id: genId(),
        senderId: '__system',
        senderName: 'SYSTEM',
        text: 'Returned to lobby.',
        timestamp: Date.now(),
        isSystem: true,
    };
    rm.addChatMessage(roomCode, msgObj);
    io.to(roomCode).emit(S2C.CHAT_NEW_MESSAGE, msgObj);
}

function restartGame(roomCode, io) {
    const room = getRoom(roomCode);
    if (!room) return;

    clearGameTimer(roomCode);
    room.gameState = null;

    // Directly start a new game
    return startGame(roomCode, io);
}

// ────────────────────────────────────────────────────────
// Ink Management
// ────────────────────────────────────────────────────────

function decreaseInk(roomCode, playerId, amount) {
    const room = getRoom(roomCode);
    if (!room || room.phase !== PHASE.DRAWING || !room.gameState) return 0;

    let ink = room.gameState.inkLeft[playerId] || 0;
    ink = Math.max(0, ink - amount);
    room.gameState.inkLeft[playerId] = ink;
    return ink;
}

// ────────────────────────────────────────────────────────
// Validation Helpers
// ────────────────────────────────────────────────────────

function isCurrentDrawer(roomCode, socketId) {
    const room = getRoom(roomCode);
    if (!room || !room.gameState || room.phase !== PHASE.DRAWING) return false;
    const gs = room.gameState;
    return gs.turnOrder[gs.currentTurnIndex] === socketId;
}

// ────────────────────────────────────────────────────────
// Utility
// ────────────────────────────────────────────────────────

function genId() {
    return Math.random().toString(36).substring(2, 9);
}

module.exports = {
    startGame,
    startTurn,
    advanceTurn,
    startVoting,
    submitVote,
    endGame,
    returnToLobby,
    restartGame,
    decreaseInk,
    isCurrentDrawer,
    clearGameTimer,
};
