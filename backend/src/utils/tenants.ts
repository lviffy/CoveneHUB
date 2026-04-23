import { TenantModel } from '../models/Tenant';

type SyncTenantOptions = {
  tenantId?: string;
  campusId?: string;
  name?: string;
  adminId?: string;
  organizerId?: string;
};

function buildTenantName(tenantId: string, explicitName?: string) {
  if (explicitName && explicitName.trim()) {
    return explicitName.trim();
  }

  return tenantId
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export async function syncTenantRecord(options: SyncTenantOptions) {
  const tenantId = options.tenantId?.trim();
  if (!tenantId) {
    return null;
  }

  const addToSet: Record<string, string> = {};
  if (options.adminId) addToSet.adminIds = options.adminId;
  if (options.organizerId) addToSet.organizerIds = options.organizerId;

  const set: Record<string, string> = {};
  if (options.campusId) set.campusId = options.campusId;
  if (options.name?.trim()) set.name = options.name.trim();

  const update: Record<string, unknown> = {
    $setOnInsert: {
      tenantId,
      ...(!options.name?.trim() ? { name: buildTenantName(tenantId, options.name) } : {}),
      ...(!options.campusId ? {} : {}),
    },
  };

  if (Object.keys(set).length > 0) {
    update.$set = set;
  }

  if (Object.keys(addToSet).length > 0) {
    update.$addToSet = addToSet;
  }

  return TenantModel.findOneAndUpdate({ tenantId }, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });
}
