'use client';

import { useSocket } from '@/lib/socket';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Player } from '@/types/socket';

function ControllerContent() {
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  // Drawing states
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [wordToDraw, setWordToDraw] = useState<string>('');
  const [guessInput, setGuessInput] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [drawingActive, setDrawingActive] = useState(false);
  const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Quiz states
  const [hasAnswered, setHasAnswered] = useState(false);
  const [myAnswer, setMyAnswer] = useState<number | null>(null);
  const [quizState, setQuizState] = useState<'playing' | 'revealing' | 'results'>('playing');
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Platformer states
  const [platformerState, setPlatformerState] = useState<'waiting' | 'racing' | 'finished'>('waiting');
  const [myPlacement, setMyPlacement] = useState<number | null>(null);
  const [myFinishTime, setMyFinishTime] = useState<number | null>(null);
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });
  const joystickIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const moveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const room = searchParams.get('room');
    const playerId = localStorage.getItem('playerId');
    
    if (!room || !playerId) {
      router.push('/join');
      return;
    }

    setRoomCode(room);

    if (!socket || !isConnected) return;

    console.log('🔌 CONTROLLER: Connected, getting player info for', playerId);
    socket.emit('get-player-info', { playerId }, (response) => {
      console.log('📥 CONTROLLER: get-player-info response:', response);
      if (response.success && response.player) {
        setPlayer(response.player);
        console.log('✅ CONTROLLER: Player loaded:', response.player.name);
        
        // Restore current game if any
        if (response.currentGame) {
          setCurrentGame(response.currentGame);
        }
      } else {
        console.error('❌ CONTROLLER: Failed to get player info:', response.error);
        // Player not found in any room - might have been kicked or room ended
        // Clear invalid player ID from localStorage
        localStorage.removeItem('playerId');
        // Don't redirect immediately, wait a bit in case it's a race condition
        setTimeout(() => {
          alert('Could not reconnect to room. Please join again.');
          router.push('/join');
        }, 500);
      }
    });

    // Game started
    socket.on('game-started', ({ gameName }) => {
      setCurrentGame(gameName);
    });

    // Game state updates
    socket.on('game-state-update', (data) => {
      console.log('📨 CONTROLLER: Game state update:', data.type);
      if (data.type === 'quiz-question-end') {
        console.log('📨 CONTROLLER: FULL quiz-question-end data:', JSON.stringify(data, null, 2));
      }
      
      if (data.type === 'drawing-init' || data.type === 'drawing-next-round') {
        const amIDrawer = data.drawerId === playerId;
        console.log('🎮 CONTROLLER: drawing-init/next-round - Am I drawer?', amIDrawer, 'Setting drawingActive to FALSE');
        setIsMyTurn(amIDrawer);
        setDrawingActive(false);
        setHasGuessedCorrectly(false); // Reset for new round
        if (amIDrawer) {
          setWordToDraw(data.word || '');
        }
      } else if (data.type === 'drawing-round-start') {
        const amIDrawer = data.drawerId === playerId;
        console.log('▶️ CONTROLLER: drawing-round-start - Am I drawer?', amIDrawer, 'Setting drawingActive to TRUE');
        setIsMyTurn(amIDrawer);
        setDrawingActive(true);
        setHasGuessedCorrectly(false); // Reset when round starts
        if (amIDrawer) {
          setWordToDraw(data.word || '');
          // Clear canvas when round starts
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      } else if (data.type === 'drawing-round-end') {
        console.log('⏹️ CONTROLLER: drawing-round-end - Setting drawingActive to FALSE');
        setDrawingActive(false);
        setIsMyTurn(false);
        setGuessInput('');
        setHasGuessedCorrectly(false); // Reset for next round
      } else if (data.type === 'drawing-correct-guess') {
        if (data.playerId === playerId) {
          setHasGuessedCorrectly(true); // Mark as guessed correctly
          alert('✅ Correct! +' + data.points + ' points');
        }
      } else if (data.type === 'quiz-init') {
        // Receive quiz questions from host
        setQuizQuestions(data.questions || []);
        setCurrentQuestionIndex(0);
        console.log('📚 CONTROLLER: Received quiz questions:', data.questions);
      } else if (data.type === 'quiz-question-start') {
        setHasAnswered(false);
        setMyAnswer(null);
        setQuizState('playing');
        setCorrectAnswer(null);
        if (data.questionIndex !== undefined) {
          setCurrentQuestionIndex(data.questionIndex);
        }
      } else if (data.type === 'quiz-question-end') {
        console.log('📊 CONTROLLER: quiz-question-end received');
        console.log('  - My playerId:', playerId);
        console.log('  - Scores received:', data.scores);
        console.log('  - Correct answer:', data.correctAnswer);
        
        setQuizState('results');
        setCorrectAnswer(data.correctAnswer);
        if (data.scores) {
          const myScoreData = data.scores.find((s: any) => s.playerId === playerId);
          console.log('  - My score data found:', myScoreData);
          if (myScoreData) {
            setMyScore(myScoreData.score);
            console.log('  - ✅ Updated my score to', myScoreData.score);
          } else {
            console.log('  - ❌ My score data NOT found in scores array');
          }
        } else {
          console.log('  - ❌ No scores array in data');
        }
      } else if (data.type === 'platformer-init') {
        setPlatformerState('waiting');
        setMyPlacement(null);
        setMyFinishTime(null);
      } else if (data.type === 'platformer-start') {
        setPlatformerState('racing');
        setMyPlacement(null);
        setMyFinishTime(null);
      } else if (data.type === 'platformer-player-finished') {
        if (data.playerId === playerId) {
          setMyPlacement(data.placement);
          setMyFinishTime(data.time);
        }
      } else if (data.type === 'platformer-end') {
        setPlatformerState('finished');
      }
    });

    // Room ended (host disconnected)
    socket.on('room-ended', () => {
      console.log('🚪 CONTROLLER: Room ended, redirecting to home...');
      // Clear player data from localStorage
      localStorage.removeItem('playerId');
      alert('Host left the game. Returning to lobby...');
      router.push('/');
    });

    return () => {
      socket.off('game-started');
      socket.off('game-state-update');
      socket.off('room-ended');
    };
  }, [socket, isConnected, router, searchParams]);

  // ============= DRAWING HANDLERS =============
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || !drawingActive) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && socket) {
      const x = (touch.clientX - rect.left) / rect.width;
      const y = (touch.clientY - rect.top) / rect.height;
      setLastPoint({ x, y });
      setIsDrawing(true);
      
      // Send first point with isNewStroke flag
      console.log('👆 CONTROLLER: Touch start at', x, y, '(new stroke)');
      socket.emit('draw-point', {
        x,
        y,
        color: selectedColor,
        size: 5,
        isNewStroke: true
      } as any); // Cast to any to allow isNewStroke property
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isMyTurn || !lastPoint || !drawingActive) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && socket) {
      const x = (touch.clientX - rect.left) / rect.width;
      const y = (touch.clientY - rect.top) / rect.height;
      
      // Draw locally
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.strokeStyle = selectedColor;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(lastPoint.x * canvas.width, lastPoint.y * canvas.height);
        ctx.lineTo(x * canvas.width, y * canvas.height);
        ctx.stroke();
      }
      
      // Send to server
      console.log('✏️ CONTROLLER: Sending draw at', x, y);
      socket.emit('draw-point', {
        x,
        y,
        color: selectedColor,
        size: 5
      });
      
      setLastPoint({ x, y });
    }
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
    setLastPoint(null);
    console.log('👆 CONTROLLER: Touch end');
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || !drawingActive) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && socket) {
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setLastPoint({ x, y });
      setIsDrawing(true);
      
      // Send first point with isNewStroke flag
      console.log('🖱️ CONTROLLER: Mouse down at', x, y, '(new stroke)');
      socket.emit('draw-point', {
        x,
        y,
        color: selectedColor,
        size: 5,
        isNewStroke: true
      } as any); // Cast to any to allow isNewStroke property
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isMyTurn || !lastPoint || !drawingActive) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && socket) {
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      
      // Draw locally
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.strokeStyle = selectedColor;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(lastPoint.x * canvas.width, lastPoint.y * canvas.height);
        ctx.lineTo(x * canvas.width, y * canvas.height);
        ctx.stroke();
      }
      
      // Send to server
      console.log('✏️ CONTROLLER: Sending draw at', x, y);
      socket.emit('draw-point', {
        x,
        y,
        color: selectedColor,
        size: 5
      });
      
      setLastPoint({ x, y });
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setLastPoint(null);
    console.log('🖱️ CONTROLLER: Mouse up');
  };

  const handleMouseLeave = () => {
    setIsDrawing(false);
    setLastPoint(null);
  };

  const handleClear = () => {
    if (!isMyTurn || !drawingActive) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    console.log('🧹 CONTROLLER: Sending clear');
    socket?.emit('clear-canvas');
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim() || isMyTurn || !drawingActive || hasGuessedCorrectly) return;
    
    console.log('💭 CONTROLLER: Sending guess:', guessInput);
    socket?.emit('submit-guess', { guess: guessInput });
    setGuessInput('');
  };

  // ============= QUIZ HANDLERS =============
  const handleAnswer = (answerIndex: number) => {
    if (hasAnswered || !socket) return;
    
    setHasAnswered(true);
    setMyAnswer(answerIndex);
    
    socket.emit('controller-input', {
      action: 'answer',
      answer: answerIndex
    });
  };

  const handleReady = () => {
    if (!socket || !player) return;
    setIsReady(true);
    socket.emit('player-ready', { playerId: player.id });
  };

  // ============= PLATFORMER HANDLERS =============
  const startMoving = (direction: number) => {
    // Clear any existing interval
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
    }
    
    // Set position immediately
    setJoystickPosition({ x: direction, y: 0 });
    
    // Send movement command immediately
    if (socket && platformerState === 'racing') {
      socket.emit('controller-input', {
        action: 'move',
        joystickX: direction,
        joystickY: 0
      });
    }
    
    // Continue sending while held (reduced frequency for less lag)
    moveIntervalRef.current = setInterval(() => {
      if (socket && platformerState === 'racing') {
        socket.emit('controller-input', {
          action: 'move',
          joystickX: direction,
          joystickY: 0
        });
      }
    }, 100); // Reduced from 50ms to 100ms (10 updates/sec instead of 20)
  };

  const stopMoving = () => {
    // Clear interval
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
    
    // Reset position
    setJoystickPosition({ x: 0, y: 0 });
    
    // Send stop signal
    if (socket) {
      socket.emit('controller-input', {
        action: 'move',
        joystickX: 0,
        joystickY: 0
      });
    }
  };

  const handleJoystickEnd = () => {
    stopMoving();
  };

  const handleJump = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!socket || platformerState !== 'racing') return;
    
    socket.emit('controller-input', {
      action: 'jump'
    });
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (joystickIntervalRef.current) {
        clearInterval(joystickIntervalRef.current);
      }
      if (moveIntervalRef.current) {
        clearInterval(moveIntervalRef.current);
      }
    };
  }, []);

  if (!isConnected || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl">Connecting...</div>
      </div>
    );
  }

  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB', '#A52A2A'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-md mx-auto">
        {/* Player Card */}
        <div
          className="rounded-2xl p-6 mb-8 text-white shadow-xl"
          style={{ backgroundColor: player.color + '40', border: `4px solid ${player.color}` }}
        >
          <div className="text-center">
            <div
              className="w-20 h-20 rounded-full mx-auto mb-4"
              style={{ backgroundColor: player.color }}
            />
            <h2 className="text-3xl font-bold mb-2">{player.name}</h2>
            <p className="text-lg opacity-80">Room: {roomCode}</p>
            {currentGame === 'quiz' && myScore > 0 && (
              <p className="text-2xl font-bold mt-4">Score: {myScore}</p>
            )}
          </div>
        </div>

        {/* Waiting for Game */}
        {!currentGame && (
          <div className="bg-white rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold mb-4 text-gray-800">Waiting for game...</h3>
            <p className="text-gray-600">The host will start a game soon!</p>
            {!isReady && (
              <button
                onClick={handleReady}
                className="mt-6 px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xl font-bold transition transform hover:scale-105"
              >
                Ready!
              </button>
            )}
            {isReady && (
              <div className="mt-6 text-green-600 text-xl font-bold">✓ Ready!</div>
            )}
          </div>
        )}

        {/* Quiz Game */}
        {currentGame === 'quiz' && (
          <div className="bg-white rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">Quiz Time!</h3>
            
            {quizState === 'playing' && !hasAnswered && quizQuestions[currentQuestionIndex] && (
              <div className="space-y-4">
                {/* Show question */}
                <div className="mb-6 p-4 bg-blue-50 rounded-xl">
                  <p className="text-lg font-semibold text-gray-800 text-center">
                    {quizQuestions[currentQuestionIndex].question}
                  </p>
                </div>
                
                {/* Show answer options */}
                {quizQuestions[currentQuestionIndex].options.map((option: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    className="w-full py-6 px-6 bg-purple-100 hover:bg-purple-200 text-gray-800 rounded-xl text-xl font-semibold transition transform hover:scale-105 text-left"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
            
            {hasAnswered && quizState === 'playing' && quizQuestions[currentQuestionIndex] && (
              <div className="text-center">
                <div className="text-6xl mb-4">✓</div>
                <p className="text-xl text-gray-600">Answer submitted!</p>
                <p className="text-lg text-gray-500 mt-2">
                  You picked: {quizQuestions[currentQuestionIndex].options[myAnswer ?? 0]}
                </p>
              </div>
            )}
            
            {quizState === 'results' && quizQuestions[currentQuestionIndex] && (
              <div className="text-center">
                {myAnswer === correctAnswer ? (
                  <>
                    <div className="text-6xl mb-4">🎉</div>
                    <p className="text-2xl font-bold text-green-600">Correct!</p>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">😔</div>
                    <p className="text-2xl font-bold text-red-600">Wrong!</p>
                    <p className="text-lg text-gray-600 mt-2">
                      Correct answer: {quizQuestions[currentQuestionIndex].options[correctAnswer ?? 0]}
                    </p>
                  </>
                )}
                <p className="text-xl font-bold text-purple-600 mt-4">
                  Your Score: {myScore}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Drawing Game - Drawer (Active Drawing) */}
        {currentGame === 'drawing' && isMyTurn && drawingActive && (
          <div className="bg-white rounded-2xl p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Your turn to draw!</h3>
              {wordToDraw && (
                <div className="bg-purple-100 border-4 border-purple-400 rounded-xl p-4">
                  <p className="text-3xl font-bold text-purple-600">{wordToDraw}</p>
                </div>
              )}
            </div>
            
            {/* Color Picker */}
            <div className="grid grid-cols-6 gap-2 mb-4">
              {colors.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-full h-12 rounded-lg border-4 transition ${
                    selectedColor === color ? 'border-blue-500 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            
            {/* Canvas */}
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              className="w-full border-4 border-gray-300 rounded-xl bg-gray-50 touch-none cursor-crosshair"
            />
            
            {/* Clear Button */}
            <button
              onClick={handleClear}
              className="w-full mt-4 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xl font-bold transition"
            >
              Clear Canvas
            </button>
          </div>
        )}

        {/* Drawing Game - Guessing */}
        {currentGame === 'drawing' && !isMyTurn && drawingActive && (
          <div className="bg-white rounded-2xl p-8">
            {!hasGuessedCorrectly ? (
              <>
                <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">
                  Guess the drawing!
                </h3>
                <form onSubmit={handleGuessSubmit}>
                  <input
                    type="text"
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    placeholder="Type your guess..."
                    className="w-full px-6 py-4 text-xl border-4 border-purple-300 rounded-xl focus:outline-none focus:border-purple-500 text-gray-800 mb-4"
                  />
                  <button
                    type="submit"
                    className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xl font-bold transition transform hover:scale-105"
                  >
                    Submit Guess
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold mb-4 text-green-600">
                  You guessed it!
                </h3>
                <p className="text-gray-600">Waiting for other players...</p>
              </div>
            )}
          </div>
        )}

        {/* Drawing Game - Waiting for Round to Start (Guessers only) */}
        {currentGame === 'drawing' && !isMyTurn && !drawingActive && (
          <div className="bg-white rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold mb-4 text-gray-800">Get Ready!</h3>
            <p className="text-gray-600 mb-4">The drawer will start soon...</p>
            <p className="text-sm text-gray-500">Watch the screen and be ready to guess!</p>
          </div>
        )}
        
        {/* Drawing Game - Drawer Waiting (Drawer only, when round not active) */}
        {currentGame === 'drawing' && isMyTurn && !drawingActive && (
          <div className="bg-white rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold mb-4 text-gray-800">Your Turn!</h3>
            {wordToDraw && (
              <div className="bg-purple-100 border-4 border-purple-400 rounded-xl p-4 mb-4">
                <p className="text-3xl font-bold text-purple-600">{wordToDraw}</p>
              </div>
            )}
            <p className="text-gray-600">Waiting for host to start the round...</p>
          </div>
        )}

        {/* Platformer Game */}
        {currentGame === 'platformer' && (
          <div className="bg-white rounded-2xl p-6">
            <h3 className="text-2xl font-bold mb-4 text-center text-gray-800">
              🏃 Platform Racer 🏃
            </h3>
            
            {platformerState === 'waiting' && (
              <div className="text-center py-8">
                <p className="text-xl text-gray-600">Waiting for race to start...</p>
                <p className="text-sm text-gray-500 mt-2">Get ready!</p>
              </div>
            )}

            {platformerState === 'racing' && !myPlacement && (
              <div>
                <p className="text-center text-xl font-bold text-green-600 mb-6">
                  GO! Race to the finish!
                </p>
                
                {/* Controls Container - Horizontal Layout for Landscape */}
                <div className="flex gap-12 items-center justify-center min-h-[60vh] px-4">
                  {/* D-Pad / Arrow Buttons (Left Side) */}
                  <div className="flex flex-col items-center">
                    <p className="text-lg text-gray-600 mb-4 font-bold">Move</p>
                    <div className="relative w-72 h-72">
                      {/* Center area */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 bg-gray-300 rounded-lg"></div>
                      </div>
                      
                      {/* Left Arrow */}
                      <button
                        onTouchStart={() => startMoving(-1)}
                        onTouchEnd={stopMoving}
                        onMouseDown={() => startMoving(-1)}
                        onMouseUp={stopMoving}
                        onMouseLeave={stopMoving}
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 text-white rounded-xl text-5xl font-bold shadow-2xl transition touch-none border-4 border-blue-800 flex items-center justify-center select-none"
                        style={{ WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
                      >
                        ←
                      </button>
                      
                      {/* Right Arrow */}
                      <button
                        onTouchStart={() => startMoving(1)}
                        onTouchEnd={stopMoving}
                        onMouseDown={() => startMoving(1)}
                        onMouseUp={stopMoving}
                        onMouseLeave={stopMoving}
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 text-white rounded-xl text-5xl font-bold shadow-2xl transition touch-none border-4 border-blue-800 flex items-center justify-center select-none"
                        style={{ WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
                      >
                        →
                      </button>
                      
                      {/* Up Arrow (optional, for jumping alternative) */}
                      <button
                        onTouchStart={handleJump}
                        onMouseDown={handleJump}
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-b from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 active:from-green-800 active:to-green-900 text-white rounded-xl text-5xl font-bold shadow-2xl transition touch-none border-4 border-green-800 flex items-center justify-center select-none"
                        style={{ WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
                      >
                        ↑
                      </button>
                      
                      {/* Down Arrow (optional, currently unused) */}
                      <button
                        disabled
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-gray-400 text-gray-600 rounded-xl text-5xl font-bold shadow-lg border-4 border-gray-500 flex items-center justify-center opacity-50 cursor-not-allowed select-none"
                        style={{ WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
                      >
                        ↓
                      </button>
                    </div>
                  </div>

                  {/* Jump Button (Right Side) */}
                  <div className="flex flex-col items-center">
                    <p className="text-lg text-gray-600 mb-4 font-bold">Jump</p>
                    <button
                      onTouchStart={handleJump}
                      onMouseDown={handleJump}
                      className="w-72 h-72 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:from-red-800 active:to-red-900 text-white rounded-full text-8xl font-bold shadow-2xl transition touch-none border-8 border-red-800 flex items-center justify-center select-none"
                      style={{ WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
                    >
                      <span className="drop-shadow-lg">⬆️</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {platformerState === 'racing' && myPlacement && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">
                  {myPlacement === 1 ? '🥇' :
                   myPlacement === 2 ? '🥈' :
                   myPlacement === 3 ? '🥉' :
                   '🏁'}
                </div>
                <p className="text-3xl font-bold text-green-600 mb-2">
                  Finished!
                </p>
                <p className="text-xl text-gray-700">
                  Place: #{myPlacement}
                </p>
                <p className="text-lg text-gray-600">
                  Time: {myFinishTime ? (myFinishTime / 1000).toFixed(2) : '--'}s
                </p>
                <p className="text-sm text-gray-500 mt-4">
                  Waiting for other players...
                </p>
              </div>
            )}

            {platformerState === 'finished' && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🏆</div>
                <p className="text-2xl font-bold text-gray-800 mb-2">
                  Race Complete!
                </p>
                {myPlacement && (
                  <>
                    <p className="text-xl text-gray-700">
                      You finished #{myPlacement}
                    </p>
                    <p className="text-lg text-gray-600">
                      Time: {myFinishTime ? (myFinishTime / 1000).toFixed(2) : '--'}s
                    </p>
                  </>
                )}
                <p className="text-sm text-gray-500 mt-4">
                  Check the TV for final results!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ControllerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center text-white text-2xl">Loading...</div>}>
      <ControllerContent />
    </Suspense>
  );
}
