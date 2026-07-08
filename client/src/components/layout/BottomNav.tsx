import { NavLink } from 'react-router-dom';
import { LayoutGrid, Plus, MessageCircle, User } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/store/auth';
import { useNotifications } from '@/store/notifications';

export function BottomNav() {
  const { user } = useAuth();
  const { unread } = useNotifications();
  if (!user) return null;

  const item = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
      isActive ? 'text-brand-600' : 'text-gray-400'
    );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-surface/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-md items-stretch">
        <NavLink to="/" end className={item}>
          <LayoutGrid className="h-5 w-5" />
          Browse
        </NavLink>
        <NavLink to="/messages" className={item}>
          <span className="relative">
            <MessageCircle className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-surface">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </span>
          Chats
        </NavLink>
        <NavLink to="/post" className={item}>
          <span className="-mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white shadow-card-hover">
            <Plus className="h-5 w-5" />
          </span>
        </NavLink>
        <NavLink to="/dashboard" className={item}>
          <LayoutGrid className="h-5 w-5" />
          Mine
        </NavLink>
        <NavLink to="/profile" className={item}>
          <User className="h-5 w-5" />
          Profile
        </NavLink>
      </div>
    </nav>
  );
}
