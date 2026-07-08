import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = import.meta.env.VITE_API_URL || undefined;
    // Default transports = polling first, then upgrade to WebSocket. This is
    // far more reliable through the Vite dev proxy than forcing WS up front.
    // Auth relies on the httpOnly cookie flowing over the same origin, so we
    // keep credentials on and let socket.io handle reconnection.
    socket = io(url, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
