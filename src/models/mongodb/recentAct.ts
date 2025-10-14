import mongoose, { Document, Schema } from 'mongoose';

export type RecentActionType =
  | 'Checkout'
  | 'Add Product'
  | 'Edit Product'
  | 'Archive Product'
  | 'Unarchive Product';

export interface IRecentAct extends Document {
  action: RecentActionType;
  username: string;
  createdAt: Date;
}

const RecentActSchema = new Schema<IRecentAct>(
  {
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: ['Checkout', 'Add Product', 'Edit Product', 'Archive Product', 'Unarchive Product'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'recent_activities',
  }
);

// indexes for common queries
RecentActSchema.index({ createdAt: -1 });
RecentActSchema.index({ action: 1 });
RecentActSchema.index({ username: 1 });

export default mongoose.models.RecentAct || mongoose.model<IRecentAct>('RecentAct', RecentActSchema);