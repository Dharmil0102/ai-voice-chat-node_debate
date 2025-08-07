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
const sessions = {};       // Debate content: sessionId => { topic, alphaName, ... }
const sessionStates = {};  // Readiness: sessionId => { alphaReady, betaReady }

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
        alphaSocketId: null, // Add this
        betaSocketId: null,  // Add this
      };
    }
    
    socket.sessionId = sessionId;
    
    socket.join(sessionId);
    io.to(sessionId).emit('sessionState', sessions[sessionId]);
    console.log(`Client ${socket.id} joined session ${sessionId}.`);
  });

  // Handle readiness with a check
  socket.on('AlphaReady', (sessionId) => {
    if (!sessionStates[sessionId]) sessionStates[sessionId] = {};
    if (sessionStates[sessionId].alphaReady) {
      console.log(`Client ${socket.id} attempted to join as Alpha, but role is taken.`);
      socket.emit('roleTaken', { role: 'alpha' });
    } else {
      sessionStates[sessionId].alphaReady = true;
      // ✅ Store the socket ID in the shared session state
      sessionStates[sessionId].alphaSocketId = socket.id;
      io.to(sessionId).emit('statusUpdate', sessionStates[sessionId]);
      console.log(`Client ${socket.id} is now Alpha in session ${sessionId}.`);
    }
  });

  socket.on('BetaReady', (sessionId) => {
    if (!sessionStates[sessionId]) sessionStates[sessionId] = {};
    if (sessionStates[sessionId].betaReady) {
      console.log(`Client ${socket.id} attempted to join as Beta, but role is taken.`);
      socket.emit('roleTaken', { role: 'beta' });
    } else {
      sessionStates[sessionId].betaReady = true;
      // ✅ Store the socket ID in the shared session state
      sessionStates[sessionId].betaSocketId = socket.id;
      io.to(sessionId).emit('statusUpdate', sessionStates[sessionId]);
      console.log(`Client ${socket.id} is now Beta in session ${sessionId}.`);
    }
  });

  // When a turn is completed
  socket.on('turnDone', ({ sessionId, role }) => {
    console.log(`Turn done from ${role} in session ${sessionId}`);
    io.to(sessionId).emit('turnDone', { role });
  });

  // Reset session on moderator request
  socket.on('resetSession', (sessionId) => {
    if (sessionStates[sessionId]) {
      sessionStates[sessionId] = { alphaReady: false, betaReady: false, alphaSocketId: null, betaSocketId: null };
    }
    if (sessions[sessionId]) {
      sessions[sessionId] = {};
    }
    io.to(sessionId).emit('statusUpdate', sessionStates[sessionId]);
  });

  // The moderator sends a turn command, and the server broadcasts it
  socket.on('startTurn', (data) => {
    // We don't need to take the object apart.
    // We can access the properties directly from 'data'.
    console.log(`Received startTurn for ${data.role} in session ${data.sessionId}`);

    // This is the FIX: Pass the ENTIRE original 'data' object.
    // It already contains role, text, name, AND voiceId.
    io.to(data.sessionId).emit('startTurn', data);
  });

  // ✅ CORRECTED DISCONNECT HANDLER
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
    const sessionId = socket.sessionId;
    if (sessionId && sessionStates[sessionId]) {
      // ✅ Check against the ID stored in the session state
      if (socket.id === sessionStates[sessionId].alphaSocketId) {
        console.log(`Alpha player disconnected from session ${sessionId}.`);
        sessionStates[sessionId].alphaReady = false;
        sessionStates[sessionId].alphaSocketId = null; // Clean up the ID
        io.to(sessionId).emit('statusUpdate', sessionStates[sessionId]);
      } else if (socket.id === sessionStates[sessionId].betaSocketId) {
        console.log(`Beta player disconnected from session ${sessionId}.`);
        sessionStates[sessionId].betaReady = false;
        sessionStates[sessionId].betaSocketId = null; // Clean up the ID
        io.to(sessionId).emit('statusUpdate', sessionStates[sessionId]);
      }
    }
  });
});

// 🔥 Start the server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

module.exports = { server, io };