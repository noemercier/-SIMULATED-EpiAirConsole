'use client';

import { useSocket } from '@/lib/socket';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Player } from '@/types/socket';

interface PlayerState {
  playerId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  isGrounded: boolean;
  hasFinished: boolean;
  finishTime: number | null;
  placement: number | null;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function PlatformerGamePage() {
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [playerStates, setPlayerStates] = useState<Map<string, PlayerState>>(new Map());
  const [gameState, setGameState] = useState<'waiting' | 'countdown' | 'racing' | 'finished'>('waiting');
  const [countdown, setCountdown] = useState(3);
  const [startTime, setStartTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [finishOrder, setFinishOrder] = useState<PlayerState[]>([]);

  // Game constants
  const GRAVITY = 0.5;
  const JUMP_FORCE = -15; // Increased from -12 for more air time
  const MAX_SPEED = 5;
  const ACCELERATION = 0.5;
  const FRICTION = 0.8;
  const PLAYER_SIZE = 30;
  const FINISH_LINE_X = 2800;

  // Platforms for the race course
  const platforms: Platform[] = [
    // Ground
    { x: 0, y: 550, width: 800, height: 50 },
    // First gap
    { x: 800, y: 550, width: 200, height: 50 },
    // Platforms
    { x: 1100, y: 550, width: 150, height: 50 },
    { x: 1300, y: 480, width: 150, height: 50 },
    { x: 1500, y: 420, width: 150, height: 50 },
    { x: 1700, y: 480, width: 150, height: 50 },
    { x: 1900, y: 550, width: 200, height: 50 },
    // Second section
    { x: 2150, y: 500, width: 100, height: 50 },
    { x: 2300, y: 450, width: 100, height: 50 },
    { x: 2450, y: 400, width: 100, height: 50 },
    // Final stretch
    { x: 2600, y: 550, width: 400, height: 50 },
  ];

  // Initialize game
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('get-room-info', (response) => {
      if (response.success && response.players) {
        const nonHostPlayers = response.players.filter(p => !p.isHost);
        setPlayers(nonHostPlayers);
        
        // Initialize player states
        const states = new Map<string, PlayerState>();
        nonHostPlayers.forEach((player, index) => {
          states.set(player.id, {
            playerId: player.id,
            name: player.name,
            color: player.color,
            x: 100,
            y: 500 - (index * 40), // Stack players vertically at start
            velocityX: 0,
            velocityY: 0,
            isGrounded: false,
            hasFinished: false,
            finishTime: null,
            placement: null,
          });
        });
        setPlayerStates(states);

        if (role === 'host') {
          // Notify players that platformer is ready
          socket.emit('game-state-update', {
            type: 'platformer-init',
            players: nonHostPlayers.map(p => ({ id: p.id, name: p.name, color: p.color }))
          });
        }
      }
    });
  }, [socket, isConnected, role]);

  // Listen for controller input
  useEffect(() => {
    if (!socket || !isConnected || role !== 'host') return;

    socket.on('controller-input', (data) => {
      if (gameState !== 'racing') return;

      const { playerId, action, joystickX, joystickY } = data;

      setPlayerStates(prev => {
        const updated = new Map(prev);
        const playerState = updated.get(playerId);
        
        if (playerState && !playerState.hasFinished) {
          if (action === 'move') {
            // Apply joystick input to player movement
            playerState.velocityX = joystickX * MAX_SPEED;
          } else if (action === 'jump' && playerState.isGrounded) {
            playerState.velocityY = JUMP_FORCE;
            playerState.isGrounded = false;
          }
        }
        
        return updated;
      });
    });

    return () => {
      socket.off('controller-input');
    };
  }, [socket, isConnected, role, gameState]);

  // Game loop - physics and collision detection
  useEffect(() => {
    if (gameState !== 'racing') return;

    let frameCount = 0;
    
    const gameLoop = () => {
      frameCount++;
      
      setPlayerStates(prev => {
        const updated = new Map(prev);
        
        updated.forEach(playerState => {
          if (playerState.hasFinished) return;

          // Apply gravity
          playerState.velocityY += GRAVITY;

          // Update position
          playerState.x += playerState.velocityX;
          playerState.y += playerState.velocityY;

          // Apply friction
          playerState.velocityX *= FRICTION;

          // Check ground collision
          playerState.isGrounded = false;
          
          platforms.forEach(platform => {
            // Check if player is above platform and falling
            if (
              playerState.x + PLAYER_SIZE > platform.x &&
              playerState.x < platform.x + platform.width &&
              playerState.y + PLAYER_SIZE > platform.y &&
              playerState.y + PLAYER_SIZE < platform.y + platform.height &&
              playerState.velocityY >= 0
            ) {
              playerState.y = platform.y - PLAYER_SIZE;
              playerState.velocityY = 0;
              playerState.isGrounded = true;
            }
          });

          // Fall off the world
          if (playerState.y > 700) {
            // Respawn at start
            playerState.x = 100;
            playerState.y = 500;
            playerState.velocityX = 0;
            playerState.velocityY = 0;
          }

          // Check finish line
          if (playerState.x >= FINISH_LINE_X && !playerState.hasFinished) {
            playerState.hasFinished = true;
            playerState.finishTime = Date.now() - startTime;
            
            // Set placement
            const finishedCount = Array.from(updated.values()).filter(p => p.hasFinished).length;
            playerState.placement = finishedCount;

            // Notify this player they finished
            if (socket) {
              socket.emit('game-state-update', {
                type: 'platformer-player-finished',
                playerId: playerState.playerId,
                placement: playerState.placement,
                time: playerState.finishTime
              });
            }

            // Check if all players finished
            const allFinished = Array.from(updated.values()).every(p => p.hasFinished);
            if (allFinished) {
              setTimeout(() => endGame(), 2000);
            }
          }
        });

        // Only broadcast positions every 3 frames (20fps instead of 60fps for network)
        if (socket && frameCount % 3 === 0) {
          socket.emit('game-state-update', {
            type: 'platformer-update',
            players: Array.from(updated.values()).map(p => ({
              playerId: p.playerId,
              x: Math.round(p.x), // Round to reduce data size
              y: Math.round(p.y)
            }))
          });
        }

        return updated;
      });

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, socket, startTime]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let renderFrameId: number;

    const render = () => {
      // Clear canvas with sky gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#87CEEB');
      gradient.addColorStop(1, '#E0F6FF');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Get camera position (follow first player)
      const cameraX = playerStates.size > 0 
        ? Math.max(0, Array.from(playerStates.values())[0].x - 200)
        : 0;

      ctx.save();
      ctx.translate(-cameraX, 0);

      // Draw platforms with better styling (simplified for performance)
      platforms.forEach(platform => {
        // Platform shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(platform.x + 3, platform.y + 3, platform.width, platform.height);
        
        // Platform main color
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Platform border
        ctx.strokeStyle = '#4A2511';
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
        
        // Platform highlight (simplified)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(platform.x, platform.y, platform.width, 3);
      });

      // Draw finish line
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(FINISH_LINE_X, 0, 20, 600);
      
      // Finish line stripes
      ctx.fillStyle = '#000';
      for (let y = 0; y < 600; y += 40) {
        ctx.fillRect(FINISH_LINE_X, y, 20, 20);
      }
      
      // Finish text with background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(FINISH_LINE_X - 40, 10, 100, 40);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('FINISH', FINISH_LINE_X - 30, 35);

      // Draw players with better styling
      playerStates.forEach(playerState => {
        // Player shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(playerState.x + 2, playerState.y + 2, PLAYER_SIZE, PLAYER_SIZE);
        
        // Player
        ctx.fillStyle = playerState.color;
        ctx.fillRect(playerState.x, playerState.y, PLAYER_SIZE, PLAYER_SIZE);
        
        // Player border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(playerState.x, playerState.y, PLAYER_SIZE, PLAYER_SIZE);
        
        // Draw player name with background
        const nameWidth = ctx.measureText(playerState.name).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(playerState.x - 5, playerState.y - 25, nameWidth + 10, 20);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(playerState.name, playerState.x, playerState.y - 10);
      });

      ctx.restore();

      renderFrameId = requestAnimationFrame(render);
    };

    renderFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(renderFrameId);
    };
  }, [playerStates]);

  // Countdown timer
  useEffect(() => {
    if (gameState === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'countdown' && countdown === 0) {
      setGameState('racing');
      setStartTime(Date.now());
    }
  }, [gameState, countdown]);

  // Update current time during race
  useEffect(() => {
    if (gameState === 'racing') {
      const timer = setInterval(() => {
        setCurrentTime(Date.now() - startTime);
      }, 100);
      return () => clearInterval(timer);
    }
  }, [gameState, startTime]);

  const startGame = () => {
    setGameState('countdown');
    setCountdown(3);
    setFinishOrder([]);
    
    // Reset all players
    setPlayerStates(prev => {
      const updated = new Map(prev);
      let index = 0;
      updated.forEach(playerState => {
        playerState.x = 100;
        playerState.y = 500 - (index * 40);
        playerState.velocityX = 0;
        playerState.velocityY = 0;
        playerState.isGrounded = false;
        playerState.hasFinished = false;
        playerState.finishTime = null;
        playerState.placement = null;
        index++;
      });
      return updated;
    });

    if (socket) {
      socket.emit('game-state-update', {
        type: 'platformer-start'
      });
    }
  };

  const endGame = () => {
    setGameState('finished');
    
    // Get final standings
    const standings = Array.from(playerStates.values())
      .sort((a, b) => (a.placement || 999) - (b.placement || 999));
    
    setFinishOrder(standings);

    if (socket) {
      socket.emit('game-state-update', {
        type: 'platformer-end',
        standings: standings.map(p => ({
          playerId: p.playerId,
          name: p.name,
          placement: p.placement,
          time: p.finishTime
        }))
      });
    }
  };

  const exitGame = () => {
    router.push('/host');
  };

  const formatTime = (ms: number | null) => {
    if (ms === null) return '--:--';
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-blue-600 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-white">Platform Racer 🏃</h1>
          {gameState === 'racing' && (
            <div className="text-2xl font-bold text-white bg-black bg-opacity-50 px-6 py-3 rounded-lg">
              {formatTime(currentTime)}
            </div>
          )}
        </div>

        {/* Game Canvas */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-6">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full"
          />
        </div>

        {/* Controls */}
        <div className="flex gap-4 justify-center">
          {gameState === 'waiting' && (
            <button
              onClick={startGame}
              disabled={players.length === 0}
              className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-xl text-xl font-bold transition"
            >
              Start Race
            </button>
          )}
          
          {gameState === 'countdown' && (
            <div className="text-6xl font-bold text-white animate-pulse">
              {countdown > 0 ? countdown : 'GO!'}
            </div>
          )}

          {gameState === 'finished' && (
            <button
              onClick={startGame}
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xl font-bold transition"
            >
              Race Again
            </button>
          )}

          <button
            onClick={exitGame}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xl font-bold transition"
          >
            Exit Game
          </button>
        </div>

        {/* Leaderboard */}
        {gameState === 'racing' && (
          <div className="mt-6 bg-white rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">Live Positions</h2>
            <div className="space-y-2">
              {Array.from(playerStates.values())
                .sort((a, b) => b.x - a.x)
                .map((player, index) => (
                  <div
                    key={player.playerId}
                    className="flex items-center justify-between p-3 bg-gray-100 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-gray-500">#{index + 1}</span>
                      <div
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: player.color }}
                      />
                      <span className="font-bold">{player.name}</span>
                    </div>
                    <div className="text-gray-600">
                      {player.hasFinished ? (
                        <span className="text-green-600 font-bold">✓ Finished</span>
                      ) : (
                        <span>{Math.floor((player.x / FINISH_LINE_X) * 100)}%</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Final Results */}
        {gameState === 'finished' && finishOrder.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl p-6">
            <h2 className="text-3xl font-bold mb-6 text-center">🏆 Final Results 🏆</h2>
            <div className="space-y-3">
              {finishOrder.map((player) => (
                <div
                  key={player.playerId}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    player.placement === 1 ? 'bg-yellow-100 border-4 border-yellow-400' :
                    player.placement === 2 ? 'bg-gray-100 border-4 border-gray-400' :
                    player.placement === 3 ? 'bg-orange-100 border-4 border-orange-400' :
                    'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl font-bold">
                      {player.placement === 1 ? '🥇' :
                       player.placement === 2 ? '🥈' :
                       player.placement === 3 ? '🥉' :
                       `#${player.placement}`}
                    </span>
                    <div
                      className="w-10 h-10 rounded"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="text-xl font-bold">{player.name}</span>
                  </div>
                  <span className="text-xl font-bold text-gray-700">
                    {formatTime(player.finishTime)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
