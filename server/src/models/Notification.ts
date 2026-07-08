import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export const NOTIFICATION_TYPES = [
  'match',
  'claim',
  'claim-approved',
  'claim-rejected',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * An in-app alert for a user.
 *  - `match`: `listing` is the freshly-posted complementary listing that
 *    triggered the alert, `matchedListing` is the recipient's own listing.
 *  - `claim` / `claim-approved` / `claim-rejected`: `listing` is the found item
 *    and `claim` references the claim; sent to the finder (new claim) or the
 *    claimant (finder's decision).
 */
export interface INotification extends Document {
  user: Types.ObjectId;
  type: NotificationType;
  listing: Types.ObjectId;
  matchedListing?: Types.ObjectId;
  claim?: Types.ObjectId;
  score?: number;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    matchedListing: { type: Schema.Types.ObjectId, ref: 'Listing' },
    claim: { type: Schema.Types.ObjectId, ref: 'Claim' },
    score: { type: Number },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Fast "my newest notifications" and unread-badge lookups.
notificationSchema.index({ user: 1, createdAt: -1 });
// Guard against firing the same match alert twice for the same pair.
notificationSchema.index(
  { user: 1, listing: 1, matchedListing: 1 },
  { unique: true, partialFilterExpression: { matchedListing: { $exists: true } } }
);

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', notificationSchema);
