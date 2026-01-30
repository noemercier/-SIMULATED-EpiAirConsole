import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Room and player management
interface Player {
  id: string;
  socketId: string;
  name: string;
  color: string;
  isHost: boolean;
}

interface Room {
  code: string;
  hostSocketId: string;
  players: Map<string, Player>;
  currentGame: string | null;
  gameState: any;
  createdAt: number;
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();

// Generate unique room code
function generateRoomCode(): string {
  let code;
  do {
    code = nanoid(6).toUpperCase();
  } while (rooms.has(code));
  return code;
}

// Player colors
const PLAYER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Create room (host)
    socket.on('create-room', (callback) => {
      const roomCode = generateRoomCode();
      const room: Room = {
        code: roomCode,
        hostSocketId: socket.id,
        players: new Map(),
        currentGame: null,
        gameState: {},
        createdAt: Date.now()
      };

      const host: Player = {
        id: nanoid(),
        socketId: socket.id,
        name: 'Host',
        color: PLAYER_COLORS[0],
        isHost: true
      };

      room.players.set(host.id, host);
      rooms.set(roomCode, room);
      socketToRoom.set(socket.id, roomCode);
      socket.join(roomCode);

      console.log(`Room created: ${roomCode}`);
      callback({ success: true, roomCode, player: host });
    });

    // Join room (player)
    socket.on('join-room', ({ roomCode, playerName }, callback) => {
      const room = rooms.get(roomCode.toUpperCase());
      
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }

      const playerCount = room.players.size;
      const player: Player = {
        id: nanoid(),
        socketId: socket.id,
        name: playerName || `Player ${playerCount}`,
        color: PLAYER_COLORS[playerCount % PLAYER_COLORS.length],
        isHost: false
      };

      room.players.set(player.id, player);
      socketToRoom.set(socket.id, roomCode.toUpperCase());
      socket.join(roomCode.toUpperCase());

      console.log(`Player ${player.name} joined room ${roomCode}`);

      // Notify all players in room
      io.to(roomCode.toUpperCase()).emit('player-joined', {
        player,
        players: Array.from(room.players.values())
      });

      callback({ success: true, player, players: Array.from(room.players.values()) });
    });

    // Get room info
    socket.on('get-room-info', (callback) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) {
        callback({ success: false, error: 'Not in a room' });
        return;
      }

      const room = rooms.get(roomCode);
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }

      callback({
        success: true,
        roomCode,
        players: Array.from(room.players.values()),
        currentGame: room.currentGame,
        gameState: room.gameState
      });
    });

    // Get player info
    socket.on('get-player-info', ({ playerId }, callback) => {
      console.log('📋 Get player info request - playerId:', playerId, 'socketId:', socket.id);
      
      // First, try to find the player in any room
      let foundRoom: Room | null = null;
      let foundPlayer: Player | null = null;
      
      for (const [code, room] of rooms.entries()) {
        const player = room.players.get(playerId);
        if (player) {
          foundRoom = room;
          foundPlayer = player;
          
          // Update the player's socket ID (for reconnections)
          player.socketId = socket.id;
          
          // Update the socketToRoom mapping
          socketToRoom.set(socket.id, code);
          
          // Join the socket to the room
          socket.join(code);
          
          console.log('✅ Player found and reconnected:', player.name, 'to room:', code);
          break;
        }
      }
      
      if (!foundPlayer || !foundRoom) {
        console.log('❌ Player not found in any room');
        callback({ success: false, error: 'Player not found' });
        return;
      }

      callback({
        success: true,
        player: foundPlayer,
        roomCode: foundRoom.code,
        currentGame: foundRoom.currentGame
      });
    });

    // Start game
    socket.on('start-game', ({ gameName }) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room || room.hostSocketId !== socket.id) return;

      room.currentGame = gameName;
      room.gameState = {};

      io.to(roomCode).emit('game-started', { gameName });
      console.log(`Game ${gameName} started in room ${roomCode}`);
    });

    // Game state update
    socket.on('game-state-update', (data) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room) return;

      room.gameState = { ...room.gameState, ...data };
      socket.to(roomCode).emit('game-state-update', data);
    });

    // Controller input
    socket.on('controller-input', (data) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room) return;

      // Send input to host
      io.to(room.hostSocketId).emit('controller-input', {
        playerId: Array.from(room.players.values()).find(p => p.socketId === socket.id)?.id,
        ...data
      });
    });

    // End room
    socket.on('end-room', () => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room || room.hostSocketId !== socket.id) return;

      io.to(roomCode).emit('room-ended');
      
      // Clean up
      room.players.forEach(player => {
        socketToRoom.delete(player.socketId);
      });
      rooms.delete(roomCode);

      console.log(`Room ${roomCode} ended`);
    });

    // Drawing game events
    socket.on('draw-point', (data) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      console.log('📥 SERVER: Received draw-point from', socket.id);
      // Broadcast to all clients in the room (including sender)
      io.to(roomCode).emit('drawing-update', data);
    });

    socket.on('clear-canvas', () => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      console.log('🧹 SERVER: Received clear-canvas from', socket.id);
      // Broadcast to all clients in the room
      io.to(roomCode).emit('drawing-clear');
    });

    socket.on('submit-guess', ({ guess }) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room) return;

      // Find the player by socket ID
      const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
      if (!player) return;

      console.log('💭 SERVER: Guess from', player.name, ':', guess);
      // Send to host only
      io.to(room.hostSocketId).emit('player-guess', {
        playerId: player.id,
        guess
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      const roomCode = socketToRoom.get(socket.id);
      
      if (roomCode) {
        const room = rooms.get(roomCode);
        if (room) {
          // Find and remove player
          const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
          
          if (player) {
            // If host disconnected, end room
            if (player.isHost) {
              console.log(`🚪 Host ${player.name} disconnected from room ${roomCode}`);
              
              // Emit room-ended BEFORE deleting anything
              io.to(roomCode).emit('room-ended', {
                reason: 'Host disconnected'
              });
              
              // Give clients time to receive the event before cleanup
              setTimeout(() => {
                room.players.forEach(p => {
                  const playerSocket = io.sockets.sockets.get(p.socketId);
                  if (playerSocket) {
                    playerSocket.leave(roomCode);
                  }
                  socketToRoom.delete(p.socketId);
                });
                rooms.delete(roomCode);
                console.log(`Room ${roomCode} closed (host disconnected)`);
              }, 100);
            } else {
              // Remove player from room
              room.players.delete(player.id);
              
              // Notify remaining players
              io.to(roomCode).emit('player-left', {
                player,
                players: Array.from(room.players.values())
              });
            }
          }
        }
        
        socketToRoom.delete(socket.id);
      }
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
