/**
 * INKOGNITO — Game Screen Controller
 *
 * Full state machine:
 *   drawing → voting → voteResult → winner → (lobby or restart)
 *
 * Role mapping for UI:
 *   Backend "Artist"    → Display "Crew"
 *   Backend "Inkognito" → Display "Impostor"
 */
document.addEventListener('DOMContentLoaded', () => {
    // ══════════════════════════════════════════════
    // STATE
    // ══════════════════════════════════════════════
    let socket;
    const roomCode = normalizeRoomCode(new URLSearchParams(window.location.search).get('room'));
    let playerData = null;
    let currentRoom = null;
    let myRole = null;        // "Artist" or "Inkognito" from server
    let myPrompt = '???';
    let isHost = false;
    const SESSION_TOKEN_KEY = 'inkognito_session';
    const SESSION_ROOM_KEY = 'inkognito_session_room';

    // Drawing
    let isDrawing = false;
    let currentColor = '#ffffff';
    let currentBrushSize = 3;
    let maxInk = 50;
    let currentInk = 50;
    let lastX = 0, lastY = 0;
    let currentStroke = null;

    // Voting
    let selectedVoteTarget = null;
    let voteLocked = false;

    // Timer
    let activeTimerInterval = null;

    // Cinematic tracking
    let cinematicPlayed = false;
    let roleReceived = false;

    // ══════════════════════════════════════════════
    // DOM REFS
    // ══════════════════════════════════════════════
    const canvas        = document.getElementById('drawingCanvas');
    const ctx           = canvas.getContext('2d');
    const playerListEl  = document.getElementById('playerList');
    const turnTimerEl   = document.getElementById('turnTimer');
    const promptEl      = document.getElementById('promptDisplay');
    const drawerTextEl  = document.getElementById('drawerText');
    const inkFillEl     = document.getElementById('inkFill');
    const colorBtns     = document.querySelectorAll('.color-btn');

    // Overlays
    const gameContainer     = document.getElementById('gameContainer');
    const votingOverlay     = document.getElementById('votingOverlay');
    const voteResultOverlay = document.getElementById('voteResultOverlay');
    const winnerOverlay     = document.getElementById('winnerOverlay');

    // Voting
    const voteCardsEl     = document.getElementById('voteCards');
    const voteTimerEl     = document.getElementById('voteTimer');
    const voteProgressEl  = document.getElementById('voteProgress');
    const voteSubtitleEl  = document.getElementById('voteSubtitle');
    const voteConfirmBtn  = document.getElementById('voteConfirmBtn');

    // Cinematic Start
    const cinematicOverlay   = document.getElementById('cinematicOverlay');
    const cinematicCountdown = document.getElementById('cinematicCountdown');
    const countdownNumber    = document.getElementById('countdownNumber');
    const cinematicRole      = document.getElementById('cinematicRole');
    const roleTitle          = document.getElementById('roleTitle');
    const roleDesc           = document.getElementById('roleDesc');
    const roleTeammates      = document.getElementById('roleTeammates');
    const cinematicWord      = document.getElementById('cinematicWord');
    const wordPreText        = document.getElementById('wordPreText');
    const wordRevealText     = document.getElementById('wordRevealText');

    // Winner
    const winnerHeadlineEl = document.getElementById('winnerHeadline');
    const winnerReasonEl   = document.getElementById('winnerReason');
    const revealWordEl     = document.getElementById('revealWord');
    const winnerRolesEl    = document.getElementById('winnerRoles');
    const playAgainBtn     = document.getElementById('playAgainBtn');
    const backToLobbyBtn   = document.getElementById('backToLobbyBtn');

    // ══════════════════════════════════════════════
    // INIT
    // ══════════════════════════════════════════════
    init();

    function init() {
        if (!roomCode) { window.location.href = '/'; return; }

        const saved = sessionStorage.getItem('inkognito_player');
        if (!saved) { window.location.href = `/?room=${roomCode}`; return; }
        playerData = JSON.parse(saved);

        connectSocket();
        setupCanvas();
        setupColorPalette();
        setupChat();
        setupVoting();
        setupWinnerActions();

        // Preloader will be hidden once room:state arrives
    }

    // ══════════════════════════════════════════════
    // ROLE DISPLAY HELPER
    // ══════════════════════════════════════════════
    function displayRole(backendRole) {
        if (backendRole === 'Inkognito') return 'Impostor';
        return 'Crew';
    }

    function displayWinner(backendWinner) {
        if (backendWinner === 'Inkognito') return 'Impostor';
        if (backendWinner === 'Artists')   return 'Crew';
        return backendWinner;
    }

    // ══════════════════════════════════════════════
    // PHASE MANAGEMENT
    // ══════════════════════════════════════════════
    function showPhase(phase) {
        // Hide all overlays initially
        votingOverlay.style.display = 'none';
        voteResultOverlay.style.display = 'none';
        winnerOverlay.style.display = 'none';
        cinematicOverlay.style.display = 'none';

        if (phase === 'drawing' || phase === 'prompt') {
            gameContainer.style.display = 'flex';
        } else if (phase === 'starting') {
            gameContainer.style.display = 'none';
            cinematicOverlay.style.display = 'flex';
        } else if (phase === 'voting') {
            gameContainer.style.display = 'none';
            votingOverlay.style.display = 'flex';
        } else if (phase === 'voteResult') {
            gameContainer.style.display = 'none';
            voteResultOverlay.style.display = 'flex';
        } else if (phase === 'end') {
            gameContainer.style.display = 'none';
            winnerOverlay.style.display = 'flex';
        } else if (phase === 'lobby') {
            // Go back to lobby
            window.location.href = `/pregame-lobby/pregame-lobby.html?room=${roomCode}`;
        }
    }

    // ══════════════════════════════════════════════
    // CINEMATIC START SEQUENCE
    // ══════════════════════════════════════════════
    function playCinematicStart() {
        cinematicOverlay.style.display = 'flex';
        
        // 1. Hide all steps
        cinematicCountdown.style.display = 'none';
        cinematicRole.style.display = 'none';
        cinematicWord.style.display = 'none';

        // 2. Start Countdown
        cinematicCountdown.style.display = 'flex';
        let count = 3;
        countdownNumber.textContent = count;
        
        const countInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownNumber.textContent = count;
                countdownNumber.style.animation = 'none';
                void countdownNumber.offsetWidth; // trigger reflow
                countdownNumber.style.animation = 'titlePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both';
            } else {
                clearInterval(countInterval);
                playRoleReveal();
            }
        }, 1000);
    }

    function playRoleReveal() {
        cinematicCountdown.style.display = 'none';
        cinematicRole.style.display = 'flex';
        
        // Let it show for 3 seconds
        setTimeout(() => {
            playWordReveal();
        }, 3000);
    }

    function playWordReveal() {
        cinematicRole.style.display = 'none';
        cinematicWord.style.display = 'flex';
        
        // After 3 seconds, the backend will send game:turnStart which handles fading out 
        // the cinematic overlay and fading in the drawing phase.
    }

    // ══════════════════════════════════════════════
    // SOCKET CONNECTION & EVENTS
    // ══════════════════════════════════════════════
    function connectSocket() {
        socket = window.InkognitoSocket ? window.InkognitoSocket.connect() : io();

        socket.on('connect', () => {
            const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
            const sessionRoom = normalizeRoomCode(sessionStorage.getItem(SESSION_ROOM_KEY));

            if (sessionToken && sessionRoom === roomCode) {
                socket.emit('room:reconnect', { roomCode, sessionToken });
            } else {
                socket.emit('room:join', { roomCode, playerData });
            }
        });

        socket.on('room:joined', (data) => {
            const joinedRoomCode = normalizeRoomCode(typeof data === 'string' ? data : data && data.roomCode) || roomCode;
            if (data && data.sessionToken) {
                sessionStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
            }
            sessionStorage.setItem(SESSION_ROOM_KEY, joinedRoomCode);
        });

        // ── Room State ──
        socket.on('room:state', (room) => {
            currentRoom = room;
            maxInk = (room.settings && room.settings.inkLimit) || 50;
            currentBrushSize = (room.settings && room.settings.brushSize) || 3;

            const me = room.players.find(p => p.id === socket.id);
            isHost = me ? me.isHost : false;

            // Hide preloader on first state
            const pre = document.getElementById('preloader');
            if (pre) {
                pre.classList.add('hidden');
                setTimeout(() => pre.remove(), 500);
            }

            renderPlayerList(room);
            updateInkMeter(room);

            // Phase-driven UI
            if (room.phase === 'voting') {
                showPhase('voting');
            } else if (room.phase === 'end') {
                // Winner overlay is triggered by game:end event
            } else if (room.phase === 'lobby') {
                showPhase('lobby');
            } else if (room.phase === 'prompt' || room.phase === 'starting') {
                // Game is starting — cinematic will trigger once role is received
                if (!cinematicPlayed && roleReceived) {
                    cinematicPlayed = true;
                    showPhase('starting');
                    playCinematicStart();
                } else if (!cinematicPlayed) {
                    // Show a waiting state until role arrives
                    showPhase('starting');
                }
            } else if (room.phase === 'drawing') {
                // We joined mid-game, show drawing phase directly
                if (!cinematicPlayed) {
                    cinematicPlayed = true; // skip cinematic
                }
                showPhase('drawing');
            }
        });

        // ── Room Error ──
        socket.on('room:error', (data) => {
            console.error('[INKOGNITO] Room Error:', data);
            if (data && (data.code === 'NOT_IN_ROOM' || data.code === 'ROOM_NOT_FOUND')) {
                clearStoredSession(roomCode);
            }
            alert(data.message || 'An error occurred while joining the room.');
            window.location.href = '/';
        });

        socket.on('connect_error', (err) => {
            console.error('[INKOGNITO] Connection Error:', err);
            // Don't immediately fail, socket.io will retry
        });

        // ── Role Assignment ──
        socket.on('game:role', (data) => {
            myRole = data.role;
            roleReceived = true;
            if (myRole === 'Artist' && data.prompt) {
                myPrompt = data.prompt;
            } else {
                myPrompt = '???';
            }
            promptEl.textContent = myPrompt;

            // Update Cinematic overlay elements
            if (myRole === 'Artist') {
                roleTitle.textContent = 'Crew';
                roleTitle.className = 'role-title crew';
                roleDesc.textContent = 'Draw the word and find the fake.';
                roleTeammates.style.display = 'none';
                
                wordPreText.textContent = 'The word is:';
                wordRevealText.textContent = myPrompt;
                wordRevealText.className = 'word-reveal-text crew-word';
            } else {
                roleTitle.textContent = 'Impostor';
                roleTitle.className = 'role-title impostor';
                roleDesc.textContent = "Blend in and don't get caught.";
                
                if (data.teammates && data.teammates.length > 0) {
                    roleTeammates.style.display = 'flex';
                    roleTeammates.innerHTML = `<span>Teammates:</span> ` + 
                        data.teammates.map(t => `<div class="teammate-pill"><img src="${t.avatar && t.avatar.hat||''}" class="tm-hat"> ${t.name}</div>`).join('');
                } else {
                    roleTeammates.style.display = 'none';
                }

                wordPreText.textContent = 'Your objective:';
                wordRevealText.textContent = 'Guess the word by observing others.';
                wordRevealText.className = 'word-reveal-text impostor-word';
            }

            // If we haven't played the cinematic yet and the room phase is appropriate, start it now
            if (!cinematicPlayed && currentRoom && (currentRoom.phase === 'prompt' || currentRoom.phase === 'starting')) {
                cinematicPlayed = true;
                showPhase('starting');
                playCinematicStart();
            }
        });

        // ── Turn System ──
        socket.on('game:turnStart', (data) => {
            showPhase('drawing');
            const { activePlayerId, activePlayerName, duration } = data;

            drawerTextEl.innerHTML = `<strong>${activePlayerName}</strong> is Drawing`;

            // Enable canvas only for active drawer
            if (activePlayerId === socket.id) {
                canvas.classList.remove('disabled');
            } else {
                canvas.classList.add('disabled');
            }

            // Countdown
            startTimer(turnTimerEl, duration);

            // Highlight in player list
            document.querySelectorAll('.player-card').forEach(el => {
                el.classList.toggle('active-drawer', el.dataset.id === activePlayerId);
            });
        });

        socket.on('game:turnEnd', () => {
            canvas.classList.add('disabled');
            clearTimer();
            turnTimerEl.textContent = '--s';
        });

        // ── Drawing ──
        socket.on('draw:stroke', (stroke) => {
            renderStroke(stroke);
        });

        socket.on('game:outOfInk', () => {
            isDrawing = false;
        });

        // ── Voting ──
        socket.on('game:voteStart', (data) => {
            showPhase('voting');
            resetVotingUI();
            buildVoteCards();
            startTimer(voteTimerEl, data.duration, true);
        });

        socket.on('game:voteResult', (data) => {
            // Investigation mode: show intermediate result
            showVoteResult(data);
        });

        // ── Game End ──
        socket.on('game:end', (data) => {
            showWinnerScreen(data);
        });

        // ── Game Starting (from lobby or restart — may not be received if page just loaded) ──
        socket.on('game:starting', () => {
            drawerTextEl.textContent = 'Game starting...';
            // Cinematic will be triggered once role is received
        });

        // ── Chat History ──
        socket.on('chat:history', (messages) => {
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.innerHTML = '';
            (messages || []).forEach(msg => appendChatMessage(msg));
        });
    }

    // ══════════════════════════════════════════════
    // TIMER
    // ══════════════════════════════════════════════
    function startTimer(el, duration, isVote = false) {
        clearTimer();
        let timeLeft = duration;
        el.textContent = `${timeLeft}s`;
        el.classList.remove('urgent');

        activeTimerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft < 0) timeLeft = 0;
            el.textContent = `${timeLeft}s`;

            if (isVote && timeLeft <= 5) {
                el.classList.add('urgent');
            }

            if (timeLeft === 0) clearTimer();
        }, 1000);
    }

    function clearTimer() {
        if (activeTimerInterval) {
            clearInterval(activeTimerInterval);
            activeTimerInterval = null;
        }
    }

    // ══════════════════════════════════════════════
    // PLAYER LIST (Drawing Phase sidebar)
    // ══════════════════════════════════════════════
    function renderPlayerList(room) {
        playerListEl.innerHTML = '';
        const players = room.players.filter(p => p.isConnected);
        let activeId = null;
        if (room.gameState && room.gameState.turnOrder) {
            activeId = room.gameState.turnOrder[room.gameState.currentTurnIndex];
        }

        players.forEach(p => {
            const div = document.createElement('div');
            div.className = 'player-card' + (p.id === activeId ? ' active-drawer' : '');
            div.dataset.id = p.id;

            const isMe = p.id === socket.id ? ' (You)' : '';
            const crown = p.isHost ? ' 👑' : '';

            div.innerHTML = `
                <div class="avatar-wrapper">
                    <img src="/assets/characters/base_character.png" class="avatar-layer">
                    ${p.avatar && p.avatar.hat ? `<img src="${p.avatar.hat}" class="avatar-layer">` : ''}
                    ${p.avatar && p.avatar.expression ? `<img src="${p.avatar.expression}" class="avatar-layer">` : ''}
                </div>
                <div class="player-name">${p.name}${isMe}${crown}</div>
            `;
            playerListEl.appendChild(div);
        });
    }

    function updateInkMeter(room) {
        if (!room.gameState || !room.gameState.inkLeft) return;
        const activeId = room.gameState.turnOrder[room.gameState.currentTurnIndex];
        const ink = room.gameState.inkLeft[activeId] || 0;
        const max = (room.settings && room.settings.inkLimit) || 50;
        inkFillEl.style.height = `${(ink / max) * 100}%`;
        if (activeId === socket.id) currentInk = ink;
    }

    // ══════════════════════════════════════════════
    // CHAT
    // ══════════════════════════════════════════════
    function setupChat() {
        const chatForm = document.getElementById('chatForm');
        const chatInput = document.getElementById('chatInput');

        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text) return;
            socket.emit('chat:send', { roomCode, message: text });
            chatInput.value = '';
        });

        socket.on('chat:newMessage', (msg) => {
            appendChatMessage(msg);
        });
    }

    function appendChatMessage(msg) {
        const chatMessages = document.getElementById('chatMessages');
        const div = document.createElement('div');
        if (msg.isSystem) {
            div.className = 'chat-message system-msg';
            div.textContent = msg.text;
        } else {
            div.className = 'chat-message';
            div.innerHTML = `<span class="sender">${msg.senderName || msg.sender}:</span> ${msg.text}`;
        }
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // ══════════════════════════════════════════════
    // DRAWING
    // ══════════════════════════════════════════════
    function setupColorPalette() {
        colorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                colorBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentColor = btn.dataset.color;
            });
        });
    }

    function setupCanvas() {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const getCoords = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            let cx = e.clientX, cy = e.clientY;
            if (e.touches && e.touches.length > 0) {
                cx = e.touches[0].clientX;
                cy = e.touches[0].clientY;
            }
            return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
        };

        const startDraw = (e) => {
            if (canvas.classList.contains('disabled') || currentInk <= 0) return;
            isDrawing = true;
            currentStroke = {
                color: currentColor,
                brushSize: currentBrushSize * 2,
                points: [],
                playerId: socket.id,
                timestamp: Date.now()
            };
            const c = getCoords(e);
            lastX = c.x; lastY = c.y;
            currentStroke.points.push({ x: lastX, y: lastY });
            ctx.beginPath();
            ctx.fillStyle = currentColor;
            ctx.arc(lastX, lastY, currentBrushSize, 0, Math.PI * 2);
            ctx.fill();
            e.preventDefault();
        };

        const draw = (e) => {
            if (!isDrawing) return;
            if (currentInk <= 0) { stopDraw(); return; }
            const c = getCoords(e);
            if (Math.abs(c.x - lastX) > 2 || Math.abs(c.y - lastY) > 2) {
                currentStroke.points.push({ x: c.x, y: c.y });
                ctx.beginPath();
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = currentBrushSize * 2;
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(c.x, c.y);
                ctx.stroke();
                lastX = c.x; lastY = c.y;
                currentInk -= 0.1;
                const max = currentRoom ? ((currentRoom.settings && currentRoom.settings.inkLimit) || 50) : 50;
                inkFillEl.style.height = `${Math.max(0, (currentInk / max) * 100)}%`;
            }
            e.preventDefault();
        };

        const stopDraw = () => {
            if (!isDrawing) return;
            isDrawing = false;
            if (currentStroke && currentStroke.points.length > 0) {
                socket.emit('draw:stroke', { roomCode, stroke: currentStroke });
            }
            currentStroke = null;
        };

        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', draw);
        window.addEventListener('mouseup', stopDraw);
        canvas.addEventListener('touchstart', startDraw, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        window.addEventListener('touchend', stopDraw);
    }

    function renderStroke(stroke) {
        if (!stroke || !stroke.points || stroke.points.length === 0) return;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = stroke.color;
        ctx.fillStyle = stroke.color;
        ctx.lineWidth = stroke.brushSize || 6;

        if (stroke.points.length === 1) {
            const p = stroke.points[0];
            ctx.beginPath();
            ctx.arc(p.x, p.y, (stroke.brushSize || 6) / 2, 0, Math.PI * 2);
            ctx.fill();
            return;
        }
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
    }

    // ══════════════════════════════════════════════
    // VOTING UI
    // ══════════════════════════════════════════════
    function setupVoting() {
        voteConfirmBtn.addEventListener('click', () => {
            if (!selectedVoteTarget || voteLocked) return;
            voteLocked = true;

            socket.emit('vote:submit', { roomCode, suspectId: selectedVoteTarget });

            // Lock UI
            voteConfirmBtn.classList.add('locked-state');
            document.querySelectorAll('.vote-card').forEach(c => {
                c.classList.add('disabled', 'locked');
            });

            voteSubtitleEl.textContent = 'Vote locked. Waiting for the others…';
        });
    }

    function resetVotingUI() {
        selectedVoteTarget = null;
        voteLocked = false;
        voteConfirmBtn.classList.remove('locked-state');
        voteConfirmBtn.disabled = true;
        voteSubtitleEl.textContent = 'Who do you think is faking it?';
        voteProgressEl.textContent = '';
    }

    function buildVoteCards() {
        voteCardsEl.innerHTML = '';
        if (!currentRoom || !currentRoom.players) return;

        const players = currentRoom.players.filter(p => p.isConnected);

        players.forEach(p => {
            const card = document.createElement('div');
            card.className = 'vote-card';
            card.dataset.id = p.id;

            // Can't vote for yourself
            if (p.id === socket.id) {
                card.classList.add('self-card');
            }

            card.innerHTML = `
                <div class="vote-card-avatar">
                    <img src="/assets/characters/base_character.png">
                    ${p.avatar && p.avatar.hat ? `<img src="${p.avatar.hat}">` : ''}
                    ${p.avatar && p.avatar.expression ? `<img src="${p.avatar.expression}">` : ''}
                </div>
                <div class="vote-card-name">${p.name}${p.id === socket.id ? ' (You)' : ''}</div>
                <div class="lock-badge">✓</div>
            `;

            // Click handler
            if (p.id !== socket.id) {
                card.addEventListener('click', () => {
                    if (voteLocked) return;

                    // Deselect previous
                    document.querySelectorAll('.vote-card.selected').forEach(c => c.classList.remove('selected'));

                    // Select this
                    card.classList.add('selected');
                    selectedVoteTarget = p.id;
                    voteConfirmBtn.disabled = false;
                });
            }

            voteCardsEl.appendChild(card);
        });
    }

    // ══════════════════════════════════════════════
    // VOTE RESULT (Investigation mode intermediate)
    // ══════════════════════════════════════════════
    function showVoteResult(data) {
        if (!currentRoom) return;
        showPhase('voteResult');

        const suspectedPlayer = currentRoom.players.find(p => p.id === data.suspectedId);
        const resultAvatarEl = document.getElementById('resultAvatar');
        const resultRing = document.getElementById('resultAvatarRing');
        const nameEl = document.getElementById('resultVotedName');
        const roleEl = document.getElementById('resultVotedRole');
        const reactionEl = document.getElementById('resultReaction');

        resultRing.className = 'result-avatar-ring';
        roleEl.className = 'result-voted-role';

        if (data.tie) {
            nameEl.textContent = 'No one was voted out';
            roleEl.textContent = 'It was a tie!';
            reactionEl.textContent = `Wrong votes: ${data.wrongVotes}/3`;
            resultAvatarEl.innerHTML = '';
        } else if (suspectedPlayer) {
            nameEl.textContent = `${suspectedPlayer.name} was voted out`;

            // At this point we may not know their role yet from this event
            // We show the suspense — the game continues
            roleEl.textContent = data.correct ? 'They were the Impostor!' : 'They were Crew';
            roleEl.classList.add(data.correct ? 'impostor-label' : 'crew-label');
            resultRing.classList.add(data.correct ? 'impostor-reveal' : 'crew-reveal');

            reactionEl.textContent = data.correct
                ? 'Nice catch!'
                : `Wrong guess… ${data.wrongVotes}/3 strikes`;

            resultAvatarEl.innerHTML = `
                <img src="/assets/characters/base_character.png">
                ${suspectedPlayer.avatar && suspectedPlayer.avatar.hat ? `<img src="${suspectedPlayer.avatar.hat}">` : ''}
                ${suspectedPlayer.avatar && suspectedPlayer.avatar.expression ? `<img src="${suspectedPlayer.avatar.expression}">` : ''}
            `;
        }

        // Auto-transition back to drawing after 5 seconds
        setTimeout(() => {
            // If the game hasn't ended, go back to drawing
            if (currentRoom && currentRoom.phase !== 'end') {
                showPhase('drawing');
            }
        }, 5000);
    }

    // ══════════════════════════════════════════════
    // WINNER SCREEN
    // ══════════════════════════════════════════════
    function showWinnerScreen(data) {
        clearTimer();
        showPhase('end');

        const { winner, reason, roles, prompt } = data;
        const displayWin = displayWinner(winner);
        const isCrew = displayWin === 'Crew';

        // Headline
        winnerHeadlineEl.textContent = `${displayWin} Wins!`;
        winnerHeadlineEl.className = 'winner-headline ' + (isCrew ? 'crew-win' : 'impostor-win');

        // Reason
        winnerReasonEl.textContent = reason || (isCrew
            ? 'The Crew found the Impostor.'
            : 'The Impostor tricked the whole room.');

        // Prompt reveal
        revealWordEl.textContent = prompt || myPrompt || '???';

        // Role pills
        winnerRolesEl.innerHTML = '';
        if (roles && currentRoom && currentRoom.players) {
            currentRoom.players.forEach(p => {
                const r = roles[p.id];
                if (!r) return;
                const dr = displayRole(r);
                const isImpostor = dr === 'Impostor';

                const pill = document.createElement('div');
                pill.className = `role-pill ${isImpostor ? 'impostor' : 'crew'}`;
                pill.innerHTML = `
                    <div class="pill-avatar">
                        <img src="/assets/characters/base_character.png">
                        ${p.avatar && p.avatar.hat ? `<img src="${p.avatar.hat}">` : ''}
                        ${p.avatar && p.avatar.expression ? `<img src="${p.avatar.expression}">` : ''}
                    </div>
                    <span>${p.name}</span>
                    <span style="opacity:0.6;">— ${dr}</span>
                `;
                winnerRolesEl.appendChild(pill);
            });
        }

        // Action buttons
        setupWinnerButtons();
    }

    function setupWinnerActions() {
        playAgainBtn.addEventListener('click', () => {
            if (!isHost) return;
            socket.emit('game:restart', { roomCode });
            playAgainBtn.classList.add('waiting-state');
            playAgainBtn.textContent = 'Starting…';
        });

        backToLobbyBtn.addEventListener('click', () => {
            if (isHost) {
                socket.emit('game:returnToLobby', { roomCode });
            } else {
                // Non-host just navigates back
                window.location.href = `/pregame-lobby/pregame-lobby.html?room=${roomCode}`;
            }
        });
    }

    function setupWinnerButtons() {
        if (isHost) {
            playAgainBtn.classList.remove('host-only-hidden', 'waiting-state');
            playAgainBtn.textContent = 'Play Again';
            backToLobbyBtn.classList.remove('host-only-hidden');
            backToLobbyBtn.textContent = 'Back to Lobby';
        } else {
            playAgainBtn.classList.add('host-only-hidden');
            backToLobbyBtn.classList.remove('host-only-hidden');
            backToLobbyBtn.textContent = 'Leave to Lobby';
        }
    }

    function normalizeRoomCode(code) {
        return typeof code === 'string' && code.trim() ? code.trim().toUpperCase() : null;
    }

    function clearStoredSession(room) {
        const storedRoom = normalizeRoomCode(sessionStorage.getItem(SESSION_ROOM_KEY));
        if (!room || !storedRoom || storedRoom === normalizeRoomCode(room)) {
            sessionStorage.removeItem(SESSION_TOKEN_KEY);
            sessionStorage.removeItem(SESSION_ROOM_KEY);
        }
    }
});
