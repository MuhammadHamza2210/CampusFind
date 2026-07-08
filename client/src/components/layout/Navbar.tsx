import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  LayoutGrid,
  MessageCircle,
  Shield,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Sun,
  Moon,
  Bell,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/store/auth';
import { useNotifications } from '@/store/notifications';
import { useTheme } from '@/store/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { TYPE_META } from '@/lib/constants';
import { timeAgo } from '@/lib/format';
import type { AppNotification } from '@/types';

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? (
        <Sun className="h-[18px] w-[18px]" />
      ) : (
        <Moon className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-extrabold text-gray-900">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        <Search className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <span className="text-lg tracking-tight">
        Campus<span className="text-brand-600">Find</span>
      </span>
    </Link>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const { unread } = useNotifications();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking anywhere outside it or pressing Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:inline-flex',
      isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
    );

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />

        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            <LayoutGrid className="h-4 w-4" /> Browse
          </NavLink>

          <ThemeToggle />

          {user ? (
            <>
              <NotificationBell />
              <NavLink to="/messages" className={navLinkClass}>
                <span className="relative">
                  <MessageCircle className="h-4 w-4" />
                  {unread > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface" />
                  )}
                </span>
                Messages
              </NavLink>
              {user.isAdmin && (
                <NavLink to="/admin" className={navLinkClass}>
                  <Shield className="h-4 w-4" /> Admin
                </NavLink>
              )}

              <Button
                onClick={() => navigate('/post')}
                className="ml-1 hidden sm:inline-flex"
              >
                <Plus className="h-4 w-4" /> Post
              </Button>

              <div className="relative ml-1" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-full p-0.5 hover:bg-gray-100"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-surface shadow-pop animate-scale-in"
                  >
                    <div className="border-b border-gray-100 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">{user.email}</p>
                    </div>
                    <MenuItem
                      to="/dashboard"
                      icon={LayoutGrid}
                      label="Dashboard"
                      onSelect={() => setMenuOpen(false)}
                    />
                    <MenuItem
                      to="/profile"
                      icon={UserIcon}
                      label="Profile"
                      onSelect={() => setMenuOpen(false)}
                    />
                    <button
                      onClick={handleLogout}
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost hidden sm:inline-flex">
                Log in
              </Link>
              <Button onClick={() => navigate('/signup')}>Get started</Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

/** Human-readable body for a notification, by type. */
function alertMessage(a: AppNotification) {
  const title = a.listing?.title ?? 'an item';
  if (a.type === 'claim') {
    const who = a.claim?.claimantName ?? 'Someone';
    return (
      <>
        <span className="font-semibold">{who}</span> claims your found item “{title}”
        is theirs — review it.
      </>
    );
  }
  if (a.type === 'claim-approved') {
    return (
      <>
        🎉 Your claim on “{title}” was{' '}
        <span className="font-semibold">approved</span>. Arrange a pickup in chat.
      </>
    );
  }
  if (a.type === 'claim-rejected') {
    return (
      <>
        Your claim on “{title}” was{' '}
        <span className="font-semibold">not approved</span>.
      </>
    );
  }
  // match
  const meta = a.listing ? TYPE_META[a.listing.type] : null;
  const mine = a.matchedListing;
  return (
    <>
      A <span className="font-semibold">{meta?.label.toLowerCase()}</span> item “
      {title}” may match{' '}
      {mine ? (
        <>
          your <span className="font-semibold">“{mine.title}”</span>
        </>
      ) : (
        <>one of your items</>
      )}
      .
    </>
  );
}

function NotificationBell() {
  const { alerts, alertsUnread, markAlertsRead } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    setOpen((v) => {
      // Opening the panel clears the unread badge.
      if (!v) markAlertsRead();
      return !v;
    });
  };

  const goTo = (listingId?: string) => {
    setOpen(false);
    if (listingId) navigate(`/listings/${listingId}`);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" />
        {alertsUnread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-surface">
            {alertsUnread > 9 ? '9+' : alertsUnread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-gray-100 bg-surface shadow-pop animate-scale-in"
        >
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
            <Sparkles className="h-4 w-4 text-brand-500" />
            <p className="text-sm font-semibold text-gray-900">Match alerts</p>
          </div>

          {alerts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">No alerts yet.</p>
              <p className="mt-1 text-xs text-gray-400">
                We'll ping you when a lost/found item may match yours.
              </p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-gray-50 overflow-y-auto">
              {alerts.map((a) => {
                if (!a.listing) return null;
                const isClaim = a.type !== 'match';
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => goTo(a.listing?.id)}
                      className={clsx(
                        'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50',
                        !a.read && 'bg-brand-50/50'
                      )}
                    >
                      <span
                        className={clsx(
                          'mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                          isClaim
                            ? 'bg-brand-100 text-brand-700'
                            : TYPE_META[a.listing.type].badge
                        )}
                      >
                        {isClaim ? (
                          <ShieldCheck className="h-4 w-4" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-gray-700">
                          {alertMessage(a)}
                        </span>
                        <span className="mt-0.5 block text-xs text-gray-400">
                          {timeAgo(a.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  to,
  icon: Icon,
  label,
  onSelect,
}: {
  to: string;
  icon: typeof LayoutGrid;
  label: string;
  onSelect?: () => void;
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onSelect}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
    >
      <Icon className="h-4 w-4 text-gray-400" /> {label}
    </Link>
  );
}
