# Quick Start Guide - EpiAirConsole

## 🎯 First Time Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm run dev
   ```

3. **Server will run on**: http://localhost:3000

## 🎮 Playing Your First Game

### Host Setup (Computer/TV)

1. Open http://localhost:3000 on your computer
2. Click **"Create Room (Host)"**
3. You'll see a **6-digit room code** (e.g., "ABC123")
4. Share this code with players

### Player Setup (Phones)

1. Each player opens http://localhost:3000 on their phone
2. Click **"Join Room (Controller)"**
3. Enter the room code
4. Enter your name
5. You're connected! ✅

### Starting a Game

1. **Host** waits for all players to join
2. **Host** selects a game:
   - 🧠 **Quiz Game** - Answer trivia questions
   - 🎨 **Drawing Game** - Draw and guess

3. Click the game to start!

## 🧠 Quiz Game Instructions

**Host View:**
- Questions appear on the TV/computer screen
- Shows who has answered
- Timer counts down (15 seconds per question)
- After time ends, correct answer is revealed
- Scoreboard updates automatically

**Player Controller:**
- Four buttons: **A, B, C, D**
- Tap your answer as fast as you can!
- Faster answers = same points (100 for correct)

**Tips:**
- Read questions carefully
- Answer quickly before time runs out
- Watch the scoreboard between questions

## 🎨 Drawing Game Instructions

**Host View:**
- Shows the drawing in real-time
- Displays who guessed correctly
- Timer counts down (60 seconds per turn)
- Scoreboard updates when players guess

**Player Controller:**

*When it's YOUR turn to draw:*
- You see the secret word at the top
- Use your finger/stylus to draw on the canvas
- Draw clearly so others can guess!
- Tap "Clear Canvas" to start over

*When someone ELSE is drawing:*
- Watch the main screen
- Type your guess in the text box
- Hit "Submit Guess"
- Faster correct guesses = more points!

**Tips:**
- Draw simple, recognizable shapes
- Don't write letters or numbers!
- Keep guessing different words
- Points: 50-120 based on speed

## 🏆 Scoring

### Quiz Game
- **Correct Answer**: 100 points
- **Wrong Answer**: 0 points
- **10 Questions Total**
- **Winner**: Highest score wins!

### Drawing Game
- **Correct Guess**: 50-120 points (faster = more)
- **Drawing**: You get points when others guess
- **3 Rounds** (everyone draws once)
- **Winner**: Highest total score!

## ⚠️ Troubleshooting

**"Not connected to server"**
- Make sure the server is running (npm run dev)
- Refresh your browser
- Check that you're on the same network

**"Room not found"**
- Double-check the room code
- Make sure the host hasn't ended the room
- Room codes are case-sensitive

**Controller not responding**
- Check your internet connection
- Refresh the page on your phone
- You may need to rejoin the room

**Drawing not appearing**
- Make sure you're the current drawer
- Try tapping harder or moving slower
- Use "Clear Canvas" and try again

## 🌐 Network Setup

### Local Network (Same WiFi)
Both host and players must be on the **same WiFi network**.

**Host Computer**: http://localhost:3000  
**Players' Phones**: http://[HOST_IP]:3000

To find HOST_IP:
- **Mac/Linux**: `ifconfig` or `ip addr`
- **Windows**: `ipconfig`
Look for `192.168.x.x` or `10.0.x.x`

### Example:
If host IP is `192.168.1.100`:
- **Host**: Opens `http://localhost:3000`
- **Players**: Open `http://192.168.1.100:3000`

## 🎨 Customization Ideas

**Easy Changes:**
1. Edit quiz questions in `data/quiz-questions.ts`
2. Edit drawing words in `data/drawing-words.ts`
3. Change player colors in `server.ts` (PLAYER_COLORS)

**Advanced:**
1. Add new games
2. Change time limits
3. Add sound effects
4. Customize UI colors

## 🎉 Tips for the Best Experience

1. **Test first** - Try with 2-3 people before a big party
2. **Big screen** - Host on TV or projector for best experience
3. **Phone holders** - Players might want phone stands
4. **WiFi** - Strong connection is important
5. **Explain games** - Give quick tutorial before starting
6. **Have fun!** - That's what it's all about! 🎮

## 📞 Need Help?

- Check the main README.md for detailed documentation
- Review the Socket.IO events for debugging
- Check browser console for errors (F12)

---

**Enjoy your games! 🎮📱✨**
