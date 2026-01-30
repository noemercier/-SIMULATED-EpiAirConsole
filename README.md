# EpiAirConsole

A multiplayer gaming platform where players use their phones as controllers, inspired by AirConsole. Built with Next.js and Socket.IO.

## 🎮 Features

- **Room-based multiplayer**: Host creates a room, players join with a code
- **Phone as controller**: Players use their mobile devices to control the game
- **Real-time communication**: Socket.IO for instant synchronization
- **Two complete games**: Quiz and Drawing games fully implemented
- **Player management**: Automatic color assignment and player tracking
- **Host controls**: Start/end games, manage room
- **Responsive design**: Works great on phones, tablets, and computers

## 🚀 Getting Started

### Installation

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

The server will start on port 3000 with both the Next.js app and Socket.IO server running.

## 📱 How to Play

### Step 1: Host Creates a Room

1. On a computer/TV, open the app
2. Click **"Create Room (Host)"**
3. A 6-digit room code will be generated
4. Share this code with players

### Step 2: Players Join

1. On your phone, open the app
2. Click **"Join Room (Controller)"**
3. Enter the room code
4. Enter your name
5. You're now connected as a controller!

### Step 3: Select and Play a Game

The host can choose from:
- **Quiz Game** - Answer trivia questions
- **Drawing Game** - Draw and guess

## 🎯 Games

### 🧠 Quiz Game

**Players:** 2-8  
**Duration:** 10 questions

**How to Play:**
- Host starts the game and displays questions
- Each question has 4 options (A, B, C, D)
- Players tap their answer on their phone controllers
- 15 seconds per question
- Correct answers earn 100 points
- Final scoreboard shows winners

**Controller:** Four large buttons (A, B, C, D)

### 🎨 Drawing Game

**Players:** 3-8  
**Duration:** 3 rounds

**How to Play:**
- Players take turns drawing a secret word
- Other players guess what's being drawn
- Drawing appears on the host screen in real-time
- Type guesses on your controller
- Correct guesses earn points (faster = more points)
- 60 seconds per turn

**Controller:** 
- **Drawing mode:** Touch canvas to draw
- **Guessing mode:** Text input to submit guesses

## 🏗️ Project Structure

```
epiairconsole/
├── app/
│   ├── page.tsx                  # Home page (create/join)
│   ├── host/page.tsx             # Host lobby
│   ├── join/page.tsx             # Join room page
│   ├── controller/page.tsx       # Player controller interface
│   ├── games/
│   │   ├── quiz/page.tsx         # Quiz game host view
│   │   └── drawing/page.tsx      # Drawing game host view
│   ├── layout.tsx                # Root layout with SocketProvider
│   └── globals.css               # Global styles
├── lib/
│   └── socket.tsx                # Socket.IO context and hooks
├── types/
│   └── socket.ts                 # TypeScript interfaces
├── data/
│   ├── quiz-questions.ts         # Quiz questions database
│   └── drawing-words.ts          # Drawing words list
├── server.ts                     # Custom Node.js + Socket.IO server
└── package.json
```

## 🔧 Technology Stack

- **Frontend**: Next.js 14, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Real-time**: Socket.IO (Server & Client)
- **Server**: Custom Node.js server with Next.js
- **Room Codes**: nanoid
- **Runtime**: tsx (TypeScript execution)

## 🌐 Socket.IO Events

### Client → Server

| Event | Description | Data |
|-------|-------------|------|
| `create-room` | Create a new game room | - |
| `join-room` | Join an existing room | `{ roomCode, playerName }` |
| `get-room-info` | Get current room state | - |
| `start-game` | Start a specific game | `{ gameName }` |
| `game-state-update` | Update game state | `{ type, ...data }` |
| `controller-input` | Send controller input | `{ action, ...data }` |
| `end-room` | Close the room | - |

### Server → Client

| Event | Description | Data |
|-------|-------------|------|
| `player-joined` | New player joined | `{ player, players }` |
| `player-left` | Player left | `{ player, players }` |
| `game-started` | Game has been started | `{ gameName }` |
| `game-state-update` | Game state changed | `{ type, ...data }` |
| `controller-input` | Controller input received | `{ playerId, action, ...data }` |
| `room-ended` | Room has been closed | - |

## 🎨 Customization

### Adding New Games

1. Create a new game page in `app/games/[game-name]/page.tsx`
2. Add game logic using Socket.IO events
3. Update controller in `app/controller/page.tsx`
4. Add game button in `app/host/page.tsx`

### Adding Quiz Questions

Edit `data/quiz-questions.ts`:

```typescript
{
  id: 16,
  question: "Your question?",
  options: ["A", "B", "C", "D"],
  correctAnswer: 2, // Index of correct answer
  category: "Category"
}
```

### Adding Drawing Words

Edit `data/drawing-words.ts`:

```typescript
export const drawingWords = [
  "newword1", "newword2", ...
];
```

## 🚀 Production Deployment

### Build for Production

```bash
npm run build
npm start
```

### Deploy to Vercel

The app can be deployed to Vercel, but note that Socket.IO requires a custom server. Consider:

1. **Separate deployment**: Deploy Next.js to Vercel, Socket.IO server elsewhere
2. **VPS/Cloud**: Deploy the entire app to a VPS (DigitalOcean, AWS, etc.)
3. **Docker**: Containerize the application

## 📝 Features to Add

- [ ] Add more games (Trivia, Racing, etc.)
- [ ] Sound effects and music
- [ ] Game scoring and leaderboards
- [ ] Room settings (max players, game duration)
- [ ] Spectator mode
- [ ] Chat functionality
- [ ] Player avatars
- [ ] Game history and statistics
- [ ] PWA support for mobile
- [ ] Room persistence/reconnection

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Add new games
- Improve UI/UX
- Add features
- Fix bugs
- Improve documentation

## 📄 License

MIT License - feel free to use this project for learning or building your own games!

## 🎉 Have Fun!

Enjoy creating and playing games with friends! 🎮📱✨

