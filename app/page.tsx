'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const handleCreateRoom = () => {
    setIsCreatingRoom(true);
    router.push('/host');
  };

  const handleJoinRoom = () => {
    router.push('/join');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 -top-48 -left-48 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute w-96 h-96 -bottom-48 -right-48 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute w-96 h-96 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="text-center relative z-10">
        {/* Logo/Title with glow effect */}
        <div className="mb-8">
          <div className="inline-block">
            <h1 className="text-7xl md:text-8xl font-black text-white mb-2 tracking-tight drop-shadow-2xl">
              <span className="bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 text-transparent bg-clip-text animate-gradient">
                EpiAir
              </span>
              <span className="text-white">Console</span>
            </h1>
            <div className="h-2 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 rounded-full"></div>
          </div>
        </div>

        <p className="text-2xl md:text-3xl text-white/90 mb-4 font-semibold drop-shadow-lg">
          🎮 Your Phone is the Controller
        </p>
        <p className="text-lg text-white/70 mb-12 max-w-md mx-auto px-4">
          Create a room, share the code, and play multiplayer games instantly!
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 justify-center px-4">
          <button
            onClick={handleCreateRoom}
            disabled={isCreatingRoom}
            className="group relative px-10 py-5 bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-yellow-500/50 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span className="text-2xl">🖥️</span>
              {isCreatingRoom ? 'Creating...' : 'Host Game'}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
          
          <button
            onClick={handleJoinRoom}
            className="group relative px-10 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold text-xl shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-105 active:scale-95 overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span className="text-2xl">📱</span>
              Play Now
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto px-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="text-white font-bold text-lg mb-2">Instant Play</h3>
            <p className="text-white/70 text-sm">No downloads, no accounts. Just join and play!</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-white font-bold text-lg mb-2">Epic Games</h3>
            <p className="text-white/70 text-sm">Quiz, Drawing, and more coming soon!</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="text-white font-bold text-lg mb-2">Up to 8 Players</h3>
            <p className="text-white/70 text-sm">The more, the merrier!</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
