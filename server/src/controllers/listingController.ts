import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { Listing, IListing } from '../models/Listing';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { uploadImage, deleteImage } from '../config/cloudinary';
import { publicUser, IUser } from '../models/User';
import {
  listingSchema,
  updateListingSchema,
  listingStatusSchema,
} from '../validators/schemas';
import { findMatches, createMatchAlerts } from '../services/matching';

function serialize(listing: IListing) {
  const owner = listing.owner as unknown as IUser | { _id: unknown };
  const ownerPublic =
    owner && 'name' in owner ? publicUser(owner as IUser) : { id: owner?._id };
  return {
    id: listing._id,
    type: listing.type,
    title: listing.title,
    description: listing.description,
    category: listing.category,
    location: listing.location,
    price: listing.price ?? null,
    imageUrl: listing.imageUrl || null,
    status: listing.status,
    flagged: listing.flagged,
    verificationQuestion: listing.verificationQuestion || null,
    owner: ownerPublic,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}

/** GET /api/listings — browse with filters, search, sort, pagination. */
export const listListings = asyncHandler(async (req: Request, res: Response) => {
  const {
    type,
    category,
    location,
    q,
    sort = 'newest',
    page = '1',
    limit = '12',
    status = 'active',
  } = req.query as Record<string, string>;

  const filter: FilterQuery<IListing> = { status: { $ne: 'removed' } };

  if (status && status !== 'all') filter.status = status;
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (location) filter.location = location;
  if (q && q.trim()) filter.$text = { $search: q.trim() };

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    'price-asc': { price: 1 },
    'price-desc': { price: -1 },
  };
  const sortBy = sortMap[sort] || sortMap.newest;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const perPage = Math.min(48, Math.max(1, parseInt(limit, 10) || 12));

  const [items, total] = await Promise.all([
    Listing.find(filter)
      .sort(sortBy)
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .populate('owner', 'name avatarUrl isVerified isAdmin createdAt email'),
    Listing.countDocuments(filter),
  ]);

  res.json({
    items: items.map(serialize),
    page: pageNum,
    limit: perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  });
});

/** GET /api/listings/:id */
export const getListing = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Listing.findById(req.params.id).populate(
    'owner',
    'name avatarUrl isVerified isAdmin createdAt email'
  );
  if (!listing || listing.status === 'removed')
    throw ApiError.notFound('Listing not found');
  res.json({ listing: serialize(listing) });
});

/** GET /api/listings/:id/matches — complementary lost/found candidates. */
export const getMatches = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing || listing.status === 'removed')
    throw ApiError.notFound('Listing not found');

  // Only lost/found items have a complement; sells never match.
  if (listing.type === 'sell') {
    res.json({ items: [] });
    return;
  }

  const matches = await findMatches(listing);
  res.json({
    items: matches.map((m) => ({ ...serialize(m.listing), score: m.score })),
  });
});

/** POST /api/listings — multipart/form-data with optional image. */
export const createListing = asyncHandler(async (req: Request, res: Response) => {
  const data = listingSchema.parse(req.body);

  if (data.type === 'sell' && (data.price === undefined || data.price === null)) {
    throw ApiError.badRequest('A price is required for items you want to sell');
  }
  if (data.type !== 'sell') data.price = undefined;
  if (data.type !== 'found') data.verificationQuestion = undefined;

  let imageUrl: string | undefined;
  let imagePublicId: string | undefined;
  if (req.file) {
    const uploaded = await uploadImage(req.file.buffer, req.file.originalname);
    imageUrl = uploaded.url;
    imagePublicId = uploaded.publicId;
  }

  const listing = await Listing.create({
    ...data,
    imageUrl,
    imagePublicId,
    owner: req.user!.id,
  });
  await listing.populate('owner', 'name avatarUrl isVerified isAdmin createdAt email');

  // Alert owners of complementary lost/found listings (best-effort, non-blocking).
  await createMatchAlerts(listing);

  res.status(201).json({ listing: serialize(listing) });
});

/** PATCH /api/listings/:id */
export const updateListing = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing || listing.status === 'removed')
    throw ApiError.notFound('Listing not found');
  if (listing.owner.toString() !== req.user!.id)
    throw ApiError.forbidden('You can only edit your own listings');

  const data = updateListingSchema.parse(req.body);
  Object.assign(listing, data);

  if (listing.type !== 'sell') listing.price = undefined;
  if (listing.type !== 'found') listing.verificationQuestion = undefined;

  if (req.file) {
    if (listing.imagePublicId) await deleteImage(listing.imagePublicId);
    const uploaded = await uploadImage(req.file.buffer, req.file.originalname);
    listing.imageUrl = uploaded.url;
    listing.imagePublicId = uploaded.publicId;
  }

  await listing.save();
  await listing.populate('owner', 'name avatarUrl isVerified isAdmin createdAt email');
  res.json({ listing: serialize(listing) });
});

/** PATCH /api/listings/:id/status — resolved / sold / active */
export const setStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = listingStatusSchema.parse(req.body);
  const listing = await Listing.findById(req.params.id);
  if (!listing || listing.status === 'removed')
    throw ApiError.notFound('Listing not found');
  if (listing.owner.toString() !== req.user!.id)
    throw ApiError.forbidden('You can only update your own listings');

  listing.status = status;
  await listing.save();
  await listing.populate('owner', 'name avatarUrl isVerified isAdmin createdAt email');
  res.json({ listing: serialize(listing) });
});

/** DELETE /api/listings/:id */
export const deleteListing = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw ApiError.notFound('Listing not found');
  if (listing.owner.toString() !== req.user!.id && !req.user!.isAdmin)
    throw ApiError.forbidden('You can only delete your own listings');

  if (listing.imagePublicId) await deleteImage(listing.imagePublicId);
  await listing.deleteOne();
  res.json({ message: 'Listing deleted' });
});

/** POST /api/listings/:id/flag — any user can flag spam. */
export const flagListing = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw ApiError.notFound('Listing not found');
  listing.flagged = true;
  listing.flagReason = req.body.reason;
  await listing.save();
  res.json({ message: 'Thanks — a moderator will review this listing' });
});

/** GET /api/listings/mine/matches — complementary candidates for my open listings. */
export const myMatches = asyncHandler(async (req: Request, res: Response) => {
  const mine = await Listing.find({
    owner: req.user!.id,
    status: 'active',
    type: { $in: ['lost', 'found'] },
  })
    .sort({ createdAt: -1 })
    .populate('owner', 'name avatarUrl isVerified isAdmin createdAt email');

  const groups = await Promise.all(
    mine.map(async (listing) => {
      const matches = await findMatches(listing, { limit: 4 });
      return {
        listing: serialize(listing),
        matches: matches.map((m) => ({ ...serialize(m.listing), score: m.score })),
      };
    })
  );

  res.json({ groups: groups.filter((g) => g.matches.length > 0) });
});

/** GET /api/listings/mine — current user's listings. */
export const myListings = asyncHandler(async (req: Request, res: Response) => {
  const listings = await Listing.find({
    owner: req.user!.id,
    status: { $ne: 'removed' },
  })
    .sort({ createdAt: -1 })
    .populate('owner', 'name avatarUrl isVerified isAdmin createdAt email');
  res.json({ items: listings.map(serialize) });
});

export { serialize as serializeListing };
