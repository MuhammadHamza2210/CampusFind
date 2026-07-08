import { Request, Response } from 'express';
import { Comment, IComment } from '../models/Comment';
import { Listing } from '../models/Listing';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { publicUser, IUser } from '../models/User';
import { commentSchema } from '../validators/schemas';

function serialize(c: IComment) {
  const author = c.author as unknown as IUser;
  return {
    id: c._id,
    body: c.body,
    author: 'name' in author ? publicUser(author) : { id: c.author },
    createdAt: c.createdAt,
  };
}

/** GET /api/listings/:id/comments */
export const listComments = asyncHandler(async (req: Request, res: Response) => {
  const comments = await Comment.find({ listing: req.params.id })
    .sort({ createdAt: 1 })
    .populate('author', 'name avatarUrl isVerified isAdmin createdAt email');
  res.json({ items: comments.map(serialize) });
});

/** POST /api/listings/:id/comments */
export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const { body } = commentSchema.parse(req.body);
  const listing = await Listing.findById(req.params.id);
  if (!listing || listing.status === 'removed')
    throw ApiError.notFound('Listing not found');

  const comment = await Comment.create({
    listing: listing.id,
    author: req.user!.id,
    body,
  });
  await comment.populate('author', 'name avatarUrl isVerified isAdmin createdAt email');
  res.status(201).json({ comment: serialize(comment) });
});

/** DELETE /api/comments/:id — author or admin. */
export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw ApiError.notFound('Comment not found');
  if (comment.author.toString() !== req.user!.id && !req.user!.isAdmin)
    throw ApiError.forbidden('Not allowed');
  await comment.deleteOne();
  res.json({ message: 'Comment deleted' });
});
