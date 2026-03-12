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
* **Server Authority:** Rooms are entirely managed on the server (Live socket events for connecting, disconnecting, updating settings).
* **UI Fidelity:** Exact layout matching of pregame lobby using chalk assets, UI cards, settings options.
* **Flow Integration:** Entry Page hooks cleanly set local Session storage and navigate correctly to `/pregame-lobby/pregame-lobby.html?room=CODE` on Room Create/Join.
* **Host Power:** Correct controls allowing only the host to start game, update settings, toggle configuration arrays, etc.
* **Custom Words / Modes / Chat Live Sync:** Real-time data binds over Socket.IO cleanly to UI elements.
