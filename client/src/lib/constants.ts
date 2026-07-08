import type { Category, CampusLocation, ListingType } from '@/types';

export const TYPE_META: Record<
  ListingType,
  { label: string; badge: string; verb: string }
> = {
  lost: {
    label: 'Lost',
    badge: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
    verb: 'This is mine',
  },
  found: {
    label: 'Found',
    badge: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
    verb: 'I lost this',
  },
  sell: {
    label: 'For sale',
    badge: 'bg-brand-100 text-brand-700 ring-1 ring-brand-200',
    verb: "I'm interested",
  },
};

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'books', label: 'Books' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'calculators', label: 'Calculators' },
  { value: 'stationery', label: 'Stationery' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'id-cards', label: 'ID Cards' },
  { value: 'keys', label: 'Keys' },
  { value: 'other', label: 'Other' },
];

export const LOCATIONS: { value: CampusLocation; label: string }[] = [
  { value: 'library', label: 'Library' },
  { value: 'cafeteria', label: 'Cafeteria' },
  { value: 'block-a', label: 'Block A' },
  { value: 'block-b', label: 'Block B' },
  { value: 'block-c', label: 'Block C' },
  { value: 'auditorium', label: 'Auditorium' },
  { value: 'sports-complex', label: 'Sports Complex' },
  { value: 'parking', label: 'Parking' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'admin-office', label: 'Admin Office' },
  { value: 'other', label: 'Other' },
];

export const TYPES: { value: ListingType; label: string }[] = [
  { value: 'lost', label: 'Lost' },
  { value: 'found', label: 'Found' },
  { value: 'sell', label: 'For sale' },
];

export const categoryLabel = (v: string) =>
  CATEGORIES.find((c) => c.value === v)?.label ?? v;
export const locationLabel = (v: string) =>
  LOCATIONS.find((l) => l.value === v)?.label ?? v;
