import { z } from 'zod';
import { LISTING_TYPES, CATEGORIES, LOCATIONS } from '../models/Listing';

export const signupSchema = z.object({
  name: z.string().min(2, 'Name is too short').max(60),
  email: z.string().email('Enter a valid email').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const verifyOtpSchema = z.object({
  email: z.string().email().toLowerCase(),
  code: z.string().length(6, 'Code must be 6 digits'),
});

export const resendOtpSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(60).optional(),
});

// Listing bodies arrive as multipart/form-data, so numbers come as strings.
export const listingSchema = z.object({
  type: z.enum(LISTING_TYPES),
  title: z.string().min(3, 'Title is too short').max(120),
  description: z.string().min(10, 'Add a few more details').max(2000),
  category: z.enum(CATEGORIES),
  location: z.enum(LOCATIONS),
  price: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : Number(v)))
    .refine((v) => v === undefined || (!Number.isNaN(v) && v >= 0), {
      message: 'Price must be a positive number',
    }),
  verificationQuestion: z
    .string()
    .max(200, 'Question is too long')
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined)),
});

export const updateListingSchema = listingSchema.partial();

export const listingStatusSchema = z.object({
  status: z.enum(['active', 'resolved', 'sold']),
});

export const flagSchema = z.object({
  reason: z.string().min(3).max(200),
});

export const commentSchema = z.object({
  body: z.string().min(1, 'Say something').max(1000),
});

export const messageSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const startConversationSchema = z.object({
  listingId: z.string().min(1),
});

export const claimSchema = z.object({
  answer: z
    .string()
    .min(2, 'Tell the finder how you can prove it')
    .max(1000, 'Keep it under 1000 characters'),
});

export const claimDecisionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});
