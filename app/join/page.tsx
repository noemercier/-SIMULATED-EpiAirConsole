'use client';

import { useSocket } from '@/lib/socket';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Player } from '@/types/socket';

export default function JoinPage() {
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!socket || !isConnected) {
      setError('Not connected to server');
      return;
    }

    if (!roomCode || !playerName) {
      setError('Please enter room code and your name');
      return;
    }

    setIsJoining(true);
    setError('');

    socket.emit('join-room', { roomCode: roomCode.toUpperCase(), playerName }, (response) => {
      setIsJoining(false);
      
      if (response.success && response.player) {
        // Store player info and navigate to controller
        localStorage.setItem('playerId', response.player.id);
        localStorage.setItem('roomCode', roomCode.toUpperCase());
        router.push(`/controller?room=${roomCode.toUpperCase()}`);
      } else {
        setError(response.error || 'Failed to join room');
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute w-72 h-72 -top-36 -left-36 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse"></div>
        <div className="absolute w-72 h-72 -bottom-36 -right-36 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse animation-delay-1000"></div>
      </div>

      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md relative z-10 border-4 border-white/50">
        <div className="text-center mb-6">
          <div className="inline-block p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg">
            <span className="text-5xl">📱</span>
          </div>
          <h1 className="text-4xl font-black text-gray-800 mb-2">
            Join Room
          </h1>
          <p className="text-gray-600">
            Enter the code shown on the host screen
          </p>
        </div>

        <form onSubmit={handleJoinRoom} className="space-y-6">
          <div>
            <label htmlFor="roomCode" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
              Room Code
            </label>
            <input
              id="roomCode"
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="w-full px-6 py-4 text-3xl font-black text-center border-4 border-purple-300 rounded-2xl focus:border-purple-500 focus:outline-none uppercase tracking-[0.3em] bg-gradient-to-br from-purple-50 to-pink-50 shadow-inner text-gray-800"
              disabled={isJoining}
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="playerName" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
              Your Name
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              className="w-full px-4 py-4 text-lg border-4 border-gray-300 rounded-2xl focus:border-purple-500 focus:outline-none font-semibold text-gray-800"
              disabled={isJoining}
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-center gap-2 animate-shake">
              <span className="text-2xl">⚠️</span>
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-sm font-semibold">
            {isConnected ? (
              <>
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></span>
                <span className="text-green-700">Connected</span>
              </>
            ) : (
              <>
                <span className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>
                <span className="text-orange-700">Connecting...</span>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={isJoining || !isConnected}
            className="w-full py-5 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white font-black text-xl rounded-2xl hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-2xl hover:shadow-purple-500/50 relative overflow-hidden group"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isJoining ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Joining...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Let's Play!
                </>
              )}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </form>

        <button
          onClick={() => router.push('/')}
          className="w-full mt-6 py-3 text-gray-600 hover:text-gray-800 font-bold transition flex items-center justify-center gap-2 hover:bg-gray-100 rounded-lg"
        >
          <span>←</span>
          Back to Home
        </button>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        .animation-delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}
