import { Request, Response } from 'express';
import { publicUser } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { uploadImage, deleteImage } from '../config/cloudinary';
import { updateProfileSchema } from '../validators/schemas';
import { Listing } from '../models/Listing';
import { Conversation } from '../models/Message';

/** PATCH /api/users/me — update name and/or avatar. */
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { name } = updateProfileSchema.parse(req.body);
  if (name) user.name = name;

  if (req.file) {
    const uploaded = await uploadImage(req.file.buffer, req.file.originalname);
    user.avatarUrl = uploaded.url;
  }

  await user.save();
  res.json({ user: publicUser(user) });
});

/** GET /api/users/me/stats — quick dashboard counters. */
export const myStats = asyncHandler(async (req: Request, res: Response) => {
  const uid = req.user!.id;
  const [active, resolved, conversations] = await Promise.all([
    Listing.countDocuments({ owner: uid, status: 'active' }),
    Listing.countDocuments({ owner: uid, status: { $in: ['resolved', 'sold'] } }),
    Conversation.countDocuments({ participants: uid }),
  ]);
  res.json({ active, resolved, conversations });
});
