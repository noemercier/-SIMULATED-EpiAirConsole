# Developer Guide - Adding New Games

This guide explains how to add new games to EpiAirConsole.

## 📋 Prerequisites

Before adding a new game, you should understand:
- React and Next.js basics
- Socket.IO event system
- TypeScript interfaces
- The existing codebase structure

## 🎮 Game Architecture

Each game consists of three main components:

1. **Host View** - Displayed on TV/computer (`app/games/[game-name]/page.tsx`)
2. **Controller View** - Player's phone interface (`app/controller/page.tsx`)
3. **Game State** - Managed through Socket.IO events (`server.ts`)

## 🚀 Step-by-Step: Adding a New Game

### Step 1: Plan Your Game

Define:
- **Game name** (e.g., "racing", "trivia", "memory")
- **How many players** (min/max)
- **Game mechanics** (how it works)
- **What players see** (host screen)
- **What controllers need** (buttons, inputs)
- **How scoring works**

### Step 2: Add Game to Host Lobby

Edit `app/host/page.tsx`:

```typescript
<button
  onClick={() => handleStartGame('your-game-name')}
  className="bg-blue-600 hover:bg-blue-700 rounded-lg p-6 text-left transition transform hover:scale-105"
>
  <h3 className="text-xl font-bold mb-2">🎯 Your Game Name</h3>
  <p className="text-gray-300">Description of your game</p>
  <p className="text-sm text-gray-400 mt-2">2-8 players</p>
</button>
```

### Step 3: Create Host Game View

Create `app/games/[your-game-name]/page.tsx`:

```typescript
'use client';

import { useSocket } from '@/lib/socket';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Player } from '@/types/socket';

export default function YourGamePage() {
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');

  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  
  // Initialize game
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Get room info and players
    socket.emit('get-room-info', (response) => {
      if (response.success && response.players) {
        setPlayers(response.players);
        
        // Initialize your game state
        if (role === 'host') {
          // Send initial game data to players
          socket.emit('game-state-update', {
            type: 'your-game-init',
            // ... your initial data
          });
        }
      }
    });

    // Listen for controller inputs
    socket.on('controller-input', (data) => {
      if (role === 'host') {
        handlePlayerInput(data.playerId, data);
      }
    });

    // Listen for game state updates
    socket.on('game-state-update', (data) => {
      // Handle state changes
      if (data.type === 'your-game-event') {
        // Update state
      }
    });

    return () => {
      socket.off('controller-input');
      socket.off('game-state-update');
    };
  }, [socket, isConnected, role]);

  const handlePlayerInput = (playerId: string, data: any) => {
    // Handle controller input
    // Update game state
    // Broadcast to other players if needed
  };

  const startGame = () => {
    setGameState('playing');
    if (socket) {
      socket.emit('game-state-update', {
        type: 'your-game-start'
      });
    }
  };

  const endGame = () => {
    setGameState('finished');
    // Show results
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Your game UI here */}
        <h1 className="text-4xl font-bold text-white">Your Game</h1>
        
        {gameState === 'waiting' && (
          <button onClick={startGame}>Start Game</button>
        )}

        {gameState === 'playing' && (
          // Game content
          <div>Game is running...</div>
        )}

        {gameState === 'finished' && (
          // Results/scoreboard
          <div>Game finished!</div>
        )}
      </div>
    </div>
  );
}
```

### Step 4: Add Controller Interface

Edit `app/controller/page.tsx`, add your game after the quiz section:

```typescript
if (currentGame === 'your-game-name') {
  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: player.color }}>
      <div className="max-w-md mx-auto">
        <div className="text-center text-white mb-8 pt-8">
          <h2 className="text-2xl font-bold">{player.name}</h2>
          <p className="text-lg">Your Game Controller</p>
        </div>

        {/* Your controller UI */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => sendInput('action1', { data: 'value' })}
            className="h-32 bg-white text-2xl font-bold rounded-2xl"
            style={{ color: player.color }}
          >
            Action 1
          </button>
          
          <button
            onClick={() => sendInput('action2', { data: 'value' })}
            className="h-32 bg-white text-2xl font-bold rounded-2xl"
            style={{ color: player.color }}
          >
            Action 2
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 5: Define Socket.IO Events

Add to `types/socket.ts` if needed:

```typescript
export interface ServerToClientEvents {
  // ... existing events
  'your-game-event': (data: YourGameData) => void;
}

export interface ClientToServerEvents {
  // ... existing events
  // Your custom events if needed
}
```

### Step 6: Update Server Logic (Optional)

If you need custom server-side logic, edit `server.ts`:

```typescript
// Add game-specific handlers
socket.on('controller-input', (data) => {
  const roomCode = socketToRoom.get(socket.id);
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  // Handle your game-specific inputs
  if (room.currentGame === 'your-game-name') {
    if (data.action === 'your-action') {
      // Process action
      // Broadcast to host or other players
      io.to(room.hostSocketId).emit('controller-input', {
        playerId: data.playerId,
        ...data
      });
    }
  }
});
```

## 💡 Examples of Game Types

### 1. Question-Based Game (like Quiz)

**Good for**: Trivia, Would You Rather, True/False

**Controller**: Buttons for choices  
**Host View**: Question and timer  
**State**: Current question, player answers, scores

### 2. Drawing/Creative Game (like Drawing)

**Good for**: Pictionary, Charades clues, Building games

**Controller**: Canvas, text input, color picker  
**Host View**: Combined artwork or results  
**State**: Current drawer, submissions, guesses

### 3. Reaction Game

**Good for**: Quick reflexes, Simon Says, Rhythm games

**Controller**: Large tap button, gesture detection  
**Host View**: Visual cues, timing display  
**State**: Timing data, success/fail

### 4. Movement Game

**Good for**: Racing, Navigation, Tilt controls

**Controller**: Accelerometer, directional buttons  
**Host View**: Positions, race track, map  
**State**: Player positions, velocities

### 5. Strategy Game

**Good for**: Card games, Turn-based games, Voting

**Controller**: Hand of cards, action selection  
**Host View**: Game board, current state  
**State**: Turn order, resources, game board

## 🎨 UI Best Practices

### Host View

- **Large text** - Readable from across the room
- **Player colors** - Show who's who
- **Clear timer** - Players know how much time is left
- **Scoreboard** - Always visible or frequently shown
- **Animations** - Make it engaging to watch

### Controller View

- **Big buttons** - Easy to tap on phone
- **Player color** - As background or accent
- **Clear feedback** - Show when action registered
- **Simple layout** - Don't overcrowd the screen
- **Touch-friendly** - No tiny tap targets

## 📊 State Management Tips

1. **Host is source of truth** - Controller sends inputs, host decides outcome
2. **Broadcast important changes** - All players see same state
3. **Validate inputs** - Don't trust controller data blindly
4. **Handle disconnects** - What happens if player leaves?
5. **Keep state minimal** - Only store what's needed

## 🐛 Testing Your Game

1. **Solo test**: One browser window for host, one for controller
2. **Multi-device test**: Use your phone as controller
3. **Multi-player test**: Get 3-4 friends to test
4. **Edge cases**:
   - Player joins mid-game
   - Player disconnects
   - Host disconnects
   - Network lag
   - Multiple rapid inputs

## 📝 Game Data Files

For games with content (questions, words, challenges):

Create `data/your-game-data.ts`:

```typescript
export interface YourGameItem {
  id: number;
  // Your data structure
}

export const yourGameData: YourGameItem[] = [
  // Your data
];

export function getRandomItems(count: number): YourGameItem[] {
  const shuffled = [...yourGameData].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
```

## 🔄 Common Patterns

### Timer Pattern
```typescript
const [timeLeft, setTimeLeft] = useState(30);

useEffect(() => {
  if (gameState === 'playing' && timeLeft > 0) {
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  } else if (timeLeft === 0) {
    endRound();
  }
}, [gameState, timeLeft]);
```

### Score Tracking Pattern
```typescript
const [scores, setScores] = useState<Map<string, number>>(new Map());

const updateScore = (playerId: string, points: number) => {
  setScores(prev => {
    const updated = new Map(prev);
    const current = updated.get(playerId) || 0;
    updated.set(playerId, current + points);
    return updated;
  });
};
```

### Turn-Based Pattern
```typescript
const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
const currentPlayer = players[currentPlayerIndex];

const nextTurn = () => {
  setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
};
```

## 🚀 Publishing Your Game

1. Test thoroughly with multiple players
2. Add to README.md game list
3. Create a demo video/GIF
4. Document any special requirements
5. Share with the community!

## 💡 Ideas for New Games

- **Trivia Categories** - Specific topics (movies, sports, etc.)
- **Word Games** - Rhymes, associations, word chains
- **Memory Game** - Simon says, sequence memory
- **Racing Game** - Tap/swipe to accelerate
- **Voting Game** - Players vote on options
- **Auction Game** - Bid on items
- **Team Games** - Split players into teams
- **Story Game** - Collaborative storytelling
- **Music Game** - Rhythm or music trivia
- **Math Game** - Quick calculations

## 📚 Resources

- Socket.IO docs: https://socket.io/docs/
- Next.js docs: https://nextjs.org/docs
- React hooks: https://react.dev/reference/react
- Tailwind CSS: https://tailwindcss.com/docs

---

**Happy game developing! 🎮✨**

Need help? Review the existing Quiz and Drawing games for complete examples.
