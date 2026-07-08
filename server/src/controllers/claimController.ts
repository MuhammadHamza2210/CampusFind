import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Claim, IClaim } from '../models/Claim';
import { Listing } from '../models/Listing';
import { Conversation, Message } from '../models/Message';
import { Notification } from '../models/Notification';
import { publicUser, IUser } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { claimSchema, claimDecisionSchema } from '../validators/schemas';
import { emitToUser } from '../socket';

/** Compact listing shape embedded in a claim response. */
function listingRef(l: unknown) {
  if (!l || typeof l !== 'object' || !('title' in l)) return { id: l };
  const listing = l as { _id: unknown; title: string; type: string; imageUrl?: string; status: string };
  return {
    id: listing._id,
    title: listing.title,
    type: listing.type,
    imageUrl: listing.imageUrl || null,
    status: listing.status,
  };
}

function serialize(claim: IClaim) {
  const claimant = claim.claimant as unknown as IUser | { _id: unknown };
  return {
    id: claim._id,
    listing: listingRef(claim.listing),
    claimant:
      claimant && 'name' in claimant
        ? publicUser(claimant as IUser)
        : { id: (claimant as { _id: unknown })._id },
    answer: claim.answer,
    status: claim.status,
    conversation: claim.conversation ?? null,
    createdAt: claim.createdAt,
  };
}

/** POST /api/listings/:id/claims — assert a found item is yours. */
export const createClaim = asyncHandler(async (req: Request, res: Response) => {
  const { answer } = claimSchema.parse(req.body);

  const listing = await Listing.findById(req.params.id);
  if (!listing || listing.status === 'removed')
    throw ApiError.notFound('Listing not found');
  if (listing.type !== 'found')
    throw ApiError.badRequest('Only found items can be claimed');
  if (listing.status !== 'active')
    throw ApiError.badRequest('This item is no longer available to claim');
  if (listing.owner.toString() === req.user!.id)
    throw ApiError.badRequest("You can't claim your own listing");

  const existing = await Claim.findOne({
    listing: listing._id,
    claimant: req.user!.id,
  });
  if (existing)
    throw ApiError.conflict('You already submitted a claim for this item');

  const claim = await Claim.create({
    listing: listing._id,
    claimant: req.user!.id,
    answer,
  });

  // Notify the finder that someone claimed their item.
  const ownerId = listing.owner.toString();
  await Notification.create({
    user: ownerId,
    type: 'claim',
    listing: listing._id,
    claim: claim._id,
  });
  emitToUser(ownerId, 'alert:new', {
    type: 'claim',
    listingId: listing._id,
    claimId: claim._id,
  });

  await claim.populate('claimant', 'name avatarUrl isVerified isAdmin createdAt email');
  await claim.populate('listing', 'title type imageUrl status');
  res.status(201).json({ claim: serialize(claim) });
});

/** GET /api/listings/:id/claims — the finder reviews claims on their item. */
export const listClaims = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw ApiError.notFound('Listing not found');
  if (listing.owner.toString() !== req.user!.id)
    throw ApiError.forbidden('Only the finder can view claims');

  const claims = await Claim.find({ listing: listing._id })
    .sort({ createdAt: -1 })
    .populate('claimant', 'name avatarUrl isVerified isAdmin createdAt email')
    .populate('listing', 'title type imageUrl status');
  res.json({ items: claims.map(serialize) });
});

/** GET /api/claims/mine — claims I have submitted. */
export const myClaims = asyncHandler(async (req: Request, res: Response) => {
  const claims = await Claim.find({ claimant: req.user!.id })
    .sort({ createdAt: -1 })
    .populate('claimant', 'name avatarUrl isVerified isAdmin createdAt email')
    .populate('listing', 'title type imageUrl status');
  res.json({ items: claims.map(serialize) });
});

/**
 * PATCH /api/claims/:id — the finder approves or rejects a claim.
 * On approval the item is marked resolved, a chat is opened to arrange pickup,
 * and any other pending claims on the same item are rejected.
 */
export const decideClaim = asyncHandler(async (req: Request, res: Response) => {
  const { status } = claimDecisionSchema.parse(req.body);

  const claim = await Claim.findById(req.params.id);
  if (!claim) throw ApiError.notFound('Claim not found');

  const listing = await Listing.findById(claim.listing);
  if (!listing) throw ApiError.notFound('Listing not found');
  if (listing.owner.toString() !== req.user!.id)
    throw ApiError.forbidden('Only the finder can decide on claims');
  if (claim.status !== 'pending')
    throw ApiError.badRequest(`This claim was already ${claim.status}`);

  claim.status = status;
  const claimantId = claim.claimant.toString();

  if (status === 'approved') {
    // Open (or reuse) a chat so both sides can arrange the handoff.
    let convo = await Conversation.findOne({
      listing: listing._id,
      participants: { $all: [listing.owner, claim.claimant], $size: 2 },
    });
    if (!convo) {
      convo = await Conversation.create({
        listing: listing._id,
        participants: [listing.owner, claim.claimant],
      });
    }
    claim.conversation = convo._id as Types.ObjectId;

    const body = '✅ Your claim was approved! Let\'s arrange a time and place to hand it over.';
    const message = await Message.create({
      conversation: convo._id,
      sender: req.user!.id,
      body,
      readBy: [req.user!.id],
    });
    convo.lastMessage = body;
    convo.lastMessageAt = new Date();
    await convo.save();

    await message.populate('sender', 'name avatarUrl isVerified isAdmin createdAt email');
    emitToUser(claimantId, 'message:new', {
      conversationId: convo._id,
      message: {
        id: message._id,
        conversation: convo._id,
        body: message.body,
        sender: publicUser(message.sender as unknown as IUser),
        createdAt: message.createdAt,
      },
    });

    // The item is now spoken for — resolve it and reject other pending claims.
    listing.status = 'resolved';
    await listing.save();
    await Claim.updateMany(
      { listing: listing._id, _id: { $ne: claim._id }, status: 'pending' },
      { status: 'rejected' }
    );
  }

  await claim.save();

  // Tell the claimant the outcome.
  await Notification.create({
    user: claimantId,
    type: status === 'approved' ? 'claim-approved' : 'claim-rejected',
    listing: listing._id,
    claim: claim._id,
  });
  emitToUser(claimantId, 'alert:new', {
    type: status === 'approved' ? 'claim-approved' : 'claim-rejected',
    listingId: listing._id,
    claimId: claim._id,
  });

  await claim.populate('claimant', 'name avatarUrl isVerified isAdmin createdAt email');
  await claim.populate('listing', 'title type imageUrl status');
  res.json({ claim: serialize(claim) });
});
