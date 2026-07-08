import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from './auth';
import type { AppNotification } from '@/types';

interface NotificationsValue {
  /** Unread private-message conversations. */
  unread: number;
  /** Lost↔found match alerts, newest first. */
  alerts: AppNotification[];
  /** Unread alert count for the bell badge. */
  alertsUnread: number;
  refresh: () => void;
  refreshAlerts: () => void;
  markAlertsRead: () => void;
}

const NotificationsContext = createContext<NotificationsValue>({
  unread: 0,
  alerts: [],
  alertsUnread: 0,
  refresh: () => {},
  refreshAlerts: () => {},
  markAlertsRead: () => {},
});

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [alerts, setAlerts] = useState<AppNotification[]>([]);
  const [alertsUnread, setAlertsUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setUnread(0);
      return;
    }
    try {
      const { data } = await api.get<{ count: number }>(
        '/api/conversations/unread-count'
      );
      setUnread(data.count);
    } catch {
      /* ignore */
    }
  }, [user]);

  const refreshAlerts = useCallback(async () => {
    if (!user) {
      setAlerts([]);
      setAlertsUnread(0);
      return;
    }
    try {
      const { data } = await api.get<{ items: AppNotification[]; unread: number }>(
        '/api/notifications'
      );
      setAlerts(data.items);
      setAlertsUnread(data.unread);
    } catch {
      /* ignore */
    }
  }, [user]);

  const markAlertsRead = useCallback(async () => {
    if (alertsUnread === 0) return;
    // Optimistic: clear the badge immediately.
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    setAlertsUnread(0);
    try {
      await api.post('/api/notifications/read-all');
    } catch {
      refreshAlerts();
    }
  }, [alertsUnread, refreshAlerts]);

  useEffect(() => {
    refresh();
    refreshAlerts();
  }, [refresh, refreshAlerts]);

  // Polling fallback so the bell + message badge stay live even if the realtime
  // socket is blocked or an event is missed — no manual refresh needed.
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      refresh();
      refreshAlerts();
    }, 10000);
    return () => clearInterval(interval);
  }, [user, refresh, refreshAlerts]);

  // Re-check the message badge whenever a message arrives in realtime.
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const onNew = () => refresh();
    socket.on('message:new', onNew);
    return () => {
      socket.off('message:new', onNew);
    };
  }, [user, refresh]);

  // Surface match alerts the moment they fire.
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const messages: Record<string, string> = {
      match: '🔔 A possible match for one of your items was just posted',
      claim: '🙋 Someone claims one of your found items is theirs',
      'claim-approved': '🎉 Your ownership claim was approved',
      'claim-rejected': 'Your ownership claim was reviewed',
    };
    const onAlert = (payload?: { type?: string }) => {
      refreshAlerts();
      toast(messages[payload?.type ?? 'match'] ?? '🔔 You have a new notification', {
        duration: 5000,
      });
    };
    socket.on('alert:new', onAlert);
    return () => {
      socket.off('alert:new', onAlert);
    };
  }, [user, refreshAlerts]);

  return (
    <NotificationsContext.Provider
      value={{
        unread,
        alerts,
        alertsUnread,
        refresh,
        refreshAlerts,
        markAlertsRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  return useContext(NotificationsContext);
}
