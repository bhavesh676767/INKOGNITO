const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const setupSocketHandlers = require('./socketHandlers');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve public files statically
// Serve public files statically
app.use(express.static(path.join(__dirname, '../public')));
// Serve assets folder statically, which is at the root
app.use('/assets', express.static(path.join(__dirname, '../assets')));
// In case root index.html needs to be served or it's moved to public, we can also serve root if needed
// For now, let's serve root as static in case we need index.html
app.use(express.static(path.join(__dirname, '../')));

// Redirect /join?room=... to /?room=...
app.get('/join', (req, res) => {
    const roomCode = req.query.room;
    if (roomCode) {
        res.redirect(`/?room=${roomCode}`);
    } else {
        res.redirect('/');
    }
});

// Initialize socket handlers
setupSocketHandlers(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
