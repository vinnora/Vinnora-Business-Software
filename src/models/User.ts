import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // Organization & roles
  orgId: { type: String, index: true, default: null },
  orgRole: {
    type: String,
    enum: ['owner', 'admin', 'manager', 'member', 'viewer'],
    default: 'member',
  },
  appRoles: {
    type: Map,
    of: String,
    default: {},
  },
  isActive: { type: Boolean, default: true },

  // Legacy fields (kept for backward compatibility)
  role: { type: String, default: 'user' },
  company: { type: String, default: '' },
  subscription: { type: String, default: 'free' },
  modules: [{ type: String }],

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
