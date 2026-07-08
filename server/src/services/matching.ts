import { Listing, IListing, ListingType } from '../models/Listing';
import { Notification } from '../models/Notification';
import { emitToUser } from '../socket';

/**
 * Lost ↔ Found matching.
 *
 * When someone loses an item, the complementary listing is a *found* report of
 * the same thing (and vice-versa). We surface those candidates on the detail
 * page and fire alerts to the other party when a fresh complementary listing
 * appears. `sell` listings have no complement.
 */

const OPPOSITE: Partial<Record<ListingType, ListingType>> = {
  lost: 'found',
  found: 'lost',
};

// Score at/above which a candidate is strong enough to notify the other user.
// A shared location alone clears it; otherwise it needs solid keyword overlap.
export const MATCH_ALERT_THRESHOLD = 3;

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'lost', 'found', 'near', 'from',
  'have', 'has', 'was', 'are', 'you', 'your', 'his', 'her', 'its', 'our', 'out',
  'got', 'get', 'any', 'not', 'but', 'can', 'who', 'someone', 'anyone', 'please',
  'around', 'today', 'yesterday', 'morning', 'evening', 'item', 'items', 'black',
  'white', 'blue', 'red', 'green', 'colour', 'color',
]);

/** Split text into meaningful lowercase tokens (≥3 chars, no stopwords). */
function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  return new Set(tokens);
}

function countShared(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}

export interface ScoredMatch {
  listing: IListing;
  score: number;
}

/**
 * Find active complementary listings for `listing`, ranked by relevance.
 * Candidates are pre-filtered to the opposite type + same category (a strong,
 * cheap signal), then scored on shared campus location and keyword overlap.
 */
export async function findMatches(
  listing: IListing,
  { limit = 6, minScore = 1 }: { limit?: number; minScore?: number } = {}
): Promise<ScoredMatch[]> {
  const opposite = OPPOSITE[listing.type];
  if (!opposite) return [];

  const candidates = await Listing.find({
    type: opposite,
    category: listing.category,
    status: 'active',
    owner: { $ne: listing.owner },
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('owner', 'name avatarUrl isVerified isAdmin createdAt email');

  const sourceTokens = tokenize(`${listing.title} ${listing.description}`);

  const scored: ScoredMatch[] = candidates.map((c) => {
    const locationMatch = c.location === listing.location ? 3 : 0;
    const overlap = Math.min(
      countShared(sourceTokens, tokenize(`${c.title} ${c.description}`)),
      4
    );
    return { listing: c, score: locationMatch + overlap };
  });

  return scored
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Fired after a lost/found listing is created: notify the owners of strong
 * complementary listings that a potential match just appeared. Best-effort —
 * never throws, so a matching hiccup can't break listing creation.
 */
export async function createMatchAlerts(listing: IListing): Promise<number> {
  try {
    if (!OPPOSITE[listing.type]) return 0;

    const matches = await findMatches(listing, {
      limit: 20,
      minScore: MATCH_ALERT_THRESHOLD,
    });
    if (matches.length === 0) return 0;

    let created = 0;
    for (const match of matches) {
      // `owner` is populated by findMatches, so read its _id rather than
      // stringifying the whole user document.
      const owner = match.listing.owner as unknown as { _id: unknown };
      const ownerId = String(owner?._id ?? match.listing.owner);
      try {
        // Unique index dedupes if this pair was somehow already alerted.
        await Notification.create({
          user: ownerId,
          type: 'match',
          listing: listing._id,
          matchedListing: match.listing._id,
          score: match.score,
        });
      } catch {
        continue; // duplicate — skip the socket push too
      }
      created++;
      emitToUser(ownerId, 'alert:new', {
        type: 'match',
        listingId: listing._id,
        matchedListingId: match.listing._id,
      });
    }
    return created;
  } catch {
    return 0;
  }
}
