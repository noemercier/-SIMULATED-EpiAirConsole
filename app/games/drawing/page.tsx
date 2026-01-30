'use client';

import { useSocket } from '@/lib/socket';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Player } from '@/types/socket';
import { getRandomWord } from '@/data/drawing-words';

interface PlayerScore {
  playerId: string;
  name: string;
  color: string;
  score: number;
  guessed: boolean;
}

interface DrawPoint {
  x: number;
  y: number;
  color: string;
  size: number;
  isNewStroke?: boolean; // Flag to indicate start of a new stroke
}

export default function DrawingGamePage() {
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [playerScores, setPlayerScores] = useState<Map<string, PlayerScore>>(new Map());
  const [currentDrawerIndex, setCurrentDrawerIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [gameState, setGameState] = useState<'waiting' | 'drawing' | 'results' | 'final'>('waiting');
  const [timeLeft, setTimeLeft] = useState(60);
  const [drawingData, setDrawingData] = useState<DrawPoint[]>([]);
  const [roundNumber, setRoundNumber] = useState(1);
  const maxRounds = 3;

  // Debug: Track gameState changes
  useEffect(() => {
    console.log('🔄 HOST: gameState changed to:', gameState);
  }, [gameState]);

  // Initialize game
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('🎬 HOST: Initializing game...');

    socket.emit('get-room-info', (response) => {
      if (response.success && response.players) {
        const nonHostPlayers = response.players.filter(p => !p.isHost);
        setPlayers(nonHostPlayers);
        
        const scores = new Map<string, PlayerScore>();
        nonHostPlayers.forEach(player => {
          scores.set(player.id, {
            playerId: player.id,
            name: player.name,
            color: player.color,
            score: 0,
            guessed: false
          });
        });
        setPlayerScores(scores);

        if (role === 'host') {
          const word = getRandomWord();
          setCurrentWord(word);
          
          console.log('📤 HOST: Sending initial drawing-init with word:', word);
          // Send initial word to drawer only
          socket.emit('game-state-update', {
            type: 'drawing-init',
            drawerIndex: 0,
            drawerId: nonHostPlayers[0].id,
            word: word
          });
        }
      }
    });
  }, [socket, isConnected, role]); // Only run when socket/connection changes

  // Socket event listeners - separate useEffect  
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for drawing data from server
    socket.on('drawing-update', (data: DrawPoint) => {
      console.log('🖼️ HOST: Received drawing update:', data);
      setDrawingData(prev => [...prev, data]);
    });

    // Listen for clear canvas
    socket.on('drawing-clear', () => {
      console.log('🧹 HOST: Received clear canvas');
      setDrawingData([]);
    });

    // Listen for guesses
    socket.on('player-guess', ({ playerId, guess }) => {
      console.log('💭 HOST: Received guess from', playerId, ':', guess);
      if (role === 'host' && gameState === 'drawing') {
        handleGuess(playerId, guess);
      }
    });

    return () => {
      socket.off('drawing-update');
      socket.off('drawing-clear');
      socket.off('player-guess');
    };
  }, [socket, isConnected, role, gameState]);

  // Draw on canvas when drawing data changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || drawingData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('🎨 HOST: Drawing', drawingData.length, 'points on canvas');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all points
    for (let i = 1; i < drawingData.length; i++) {
      const prevPoint = drawingData[i - 1];
      const currentPoint = drawingData[i];

      // Skip connecting if current point is the start of a new stroke
      if (currentPoint.isNewStroke) {
        continue;
      }

      ctx.strokeStyle = currentPoint.color;
      ctx.lineWidth = currentPoint.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(prevPoint.x * canvas.width, prevPoint.y * canvas.height);
      ctx.lineTo(currentPoint.x * canvas.width, currentPoint.y * canvas.height);
      ctx.stroke();
    }
  }, [drawingData]);

  // Timer
  useEffect(() => {
    if (gameState !== 'drawing' || !socket) return;

    console.log('⏰ HOST: Timer effect started for round', roundNumber);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          console.log('⏰ HOST: Timer expired, ending round');
          endRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  const handleGuess = (playerId: string, guess: string) => {
    console.log('🎯 HOST: Checking guess:', guess, 'vs', currentWord);
    
    const playerScore = playerScores.get(playerId);
    if (!playerScore || playerScore.guessed) return;

    if (guess.toLowerCase().trim() === currentWord.toLowerCase().trim()) {
      console.log('✅ HOST: Correct guess from', playerId);
      
      // Award points based on time left
      const points = Math.max(100, Math.floor((timeLeft / 60) * 500));
      
      setPlayerScores(prev => {
        const updated = new Map(prev);
        const score = updated.get(playerId);
        if (score) {
          score.score += points;
          score.guessed = true;
        }
        return updated;
      });

      // Notify the player
      if (socket) {
        socket.emit('game-state-update', {
          type: 'drawing-correct-guess',
          playerId,
          points
        });
      }

      // Check if all players guessed
      const eligiblePlayers = Array.from(playerScores.values())
        .filter(s => s.playerId !== players[currentDrawerIndex]?.id);
      
      const allGuessed = eligiblePlayers.length > 0 && eligiblePlayers.every(s => s.guessed);

      console.log('🔍 HOST: Checking if all guessed - eligible:', eligiblePlayers.length, 'all guessed:', allGuessed);

      if (allGuessed) {
        console.log('🎉 HOST: All players guessed correctly!');
        setTimeout(() => endRound(), 1000);
      }
    }
  };

  const startRound = () => {
    console.log('▶️ HOST: Starting round', roundNumber, 'current drawer:', players[currentDrawerIndex]?.name);
    console.log('📊 HOST: PlayerScores:', Array.from(playerScores.entries()).map(([id, score]) => ({id, name: score.name, guessed: score.guessed})));
    setGameState('drawing');
    setTimeLeft(60);
    setDrawingData([]);
    
    setPlayerScores(prev => {
      const updated = new Map(prev);
      updated.forEach(score => {
        score.guessed = false;
      });
      return updated;
    });

    if (socket) {
      socket.emit('game-state-update', {
        type: 'drawing-round-start',
        drawerIndex: currentDrawerIndex,
        drawerId: players[currentDrawerIndex]?.id,
        word: currentWord,
        roundNumber
      });
    }
  };

  const endRound = () => {
    console.log('⏹️ HOST: Ending round', roundNumber, 'gameState:', gameState);
    setGameState('results');
    
    if (socket) {
      socket.emit('game-state-update', {
        type: 'drawing-round-end',
        word: currentWord,
        scores: Array.from(playerScores.values())
      });
    }
  };

  const nextRound = () => {
    if (roundNumber < maxRounds) {
      const nextDrawerIndex = (currentDrawerIndex + 1) % players.length;
      const newWord = getRandomWord();
      
      console.log('➡️ HOST: Moving to round', roundNumber + 1);
      setCurrentDrawerIndex(nextDrawerIndex);
      setCurrentWord(newWord);
      setRoundNumber(roundNumber + 1);
      setGameState('waiting');
      setDrawingData([]);
      
      if (socket) {
        socket.emit('game-state-update', {
          type: 'drawing-next-round',
          drawerIndex: nextDrawerIndex,
          drawerId: players[nextDrawerIndex]?.id,
          word: newWord,
          roundNumber: roundNumber + 1
        });
      }
    } else {
      setGameState('final');
      
      if (socket) {
        socket.emit('game-state-update', {
          type: 'drawing-game-end',
          scores: Array.from(playerScores.values())
        });
      }
    }
  };

  const exitGame = () => {
    router.push('/host');
  };

  if (!isConnected || players.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-teal-900 to-blue-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading game...</div>
      </div>
    );
  }

  const currentDrawer = players[currentDrawerIndex];
  const sortedScores = Array.from(playerScores.values()).sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-teal-900 to-blue-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 text-white">
          <div>
            <h1 className="text-4xl font-bold">🎨 Drawing Game</h1>
            <p className="text-xl">Round {roundNumber} of {maxRounds}</p>
          </div>
          <button
            onClick={exitGame}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
          >
            Exit Game
          </button>
        </div>

        {/* Waiting State */}
        {gameState === 'waiting' && role === 'host' && (
          <div className="text-center">
            <div className="bg-white rounded-2xl p-12 mb-8">
              <div
                className="w-24 h-24 rounded-full mx-auto mb-4"
                style={{ backgroundColor: currentDrawer.color }}
              />
              <h2 className="text-4xl font-bold mb-4 text-gray-800">
                {currentDrawer.name}'s turn to draw!
              </h2>
              <div className="bg-purple-100 border-4 border-purple-400 rounded-xl p-8 mb-8">
                <p className="text-2xl text-gray-600 mb-2">Get ready!</p>
                <p className="text-xl text-gray-600">
                  The drawer will see their word on their phone
                </p>
              </div>
              <p className="text-xl text-gray-600">
                Other players will try to guess!
              </p>
            </div>
            <button
              onClick={startRound}
              className="px-12 py-6 bg-green-600 hover:bg-green-700 text-white rounded-xl text-2xl font-bold transition transform hover:scale-105"
            >
              Start Drawing
            </button>
          </div>
        )}

        {/* Drawing State */}
        {gameState === 'drawing' && role === 'host' && (
          <div className="grid grid-cols-3 gap-8">
            {/* Canvas */}
            <div className="col-span-2">
              <div className="bg-white rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {currentDrawer.name} is drawing...
                  </h2>
                  <div className="text-3xl font-bold text-purple-600">
                    {timeLeft}s
                  </div>
                </div>
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="w-full border-4 border-gray-300 rounded-xl bg-gray-50"
                />
              </div>
            </div>

            {/* Scoreboard */}
            <div>
              <div className="bg-white rounded-2xl p-6">
                <h3 className="text-2xl font-bold mb-4 text-gray-800">Players</h3>
                <div className="space-y-3">
                  {sortedScores.map(player => (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ backgroundColor: player.color + '20' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full"
                          style={{ backgroundColor: player.color }}
                        />
                        <span className="font-semibold text-gray-800">
                          {player.name}
                          {player.playerId === currentDrawer.id && ' ✏️'}
                          {player.guessed && ' ✅'}
                        </span>
                      </div>
                      <span className="font-bold text-gray-800">{player.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results State */}
        {gameState === 'results' && role === 'host' && (
          <div className="text-center">
            <div className="bg-white rounded-2xl p-12 mb-8">
              <h2 className="text-4xl font-bold mb-8 text-gray-800">Round {roundNumber} Results</h2>
              <div className="bg-purple-100 border-4 border-purple-400 rounded-xl p-8 mb-8">
                <p className="text-2xl text-gray-600 mb-2">The word was:</p>
                <p className="text-5xl font-bold text-purple-600">{currentWord}</p>
              </div>
              <div className="space-y-4 mb-8">
                {sortedScores.map((player, index) => (
                  <div
                    key={player.playerId}
                    className="flex items-center justify-between p-6 rounded-xl"
                    style={{ backgroundColor: player.color + '20' }}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl font-bold text-gray-600">#{index + 1}</span>
                      <div
                        className="w-12 h-12 rounded-full"
                        style={{ backgroundColor: player.color }}
                      />
                      <span className="text-2xl font-semibold text-gray-800">{player.name}</span>
                    </div>
                    <span className="text-3xl font-bold text-gray-800">{player.score}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={nextRound}
              className="px-12 py-6 bg-green-600 hover:bg-green-700 text-white rounded-xl text-2xl font-bold transition transform hover:scale-105"
            >
              {roundNumber < maxRounds ? 'Next Round' : 'Final Results'}
            </button>
          </div>
        )}

        {/* Final Results */}
        {gameState === 'final' && role === 'host' && (
          <div className="text-center">
            <div className="bg-white rounded-2xl p-12">
              <h2 className="text-5xl font-bold mb-12 text-gray-800">🏆 Final Results 🏆</h2>
              <div className="space-y-6 mb-12">
                {sortedScores.map((player, index) => (
                  <div
                    key={player.playerId}
                    className={`flex items-center justify-between p-8 rounded-xl ${
                      index === 0 ? 'ring-4 ring-yellow-400' : ''
                    }`}
                    style={{ backgroundColor: player.color + '30' }}
                  >
                    <div className="flex items-center gap-6">
                      <span className="text-5xl">
                        {index === 0 ? '🥇' : index === 1 ? '��' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                      <div
                        className="w-16 h-16 rounded-full"
                        style={{ backgroundColor: player.color }}
                      />
                      <span className="text-3xl font-bold text-gray-800">{player.name}</span>
                    </div>
                    <span className="text-4xl font-bold text-gray-800">{player.score}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={exitGame}
                className="px-12 py-6 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-2xl font-bold transition transform hover:scale-105"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
