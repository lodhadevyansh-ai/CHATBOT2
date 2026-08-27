import mongoose from 'mongoose';

const memorySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    key: {
      type: String,
      required: true,
      trim: true
    },
    value: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      default: 'fact',
      enum: ['identity', 'preference', 'location', 'fact', 'custom', 'project']
    },
    rawText: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure uniqueness of user keys for easy upserts
memorySchema.index({ userId: 1, key: 1 }, { unique: true });

const Memory = mongoose.models.Memory || mongoose.model('Memory', memorySchema);

export default Memory;
