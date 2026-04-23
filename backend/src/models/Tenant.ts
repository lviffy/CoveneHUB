import { Schema, model } from 'mongoose';

interface TenantDocument {
  tenantId: string;
  name: string;
  campusId?: string;
  adminIds: string[];
  organizerIds: string[];
}

const tenantSchema = new Schema<TenantDocument>(
  {
    tenantId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    campusId: { type: String, trim: true },
    adminIds: { type: [String], default: [] },
    organizerIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const TenantModel = model<TenantDocument>('Tenant', tenantSchema);
