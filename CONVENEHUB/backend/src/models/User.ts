import { Schema, model } from 'mongoose';
import { UserRole } from '../types/common';

interface UserDocument {
  fullName: string;
  name?: string;
  email: string;
  passwordHash: string;
  password?: string;
  role: UserRole;
  tenantId?: string;
  campusId?: string;
  phone?: string;
  city?: string;
}

const userSchema = new Schema<UserDocument>(
  {
    // Keep fullName/passwordHash for existing APIs while exposing name/password aliases
    // to match the documented collection shape.
    fullName: { type: String, required: true, trim: true, alias: 'name' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, alias: 'password' },
    role: { type: String, enum: ['admin', 'organizer', 'promoter', 'attendee'], default: 'attendee' },
    tenantId: { type: String },
    campusId: { type: String },
    phone: { type: String },
    city: { type: String },
  },
  { timestamps: true }
);

export const UserModel = model<UserDocument>('User', userSchema);
