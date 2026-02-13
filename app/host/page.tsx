'use client';

import { useSocket } from '@/lib/socket';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Player } from '@/types/socket';

export default function HostPage() {
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const [roomCode, setRoomCode] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [joinUrl, setJoinUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const url = joinUrl || `${window.location.origin}/join`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Get local IP address or use window location
  useEffect(() => {
    const getJoinUrl = async () => {
      const hostname = window.location.hostname;
      const port = window.location.port;
      const protocol = window.location.protocol;
      
      // If it's localhost, get the local IP from the API
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        try {
          const response = await fetch('/api/local-ip');
          const data = await response.json();
          
          if (data.ip && data.ip !== 'localhost') {
            const portStr = port ? `:${port}` : '';
            setJoinUrl(`${protocol}//${data.ip}${portStr}/join`);
            return;
          }
        } catch (error) {
          console.error('Failed to get local IP from API:', error);
        }
        
        // Fallback: Try WebRTC method
        try {
          const pc = new RTCPeerConnection({ iceServers: [] });
          pc.createDataChannel('');
          
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          const localIP = await new Promise<string>((resolve) => {
            pc.onicecandidate = (ice) => {
              if (!ice || !ice.candidate || !ice.candidate.candidate) return;
              
              const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
              const match = ipRegex.exec(ice.candidate.candidate);
              
              if (match && match[1]) {
                pc.onicecandidate = null;
                pc.close();
                resolve(match[1]);
              }
            };
            
            // Fallback to localhost after 1 second
            setTimeout(() => {
              resolve('localhost');
              pc.close();
            }, 1000);
          });
          
          const portStr = port ? `:${port}` : '';
          setJoinUrl(`${protocol}//${localIP}${portStr}/join`);
        } catch (error) {
          // Final fallback to window.location
          setJoinUrl(`${window.location.origin}/join`);
        }
      } else {
        setJoinUrl(`${window.location.origin}/join`);
      }
    };
    
    getJoinUrl();
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Create room when component mounts
    socket.emit('create-room', (response) => {
      if (response.success && response.roomCode) {
        setRoomCode(response.roomCode);
        if (response.player) {
          setPlayers([response.player]);
        }
        setIsLoading(false);
      }
    });

    // Listen for players joining
    socket.on('player-joined', ({ players: updatedPlayers }) => {
      setPlayers(updatedPlayers);
    });

    // Listen for players leaving
    socket.on('player-left', ({ players: updatedPlayers }) => {
      setPlayers(updatedPlayers);
    });

    // Listen for room ending
    socket.on('room-ended', () => {
      router.push('/');
    });

    return () => {
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('room-ended');
    };
  }, [socket, isConnected, router]);

  const handleStartGame = (gameName: string) => {
    if (!socket) return;
    socket.emit('start-game', { gameName });
    setCurrentGame(gameName);
    router.push(`/games/${gameName}?role=host`);
  };

  const handleEndRoom = () => {
    if (!socket) return;
    socket.emit('end-room');
    router.push('/');
  };

  if (isLoading || !roomCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-2xl">Creating room...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Host Room</h1>
            <p className="text-gray-400">Share this code with players</p>
          </div>
          <button
            onClick={handleEndRoom}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
          >
            End Room
          </button>
        </div>

        {/* Room Code Display */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-12 mb-8 text-center">
          <p className="text-xl mb-4">Room Code</p>
          <div className="text-8xl font-bold tracking-widest mb-4">
            {roomCode}
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg opacity-90">
              Players can join at:
            </p>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3 flex items-center gap-3">
              <code className="text-xl font-mono">
                {joinUrl || `${window.location.origin}/join`}
              </code>
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-white/30 hover:bg-white/40 rounded-lg transition font-semibold"
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">
            Connected Players ({players.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {players.map((player) => (
              <div
                key={player.id}
                className="bg-gray-700 rounded-lg p-4 text-center"
              >
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: player.color }}
                />
                <p className="font-semibold">{player.name}</p>
                {player.isHost && (
                  <span className="text-xs text-yellow-400">👑 Host</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Game Selection */}
        {!currentGame && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">Select a Game</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleStartGame('quiz')}
                className="bg-blue-600 hover:bg-blue-700 rounded-lg p-6 text-left transition transform hover:scale-105"
              >
                <h3 className="text-xl font-bold mb-2">🧠 Quiz Game</h3>
                <p className="text-gray-300">Answer questions using your controller</p>
                <p className="text-sm text-gray-400 mt-2">2-8 players</p>
              </button>

              <button
                onClick={() => handleStartGame('drawing')}
                className="bg-green-600 hover:bg-green-700 rounded-lg p-6 text-left transition transform hover:scale-105"
              >
                <h3 className="text-xl font-bold mb-2">🎨 Drawing Game</h3>
                <p className="text-gray-300">Draw and guess what others are drawing</p>
                <p className="text-sm text-gray-400 mt-2">3-8 players</p>
              </button>

              <button
                onClick={() => handleStartGame('platformer')}
                className="bg-purple-600 hover:bg-purple-700 rounded-lg p-6 text-left transition transform hover:scale-105"
              >
                <h3 className="text-xl font-bold mb-2">🏃 Platform Racer</h3>
                <p className="text-gray-300">Race through platforms using phone controls</p>
                <p className="text-sm text-gray-400 mt-2">2-8 players</p>
              </button>
            </div>
          </div>
        )}

        {/* Current Game Info */}
        {currentGame && (
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <p className="text-xl mb-2">Currently Playing</p>
            <p className="text-3xl font-bold">{currentGame}</p>
          </div>
        )}
      </div>
    </div>
  );
}
