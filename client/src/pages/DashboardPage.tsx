import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  PackageSearch,
  CheckCircle2,
  MessageCircle,
  LayoutList,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import type { Listing, MatchGroup } from '@/types';
import { TYPE_META } from '@/lib/constants';
import { ListingCard } from '@/components/listings/ListingCard';
import { ListingGridSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate } from '@/lib/format';

type Tab = 'active' | 'resolved';

export default function DashboardPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [matchGroups, setMatchGroups] = useState<MatchGroup[]>([]);
  const [stats, setStats] = useState({ active: 0, resolved: 0, conversations: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('active');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [l, s] = await Promise.all([
        api.get<{ items: Listing[] }>('/api/listings/mine'),
        api.get<typeof stats>('/api/users/me/stats'),
      ]);
      setListings(l.data.items);
      setStats(s.data);
    } finally {
      if (!silent) setLoading(false);
    }
    // Complementary lost↔found candidates for my open listings (best-effort).
    api
      .get<{ groups: MatchGroup[] }>('/api/listings/mine/matches')
      .then(({ data }) => setMatchGroups(data.groups))
      .catch(() => {
        /* matches are a bonus — ignore failures */
      });
  }, []);

  useEffect(() => {
    load();
    // Silent auto-refresh so new matches/claims surface without a manual reload.
    const interval = setInterval(() => load(true), 15000);
    return () => clearInterval(interval);
  }, [load]);

  const filtered = listings.filter((l) =>
    tab === 'active' ? l.status === 'active' : l.status !== 'active'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {user && <Avatar name={user.name} src={user.avatarUrl} size="lg" />}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
            <p className="text-sm text-gray-500">
              Member since {user && formatDate(user.joinedAt)}
            </p>
          </div>
        </div>
        <Link to="/post" className="btn-primary">
          <Plus className="h-4 w-4" /> Post a listing
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard icon={PackageSearch} label="Active" value={stats.active} />
        <StatCard icon={CheckCircle2} label="Resolved" value={stats.resolved} />
        <StatCard icon={MessageCircle} label="Chats" value={stats.conversations} />
      </div>

      {/* Possible matches for my open lost/found listings */}
      {matchGroups.length > 0 && (
        <section className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-500" />
            <h2 className="text-lg font-bold text-gray-900">Possible matches</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Complementary posts that might match your open items — same category,
            ranked by location and description.
          </p>

          <div className="mt-4 space-y-5">
            {matchGroups.map((g) => (
              <div key={g.listing.id}>
                <p className="text-sm text-gray-600">
                  For your{' '}
                  <span
                    className={clsx(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                      TYPE_META[g.listing.type].badge
                    )}
                  >
                    {TYPE_META[g.listing.type].label}
                  </span>{' '}
                  <Link
                    to={`/listings/${g.listing.id}`}
                    className="font-semibold text-gray-900 hover:text-brand-700"
                  >
                    “{g.listing.title}”
                  </Link>
                </p>
                <div className="mt-2 space-y-3">
                  {g.matches.map((m) => (
                    <ListingCard key={m.id} listing={m} view="list" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        <TabButton active={tab === 'active'} onClick={() => setTab('active')}>
          Active
        </TabButton>
        <TabButton active={tab === 'resolved'} onClick={() => setTab('resolved')}>
          Resolved & sold
        </TabButton>
      </div>

      {/* Listings */}
      {loading ? (
        <ListingGridSkeleton count={4} />
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={LayoutList}
          title={
            tab === 'active' ? 'No active listings yet' : 'Nothing here yet'
          }
          description={
            tab === 'active'
              ? 'Post a lost item, something you found, or an item to sell.'
              : "Items you mark as resolved or sold will show up here."
          }
          action={
            tab === 'active' && (
              <Link to="/post" className="btn-primary">
                <Plus className="h-4 w-4" /> Create your first listing
              </Link>
            )
          }
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof PackageSearch;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2 text-gray-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        '-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
        active
          ? 'border-brand-600 text-brand-700'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      )}
    >
      {children}
    </button>
  );
}
