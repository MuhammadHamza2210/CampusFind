import { Request, Response } from 'express';
import { Conversation, Message, IMessage } from '../models/Message';
import { Listing } from '../models/Listing';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { publicUser, IUser } from '../models/User';
import { messageSchema, startConversationSchema } from '../validators/schemas';
import { emitToUser } from '../socket';

function serializeMessage(m: IMessage) {
  const sender = m.sender as unknown as IUser | { _id: unknown };
  return {
    id: m._id,
    conversation: m.conversation,
    body: m.body,
    sender: sender && 'name' in sender ? publicUser(sender as IUser) : { id: (sender as { _id: unknown })._id },
    createdAt: m.createdAt,
  };
}

/** POST /api/conversations — start (or reuse) a chat about a listing. */
export const startConversation = asyncHandler(
  async (req: Request, res: Response) => {
    const { listingId } = startConversationSchema.parse(req.body);
    const listing = await Listing.findById(listingId);
    if (!listing || listing.status === 'removed')
      throw ApiError.notFound('Listing not found');

    const me = req.user!.id;
    const ownerId = listing.owner.toString();
    if (ownerId === me)
      throw ApiError.badRequest("You can't message yourself about your own listing");

    let convo = await Conversation.findOne({
      listing: listing.id,
      participants: { $all: [me, ownerId], $size: 2 },
    });
    if (!convo) {
      convo = await Conversation.create({
        listing: listing.id,
        participants: [me, ownerId],
      });
    }

    await convo.populate('participants', 'name avatarUrl isVerified isAdmin createdAt email');
    await convo.populate('listing', 'title imageUrl type status');
    res.status(201).json({ conversation: convo });
  }
);

/** GET /api/conversations — my conversations, newest activity first. */
export const listConversations = asyncHandler(
  async (req: Request, res: Response) => {
    const convos = await Conversation.find({ participants: req.user!.id })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate('participants', 'name avatarUrl isVerified isAdmin createdAt email')
      .populate('listing', 'title imageUrl type status');
    res.json({ items: convos });
  }
);

/** GET /api/conversations/unread-count — total unread messages for the badge. */
export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  const myConvos = await Conversation.find({ participants: req.user!.id }).select('_id');
  const ids = myConvos.map((c) => c._id);
  const count = await Message.countDocuments({
    conversation: { $in: ids },
    sender: { $ne: req.user!.id },
    readBy: { $ne: req.user!.id },
  });
  res.json({ count });
});

/** GET /api/conversations/:id/messages */
export const listMessages = asyncHandler(async (req: Request, res: Response) => {
  const convo = await Conversation.findById(req.params.id);
  if (!convo) throw ApiError.notFound('Conversation not found');
  if (!convo.participants.some((p) => p.toString() === req.user!.id))
    throw ApiError.forbidden('Not part of this conversation');

  const messages = await Message.find({ conversation: convo.id })
    .sort({ createdAt: 1 })
    .populate('sender', 'name avatarUrl isVerified isAdmin createdAt email');

  // Mark as read for this user.
  await Message.updateMany(
    { conversation: convo.id, readBy: { $ne: req.user!.id } },
    { $addToSet: { readBy: req.user!.id } }
  );

  res.json({ items: messages.map(serializeMessage) });
});

/** POST /api/conversations/:id/messages */
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const { body } = messageSchema.parse(req.body);
  const convo = await Conversation.findById(req.params.id);
  if (!convo) throw ApiError.notFound('Conversation not found');
  if (!convo.participants.some((p) => p.toString() === req.user!.id))
    throw ApiError.forbidden('Not part of this conversation');

  const message = await Message.create({
    conversation: convo.id,
    sender: req.user!.id,
    body,
    readBy: [req.user!.id],
  });
  convo.lastMessage = body;
  convo.lastMessageAt = new Date();
  await convo.save();

  await message.populate('sender', 'name avatarUrl isVerified isAdmin createdAt email');
  const payload = serializeMessage(message);

  // Realtime push to the other participant(s).
  convo.participants.forEach((p) => {
    const uid = p.toString();
    if (uid !== req.user!.id) {
      emitToUser(uid, 'message:new', { conversationId: convo.id, message: payload });
    }
  });

  res.status(201).json({ message: payload });
});
