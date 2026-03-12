# INKOGNITO - Lobby MVP

This is an MVP implementation of the pre-game lobby system for INKOGNITO.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the game server:
   ```bash
   npm run start
   ```
3. Open the browser and navigate to:
   ```text
   http://localhost:3000
   ```
   
## Features Implemented:

### Core Multiplayer System
* **Server Authority:** Rooms are entirely managed on the server (Live socket events for connecting, disconnecting, updating settings).
* **Live Synchronization:** Real-time updates for player list, chat, settings, custom words, and mode selection.
* **Host Reassignment:** When host leaves, a new host is automatically assigned to the next player.

### UI/UX Improvements
* **Space-themed Background:** Dark space background with floating, twinkling stars for atmospheric effect.
* **Clean Lobby Layout:** Improved spacing, alignment, and visual hierarchy with better panel design.
* **Hover Effects:** Interactive feedback on buttons, mode cards, and player cards.

### Invite System
* **Proper Invite Flow:** Invite links now route through entry page (`/join?room=CODE`) ensuring players set name/avatar first.
* **Invite Notification:** Clear notification card when joining via invite link.
* **Leave Party:** Players can cancel joining before entering the lobby.

### Room Management
* **Leave Lobby:** Players can leave the lobby and return to entry page.
* **Game Phase Handling:** Leave lobby button hides when game starts to prevent premature leaving.
* **Host Controls:** Only host can change settings, start game, and remove custom words.

### Chat & Customization
* **Live Chat:** Real-time chat with message history.
* **Custom Words:** Host-enabled custom word system with live sync.
* **Mode Selection:** Visual mode cards with clear selection state.

## How to Test:

1. **Create a Room:**
   - Enter name and select character
   - Click "CREATE PARTY"
   - You'll be taken to lobby as host

2. **Join via Invite:**
   - Copy the invite link from host's lobby
   - Open it in a new browser/tab
   - You'll see the entry page with room notification
   - Select character and click "START"

3. **Test Multiplayer:**
   - Open multiple browser tabs to simulate different players
   - Verify live updates in player list and chat
   - Test host controls and settings sync

4. **Test Leave Flow:**
   - Click "Leave Lobby" to return to entry page
   - Verify host reassignment if host leaves
   - Test "Leave Party" on invite page
