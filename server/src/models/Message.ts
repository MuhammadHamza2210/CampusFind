import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * A Conversation ties two users together around a specific listing.
 * Messages belong to a conversation.
 */
export interface IConversation extends Document {
  listing: Types.ObjectId;
  participants: Types.ObjectId[];
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    participants: [
      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ],
    lastMessage: { type: String },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
);

conversationSchema.index({ listing: 1, participants: 1 });

export const Conversation: Model<IConversation> =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>('Conversation', conversationSchema);

export interface IMessage extends Document {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  body: string;
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export const Message: Model<IMessage> =
  mongoose.models.Message ||
  mongoose.model<IMessage>('Message', messageSchema);
