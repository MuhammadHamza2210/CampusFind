import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Flag, Trash2, X, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, parseError } from '@/lib/api';
import type { Listing } from '@/types';
import { TYPE_META, categoryLabel } from '@/lib/constants';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { timeAgo } from '@/lib/format';

export default function AdminPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get<{ items: Listing[] }>('/api/admin/flagged')
      .then(({ data }) => setItems(data.items))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const act = async (
    listing: Listing,
    action: 'remove' | 'dismiss'
  ) => {
    try {
      await api.post(`/api/admin/listings/${listing.id}/${action}`);
      setItems((list) => list.filter((l) => l.id !== listing.id));
      toast.success(action === 'remove' ? 'Listing removed' : 'Flag dismissed');
    } catch (err) {
      toast.error(parseError(err).message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
          <Shield className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moderation</h1>
          <p className="text-sm text-gray-500">Review flagged listings.</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))
        ) : items.length === 0 ? (
          <EmptyState
            icon={Flag}
            title="Nothing flagged"
            description="When users report spam or inappropriate listings, they'll appear here for review."
          />
        ) : (
          items.map((l) => (
            <div
              key={l.id}
              className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-surface p-4 shadow-card sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge className={TYPE_META[l.type].badge}>
                    {TYPE_META[l.type].label}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {categoryLabel(l.category)} · {timeAgo(l.createdAt)}
                  </span>
                </div>
                <Link
                  to={`/listings/${l.id}`}
                  className="mt-1 inline-flex items-center gap-1 font-semibold text-gray-900 hover:text-brand-700"
                >
                  {l.title} <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">
                  by {l.owner.name} · {l.owner.email}
                </p>
                {l.flagged && (
                  <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                    <Flag className="h-3 w-3" /> Flagged
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => act(l, 'dismiss')}>
                  <X className="h-4 w-4" /> Dismiss
                </Button>
                <Button variant="danger" onClick={() => act(l, 'remove')}>
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
