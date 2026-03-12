/* ============================================================
   INKOGNITO — Entry Page Logic
   Character selection, name input, menu actions, sound FX
   ============================================================ */

class CharacterSelector {
    constructor() {
        /* ---- Asset lists (match filenames in /assets/characters/) ---- */
        this.hats = [
            'MarioHat.png',
            'birthday_cap.png',
            'cowboy.png',
            'crown.png',
            'donaldtrump.png',
            'duck.png',
            'justin.png',
            'knight.png',
            'labubu.png'
        ];

        this.expressions = [
            'arabic.png',
            'blush.png',
            'cat.png',
            'glasses.png',
            'glasses2.png',
            'roblox.png'
        ];

        this.currentHatIndex = 0;        // MarioHat
        this.currentExpressionIndex = 3;  // glasses (match reference)
        this.soundEnabled = true;
        this.playerData = null;

        this.init();
    }

    /* ================================================================
       INIT
       ================================================================ */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.updateCharacter();
    }

    cacheElements() {
        this.hatLayerEl = document.getElementById('hatLayer');
        this.exprLayerEl = document.getElementById('exprLayer');
        this.avatarEl = document.getElementById('avatar');
        this.nameInputEl = document.getElementById('nameInput');
        this.soundIconEl = document.getElementById('soundIcon');
        
        // Invite elements
        this.inviteNotification = document.getElementById('inviteNotification');
        this.inviteRoomCodeEl = document.getElementById('inviteRoomCode');
        this.createPartyBtn = document.getElementById('createPartyBtn');
        this.joinBtn = document.getElementById('joinBtn');
    }

    bindEvents() {
        /* Navigation */
        document.getElementById('hatPrev').addEventListener('click', () => this.prevHat());
        document.getElementById('hatNext').addEventListener('click', () => this.nextHat());
        document.getElementById('exprPrev').addEventListener('click', () => this.prevExpr());
        document.getElementById('exprNext').addEventListener('click', () => this.nextExpr());

        /* Random */
        document.getElementById('randomBtn').addEventListener('click', () => this.randomize());

        /* Name submit */
        document.getElementById('submitBtn').addEventListener('click', () => this.submitName());
        this.nameInputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitName();
        });

        /* Menu */
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
        this.createPartyBtn.addEventListener('click', () => this.createParty());
        this.joinBtn.addEventListener('click', () => this.joinParty());
        
        const leavePartyBtn = document.getElementById('leavePartyBtn');
        if(leavePartyBtn) leavePartyBtn.addEventListener('click', () => this.leaveParty());

        /* Top bar */
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('soundBtn').addEventListener('click', () => this.toggleSound());
        document.getElementById('langBtn').addEventListener('click', () => this.cycleLang());
    }

    /* ================================================================
       CHARACTER CYCLING
       ================================================================ */
    prevHat() {
        this.currentHatIndex = (this.currentHatIndex - 1 + this.hats.length) % this.hats.length;
        this.updateCharacter();
        this.playSound('nav');
    }

    nextHat() {
        this.currentHatIndex = (this.currentHatIndex + 1) % this.hats.length;
        this.updateCharacter();
        this.playSound('nav');
    }

    prevExpr() {
        this.currentExpressionIndex = (this.currentExpressionIndex - 1 + this.expressions.length) % this.expressions.length;
        this.updateCharacter();
        this.playSound('nav');
    }

    nextExpr() {
        this.currentExpressionIndex = (this.currentExpressionIndex + 1) % this.expressions.length;
        this.updateCharacter();
        this.playSound('nav');
    }

    randomize() {
        this.currentHatIndex = Math.floor(Math.random() * this.hats.length);
        this.currentExpressionIndex = Math.floor(Math.random() * this.expressions.length);
        this.updateCharacter();
        this.playSound('random');

        /* Quick spin animation */
        this.avatarEl.style.transition = 'transform 0.35s ease';
        this.avatarEl.style.transform = 'scale(1.08) rotate(360deg)';
        setTimeout(() => {
            this.avatarEl.style.transform = '';
            this.avatarEl.style.transition = '';
        }, 360);
    }

    updateCharacter() {
        const hat = `assets/characters/hats/${this.hats[this.currentHatIndex]}`;
        const expr = `assets/characters/expressions/${this.expressions[this.currentExpressionIndex]}`;

        /* Fade out and swap */
        this.hatLayerEl.style.opacity = '0';
        this.exprLayerEl.style.opacity = '0';

        setTimeout(() => {
            this.hatLayerEl.src = hat;
            this.exprLayerEl.src = expr;
            this.hatLayerEl.style.opacity = '1';
            this.exprLayerEl.style.opacity = '1';
        }, 90);
    }

    /* ================================================================
       NAME & ACTIONS
       ================================================================ */
    submitName() {
        const name = this.nameInputEl.value.trim();

        if (name.length < 2) {
            this.toast('Name must be at least 2 characters!');
            this.playSound('error');
            return;
        }

        this.playerData = {
            name,
            hat: this.hats[this.currentHatIndex],
            expression: this.expressions[this.currentExpressionIndex]
        };

        this.toast(`Welcome, ${name}!`);
        this.playSound('success');

        /* Visual confirmation */
        this.nameInputEl.disabled = true;
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('submitBtn').style.opacity = '0.5';
    }

    startGame() {
        if (!this.playerData) {
            this.toast('Please enter your name first!');
            this.playSound('error');
            return;
        }
        this.playSound('start');
        this.toast('Starting game...');
        
        // Save profile
        sessionStorage.setItem('inkognito_player', JSON.stringify({
            name: this.playerData.name,
            avatar: {
                hat: `/assets/characters/hats/${this.playerData.hat}`,
                expression: `/assets/characters/expressions/${this.playerData.expression}`
            }
        }));

        this.updateCharacter(); // Visual flair
        
        // If there is an invite room, join it instead of redirecting nowhere
        if (this.inviteRoomCode) {
            setTimeout(() => {
                window.location.href = `/pregame-lobby/pregame-lobby.html?room=${this.inviteRoomCode}`;
            }, 500);
        } else {
            console.log('Starting game locally (no room code context). (Feature pending)');
            this.toast("Wait! Please 'Create Party' or 'Join' to play multiplayer.");
        }
    }

    createParty() {
        if (!this.playerData) {
            this.toast('Please enter your name first!');
            this.playSound('error');
            return;
        }
        this.playSound('start');
        this.toast('Creating party...');
        
        sessionStorage.setItem('inkognito_player', JSON.stringify({
            name: this.playerData.name,
            avatar: {
                hat: `/assets/characters/hats/${this.playerData.hat}`,
                expression: `/assets/characters/expressions/${this.playerData.expression}`
            }
        }));
        
        setTimeout(() => {
            window.location.href = '/pregame-lobby/pregame-lobby.html';
        }, 500);
    }

    joinParty() {
        if (!this.playerData) {
            this.toast('Please enter your name first!');
            this.playSound('error');
            return;
        }
        
        const code = prompt("Enter Room Code:");
        if (!code || code.trim() === '') return;
        
        this.playSound('start');
        this.toast('Joining party...');
        
        sessionStorage.setItem('inkognito_player', JSON.stringify({
            name: this.playerData.name,
            avatar: {
                hat: `/assets/characters/hats/${this.playerData.hat}`,
                expression: `/assets/characters/expressions/${this.playerData.expression}`
            }
        }));
        
        setTimeout(() => {
            window.location.href = `/pregame-lobby/pregame-lobby.html?room=${code.toUpperCase().trim()}`;
        }, 500);
    }

    /* ================================================================
       INVITE & TOP BAR ACTIONS
       ================================================================ */
       
    checkInvite() {
        const params = new URLSearchParams(window.location.search);
        const room = params.get('room');
        if (room) {
            this.inviteRoomCode = room.toUpperCase();
            
            // Show notification
            if (this.inviteNotification && this.inviteRoomCodeEl) {
                this.inviteRoomCodeEl.textContent = this.inviteRoomCode;
                this.inviteNotification.style.display = 'flex';
            }
            
            // Disable Create & Join buttons 
            if (this.createPartyBtn) {
                this.createPartyBtn.disabled = true;
                this.createPartyBtn.style.opacity = '0.5';
                this.createPartyBtn.style.cursor = 'not-allowed';
            }
            if (this.joinBtn) {
                this.joinBtn.disabled = true;
                this.joinBtn.style.opacity = '0.5';
                this.joinBtn.style.cursor = 'not-allowed';
            }
            
            this.toast('Join party detected!');
            this.playSound('nav');
        }
    }

    leaveParty() {
        this.inviteRoomCode = null;
        this.playSound('click');
        
        // Hide UI notification
        if (this.inviteNotification) {
            this.inviteNotification.style.display = 'none';
        }
        
        // Enable buttons
        if (this.createPartyBtn) {
            this.createPartyBtn.disabled = false;
            this.createPartyBtn.style.opacity = '1';
            this.createPartyBtn.style.cursor = 'pointer';
        }
        if (this.joinBtn) {
            this.joinBtn.disabled = false;
            this.joinBtn.style.opacity = '1';
            this.joinBtn.style.cursor = 'pointer';
        }
        
        // Remove from URL without reloading
        const url = new URL(window.location);
        url.searchParams.delete('room');
        window.history.replaceState({}, '', url);
        
        this.toast('Invite cancelled.');
    }
    openSettings() {
        this.playSound('click');
        this.toast('Settings coming soon!');
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.soundIconEl.src = this.soundEnabled
            ? 'assets/UI Chalk/UI_Button_Chalk-3.png'
            : 'assets/UI Chalk/UI_Button_Chalk-4.png';
        this.soundIconEl.parentElement.style.opacity = this.soundEnabled ? '1' : '0.6';
        this.toast(this.soundEnabled ? 'Sound ON' : 'Sound OFF');
    }

    cycleLang() {
        this.playSound('click');
        const btn = document.getElementById('langBtn');
        const langs = ['EN', 'ES', 'FR', 'DE', 'PT', 'RU', 'JA', 'KO', 'ZH'];
        const idx = langs.indexOf(btn.textContent);
        btn.textContent = langs[(idx + 1) % langs.length];
        this.toast(`Language: ${btn.textContent}`);
    }

    /* ================================================================
       TOAST NOTIFICATION
       ================================================================ */
    toast(msg) {
        let el = document.getElementById('toastMsg');
        if (!el) {
            el = document.createElement('div');
            el.id = 'toastMsg';
            el.className = 'toast-msg';
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.classList.add('show');

        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
    }

    /* ================================================================
       SIMPLE SOUND FX (Web Audio API)
       ================================================================ */
    playSound(type) {
        if (!this.soundEnabled) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            switch (type) {
                case 'click':
                    osc.frequency.value = 800;
                    gain.gain.value = 0.08;
                    osc.start(); osc.stop(ctx.currentTime + 0.04);
                    break;
                case 'nav':
                    osc.frequency.value = 620;
                    gain.gain.value = 0.07;
                    osc.start(); osc.stop(ctx.currentTime + 0.06);
                    break;
                case 'random':
                    osc.frequency.value = 900;
                    gain.gain.value = 0.1;
                    osc.start();
                    osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.12);
                    osc.stop(ctx.currentTime + 0.16);
                    break;
                case 'success':
                    osc.frequency.value = 523;
                    gain.gain.value = 0.12;
                    osc.start();
                    osc.frequency.exponentialRampToValueAtTime(659, ctx.currentTime + 0.08);
                    osc.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.16);
                    osc.stop(ctx.currentTime + 0.26);
                    break;
                case 'error':
                    osc.frequency.value = 300;
                    gain.gain.value = 0.09;
                    osc.start();
                    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
                    osc.stop(ctx.currentTime + 0.18);
                    break;
                case 'start':
                    osc.frequency.value = 440;
                    gain.gain.value = 0.12;
                    osc.start();
                    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
                    osc.stop(ctx.currentTime + 0.35);
                    break;
                default:
                    osc.frequency.value = 700;
                    gain.gain.value = 0.06;
                    osc.start(); osc.stop(ctx.currentTime + 0.04);
            }
        } catch (_) { /* silent fail */ }
    }
}

/* ================================================================
   BOOT
   ================================================================ */
function boot() {
    console.log('[INKOGNITO] boot() called, readyState:', document.readyState);

    const preloader = document.getElementById('preloader');
    const gameContainer = document.getElementById('gameContainer');

    if (!preloader || !gameContainer) {
        console.error('[INKOGNITO] Missing preloader or gameContainer element!');
        return;
    }

    /* Show the game after a short preloader delay */
    setTimeout(() => {
        /* ALWAYS hide preloader first */
        preloader.style.transition = 'opacity 0.4s ease';
        preloader.style.opacity = '0';
        preloader.style.pointerEvents = 'none';
        setTimeout(() => { preloader.style.display = 'none'; }, 500);

        /* Show game container */
        gameContainer.style.display = 'flex';

        /* Initialise game selector (wrapped in try/catch so page always loads) */
        try {
            window.characterSelector = new CharacterSelector();
            window.characterSelector.checkInvite();
            console.log('[INKOGNITO] Entry Page loaded ✓');
        } catch (err) {
            console.error('[INKOGNITO] CharacterSelector error:', err);
        }
    }, 1200);
}

/* Ensure boot runs regardless of when script loads */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    /* DOM already parsed — call boot on next tick to be safe */
    setTimeout(boot, 0);
}
