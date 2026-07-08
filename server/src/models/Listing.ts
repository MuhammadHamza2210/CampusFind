import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export const LISTING_TYPES = ['lost', 'found', 'sell'] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const CATEGORIES = [
  'books',
  'electronics',
  'calculators',
  'stationery',
  'accessories',
  'clothing',
  'id-cards',
  'keys',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const LOCATIONS = [
  'library',
  'cafeteria',
  'block-a',
  'block-b',
  'block-c',
  'auditorium',
  'sports-complex',
  'parking',
  'hostel',
  'admin-office',
  'other',
] as const;
export type CampusLocation = (typeof LOCATIONS)[number];

export const LISTING_STATUS = ['active', 'resolved', 'sold', 'removed'] as const;
export type ListingStatus = (typeof LISTING_STATUS)[number];

export interface IListing extends Document {
  type: ListingType;
  title: string;
  description: string;
  category: Category;
  location: CampusLocation;
  price?: number;
  imageUrl?: string;
  imagePublicId?: string;
  status: ListingStatus;
  owner: Types.ObjectId;
  flagged: boolean;
  flagReason?: string;
  /** Found items only: a question a claimant must answer to prove ownership. */
  verificationQuestion?: string;
  createdAt: Date;
  updatedAt: Date;
}

const listingSchema = new Schema<IListing>(
  {
    type: { type: String, enum: LISTING_TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    location: { type: String, enum: LOCATIONS, required: true, index: true },
    price: { type: Number, min: 0 },
    imageUrl: { type: String },
    imagePublicId: { type: String },
    status: {
      type: String,
      enum: LISTING_STATUS,
      default: 'active',
      index: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    flagged: { type: Boolean, default: false, index: true },
    flagReason: { type: String },
    verificationQuestion: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

// Text index powers the search bar (title + description).
listingSchema.index({ title: 'text', description: 'text' });

export const Listing: Model<IListing> =
  mongoose.models.Listing ||
  mongoose.model<IListing>('Listing', listingSchema);
