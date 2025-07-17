const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set EJS views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

const debateRoutes = require('./ai_debate/debateRoutes');
app.use('/ai-debate', debateRoutes);

// --- 🔥 WebSocket session store ---
const sessions = {};       // Debate content: sessionId => { topic, alphaName, ... }
const sessionStates = {};  // Readiness: sessionId => { alphaReady, betaReady }

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Join a session room
  socket.on('joinSession', (sessionId) => {
    if (!sessionId) {
      console.log('Client tried to join with a null sessionId.');
      return; 
    }

    if (!sessions[sessionId]) {
      sessions[sessionId] = {
        topic: '',
        alphaName: '',
        betaName: '',
        rounds: 3,
        maxSteps: 6,
        step: 0,
        history: [],
        isDebateActive: false,
      };
    }

    if (!sessionStates[sessionId]) {
      sessionStates[sessionId] = {
        alphaReady: false,
        betaReady: false,
      };
    }

    socket.join(sessionId);
    socket.emit('sessionState', sessions[sessionId]);
    io.to(sessionId).emit('statusUpdate', sessionStates[sessionId]);
    console.log(`Client ${socket.id} joined session ${sessionId}.`);
  });

  // Shared state update (e.g. names, steps, history)
  socket.on('updateState', ({ sessionId, data }) => {
    sessions[sessionId] = { ...sessions[sessionId], ...data };
    socket.to(sessionId).emit('sessionUpdated', data);
  });

  // Handle readiness (FIX: Match case to BetaReady and AlphaReady)
  socket.on('AlphaReady', (sessionId) => {
    if (!sessionStates[sessionId]) sessionStates[sessionId] = {};
    sessionStates[sessionId].alphaReady = true;
    io.to(sessionId).emit('statusUpdate', sessionStates[sessionId]);
  });

  socket.on('BetaReady', (sessionId) => {
    if (!sessionStates[sessionId]) sessionStates[sessionId] = {};
    sessionStates[sessionId].betaReady = true;
    io.to(sessionId).emit('statusUpdate', sessionStates[sessionId]);
  });

  // When a turn is completed
  socket.on('turnDone', ({ sessionId, role }) => {
    console.log(`Turn done from ${role} in session ${sessionId}`);
    io.to(sessionId).emit('turnDone', { role });
  });

  // Reset session on moderator request
  socket.on('resetSession', (sessionId) => {
    sessionStates[sessionId] = { alphaReady: false, betaReady: false };
    sessions[sessionId] = {};
    io.to(sessionId).emit('statusUpdate', sessionStates[sessionId]);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
    // Optional: cleanup logic here
  });
});


// 🔥 Start the server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

module.exports = { server, io };
