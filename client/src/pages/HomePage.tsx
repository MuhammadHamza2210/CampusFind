import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  PackageSearch,
  X,
  Plus,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/store/auth';
import { TYPES, CATEGORIES, LOCATIONS } from '@/lib/constants';
import type { Listing, ListingType, Paginated } from '@/types';
import { ListingCard } from '@/components/listings/ListingCard';
import { ListingGridSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

type View = 'grid' | 'list';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

export default function HomePage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const [type, setType] = useState<ListingType | ''>('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState('newest');
  const [view, setView] = useState<View>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<Paginated<Listing> | null>(null);
  const [loading, setLoading] = useState(true);

  // Reset to first page whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, type, category, location, sort]);

  const params = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      type: type || undefined,
      category: category || undefined,
      location: location || undefined,
      sort,
      page,
      limit: 12,
    }),
    [debouncedSearch, type, category, location, sort, page]
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api
      .get<Paginated<Listing>>('/api/listings', { params, signal: controller.signal })
      .then(({ data }) => setData(data))
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setData({ items: [], page: 1, limit: 12, total: 0, totalPages: 0 });
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [params]);

  // Silent auto-refresh so new listings (yours or others') appear live without
  // a manual reload. No spinner — it just swaps in fresh results.
  useEffect(() => {
    const interval = setInterval(() => {
      api
        .get<Paginated<Listing>>('/api/listings', { params })
        .then(({ data }) => setData(data))
        .catch(() => {});
    }, 12000);
    return () => clearInterval(interval);
  }, [params]);

  const activeFilterCount = useMemo(
    () => [type, category, location].filter(Boolean).length,
    [type, category, location]
  );

  const clearFilters = () => {
    setType('');
    setCategory('');
    setLocation('');
    setSearch('');
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-8 text-white sm:px-10 sm:py-10">
        <h1 className="max-w-xl text-2xl font-bold sm:text-3xl">
          Find what's lost. Sell what's spare.
        </h1>
        <p className="mt-2 max-w-lg text-brand-100">
          Browse everything posted across your campus — or add your own in under
          a minute.
        </p>
        {user && (
          <Link to="/post" className="btn mt-5 bg-white text-brand-700 hover:bg-brand-50">
            <Plus className="h-4 w-4" /> Post a listing
          </Link>
        )}
      </section>

      {/* Type quick-tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <TypeTab active={type === ''} onClick={() => setType('')}>
          All
        </TypeTab>
        {TYPES.map((t) => (
          <TypeTab
            key={t.value}
            active={type === t.value}
            onClick={() => setType(type === t.value ? '' : t.value)}
          >
            {t.label}
          </TypeTab>
        ))}
      </div>

      {/* Search + controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            placeholder="Search titles and descriptions…"
            icon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search listings"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={clsx(
              'btn-secondary relative',
              showFilters && 'border-brand-300 bg-brand-50 text-brand-700'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
            {activeFilterCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <ViewToggle active={view === 'grid'} onClick={() => setView('grid')} label="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </ViewToggle>
            <ViewToggle active={view === 'list'} onClick={() => setView('list')} label="List view">
              <List className="h-4 w-4" />
            </ViewToggle>
          </div>
        </div>
      </div>

      {/* Expandable filter panel */}
      {showFilters && (
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-100 bg-surface p-4 shadow-card animate-scale-in sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Category"
            placeholder="All categories"
            options={CATEGORIES}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <Select
            label="Campus location"
            placeholder="Anywhere on campus"
            options={LOCATIONS}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <Select
            label="Sort by"
            options={SORTS}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          />
          <div className="flex items-end">
            {activeFilterCount > 0 || search ? (
              <Button variant="ghost" onClick={clearFilters} className="w-full">
                <X className="h-4 w-4" /> Clear all
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <ListingGridSkeleton />
      ) : data && data.items.length > 0 ? (
        <>
          <p className="text-sm text-gray-500">
            {data.total} {data.total === 1 ? 'result' : 'results'}
          </p>
          <div
            className={clsx(
              view === 'grid'
                ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'flex flex-col gap-3'
            )}
          >
            {data.items.map((l) => (
              <ListingCard key={l.id} listing={l} view={view} />
            ))}
          </div>

          {data.totalPages > 1 && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onPage={setPage}
            />
          )}
        </>
      ) : (
        <EmptyState
          icon={PackageSearch}
          title="No listings match your search"
          description="Try removing a filter or broadening your search. Or be the first to post something here."
          action={
            activeFilterCount > 0 || search ? (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : user ? (
              <Link to="/post" className="btn-primary">
                <Plus className="h-4 w-4" /> Post the first listing
              </Link>
            ) : (
              <Link to="/signup" className="btn-primary">
                Join to post
              </Link>
            )
          }
        />
      )}
    </div>
  );
}

function TypeTab({
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
        'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
        active
          ? 'bg-gray-900 text-white'
          : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
      )}
    >
      {children}
    </button>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={clsx(
        'flex h-[42px] w-11 items-center justify-center transition-colors',
        active ? 'bg-brand-50 text-brand-700' : 'text-gray-400 hover:bg-gray-50'
      )}
    >
      {children}
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <button
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page === 1}
        className="btn-secondary px-3 disabled:opacity-40"
      >
        Prev
      </button>
      {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {
        const p = i + 1;
        return (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={clsx(
              'h-10 w-10 rounded-xl text-sm font-semibold transition-colors',
              p === page
                ? 'bg-brand-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {p}
          </button>
        );
      })}
      <button
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="btn-secondary px-3 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
