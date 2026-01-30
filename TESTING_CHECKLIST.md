# Testing Checklist for EpiAirConsole

Use this checklist to ensure everything works before a game session or after making changes.

## ✅ Basic Setup Tests

### Server Startup
- [ ] Server starts without errors (`npm run dev`)
- [ ] No TypeScript compilation errors
- [ ] Socket.IO server initializes
- [ ] Port 3000 is accessible

### Home Page
- [ ] Home page loads at http://localhost:3000
- [ ] "Create Room" button visible
- [ ] "Join Room" button visible
- [ ] No console errors (F12)

## ✅ Host Flow Tests

### Room Creation
- [ ] Click "Create Room" navigates to /host
- [ ] 6-digit room code is generated
- [ ] Room code is displayed prominently
- [ ] Host appears in players list with crown
- [ ] Socket connection indicator shows "connected"

### Player Management
- [ ] New players appear in the list when they join
- [ ] Player colors are assigned correctly
- [ ] Player names display properly
- [ ] Player count updates correctly

### Game Selection
- [ ] Both game cards are visible (Quiz & Drawing)
- [ ] Game descriptions are readable
- [ ] Clicking a game starts it
- [ ] Navigation to game page works

### End Room
- [ ] "End Room" button is visible
- [ ] Clicking ends the room
- [ ] Redirects back to home page
- [ ] Controllers are notified

## ✅ Controller Flow Tests

### Join Room
- [ ] Join page loads at /join
- [ ] Room code input works
- [ ] Name input works
- [ ] "Join Room" button enables when fields filled
- [ ] Connection status indicator visible

### Joining
- [ ] Valid room code allows joining
- [ ] Invalid room code shows error
- [ ] Player is redirected to /controller
- [ ] Player sees waiting screen
- [ ] Player's assigned color is visible

### Waiting Screen
- [ ] Player name displayed
- [ ] Room code displayed
- [ ] "Waiting for host" message shown
- [ ] Connection status visible

## ✅ Quiz Game Tests

### Host View
- [ ] Game page loads (/games/quiz?role=host)
- [ ] Question displays correctly
- [ ] All 4 options are visible
- [ ] Category is shown
- [ ] Question counter shows (1 of 10)

### Starting Questions
- [ ] "Start Question" button works
- [ ] Timer starts at 15 seconds
- [ ] Timer counts down
- [ ] Question becomes active

### During Question
- [ ] Player answers are tracked
- [ ] Answer counts update in real-time
- [ ] Timer turns red at 5 seconds
- [ ] All players status shown (answered or waiting)

### Question Results
- [ ] Timer ends automatically at 0
- [ ] Correct answer is highlighted (green)
- [ ] Wrong answers shown in gray
- [ ] Player answer counts visible
- [ ] Scoreboard appears with correct scores

### Next Question
- [ ] "Next Question" button works
- [ ] Moves to next question
- [ ] Question counter increments
- [ ] Scores persist

### Final Results
- [ ] After 10 questions, shows final screen
- [ ] Top 3 on podium (gold, silver, bronze)
- [ ] All players ranked by score
- [ ] "Back to Lobby" button works

### Controller - Quiz
- [ ] Four buttons (A, B, C, D) are large and tappable
- [ ] Buttons have correct colors
- [ ] Tap registers immediately
- [ ] Can answer each question once
- [ ] Visual feedback on tap

## ✅ Drawing Game Tests

### Host View
- [ ] Game page loads (/games/drawing?role=host)
- [ ] Current drawer is displayed
- [ ] Secret word is shown
- [ ] Round counter shows (1 of 3)

### Starting Round
- [ ] "Start Drawing" button works
- [ ] Timer starts at 60 seconds
- [ ] Canvas appears
- [ ] Word is visible to host

### During Drawing
- [ ] Canvas displays drawing in real-time
- [ ] Multiple strokes appear
- [ ] Drawing is smooth (no lag)
- [ ] Clear works properly

### Guessing
- [ ] Correct guesses are detected
- [ ] Player status updates (✓ when guessed)
- [ ] Points awarded correctly (faster = more)
- [ ] Guessing players see notification

### Round End
- [ ] Timer ends round at 0
- [ ] Final drawing is shown
- [ ] Word revealed
- [ ] Scoreboard shows round scores
- [ ] Who guessed correctly is indicated

### Next Round
- [ ] "Next Round" button works
- [ ] New drawer selected (rotates)
- [ ] New word chosen
- [ ] Canvas clears
- [ ] Round counter increments

### Final Results
- [ ] After 3 rounds, shows final screen
- [ ] Top 3 on podium
- [ ] All players ranked
- [ ] "Back to Lobby" button works

### Controller - Drawing (Your Turn)
- [ ] Shows "Your turn to draw!"
- [ ] Secret word displayed at top
- [ ] Canvas is large and responsive
- [ ] Drawing with finger works
- [ ] Touch tracking is accurate
- [ ] "Clear Canvas" button works

### Controller - Drawing (Guessing)
- [ ] Shows "Guess what's being drawn!"
- [ ] Text input is visible
- [ ] Keyboard appears when tapped
- [ ] Can type guesses
- [ ] "Submit Guess" button works
- [ ] Input clears after submission

## ✅ Connection & Error Tests

### Network
- [ ] Works on same WiFi network
- [ ] Host IP address works for players
- [ ] Reconnects after brief disconnect
- [ ] Multiple controllers can connect

### Edge Cases
- [ ] Player joins mid-game (should work or be prevented)
- [ ] Player disconnects during game
- [ ] Host disconnects ends game for all
- [ ] Duplicate room codes don't exist
- [ ] Empty name is prevented

### Browser Compatibility
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works on mobile browsers
- [ ] Touch events work on mobile

## ✅ UI/UX Tests

### Responsive Design
- [ ] Looks good on desktop (host)
- [ ] Looks good on tablet (host or controller)
- [ ] Looks good on phone (controller)
- [ ] Buttons are touch-friendly (44px+)
- [ ] Text is readable from distance (host)

### Visual Feedback
- [ ] Buttons show hover states
- [ ] Active states visible on tap
- [ ] Loading states shown when needed
- [ ] Error messages are clear
- [ ] Success states are satisfying

### Performance
- [ ] No noticeable lag in drawing
- [ ] Quiz answers register instantly
- [ ] Animations are smooth
- [ ] No memory leaks after multiple games
- [ ] Socket messages not delayed

## ✅ Multi-Player Tests

### 2 Players
- [ ] Both can join
- [ ] Both see each other
- [ ] Quiz works with 2
- [ ] Drawing works with 2
- [ ] Scores calculated correctly

### 4 Players
- [ ] All can join simultaneously
- [ ] All different colors
- [ ] All controllers responsive
- [ ] Drawing rotation works
- [ ] Quiz shows all answers

### 8 Players (Max)
- [ ] All 8 can join
- [ ] Performance is acceptable
- [ ] All colors are different
- [ ] Turn order works in drawing
- [ ] Quiz scoreboard shows all

## ✅ Data Validation

### Quiz Questions
- [ ] All questions have 4 options
- [ ] Correct answers are accurate
- [ ] No typos in questions
- [ ] Categories are appropriate
- [ ] At least 10 questions available

### Drawing Words
- [ ] Words are drawable
- [ ] No duplicate words in same game
- [ ] Difficulty varies
- [ ] No offensive words
- [ ] Sufficient words for multiple games

## 🐛 Known Issues to Check

- [ ] No CSS import warnings
- [ ] No Socket.IO connection errors
- [ ] No React hydration errors
- [ ] No TypeScript type errors
- [ ] No console warnings

## 📱 Mobile-Specific Tests

### Touch Interactions
- [ ] Tap targets are large enough
- [ ] No accidental double-taps
- [ ] Scroll works properly
- [ ] Zoom is disabled (viewport meta)
- [ ] Orientation lock isn't needed

### Performance
- [ ] Smooth animations on phone
- [ ] Drawing is responsive
- [ ] Battery drain is reasonable
- [ ] No overheating issues

## 🎉 Final Pre-Launch Checklist

- [ ] All games tested with real players
- [ ] Documentation is up to date
- [ ] README has accurate instructions
- [ ] Quick Start guide is clear
- [ ] No critical bugs remaining
- [ ] Performance is acceptable
- [ ] Fun factor is high! 🎮

## 📝 Notes Section

Use this space to track issues found during testing:

```
Date: ___________
Tester: ___________
Issue: ___________
Status: ___________
```

---

**Testing Tips:**
- Test with real devices, not just simulators
- Have someone else test (fresh perspective)
- Test with poor WiFi to simulate real conditions
- Take notes during testing
- Fix critical bugs before minor ones

**Good luck with testing! 🧪✅**
