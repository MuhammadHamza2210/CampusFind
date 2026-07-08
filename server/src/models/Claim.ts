import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export const CLAIM_STATUS = ['pending', 'approved', 'rejected'] as const;
export type ClaimStatus = (typeof CLAIM_STATUS)[number];

/**
 * A claim asserts "this found item is mine". The claimant answers the finder's
 * verification question; the finder approves or rejects. On approval a private
 * chat is opened so the two can arrange a pickup.
 */
export interface IClaim extends Document {
  listing: Types.ObjectId;
  claimant: Types.ObjectId;
  answer: string;
  status: ClaimStatus;
  conversation?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const claimSchema = new Schema<IClaim>(
  {
    listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    claimant: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    answer: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: CLAIM_STATUS, default: 'pending', index: true },
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  },
  { timestamps: true }
);

// One claim per user per listing.
claimSchema.index({ listing: 1, claimant: 1 }, { unique: true });

export const Claim: Model<IClaim> =
  mongoose.models.Claim || mongoose.model<IClaim>('Claim', claimSchema);
