/* public/pregame-lobby/pregame-lobby.js */

document.addEventListener('DOMContentLoaded', () => {
    // Use shared socket client
    const socket = window.InkognitoSocket.connect();

    // =============== DOM ELEMENTS ===============
    const preloader = document.getElementById('preloader');
    const lobbyContainer = document.getElementById('lobbyContainer');
    const playersList = document.getElementById('playersList');
    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const toast = document.getElementById('lobbyToast');
    const inviteBtn = document.getElementById('inviteBtn');
    const startGameBtn = document.getElementById('startGameBtn');
    const leaveLobbyBtn = document.getElementById('leaveLobbyBtn');

    // Canvas Background
    initStarfield();

    // Settings elements
    const settingsElements = {
        maxPlayers: document.getElementById('maxPlayers'),
        turnDuration: document.getElementById('turnDuration'),
        brushSize: document.getElementById('brushSize'),
        slowMoReplay: document.getElementById('slowMoReplay'),
        numberOfImposters: document.getElementById('numberOfImposters'),
        allowVoiceChat: document.getElementById('allowVoiceChat'),
        language: document.getElementById('language'),
        inkLimit: document.getElementById('inkLimit'),
        voteTime: document.getElementById('voteTime'),
        anonymousVote: document.getElementById('anonymousVote'),
        customWordsEnabled: document.getElementById('customWordsEnabled')
    };

    // Modes elements
    const modes = {
        'Final Verdict': document.getElementById('modeFinalVerdict'),
        'Investigation': document.getElementById('modeInvestigation')
    };

    // Custom Words elements
    const customWordInput = document.getElementById('customWordInput');
    const customWordsList = document.getElementById('customWordsList');

    // =============== STATE ===============
    let currentRoomCode = null;
    let isHost = false;
    let localPlayerId = null; 
    const SESSION_TOKEN_KEY = 'inkognito_session';
    const SESSION_ROOM_KEY = 'inkognito_session_room';

    // Get player data from session storage (saved from entry page)
    const storedPlayer = sessionStorage.getItem('inkognito_player');
    const playerData = storedPlayer ? JSON.parse(storedPlayer) : {
        name: `Guest_${Math.floor(Math.random()*1000)}`,
        avatar: {
            hat: null,
            expression: null
        }
    };

    // Find room from URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomCode = normalizeRoomCode(urlParams.get('room'));
    const storedSessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const storedSessionRoom = normalizeRoomCode(sessionStorage.getItem(SESSION_ROOM_KEY));

    // Init Join or Create
    if (urlRoomCode) {
        if (storedSessionToken && storedSessionRoom === urlRoomCode) {
            socket.emit('room:reconnect', { roomCode: urlRoomCode, sessionToken: storedSessionToken });
        } else {
            socket.emit('room:join', { roomCode: urlRoomCode, playerData });
        }
    } else {
        // No room code means they came here to create a room
        socket.emit('room:create', playerData);
    }

    // =============== SOCKET LISTENERS ===============
    
    socket.on('connect', () => {
        localPlayerId = socket.id;
    });

    socket.on('room:created', (data) => {
        // Backend sends { roomCode, sessionToken }
        const code = normalizeRoomCode(typeof data === 'string' ? data : data.roomCode);
        currentRoomCode = code;
        persistSession(code, data && data.sessionToken);
        updateURL(code);
        updateRoomCodeDisplay(code);
    });

    socket.on('room:joined', (data) => {
        const code = normalizeRoomCode(typeof data === 'string' ? data : data.roomCode);
        currentRoomCode = code;
        persistSession(code, data && data.sessionToken);
        updateURL(code);
        updateRoomCodeDisplay(code);
    });

    socket.on('room:state', (room) => {
        // Hide preloader
        preloader.style.display = 'none';
        lobbyContainer.style.display = 'flex';

        // Update room code display
        if (room.roomCode) {
            currentRoomCode = room.roomCode;
            updateRoomCodeDisplay(room.roomCode);
        }

        // Check if we are host
        const myPlayer = room.players.find(p => p.id === socket.id);
        isHost = myPlayer ? myPlayer.isHost : false;

        // Update player count
        const countEl = document.getElementById('playerCount');
        const maxEl = document.getElementById('maxPlayersDisplay');
        if (countEl) countEl.textContent = room.players.filter(p => p.isConnected).length;
        if (maxEl) maxEl.textContent = room.settings.maxPlayers || 6;

        renderPlayers(room.players, room.hostId);
        renderSettings(room.settings);
        renderModes(room.settings.mode);
        renderCustomWords(room.settings.customWords || []);
        updateHostControls();
    });

    socket.on('room:error', (data) => {
        if (data && (data.code === 'NOT_IN_ROOM' || data.code === 'ROOM_NOT_FOUND')) {
            clearStoredSession(urlRoomCode || currentRoomCode);
        }
        showToast(data.message);
        // Fallback: try creating a new room or return to entry
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
    });

    socket.on('chat:newMessage', (msg) => {
        renderChatMessage(msg);
    });

    socket.on('chat:history', (messages) => {
        chatMessages.innerHTML = '';
        (messages || []).forEach(msg => renderChatMessage(msg));
    });

    socket.on('game:starting', (data) => {
        showToast(data.message);
        if (leaveLobbyBtn) leaveLobbyBtn.style.display = 'none';
        
        setTimeout(() => {
            window.location.href = `/game/game.html?room=${currentRoomCode}`;
        }, 1500);
    });

    // Host receives full settings including custom words
    socket.on('settings:updated', (data) => {
        if (data && data.settings) {
            renderSettings(data.settings);
            renderCustomWords(data.settings.customWords || []);
        }
    });

    // =============== RENDER FUNCTIONS ===============

    function renderPlayers(players, hostId) {
        playersList.innerHTML = '';
        players.forEach(player => {
            const isMe = player.id === socket.id;
            const isThisHost = player.id === hostId;

            const div = document.createElement('div');
            div.className = 'player-card';

            // Construct Avatar
            let hatHTML = player.avatar && player.avatar.hat 
                ? `<img src="${player.avatar.hat}" class="char-layer hat-layer">` : '';
            let exprHTML = player.avatar && player.avatar.expression 
                ? `<img src="${player.avatar.expression}" class="char-layer expr-layer">` : '';

            // Using base character + layers
            div.innerHTML = `
                <div class="player-avatar-wrapper">
                    <img src="/assets/characters/base_character.png" class="char-layer base-layer">
                    ${hatHTML}
                    ${exprHTML}
                </div>
                <div class="player-name">
                    ${escapeHTML(player.name)} ${isMe ? '(You)' : ''}
                </div>
                ${isThisHost ? '<img src="/assets/UI Chalk/host.png" class="host-crown" data-tooltip="Host controls the game settings">' : ''}
            `;
            playersList.appendChild(div);
        });
    }

    function renderSettings(settings) {
        // Update DOM elements matching state without triggering change events
        setElementValue(settingsElements.maxPlayers, settings.maxPlayers);
        setElementValue(settingsElements.turnDuration, settings.turnDuration);
        setElementValue(settingsElements.brushSize, settings.brushSize);
        setElementValue(settingsElements.slowMoReplay, settings.slowMoReplay);
        setElementValue(settingsElements.numberOfImposters, settings.numberOfImposters);
        setElementValue(settingsElements.allowVoiceChat, settings.allowVoiceChat);
        setElementValue(settingsElements.language, settings.language);
        setElementValue(settingsElements.inkLimit, settings.inkLimit);
        setElementValue(settingsElements.voteTime, settings.voteTime);
        setElementValue(settingsElements.anonymousVote, settings.anonymousVote);
        setElementValue(settingsElements.customWordsEnabled, settings.customWordsEnabled);

        customWordInput.disabled = !settings.customWordsEnabled;
        if (!settings.customWordsEnabled && !isHost) {
            customWordInput.placeholder = "Custom words disabled";
        } else {
            customWordInput.placeholder = "Add custom word...";
        }
    }

    function setElementValue(el, value) {
        if (!el) return;
        if (el.type === 'checkbox') {
            el.checked = value;
        } else {
            el.value = value;
        }
    }

    function renderModes(activeMode) {
        Object.values(modes).forEach(el => {
            if(el) el.classList.remove('active');
        });
        if (modes[activeMode]) {
            modes[activeMode].classList.add('active');
        }
    }

    function renderCustomWords(words) {
        customWordsList.innerHTML = '';
        words.forEach((word, index) => {
            const colorClass = `color-${index % 5}`;
            const chip = document.createElement('div');
            chip.className = `word-chip ${colorClass}`;
            chip.innerHTML = `
                <span>${escapeHTML(word)}</span>
                ${isHost ? `<span class="remove-word" data-word="${escapeHTML(word)}">×</span>` : ''}
            `;
            customWordsList.appendChild(chip);
        });
    }

    function renderChatMessage(msg) {
        const div = document.createElement('div');
        const senderName = msg.senderName || msg.sender || 'Unknown';
        if (msg.isSystem) {
            div.className = 'chat-msg system';
            div.innerHTML = `<span class="msg-sender">SYSTEM</span>${escapeHTML(msg.text)}`;
        } else {
            div.className = 'chat-msg';
            div.innerHTML = `<span class="msg-sender">${escapeHTML(senderName)}:</span> <span class="msg-text">${escapeHTML(msg.text)}</span>`;
        }
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // =============== EVENT LISTENERS (UI -> SOCKET) ===============

    // Settings changes
    const emitSettingsUpdate = () => {
        if (!isHost || !currentRoomCode) return;
        const newSettings = {
            maxPlayers: parseInt(settingsElements.maxPlayers.value),
            turnDuration: parseInt(settingsElements.turnDuration.value),
            brushSize: parseInt(settingsElements.brushSize.value),
            slowMoReplay: settingsElements.slowMoReplay.checked,
            numberOfImposters: parseInt(settingsElements.numberOfImposters.value),
            allowVoiceChat: settingsElements.allowVoiceChat.checked,
            language: settingsElements.language.value,
            inkLimit: parseInt(settingsElements.inkLimit.value),
            voteTime: parseInt(settingsElements.voteTime.value),
            anonymousVote: settingsElements.anonymousVote.checked,
            customWordsEnabled: settingsElements.customWordsEnabled.checked
        };
        socket.emit('room:updateSettings', { roomCode: currentRoomCode, settings: newSettings });
    };

    Object.values(settingsElements).forEach(el => {
        if(el) {
            el.addEventListener('change', emitSettingsUpdate);
        }
    });

    // Mode Selection
    Object.keys(modes).forEach(modeKey => {
        const el = modes[modeKey];
        if (el) {
            el.addEventListener('click', () => {
                if (!isHost || !currentRoomCode) return;
                socket.emit('room:updateSettings', { roomCode: currentRoomCode, settings: { mode: modeKey } });
            });
        }
    });

    // Custom Words Add 
    customWordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = customWordInput.value.trim();
            if (val && currentRoomCode) {
                // Anyone can add word if custom words enabled and host allows
                // Logic mostly handled in backend
                socket.emit('room:addCustomWord', { roomCode: currentRoomCode, word: val });
                customWordInput.value = '';
            }
        }
    });

    // Custom Words Remove
    customWordsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-word') && isHost && currentRoomCode) {
            const word = e.target.getAttribute('data-word');
            socket.emit('room:removeCustomWord', { roomCode: currentRoomCode, word });
        }
    });

    // Chat
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = chatInput.value.trim();
        if (msg && currentRoomCode) {
            socket.emit('chat:send', { roomCode: currentRoomCode, message: msg });
            chatInput.value = '';
        }
    });

    // Start Game
    startGameBtn.addEventListener('click', () => {
        if (!isHost || !currentRoomCode) return;
        socket.emit('game:start', { roomCode: currentRoomCode });
    });

    // Invite
    inviteBtn.addEventListener('click', () => {
        if (!currentRoomCode) return;
        const urlToCopy = window.location.origin + '/join?room=' + currentRoomCode;
        
        // Copy to clipboard
        navigator.clipboard.writeText(urlToCopy).then(() => {
            showToast('Invite link copied!');
        }).catch(err => {
            // Fallback
            const input = document.getElementById('copyUrlInput');
            input.value = urlToCopy;
            input.focus();
            input.select();
            try {
                document.execCommand('copy');
                showToast('Invite link copied!');
            } catch(e) {
                showToast('Failed to copy link. Code: ' + currentRoomCode);
            }
        });
    });

    // Leave Lobby
    if(leaveLobbyBtn) {
        leaveLobbyBtn.addEventListener('click', () => {
            if (currentRoomCode) {
                socket.emit('room:leave', { roomCode: currentRoomCode });
            }
            clearStoredSession(currentRoomCode);
            window.location.href = '/';
        });
    }

    // =============== HOST CONTROLS ===============
    function updateHostControls() {
        // Enable/disable host controls
        if (isHost) {
            Object.values(settingsElements).forEach(el => {
                if (el) el.disabled = false;
            });
            startGameBtn.disabled = false;
        } else {
            Object.values(settingsElements).forEach(el => {
                if (el) el.disabled = true;
            });
            startGameBtn.disabled = true;
        }
        
        // Show leave lobby button in lobby phase
        if (leaveLobbyBtn) {
            leaveLobbyBtn.style.display = 'block';
        }
    }

    // =============== UTILS ===============

    function updateURL(code) {
        const url = new URL(window.location);
        url.searchParams.set('room', code);
        window.history.replaceState({}, '', url);
    }

    function normalizeRoomCode(code) {
        return typeof code === 'string' && code.trim() ? code.trim().toUpperCase() : null;
    }

    function persistSession(code, sessionToken) {
        if (sessionToken) {
            sessionStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
        }
        if (code) {
            sessionStorage.setItem(SESSION_ROOM_KEY, code);
        }
    }

    function clearStoredSession(roomCode) {
        const storedRoom = normalizeRoomCode(sessionStorage.getItem(SESSION_ROOM_KEY));
        if (!roomCode || !storedRoom || storedRoom === normalizeRoomCode(roomCode)) {
            sessionStorage.removeItem(SESSION_TOKEN_KEY);
            sessionStorage.removeItem(SESSION_ROOM_KEY);
        }
    }

    function updateRoomCodeDisplay(code) {
        const roomCodeVal = document.getElementById('roomCodeVal');
        if (roomCodeVal) roomCodeVal.textContent = code;
    }

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    // =============== STARFIELD BACKGROUND ===============
    function initStarfield() {
        let canvas = document.getElementById('starfield');
        if (!canvas) {
            // Create starfield canvas dynamically if it doesn't exist
            canvas = document.createElement('canvas');
            canvas.id = 'starfield';
            canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;';
            const lobbyEl = document.getElementById('lobbyContainer');
            if (lobbyEl) lobbyEl.prepend(canvas);
            else return;
        }
        const ctx = canvas.getContext('2d');
        
        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        window.addEventListener('resize', () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            initStars();
        });

        const STARS_COUNT = 150;
        let stars = [];

        function initStars() {
            stars = [];
            for (let i = 0; i < STARS_COUNT; i++) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    radius: Math.random() * 1.5,
                    vx: (Math.random() - 0.5) * 0.15, // gentle drift
                    vy: (Math.random() - 0.5) * 0.15, // gentle drift
                    alpha: Math.random() * 0.8 + 0.2, // min alpha 0.2
                    dAlpha: (Math.random() - 0.5) * 0.005 // very slow twinkle
                });
            }
        }

        function drawStars() {
            ctx.clearRect(0, 0, width, height);
            
            stars.forEach(star => {
                star.x += star.vx;
                star.y += star.vy;
                
                // Wrap around edges
                if (star.x < 0) star.x = width;
                if (star.x > width) star.x = 0;
                if (star.y < 0) star.y = height;
                if (star.y > height) star.y = 0;

                // Gentle twinkle
                star.alpha += star.dAlpha;
                if (star.alpha <= 0.2 || star.alpha >= 1) {
                    star.dAlpha *= -1; // reverse twinkle
                    // Clamp
                    star.alpha = Math.max(0.2, Math.min(1, star.alpha));
                }

                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
                ctx.fill();
            });

            requestAnimationFrame(drawStars);
        }

        initStars();
        drawStars();
    }

});
