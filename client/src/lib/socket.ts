import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = import.meta.env.VITE_API_URL || undefined;
    // Default transports = polling first, then upgrade to WebSocket. This is
    // far more reliable through the Vite dev proxy than forcing WS up front.
    // Auth rides in the handshake `auth.token` (Bearer), matching our token
    // auth — cookies don't flow cross-origin on some hosts.
    socket = io(url, {
      withCredentials: false,
      auth: { token: getAuthToken() },
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
