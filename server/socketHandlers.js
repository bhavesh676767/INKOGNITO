const {
    createRoom,
    getRoom,
    joinRoom,
    removePlayerFromRoom,
    updateSettings,
    addCustomWord,
    removeCustomWord,
    addChatMessage
} = require('./roomManager');
const { generateRoomCode } = require('./utils/generateRoomCode');
const { sanitize } = require('./utils/sanitize');

module.exports = function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        socket.on('room:create', (playerData) => {
            const code = generateRoomCode();
            const safeName = sanitize(playerData.name);
            const playerHost = {
                id: socket.id,
                name: safeName || `Player${Math.floor(Math.random()*1000)}`,
                avatar: playerData.avatar || { hat: null, expression: null },
                isHost: true,
                isConnected: true
            };

            const room = createRoom(code, socket.id);
            joinRoom(code, playerHost);

            socket.join(code);
            socket.emit('room:created', code);
            io.to(code).emit('room:state', room);
            console.log(`Room created ${code} by ${playerHost.name}`);
        });

        socket.on('room:join', ({ roomCode, playerData }) => {
            const room = getRoom(roomCode);
            if (!room) {
                return socket.emit('room:error', { message: 'Room not found.' });
            }

            const safeName = sanitize(playerData.name);
            const player = {
                id: socket.id,
                name: safeName || `Player${Math.floor(Math.random()*1000)}`,
                avatar: playerData.avatar || { hat: null, expression: null },
                isHost: false, // In case of duplicate or someone trying to hijack
                isConnected: true
            };

            const joinedRoom = joinRoom(roomCode, player);
            if (joinedRoom && joinedRoom.error) {
                return socket.emit('room:error', { message: joinedRoom.error });
            }

            socket.join(roomCode);
            socket.emit('room:joined', roomCode);
            io.to(roomCode).emit('room:state', joinedRoom);
            console.log(`Player ${player.name} joined room ${roomCode}`);
        });

        socket.on('room:leave', ({ roomCode }) => {
            const result = removePlayerFromRoom(roomCode, socket.id);
            if (result && result.action === 'updated') {
                io.to(roomCode).emit('room:state', result.room);
            }
            socket.leave(roomCode);
            console.log(`Player ${socket.id} left room ${roomCode}`);
        });

        socket.on('room:updateSettings', ({ roomCode, settings }) => {
            const room = getRoom(roomCode);
            if (!room) return;
            
            // Only host can update
            if (socket.id !== room.hostId) return;

            // Optional: validate settings object here
            const updatedRoom = updateSettings(roomCode, settings);
            if (updatedRoom) {
                io.to(roomCode).emit('room:state', updatedRoom);
            }
        });

        socket.on('room:addCustomWord', ({ roomCode, word }) => {
            const room = getRoom(roomCode);
            if (!room) return;

            // E.g. check if custom words are enabled or player has perm
            // (Assuming host or enabled for players, let's allow host or if enabled)
            if (socket.id !== room.hostId && !room.settings.customWordsEnabled) return;

            const safeWord = sanitize(word);
            if (safeWord) {
                const updatedRoom = addCustomWord(roomCode, safeWord);
                if (updatedRoom) {
                    io.to(roomCode).emit('room:state', updatedRoom);
                }
            }
        });

        socket.on('room:removeCustomWord', ({ roomCode, word }) => {
            const room = getRoom(roomCode);
            if (!room) return;

            // Only host can remove
            if (socket.id !== room.hostId) return;

            const updatedRoom = removeCustomWord(roomCode, word);
            if(updatedRoom) {
                io.to(roomCode).emit('room:state', updatedRoom);
            }
        });

        socket.on('chat:send', ({ roomCode, message }) => {
            const room = getRoom(roomCode);
            if (!room) return;

            const player = room.players.find(p => p.id === socket.id);
            if (!player) return;

            const safeMessage = sanitize(message);
            if(safeMessage) {
                const msgObj = {
                    sender: player.name,
                    text: safeMessage,
                    timestamp: Date.now()
                };
                
                // Add to room state and broadcast
                const updatedRoom = addChatMessage(roomCode, msgObj);
                if(updatedRoom) {
                    io.to(roomCode).emit('chat:message', msgObj);
                }
            }
        });

        socket.on('game:start', ({ roomCode }) => {
            const room = getRoom(roomCode);
            if (!room) return;

            // Only host can start
            if (socket.id !== room.hostId) return;

            // Validate constraints (e.g. at least min players, though MVP might allow 1 or 2 minimum)
            // if (room.players.length < 2) return socket.emit('room:error', { message: 'Not enough players' });

            room.phase = 'starting';
            io.to(roomCode).emit('game:starting', { message: 'Game is starting...' });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            // We need to find the room this socket was in. 
            // In a better structure, socket might have attached roomCode
            // or we loop through rooms. For MVP, we loop since `rooms` isn't huge.
            const { rooms } = require('./roomManager'); // actually, we can't easily iterate Map unless exposed
            // Wait, we can. but `rooms` is inside roomManager.js.
            // Let's add an explicit helper or just loop if we expose rooms.
        });
        
        // Disconnecting handler properly
        socket.on('disconnecting', () => {
            const socketRooms = Array.from(socket.rooms); // socket.rooms is Set
            for (let roomCode of socketRooms) {
                if (roomCode !== socket.id) { // default room is socket.id
                    const result = removePlayerFromRoom(roomCode, socket.id);
                    if (result && result.action === 'updated') {
                        io.to(roomCode).emit('room:state', result.room);
                    }
                }
            }
        });
    });
};
