export type ListingType = 'lost' | 'found' | 'sell';
export type ListingStatus = 'active' | 'resolved' | 'sold' | 'removed';

export type Category =
  | 'books'
  | 'electronics'
  | 'calculators'
  | 'stationery'
  | 'accessories'
  | 'clothing'
  | 'id-cards'
  | 'keys'
  | 'other';

export type CampusLocation =
  | 'library'
  | 'cafeteria'
  | 'block-a'
  | 'block-b'
  | 'block-c'
  | 'auditorium'
  | 'sports-complex'
  | 'parking'
  | 'hostel'
  | 'admin-office'
  | 'other';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isAdmin: boolean;
  joinedAt: string;
}

export interface Listing {
  id: string;
  type: ListingType;
  title: string;
  description: string;
  category: Category;
  location: CampusLocation;
  price: number | null;
  imageUrl: string | null;
  status: ListingStatus;
  flagged: boolean;
  verificationQuestion: string | null;
  owner: User;
  createdAt: string;
  updatedAt: string;
}

export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface Claim {
  id: string;
  listing: {
    id: string;
    title: string;
    type: ListingType;
    imageUrl: string | null;
    status: ListingStatus;
  };
  claimant: User;
  answer: string;
  status: ClaimStatus;
  conversation: string | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  body: string;
  author: User;
  createdAt: string;
}

export interface Message {
  id: string;
  conversation: string;
  body: string;
  sender: User;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  listing: {
    _id: string;
    title: string;
    imageUrl: string | null;
    type: ListingType;
    status: ListingStatus;
  };
  participants: User[];
  lastMessage?: string;
  lastMessageAt?: string;
  updatedAt: string;
}

/** A match candidate is a full listing plus its relevance score. */
export interface MatchListing extends Listing {
  score: number;
}

/** One of my open listings paired with its complementary candidates. */
export interface MatchGroup {
  listing: Listing;
  matches: MatchListing[];
}

/** Compact listing reference embedded inside a notification. */
export interface ListingRef {
  id: string;
  title: string;
  type: ListingType;
  category: Category;
  location: CampusLocation;
  imageUrl: string | null;
  status: ListingStatus;
}

export type NotificationType =
  | 'match'
  | 'claim'
  | 'claim-approved'
  | 'claim-rejected';

export interface AppNotification {
  id: string;
  type: NotificationType;
  read: boolean;
  score: number | null;
  listing: ListingRef | null;
  matchedListing: ListingRef | null;
  claim: { id: string; status: ClaimStatus; claimantName: string | null } | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListingFilters {
  type?: ListingType | '';
  category?: Category | '';
  location?: CampusLocation | '';
  q?: string;
  sort?: 'newest' | 'oldest' | 'price-asc' | 'price-desc';
  page?: number;
}
