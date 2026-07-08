import { Link } from 'react-router-dom';
import { MapPin, ImageOff, CheckCircle2, BadgeCheck } from 'lucide-react';
import clsx from 'clsx';
import type { Listing } from '@/types';
import { TYPE_META } from '@/lib/constants';
import { locationLabel, categoryLabel } from '@/lib/constants';
import { formatPrice, timeAgo } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';

interface Props {
  listing: Listing;
  view?: 'grid' | 'list';
}

export function ListingCard({ listing, view = 'grid' }: Props) {
  const meta = TYPE_META[listing.type];
  const resolved = listing.status === 'resolved' || listing.status === 'sold';

  if (view === 'list') {
    return (
      <Link
        to={`/listings/${listing.id}`}
        className="group flex gap-4 rounded-2xl border border-gray-100 bg-surface p-3 shadow-card transition-all hover:shadow-card-hover"
      >
        <Thumb listing={listing} className="h-24 w-24 flex-shrink-0 rounded-xl sm:h-28 sm:w-28" />
        <div className="min-w-0 flex-1 py-1">
          <div className="flex items-center gap-2">
            <Badge className={meta.badge}>{meta.label}</Badge>
            {resolved && <ResolvedTag type={listing.type} />}
          </div>
          <h3 className="mt-1.5 truncate text-base font-semibold text-gray-900 group-hover:text-brand-700">
            {listing.title}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">
            {listing.description}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {locationLabel(listing.location)}
            </span>
            <span>·</span>
            <span>{timeAgo(listing.createdAt)}</span>
            {listing.price !== null && (
              <span className="ml-auto text-sm font-bold text-gray-900">
                {formatPrice(listing.price)}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/listings/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="relative">
        <Thumb listing={listing} className="aspect-[4/3] w-full" />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <Badge className={clsx(meta.badge, 'shadow-sm')}>{meta.label}</Badge>
        </div>
        {resolved && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
            <ResolvedTag type={listing.type} large />
          </div>
        )}
        {listing.price !== null && (
          <span className="absolute bottom-3 right-3 rounded-lg bg-gray-900/85 px-2.5 py-1 text-sm font-bold text-white shadow-sm">
            {formatPrice(listing.price)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {categoryLabel(listing.category)}
        </p>
        <h3 className="mt-1 line-clamp-1 font-semibold text-gray-900 group-hover:text-brand-700">
          {listing.title}
        </h3>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-gray-500">
          {listing.description}
        </p>

        <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
          <Avatar name={listing.owner.name} src={listing.owner.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-xs font-medium text-gray-700">
              {listing.owner.name}
              {listing.owner.isVerified && (
                <BadgeCheck className="h-3.5 w-3.5 text-brand-500" />
              )}
            </p>
            <p className="flex items-center gap-1 text-[11px] text-gray-400">
              <MapPin className="h-3 w-3" />
              {locationLabel(listing.location)} · {timeAgo(listing.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function Thumb({ listing, className }: { listing: Listing; className?: string }) {
  if (!listing.imageUrl) {
    return (
      <div
        className={clsx(
          'flex items-center justify-center bg-gradient-to-br from-brand-50 to-gray-100 text-brand-200',
          className
        )}
      >
        <ImageOff className="h-8 w-8" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <img
      src={listing.imageUrl}
      alt={listing.title}
      loading="lazy"
      className={clsx('bg-gray-100 object-cover', className)}
    />
  );
}

function ResolvedTag({ type, large }: { type: Listing['type']; large?: boolean }) {
  const label = type === 'sell' ? 'Sold' : 'Resolved';
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full bg-emerald-600 font-semibold text-white',
        large ? 'px-4 py-1.5 text-sm shadow-lg' : 'px-2 py-0.5 text-[11px]'
      )}
    >
      <CheckCircle2 className={large ? 'h-4 w-4' : 'h-3 w-3'} /> {label}
    </span>
  );
}
