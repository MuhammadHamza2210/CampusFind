import { useEffect, useRef, useState, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Send,
  MessageCircle,
  ArrowLeft,
  ImageOff,
  BadgeCheck,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { api, parseError } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/store/auth';
import { useNotifications } from '@/store/notifications';
import type { Conversation, Message, User } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { timeAgo } from '@/lib/format';

export default function MessagesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh: refreshUnread } = useNotifications();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const peerTypingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  const active = conversations.find((c) => c._id === id) || null;

  const other = (c: Conversation): User =>
    c.participants.find((p) => p.id !== user?.id) || c.participants[0];

  // Load conversation list once.
  useEffect(() => {
    api
      .get<{ items: Conversation[] }>('/api/conversations')
      .then(({ data }) => setConversations(data.items))
      .finally(() => setLoadingList(false));
  }, []);

  // Load messages when a conversation is opened.
  useEffect(() => {
    if (!id) {
      setMessages([]);
      return;
    }
    setLoadingMsgs(true);
    api
      .get<{ items: Message[] }>(`/api/conversations/${id}/messages`)
      .then(({ data }) => {
        setMessages(data.items);
        // Opening a conversation marks it read on the server — sync the badge.
        refreshUnread();
      })
      .catch(() => toast.error('Could not open this conversation'))
      .finally(() => setLoadingMsgs(false));
  }, [id, refreshUnread]);

  // Socket: join the room and listen for new messages.
  useEffect(() => {
    const socket = getSocket();
    const onNew = (payload: { conversationId: string; message: Message }) => {
      // Bump the conversation in the list.
      setConversations((list) => {
        const idx = list.findIndex((c) => c._id === payload.conversationId);
        if (idx === -1) return list;
        const updated = {
          ...list[idx],
          lastMessage: payload.message.body,
          lastMessageAt: payload.message.createdAt,
        };
        return [updated, ...list.filter((_, i) => i !== idx)];
      });
      if (payload.conversationId === id) {
        setPeerTyping(false);
        setMessages((m) =>
          m.some((x) => x.id === payload.message.id) ? m : [...m, payload.message]
        );
      }
    };
    const onTyping = (data: {
      conversationId: string;
      typing: boolean;
      userId?: string;
    }) => {
      if (data.conversationId !== id || data.userId === user?.id) return;
      setPeerTyping(data.typing);
      if (peerTypingTimeout.current) clearTimeout(peerTypingTimeout.current);
      if (data.typing) {
        // Safety: clear if the "stopped typing" event never arrives.
        peerTypingTimeout.current = setTimeout(() => setPeerTyping(false), 4000);
      }
    };

    // Re-join the room after any (re)connect so typing keeps working.
    const onConnect = () => {
      if (id) socket.emit('conversation:join', id);
    };

    socket.on('message:new', onNew);
    socket.on('typing', onTyping);
    socket.on('connect', onConnect);
    if (id && socket.connected) socket.emit('conversation:join', id);
    setPeerTyping(false);
    return () => {
      socket.off('message:new', onNew);
      socket.off('typing', onTyping);
      socket.off('connect', onConnect);
      if (id) socket.emit('conversation:leave', id);
    };
  }, [id, user?.id]);

  // Polling fallback for the OPEN conversation — guarantees new messages show
  // up within a few seconds even if the WebSocket is blocked or dropped.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const { data } = await api.get<{ items: Message[] }>(
          `/api/conversations/${id}/messages`
        );
        if (cancelled) return;
        const seen = new Set(messagesRef.current.map((m) => m.id));
        const fresh = data.items.filter((m) => !seen.has(m.id));
        if (fresh.length) {
          setMessages((prev) => {
            const have = new Set(prev.map((m) => m.id));
            return [...prev, ...data.items.filter((m) => !have.has(m.id))];
          });
          refreshUnread();
        }
      } catch {
        /* ignore transient errors */
      }
    };
    const interval = setInterval(poll, 3500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, refreshUnread]);

  // Polling fallback for the conversation LIST — catches brand-new chats other
  // people start with you, and keeps last-message/ordering fresh.
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const { data } = await api.get<{ items: Conversation[] }>(
          '/api/conversations'
        );
        if (!cancelled) setConversations(data.items);
      } catch {
        /* ignore */
      }
    };
    const interval = setInterval(poll, 9000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Auto-scroll to newest.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, loadingMsgs]);

  // Emit typing signals (throttled by a trailing "stopped" timer).
  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!id) return;
    const socket = getSocket();
    socket.emit('typing', { conversationId: id, typing: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing', { conversationId: id, typing: false });
    }, 1200);
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !id) return;
    const body = draft.trim();
    setDraft('');
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    getSocket().emit('typing', { conversationId: id, typing: false });
    setSending(true);
    try {
      const { data } = await api.post<{ message: Message }>(
        `/api/conversations/${id}/messages`,
        { body }
      );
      setMessages((m) => [...m, data.message]);
      setConversations((list) => {
        const idx = list.findIndex((c) => c._id === id);
        if (idx === -1) return list;
        const updated = {
          ...list[idx],
          lastMessage: body,
          lastMessageAt: data.message.createdAt,
        };
        return [updated, ...list.filter((_, i) => i !== idx)];
      });
    } catch (err) {
      toast.error(parseError(err).message);
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Messages</h1>

      <div className="grid h-[70vh] grid-cols-1 overflow-hidden rounded-2xl border border-gray-100 bg-surface shadow-card md:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <aside
          className={clsx(
            'min-h-0 flex-col border-r border-gray-100',
            id ? 'hidden md:flex' : 'flex'
          )}
        >
          <div className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-500">
            Conversations
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="flex h-full items-center justify-center">
                <Spinner />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={MessageCircle}
                  title="No messages yet"
                  description="Reach out on a listing to start a conversation."
                />
              </div>
            ) : (
              conversations.map((c) => {
                const o = other(c);
                return (
                  <button
                    key={c._id}
                    onClick={() => navigate(`/messages/${c._id}`)}
                    className={clsx(
                      'flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-50',
                      c._id === id && 'bg-brand-50/60'
                    )}
                  >
                    <Avatar name={o.name} src={o.avatarUrl} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-gray-900">
                          {o.name}
                        </span>
                        {c.lastMessageAt && (
                          <span className="flex-shrink-0 text-[11px] text-gray-400">
                            {timeAgo(c.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-gray-500">
                        {c.listing?.title}
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        {c.lastMessage || 'Say hello 👋'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Chat panel */}
        <section className={clsx('min-h-0 flex-col', id ? 'flex' : 'hidden md:flex')}>
          {!active ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              <div>
                <MessageCircle className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">
                  Select a conversation to start chatting.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                <button
                  onClick={() => navigate('/messages')}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 md:hidden"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar
                  name={other(active).name}
                  src={other(active).avatarUrl}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold text-gray-900">
                    {other(active).name}
                    {other(active).isVerified && (
                      <BadgeCheck className="h-3.5 w-3.5 text-brand-500" />
                    )}
                  </p>
                  {peerTyping ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-brand-600">
                      <TypingDots /> typing…
                    </span>
                  ) : (
                    <Link
                      to={`/listings/${active.listing?._id}`}
                      className="truncate text-xs text-gray-400 hover:text-brand-600"
                    >
                      Re: {active.listing?.title}
                    </Link>
                  )}
                </div>
                <Link
                  to={`/listings/${active.listing?._id}`}
                  className="hidden h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:block"
                >
                  {active.listing?.imageUrl ? (
                    <img
                      src={active.listing.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-gray-300">
                      <ImageOff className="h-4 w-4" />
                    </span>
                  )}
                </Link>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-canvas p-4"
              >
                {loadingMsgs ? (
                  <div className="flex h-full items-center justify-center">
                    <Spinner />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="mt-8 text-center text-sm text-gray-400">
                    No messages yet — send the first one.
                  </p>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender.id === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={clsx('flex', mine ? 'justify-end' : 'justify-start')}
                      >
                        <div
                          className={clsx(
                            'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm',
                            mine
                              ? 'rounded-br-sm bg-brand-600 text-white'
                              : 'rounded-bl-sm border border-gray-100 bg-surface text-gray-800'
                          )}
                        >
                          <p className="whitespace-pre-line break-words">{m.body}</p>
                          <p
                            className={clsx(
                              'mt-0.5 text-right text-[10px]',
                              mine ? 'text-brand-200' : 'text-gray-400'
                            )}
                          >
                            {timeAgo(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                {peerTyping && !loadingMsgs && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm border border-gray-100 bg-surface px-4 py-3 shadow-sm">
                      <TypingDots />
                    </div>
                  </div>
                )}
              </div>

              {/* Composer */}
              <form
                onSubmit={send}
                className="flex items-center gap-2 border-t border-gray-100 p-3"
              >
                <input
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  placeholder="Type a message…"
                  className="input flex-1"
                  aria-label="Message"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="btn-primary aspect-square !px-0 !py-0 h-11 w-11"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1" aria-label="typing">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
