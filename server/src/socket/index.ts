import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import cookie from 'cookie-parser';
import { verifyToken } from '../utils/token';
import { env } from '../config/env';
import { Conversation } from '../models/Message';

let io: IOServer | null = null;

/** Parse the auth token from the socket handshake (cookie or auth field). */
function getUserId(socket: Socket): string | null {
  try {
    // From auth payload (client sends token explicitly if available)
    const authToken = (socket.handshake.auth as { token?: string })?.token;
    if (authToken) return verifyToken(authToken).id;

    // From cookie header
    const raw = socket.handshake.headers.cookie;
    if (raw) {
      const parsed = Object.fromEntries(
        raw.split(';').map((c) => {
          const [k, ...v] = c.trim().split('=');
          return [k, decodeURIComponent(v.join('='))];
        })
      );
      if (parsed.token) return verifyToken(parsed.token).id;
    }
  } catch {
    /* ignore invalid token */
  }
  return null;
}

/** Is this user a participant of the given conversation? */
async function isParticipant(
  conversationId: string,
  userId: string
): Promise<boolean> {
  try {
    const convo = await Conversation.findById(conversationId).select('participants');
    if (!convo) return false;
    return convo.participants.some((p) => p.toString() === userId);
  } catch {
    // Malformed id or DB error — treat as not authorized.
    return false;
  }
}

export function initSocket(server: HttpServer): IOServer {
  io = new IOServer(server, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  // Authenticate the handshake once, up front. Reject anonymous sockets so no
  // unauthenticated client can subscribe to conversation rooms.
  io.use((socket, next) => {
    const userId = getUserId(socket);
    if (!userId) return next(new Error('Unauthorized'));
    socket.data.userId = userId;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    socket.on('conversation:join', async (conversationId: string) => {
      // Only allow joining a conversation the user actually belongs to,
      // otherwise anyone could subscribe to a stranger's chat by guessing its id.
      if (typeof conversationId !== 'string') return;
      if (await isParticipant(conversationId, userId)) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on('conversation:leave', (conversationId: string) => {
      if (typeof conversationId !== 'string') return;
      socket.leave(`conversation:${conversationId}`);
    });

    // Lightweight typing indicator relay — only to rooms this socket has
    // actually joined (i.e. conversations it was authorized for above).
    socket.on(
      'typing',
      (data: { conversationId: string; typing: boolean }) => {
        const room = `conversation:${data?.conversationId}`;
        if (!socket.rooms.has(room)) return;
        socket.to(room).emit('typing', { ...data, userId });
      }
    );
  });

  return io;
}

/** Emit an event to a specific user's room (all their open tabs). */
export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

// Silence unused import in some tsconfigs while keeping cookie-parser available.
void cookie;
