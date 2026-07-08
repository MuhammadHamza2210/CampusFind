import { Request, Response } from 'express';
import { Listing } from '../models/Listing';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { deleteImage } from '../config/cloudinary';
import { serializeListing } from './listingController';

/** GET /api/admin/flagged — listings flagged as spam. */
export const listFlagged = asyncHandler(async (_req: Request, res: Response) => {
  const items = await Listing.find({ flagged: true, status: { $ne: 'removed' } })
    .sort({ updatedAt: -1 })
    .populate('owner', 'name avatarUrl isVerified isAdmin createdAt email');
  res.json({ items: items.map(serializeListing) });
});

/** POST /api/admin/listings/:id/remove — soft-remove a listing. */
export const removeListing = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw ApiError.notFound('Listing not found');
  listing.status = 'removed';
  await listing.save();
  res.json({ message: 'Listing removed' });
});

/** POST /api/admin/listings/:id/dismiss — clear the flag, keep the listing. */
export const dismissFlag = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw ApiError.notFound('Listing not found');
  listing.flagged = false;
  listing.flagReason = undefined;
  await listing.save();
  res.json({ message: 'Flag dismissed' });
});

/** DELETE /api/admin/listings/:id — hard delete + image cleanup. */
export const hardDelete = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw ApiError.notFound('Listing not found');
  if (listing.imagePublicId) await deleteImage(listing.imagePublicId);
  await listing.deleteOne();
  res.json({ message: 'Listing permanently deleted' });
});
