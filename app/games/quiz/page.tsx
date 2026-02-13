'use client';

import { useSocket } from '@/lib/socket';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Player } from '@/types/socket';
import { getRandomQuestions, QuizQuestion } from '@/data/quiz-questions';

interface PlayerScore {
  playerId: string;
  name: string;
  color: string;
  score: number;
  answered: boolean;
  answer?: number;
}

export default function QuizGamePage() {
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');

  const [players, setPlayers] = useState<Player[]>([]);
  const [playerScores, setPlayerScores] = useState<Map<string, PlayerScore>>(new Map());
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameState, setGameState] = useState<'waiting' | 'question' | 'revealing' | 'results' | 'final'>('waiting');
  const [timeLeft, setTimeLeft] = useState(15);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [revealDelay, setRevealDelay] = useState(3); // 3 seconds delay before showing answers
  const [myAnswer, setMyAnswer] = useState<number | null>(null);
  const [hostPlayer, setHostPlayer] = useState<Player | null>(null);

  // Initialize game
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Get room info
    socket.emit('get-room-info', (response) => {
      if (response.success && response.players) {
        setPlayers(response.players);
        
        // Find host player
        const host = response.players.find((p: Player) => p.isHost);
        if (host) {
          setHostPlayer(host);
        }
        
        // Initialize scores
        const scores = new Map<string, PlayerScore>();
        response.players.forEach(player => {
          scores.set(player.id, {
            playerId: player.id,
            name: player.name,
            color: player.color,
            score: 0,
            answered: false
          });
        });
        setPlayerScores(scores);

        // Host initializes questions
        if (role === 'host') {
          const gameQuestions = getRandomQuestions(10);
          setQuestions(gameQuestions);
          
          // Broadcast questions to all players
          socket.emit('game-state-update', {
            type: 'quiz-init',
            questions: gameQuestions.map(q => ({
              id: q.id,
              question: q.question,
              options: q.options,
              category: q.category
            }))
          });
        }
      }
    });

    // Listen for controller input (host only)
    if (role === 'host') {
      socket.on('controller-input', (data) => {
        console.log('Controller input received:', data);
        if (data.action === 'answer') {
          handlePlayerAnswer(data.playerId, data.answer);
        }
      });
    }

    // Listen for game state updates
    socket.on('game-state-update', (data) => {
      if (data.type === 'quiz-init' && role !== 'host') {
        setQuestions(data.questions);
      }
    });

    return () => {
      socket.off('controller-input');
      socket.off('game-state-update');
    };
  }, [socket, isConnected, role]);

  // Check if all players have answered
  useEffect(() => {
    if (gameState === 'question' && role === 'host') {
      const allAnswered = Array.from(playerScores.values()).every(score => score.answered);
      if (allAnswered && playerScores.size > 0) {
        console.log('✅ All players answered! Skipping timer...');
        // All players answered, skip to revealing phase
        setGameState('revealing');
        setRevealDelay(3);
      }
    }
  }, [playerScores, gameState, role]);

  // Timer effect
  useEffect(() => {
    if (gameState === 'question' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'question' && timeLeft === 0) {
      // Time's up, start revealing phase
      setGameState('revealing');
      setRevealDelay(3);
    }
  }, [gameState, timeLeft]);

  // Reveal delay timer
  useEffect(() => {
    if (gameState === 'revealing' && revealDelay > 0) {
      const timer = setTimeout(() => {
        setRevealDelay(revealDelay - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'revealing' && revealDelay === 0) {
      endQuestion();
    }
  }, [gameState, revealDelay]);

  const handlePlayerAnswer = (playerId: string, answerIndex: number) => {
    console.log('handlePlayerAnswer called:', { playerId, answerIndex });
    setPlayerScores(prev => {
      const updated = new Map(prev);
      const playerScore = updated.get(playerId);
      console.log('Player score before update:', playerScore);
      if (playerScore && !playerScore.answered) {
        playerScore.answered = true;
        playerScore.answer = answerIndex;
        updated.set(playerId, playerScore);
        console.log('Player score after update:', playerScore);
      } else {
        console.log('Player not found or already answered:', { playerId, playerScore });
      }
      return updated;
    });
  };

  const startQuestion = () => {
    setGameState('question');
    setTimeLeft(15);
    setShowCorrectAnswer(false);
    setMyAnswer(null);
    
    // Reset answered status
    setPlayerScores(prev => {
      const updated = new Map(prev);
      updated.forEach(score => {
        score.answered = false;
        score.answer = undefined;
      });
      return updated;
    });

    // Notify players
    if (socket) {
      socket.emit('game-state-update', {
        type: 'quiz-question-start',
        questionIndex: currentQuestionIndex
      });
    }
  };

  const handleHostAnswer = (answerIndex: number) => {
    if (!hostPlayer || myAnswer !== null) return;
    setMyAnswer(answerIndex);
    handlePlayerAnswer(hostPlayer.id, answerIndex);
  };

  const endQuestion = () => {
    setGameState('results');
    setShowCorrectAnswer(true);

    // Calculate scores
    const currentQuestion = questions[currentQuestionIndex];
    const updatedScores = new Map(playerScores);
    console.log('=== CALCULATING SCORES ===');
    console.log('Current question correct answer:', currentQuestion.correctAnswer);
    console.log('All player scores before calculation:', Array.from(updatedScores.values()));
    
    updatedScores.forEach(score => {
      console.log(`Player ${score.name} (${score.playerId}): answered=${score.answer}, correct=${currentQuestion.correctAnswer}, match=${score.answer === currentQuestion.correctAnswer}`);
      if (score.answer === currentQuestion.correctAnswer) {
        score.score += 100;
        console.log(`  ✅ Added 100 points! New score: ${score.score}`);
      } else {
        console.log(`  ❌ Wrong answer, no points added`);
      }
    });
    
    console.log('All player scores after calculation:', Array.from(updatedScores.values()));
    
    // Update state with new scores
    setPlayerScores(updatedScores);

    // Notify players with updated scores
    if (socket) {
      const scoresArray = Array.from(updatedScores.values());
      console.log('Broadcasting updated scores:', scoresArray);
      socket.emit('game-state-update', {
        type: 'quiz-question-end',
        correctAnswer: currentQuestion.correctAnswer,
        scores: scoresArray
      });
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setGameState('waiting');
    } else {
      setGameState('final');
      
      // Notify players
      if (socket) {
        socket.emit('game-state-update', {
          type: 'quiz-final',
          scores: Array.from(playerScores.values())
        });
      }
    }
  };

  const exitGame = () => {
    router.push('/host');
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-900">
        <div className="text-white text-2xl">Loading quiz...</div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const sortedScores = Array.from(playerScores.values()).sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 text-white">
          <div>
            <h1 className="text-4xl font-bold">🧠 Quiz Game</h1>
            <p className="text-xl">Question {currentQuestionIndex + 1} of {questions.length}</p>
          </div>
          <button
            onClick={exitGame}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
          >
            Exit Game
          </button>
        </div>

        {/* Game States */}
        {gameState === 'waiting' && (
          <div className="text-center">
            <div className="bg-white rounded-2xl p-12 mb-8">
              <h2 className="text-3xl font-bold mb-4 text-gray-800">
                {currentQuestion.category}
              </h2>
              <p className="text-6xl mb-8 font-bold text-gray-800">{currentQuestion.question}</p>
              <div className="grid grid-cols-2 gap-6">
                {currentQuestion.options.map((option, index) => (
                  <div
                    key={index}
                    className="bg-gray-100 rounded-xl p-6 text-3xl font-semibold text-gray-800"
                  >
                    {String.fromCharCode(65 + index)}. {option}
                  </div>
                ))}
              </div>
            </div>
            {role === 'host' && (
              <button
                onClick={startQuestion}
                className="px-12 py-6 bg-green-600 hover:bg-green-700 text-white rounded-xl text-2xl font-bold transition transform hover:scale-105"
              >
                Start Question
              </button>
            )}
          </div>
        )}

        {gameState === 'question' && (
          <div>
            {/* Timer */}
            <div className="mb-8 text-center">
              <div className="inline-block bg-white rounded-full px-8 py-4">
                <span className={`text-6xl font-bold ${timeLeft <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                  {timeLeft}
                </span>
              </div>
            </div>

            {/* Question */}
            <div className="bg-white rounded-2xl p-12 mb-8">
              <h2 className="text-2xl font-bold mb-4 text-gray-600">
                {currentQuestion.category}
              </h2>
              <p className="text-5xl mb-8 font-bold text-gray-800">{currentQuestion.question}</p>
              <div className="grid grid-cols-2 gap-6">
                {currentQuestion.options.map((option, index) => {
                  const isMyAnswer = myAnswer === index;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => role === 'host' && handleHostAnswer(index)}
                      disabled={myAnswer !== null}
                      className={`rounded-xl p-6 text-3xl font-semibold relative transition-all ${
                        isMyAnswer 
                          ? 'bg-yellow-500 text-white ring-4 ring-yellow-300 scale-105' 
                          : myAnswer !== null
                          ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer active:scale-95'
                      }`}
                    >
                      <span>{String.fromCharCode(65 + index)}. {option}</span>
                      {isMyAnswer && <span className="ml-2">✓</span>}
                    </button>
                  );
                })}
              </div>
              {myAnswer !== null && (
                <p className="text-center text-green-600 font-bold text-2xl mt-4 animate-pulse">
                  ✓ Answer Submitted!
                </p>
              )}
            </div>

            {/* Players answered status */}
            <div className="grid grid-cols-4 gap-4">
              {Array.from(playerScores.values()).map(score => (
                <div
                  key={score.playerId}
                  className={`rounded-lg p-4 text-center text-white font-semibold ${
                    score.answered ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  {score.name} {score.answered ? '✓' : '...'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revealing phase - countdown before showing answers */}
        {gameState === 'revealing' && (
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-16 mb-8 border-4 border-white/30">
              <div className="text-8xl mb-6 animate-pulse">⏱️</div>
              <h2 className="text-4xl font-bold text-white mb-4">Time's Up!</h2>
              <p className="text-3xl text-white/80 mb-8">Revealing answers in...</p>
              <div className="text-9xl font-black text-yellow-400 animate-bounce">
                {revealDelay}
              </div>
            </div>
            
            {/* Show who answered */}
            <div className="grid grid-cols-4 gap-4">
              {Array.from(playerScores.values()).map(score => (
                <div
                  key={score.playerId}
                  className={`rounded-lg p-4 text-center text-white font-semibold ${
                    score.answered ? 'bg-green-600' : 'bg-red-600'
                  }`}
                >
                  {score.name} {score.answered ? '✓' : '✗'}
                </div>
              ))}
            </div>
          </div>
        )}

        {gameState === 'results' && role === 'host' && (
          <div>
            {/* Correct Answer */}
            <div className="bg-white rounded-2xl p-12 mb-8">
              <h2 className="text-3xl font-bold mb-4 text-green-600">Correct Answer!</h2>
              <p className="text-5xl mb-8 font-bold text-gray-800">{currentQuestion.question}</p>
              <div className="grid grid-cols-2 gap-6">
                {currentQuestion.options.map((option, index) => {
                  const isCorrect = index === currentQuestion.correctAnswer;
                  const answeredCount = Array.from(playerScores.values()).filter(
                    s => s.answer === index
                  ).length;

                  return (
                    <div
                      key={index}
                      className={`rounded-xl p-6 text-3xl font-semibold ${
                        isCorrect
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{String.fromCharCode(65 + index)}. {option}</span>
                        {answeredCount > 0 && (
                          <span className="text-2xl">({answeredCount})</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scores */}
            <div className="bg-white rounded-xl p-6 mb-8">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Current Scores</h3>
              <div className="space-y-2">
                {sortedScores.map((score, index) => (
                  <div
                    key={score.playerId}
                    className="flex items-center justify-between p-4 bg-gray-100 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold">#{index + 1}</span>
                      <div
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: score.color }}
                      />
                      <span className="text-xl font-semibold">{score.name}</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">{score.score} pts</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={nextQuestion}
              className="w-full px-12 py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-2xl font-bold transition"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Show Final Results'}
            </button>
          </div>
        )}

        {gameState === 'final' && (
          <div className="text-center">
            <h2 className="text-6xl font-bold text-white mb-8">🏆 Final Results!</h2>
            
            {/* Podium */}
            <div className="bg-white rounded-2xl p-12 mb-8">
              {sortedScores.slice(0, 3).map((score, index) => (
                <div
                  key={score.playerId}
                  className={`mb-6 p-8 rounded-xl ${
                    index === 0
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                      : index === 1
                      ? 'bg-gradient-to-r from-gray-300 to-gray-400'
                      : 'bg-gradient-to-r from-orange-400 to-orange-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <span className="text-5xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                      <div
                        className="w-16 h-16 rounded-full border-4 border-white"
                        style={{ backgroundColor: score.color }}
                      />
                      <span className="text-4xl font-bold text-white">{score.name}</span>
                    </div>
                    <span className="text-5xl font-bold text-white">{score.score} pts</span>
                  </div>
                </div>
              ))}

              {/* Rest of players */}
              {sortedScores.slice(3).map((score, index) => (
                <div
                  key={score.playerId}
                  className="mb-3 p-4 bg-gray-100 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-800">#{index + 4}</span>
                    <div
                      className="w-10 h-10 rounded-full"
                      style={{ backgroundColor: score.color }}
                    />
                    <span className="text-2xl font-semibold text-gray-800">{score.name}</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{score.score} pts</span>
                </div>
              ))}
            </div>

            <button
              onClick={exitGame}
              className="px-12 py-6 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-2xl font-bold transition"
            >
              Back to Lobby
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
