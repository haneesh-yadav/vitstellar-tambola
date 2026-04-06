const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// ─── Max Winners Per Prize ────────────────────────────────────────────────────
const MAX_WINNERS = {
  topLine: 4,
  middleLine: 4,
  bottomLine: 4,
  corners: 4,
  earlyFive: 5,
  fullHouse: 3,
};

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// ─── Game State ──────────────────────────────────────────────────────────────

let gameState = {
  status: 'waiting',
  calledNumbers: [],
  currentNumber: null,
  players: {},
  hostSocketId: null,
  gameId: null,
  winners: {
    topLine: [],
    middleLine: [],
    bottomLine: [],
    corners: [],
    earlyFive: [],
    fullHouse: [],
  },
  autoCallInterval: null,
  autoCallDelay: 5000,
};

// ─── Tambola Ticket Generator (Guaranteed 5 per row) ─────────────────────────

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateTicket() {
  const colRanges = [
    [1, 9], [10, 19], [20, 29], [30, 39], [40, 49],
    [50, 59], [60, 69], [70, 79], [80, 90],
  ];

  // Step 1: Build a pool of numbers for each column (shuffled)
  const colPools = colRanges.map(([min, max]) => {
    const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return shuffle(nums);
  });

  // Step 2: Initialize 3x9 grid with nulls
  const grid = Array.from({ length: 3 }, () => Array(9).fill(null));

  // Step 3: For each row, pick exactly 5 columns to fill
  for (let row = 0; row < 3; row++) {
    // Shuffle column indices and pick 5
    const colIndices = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 5).sort((a, b) => a - b);
    for (const col of colIndices) {
      // Pick a number from this column's pool
      grid[row][col] = colPools[col].pop();
    }
  }

  // Step 4: Sort numbers within each column in ascending order
  for (let col = 0; col < 9; col++) {
    const filled = [];
    const filledRows = [];
    for (let row = 0; row < 3; row++) {
      if (grid[row][col] !== null) {
        filled.push(grid[row][col]);
        filledRows.push(row);
      }
    }
    filled.sort((a, b) => a - b);
    filledRows.forEach((row, i) => {
      grid[row][col] = filled[i];
    });
  }

  return grid;
}

function generateNumberBag() {
  const nums = Array.from({ length: 90 }, (_, i) => i + 1);
  return shuffle(nums);
}

// ─── Win Condition Checkers ───────────────────────────────────────────────────

function checkWinConditions(ticket, calledNumbers) {
  const called = new Set(calledNumbers);
  const results = {};

  for (let row = 0; row < 3; row++) {
    const rowNums = ticket[row].filter(n => n !== null);
    results[`row${row}`] = rowNums.every(n => called.has(n));
  }

  // Corners: first and last number of first and last row
  const topRow = ticket[0].filter(n => n !== null);
  const botRow = ticket[2].filter(n => n !== null);
  results.corners =
    topRow.length >= 2 && botRow.length >= 2 &&
    called.has(topRow[0]) && called.has(topRow[topRow.length - 1]) &&
    called.has(botRow[0]) && called.has(botRow[botRow.length - 1]);

  // Early Five: any 5 numbers from ticket called
  const allNums = ticket.flat().filter(n => n !== null);
  const calledFromTicket = allNums.filter(n => called.has(n));
  results.earlyFive = calledFromTicket.length >= 5;

  // Full house
  results.fullHouse = allNums.every(n => called.has(n));

  return results;
}

// ─── Socket.IO ───────────────────────────────────────────────────────────────

let numberBag = [];

function resetGame() {
  if (gameState.autoCallInterval) {
    clearInterval(gameState.autoCallInterval);
  }
  numberBag = generateNumberBag();
  gameState = {
    status: 'waiting',
    calledNumbers: [],
    currentNumber: null,
    players: {},
    hostSocketId: gameState.hostSocketId,
    gameId: uuidv4(),
    winners: {
      topLine: [],
      middleLine: [],
      bottomLine: [],
      corners: [],
      earlyFive: [],
      fullHouse: [],
    },
    autoCallInterval: null,
    autoCallDelay: gameState.autoCallDelay || 5000,
  };
}

function getPublicState() {
  return {
    status: gameState.status,
    calledNumbers: gameState.calledNumbers,
    currentNumber: gameState.currentNumber,
    playerCount: Object.keys(gameState.players).length,
    winners: gameState.winners,
    autoCallDelay: gameState.autoCallDelay,
    gameId: gameState.gameId,
  };
}

function callNextNumber() {
  if (numberBag.length === 0) {
    gameState.status = 'ended';
    io.emit('game:ended', { message: 'All 90 numbers called!' });
    if (gameState.autoCallInterval) clearInterval(gameState.autoCallInterval);
    return null;
  }
  const num = numberBag.shift();
  gameState.calledNumbers.push(num);
  gameState.currentNumber = num;
  io.emit('number:called', {
    number: num,
    calledNumbers: gameState.calledNumbers,
    remaining: numberBag.length,
  });
  return num;
}

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // ── Host joins ──
  socket.on('host:join', () => {
    gameState.hostSocketId = socket.id;
    socket.join('host-room');
    socket.emit('host:joined', { gameId: gameState.gameId, state: getPublicState() });
    console.log(`[HOST] ${socket.id}`);
  });

  // ── Player joins ──
  socket.on('player:join', ({ name }) => {
    if (gameState.status !== 'waiting' && gameState.status !== 'running') {
      socket.emit('error', { message: 'Game is not accepting players right now.' });
      return;
    }
    if (!name || name.trim().length < 2) {
      socket.emit('error', { message: 'Name must be at least 2 characters.' });
      return;
    }

    const ticket = generateTicket();
    gameState.players[socket.id] = {
      id: socket.id,
      name: name.trim(),
      ticket,
      claims: [],
      joinedAt: Date.now(),
    };

    socket.join('players-room');
    socket.emit('player:joined', {
      player: gameState.players[socket.id],
      state: getPublicState(),
    });

    io.to('host-room').emit('host:playerUpdate', {
      playerCount: Object.keys(gameState.players).length,
      players: Object.values(gameState.players).map(p => ({ id: p.id, name: p.name })),
    });

    console.log(`[PLAYER] ${name} (${socket.id})`);
  });

  // ── Host: start game ──
  socket.on('host:startGame', () => {
    if (socket.id !== gameState.hostSocketId) return;
    if (gameState.status === 'running') return;

    numberBag = generateNumberBag();
    gameState.status = 'running';
    gameState.calledNumbers = [];
    gameState.currentNumber = null;
    gameState.winners = {
      topLine: [], middleLine: [], bottomLine: [],
      corners: [], earlyFive: [], fullHouse: [],
    };

    io.emit('game:started', getPublicState());
    console.log('[GAME] Started');
  });

  // ── Host: call number manually ──
  socket.on('host:callNumber', () => {
    if (socket.id !== gameState.hostSocketId) return;
    if (gameState.status !== 'running') return;
    callNextNumber();
  });

  // ── Host: toggle auto-call ──
  socket.on('host:toggleAutoCall', ({ enabled, delay }) => {
    if (socket.id !== gameState.hostSocketId) return;
    if (delay) gameState.autoCallDelay = delay;

    if (enabled) {
      if (gameState.autoCallInterval) clearInterval(gameState.autoCallInterval);
      gameState.autoCallInterval = setInterval(() => {
        if (gameState.status === 'running') callNextNumber();
        else clearInterval(gameState.autoCallInterval);
      }, gameState.autoCallDelay);
      socket.emit('host:autoCallStatus', { enabled: true, delay: gameState.autoCallDelay });
    } else {
      if (gameState.autoCallInterval) clearInterval(gameState.autoCallInterval);
      gameState.autoCallInterval = null;
      socket.emit('host:autoCallStatus', { enabled: false });
    }
  });

  // ── Host: pause/resume ──
  socket.on('host:pauseGame', () => {
    if (socket.id !== gameState.hostSocketId) return;
    if (gameState.status === 'running') {
      gameState.status = 'paused';
      if (gameState.autoCallInterval) clearInterval(gameState.autoCallInterval);
      io.emit('game:paused');
    } else if (gameState.status === 'paused') {
      gameState.status = 'running';
      io.emit('game:resumed', getPublicState());
    }
  });

  // ── Host: reset game ──
  socket.on('host:resetGame', () => {
    if (socket.id !== gameState.hostSocketId) return;
    resetGame();
    io.emit('game:reset', getPublicState());
    console.log('[GAME] Reset');
  });

  // ── Player: claim win ──
  socket.on('player:claim', ({ type }) => {
    const player = gameState.players[socket.id];
    if (!player) return;
    if (gameState.status !== 'running') {
      socket.emit('claim:rejected', { type, reason: 'Game is not running' });
      return;
    }

    const validTypes = ['topLine', 'middleLine', 'bottomLine', 'corners', 'earlyFive', 'fullHouse'];
    if (!validTypes.includes(type)) return;

    // Check if already claimed by this player
    if (player.claims.includes(type)) {
      socket.emit('claim:rejected', { type, reason: 'You already claimed this prize' });
      return;
    }

    // Check if max winners reached
    if (gameState.winners[type].length >= MAX_WINNERS[type]) {
      socket.emit('claim:rejected', { type, reason: `All ${MAX_WINNERS[type]} winners for ${type} already found!` });
      return;
    }

    // Verify the claim
    const wins = checkWinConditions(player.ticket, gameState.calledNumbers);
    const typeToCheck = {
      topLine: 'row0',
      middleLine: 'row1',
      bottomLine: 'row2',
      corners: 'corners',
      earlyFive: 'earlyFive',
      fullHouse: 'fullHouse',
    };
    const key = typeToCheck[type];

    if (wins[key]) {
      gameState.winners[type].push({ id: socket.id, name: player.name });
      player.claims.push(type);

      const isFull = gameState.winners[type].length >= MAX_WINNERS[type];
      const winData = {
        type,
        player: { id: socket.id, name: player.name },
        winners: gameState.winners[type],
        isFull,
      };
      io.emit('game:winner', winData);
      socket.emit('claim:accepted', { type });

      console.log(`[WIN] ${player.name} -> ${type} (${gameState.winners[type].length}/${MAX_WINNERS[type]})`);
    } else {
      socket.emit('claim:rejected', { type, reason: 'Numbers not matching. Keep playing!' });
    }
  });

  // ── Get current state ──
  socket.on('state:get', () => {
    const player = gameState.players[socket.id];
    socket.emit('state:current', {
      ...getPublicState(),
      player: player || null,
    });
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    if (gameState.players[socket.id]) {
      const name = gameState.players[socket.id].name;
      delete gameState.players[socket.id];
      io.to('host-room').emit('host:playerUpdate', {
        playerCount: Object.keys(gameState.players).length,
        players: Object.values(gameState.players).map(p => ({ id: p.id, name: p.name })),
      });
      console.log(`[-] Disconnected player: ${name}`);
    } else if (socket.id === gameState.hostSocketId) {
      console.log('[-] Host disconnected');
    }
  });
});

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ ok: true, players: Object.keys(gameState.players).length, status: gameState.status }));

// ─── Init ─────────────────────────────────────────────────────────────────────

resetGame();
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🎯 Tambola server running on port ${PORT}`));

// Keep-alive ping
setInterval(() => {
  console.log('keepalive');
}, 1000 * 60 * 4);
