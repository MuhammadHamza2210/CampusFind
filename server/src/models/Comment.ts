import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IComment extends Document {
  listing: Types.ObjectId;
  author: Types.ObjectId;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

export const Comment: Model<IComment> =
  mongoose.models.Comment ||
  mongoose.model<IComment>('Comment', commentSchema);
