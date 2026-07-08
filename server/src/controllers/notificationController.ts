import { Request, Response } from 'express';
import { Notification, INotification } from '../models/Notification';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { IListing } from '../models/Listing';

/** Compact listing shape for embedding inside a notification. */
function listingRef(l: unknown) {
  if (!l || typeof l !== 'object' || !('title' in l)) return null;
  const listing = l as IListing;
  return {
    id: listing._id,
    title: listing.title,
    type: listing.type,
    category: listing.category,
    location: listing.location,
    imageUrl: listing.imageUrl || null,
    status: listing.status,
  };
}

function claimRef(c: unknown) {
  if (!c || typeof c !== 'object' || !('status' in c)) return null;
  const claim = c as {
    _id: unknown;
    status: string;
    claimant?: { name?: string };
  };
  return {
    id: claim._id,
    status: claim.status,
    claimantName: claim.claimant?.name ?? null,
  };
}

function serialize(n: INotification) {
  return {
    id: n._id,
    type: n.type,
    read: n.read,
    score: n.score ?? null,
    listing: listingRef(n.listing),
    matchedListing: listingRef(n.matchedListing),
    claim: claimRef(n.claim),
    createdAt: n.createdAt,
  };
}

const listingFields = 'title type category location imageUrl status';

/** GET /api/notifications — my newest notifications + unread count. */
export const listNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const [items, unread] = await Promise.all([
      Notification.find({ user: req.user!.id })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate('listing', listingFields)
        .populate('matchedListing', listingFields)
        .populate({ path: 'claim', select: 'status claimant', populate: { path: 'claimant', select: 'name' } }),
      Notification.countDocuments({ user: req.user!.id, read: false }),
    ]);
    res.json({ items: items.map(serialize), unread });
  }
);

/** GET /api/notifications/unread-count */
export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await Notification.countDocuments({
    user: req.user!.id,
    read: false,
  });
  res.json({ count });
});

/** POST /api/notifications/read-all — mark every notification read. */
export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await Notification.updateMany(
    { user: req.user!.id, read: false },
    { read: true }
  );
  res.json({ message: 'All caught up' });
});

/** PATCH /api/notifications/:id/read — mark a single notification read. */
export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) throw ApiError.notFound('Notification not found');
  if (notification.user.toString() !== req.user!.id)
    throw ApiError.forbidden('Not your notification');

  notification.read = true;
  await notification.save();
  res.json({ notification: serialize(notification) });
});
