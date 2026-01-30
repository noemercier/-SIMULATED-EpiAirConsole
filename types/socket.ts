export interface Player {
  id: string;
  socketId: string;
  name: string;
  color: string;
  isHost: boolean;
}

export interface Room {
  code: string;
  players: Player[];
  currentGame: string | null;
  gameState: any;
}

export interface ServerToClientEvents {
  'player-joined': (data: { player: Player; players: Player[] }) => void;
  'player-left': (data: { player: Player; players: Player[] }) => void;
  'game-started': (data: { gameName: string }) => void;
  'game-state-update': (data: any) => void;
  'controller-input': (data: any) => void;
  'room-ended': () => void;
  'drawing-update': (data: { x: number; y: number; color: string; size: number }) => void;
  'drawing-clear': () => void;
  'player-guess': (data: { playerId: string; guess: string }) => void;
}

export interface ClientToServerEvents {
  'create-room': (callback: (response: { success: boolean; roomCode?: string; player?: Player; error?: string }) => void) => void;
  'join-room': (data: { roomCode: string; playerName: string }, callback: (response: { success: boolean; player?: Player; players?: Player[]; error?: string }) => void) => void;
  'get-room-info': (callback: (response: { success: boolean; roomCode?: string; players?: Player[]; currentGame?: string | null; gameState?: any; error?: string }) => void) => void;
  'get-player-info': (data: { playerId: string }, callback: (response: { success: boolean; player?: Player; roomCode?: string; currentGame?: string | null; error?: string }) => void) => void;
  'start-game': (data: { gameName: string }) => void;
  'game-state-update': (data: any) => void;
  'controller-input': (data: any) => void;
  'end-room': () => void;
  'player-ready': (data: { playerId: string }) => void;
  'draw-point': (data: { x: number; y: number; color: string; size: number }) => void;
  'clear-canvas': () => void;
  'submit-guess': (data: { guess: string }) => void;
}
