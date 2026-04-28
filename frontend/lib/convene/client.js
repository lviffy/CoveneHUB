import { resolveAssetUrl, extractUploadPath } from "@/lib/storage";
const ACCESS_TOKEN_KEY = "convenehub_access_token";
const REFRESH_TOKEN_KEY = "convenehub_refresh_token";
const USER_KEY = "convenehub_user";
const AUTH_EVENT = "convenehub_auth_state_change";
const API_ORIGIN = String(import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/+$/,
  "",
);
const API_BASE = API_ORIGIN ? `${API_ORIGIN}/api/v1` : "/api/v1";
let refreshInFlight = null;
function mapRoleToFrontend(role) {
  if (role === "admin" || role === "admin_team") return "admin_team";
  if (role === "organizer" || role === "movie_team") return "organizer";
  if (role === "promoter") return "promoter";
  return "user";
}
function mapRoleToBackend(role) {
  if (role === "admin_team" || role === "admin") return "admin";
  if (role === "organizer" || role === "movie_team") return "organizer";
  if (role === "promoter") return "promoter";
  return "attendee";
}
function safeJsonParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
export function normalizeAuthUser(user) {
  const role = mapRoleToFrontend(user?.role || user?.user_metadata?.role);
  const fullName =
    user?.user_metadata?.full_name || user?.full_name || user?.fullName || "";
  const city = user?.city || user?.user_metadata?.city;
  const phone = user?.phone || user?.user_metadata?.phone;
  return {
    id: String(user?.id || user?._id || ""),
    email: user?.email || "",
    role,
    phone,
    city,
    created_at: user?.created_at || user?.createdAt,
    user_metadata: {
      ...(user?.user_metadata || {}),
      full_name: fullName,
      city,
      phone,
      role,
    },
  };
}
function getCookieValue(name) {
  if (typeof document === "undefined") return null;
  const entries = document.cookie ? document.cookie.split("; ") : [];
  for (const entry of entries) {
    const [cookieName, ...rest] = entry.split("=");
    if (cookieName === name) {
      return rest.join("=");
    }
  }
  return null;
}
function getStoredAccessToken() {
  return typeof window === "undefined"
    ? null
    : localStorage.getItem(ACCESS_TOKEN_KEY);
}
function getStoredRefreshToken() {
  return typeof window === "undefined"
    ? null
    : localStorage.getItem(REFRESH_TOKEN_KEY);
}
function setStoredAccessToken(accessToken) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}
function getStoredUser() {
  if (typeof window === "undefined") return null;
  const parsed = safeJsonParse(localStorage.getItem(USER_KEY));
  return parsed ? normalizeAuthUser(parsed) : null;
}
function setStoredSession(accessToken, refreshToken, user) {
  if (typeof window === "undefined") return;
  const normalizedUser = normalizeAuthUser(user);
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
  window.dispatchEvent(
    new CustomEvent(AUTH_EVENT, {
      detail: {
        event: "SIGNED_IN",
        session: {
          access_token: accessToken,
          refresh_token: refreshToken,
          user: normalizedUser,
        },
      },
    }),
  );
}
function clearStoredSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(
    new CustomEvent(AUTH_EVENT, {
      detail: {
        event: "SIGNED_OUT",
        session: null,
      },
    }),
  );
}
function mapBackendUser(user) {
  return normalizeAuthUser(user);
}
function mapBackendEvent(event) {
  const tiers = Array.isArray(event?.ticketTiers) ? event.ticketTiers : [];
  const firstTier = tiers.length > 0 ? tiers[0] : null;
  const generalTier =
    tiers.find(
      (tier) =>
        String(tier?.name || "")
          .trim()
          .toLowerCase() === "general",
    ) || firstTier;
  const vipTier =
    tiers.find(
      (tier) =>
        String(tier?.name || "")
          .trim()
          .toLowerCase() === "vip",
    ) || null;
  const status =
    event?.status === "closed" ? "ended" : event?.status || "draft";
  return {
    event_id: String(event?.event_id || event?._id || ""),
    title: event?.title || "",
    description: event?.description || "",
    venue_name: event?.venue_name || event?.venue || "",
    venue_address: event?.venue_address || event?.venue || "",
    city: event?.city || "",
    date_time: event?.date_time || event?.dateTime,
    capacity: event?.capacity || 0,
    remaining: event?.remaining || 0,
    status,
    event_image: resolveAssetUrl(event?.event_image || event?.eventImage || ""),
    entry_instructions:
      event?.entry_instructions || event?.entryInstructions || "",
    terms: event?.terms || "",
    ticket_price:
      event?.ticket_price ?? generalTier?.price ?? firstTier?.price ?? 0,
    vip_ticket_price:
      event?.vip_ticket_price ??
      vipTier?.price ??
      generalTier?.price ??
      firstTier?.price ??
      0,
    ticket_tiers: tiers.map((tier) => ({
      name: tier?.name || "",
      price: Number(tier?.price || 0),
      quantity: Number(tier?.quantity || 0),
      sold_count: Number(tier?.soldCount || 0),
      remaining: Math.max(
        0,
        Number(tier?.quantity || 0) - Number(tier?.soldCount || 0),
      ),
    })),
    created_at: event?.created_at || event?.createdAt,
    created_by:
      event?.created_by || event?.createdBy || event?.organizerId || "",
  };
}
function mapBackendBooking(booking) {
  return {
    booking_id: String(booking?.booking_id || booking?._id || ""),
    event_id: booking?.event_id || booking?.eventId,
    user_id: booking?.user_id || booking?.attendeeId,
    booking_code: booking?.booking_code || booking?.bookingCode,
    booking_status: booking?.booking_status || booking?.bookingStatus,
    payment_status: booking?.payment_status || "NOT_REQUIRED",
    tickets_count: booking?.tickets_count || booking?.ticketsCount || 0,
    total_amount: booking?.total_amount || booking?.amount || 0,
    booked_at: booking?.booked_at || booking?.createdAt,
    checked_in: booking?.checked_in || false,
    qr_nonce: booking?.qr_nonce || "",
    event: booking?.event ? mapBackendEvent(booking.event) : booking?.event,
  };
}
async function rawApiFetch(path, init) {
  const headers = new Headers(init?.headers || {});
  headers.set(
    "Content-Type",
    headers.get("Content-Type") || "application/json",
  );
  if (init?.auth) {
    const accessToken = getStoredAccessToken();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
  if (response.status === 401 && init?.auth && !init?.retrying) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return rawApiFetch(path, {
        ...init,
        retrying: true,
      });
    }
  }
  return response;
}
async function refreshAccessToken() {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return null;
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });
    if (!response.ok) {
      clearStoredSession();
      return null;
    }
    const payload = await response.json();
    const accessToken = payload?.accessToken;
    if (!accessToken) {
      clearStoredSession();
      return null;
    }
    setStoredAccessToken(accessToken);
    return accessToken;
  })();
  const token = await refreshInFlight;
  refreshInFlight = null;
  return token;
}
async function ensureValidSession() {
  const accessToken = getStoredAccessToken();
  if (!accessToken) {
    return null;
  }
  const response = await rawApiFetch("/auth/me", {
    method: "GET",
    auth: true,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.user) {
    clearStoredSession();
    return null;
  }
  const user = mapBackendUser(payload.user);
  const nextAccessToken = payload?.accessToken || getStoredAccessToken();
  const nextRefreshToken =
    payload?.refreshToken || getStoredRefreshToken() || undefined;
  if (!nextAccessToken) {
    clearStoredSession();
    return null;
  }
  setStoredSession(nextAccessToken, nextRefreshToken, user);
  return {
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
    user,
  };
}
class QueryBuilder {
  operation = "select";
  filters = [];
  orderBy = null;
  limitCount = null;
  countMode = null;
  headOnly = false;
  returnSingle = false;
  allowEmptySingle = false;
  payload = null;
  constructor(table) {
    this.table = table;
  }
  select(_columns = "*", options) {
    if (this.operation === "select") {
      this.operation = "select";
    }
    this.countMode = options?.count || null;
    this.headOnly = Boolean(options?.head);
    return this;
  }
  insert(payload) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }
  update(payload) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }
  delete() {
    this.operation = "delete";
    return this;
  }
  eq(field, value) {
    this.filters.push({
      type: "eq",
      field,
      value,
    });
    return this;
  }
  neq(field, value) {
    this.filters.push({
      type: "neq",
      field,
      value,
    });
    return this;
  }
  in(field, value) {
    this.filters.push({
      type: "in",
      field,
      value,
    });
    return this;
  }
  gt(field, value) {
    this.filters.push({
      type: "gt",
      field,
      value,
    });
    return this;
  }
  gte(field, value) {
    this.filters.push({
      type: "gte",
      field,
      value,
    });
    return this;
  }
  lt(field, value) {
    this.filters.push({
      type: "lt",
      field,
      value,
    });
    return this;
  }
  lte(field, value) {
    this.filters.push({
      type: "lte",
      field,
      value,
    });
    return this;
  }
  order(field, options) {
    this.orderBy = {
      field,
      ascending: options?.ascending !== false,
    };
    return this;
  }
  limit(count) {
    this.limitCount = count;
    return this;
  }
  single() {
    this.returnSingle = true;
    this.allowEmptySingle = false;
    return this;
  }
  maybeSingle() {
    this.returnSingle = true;
    this.allowEmptySingle = true;
    return this;
  }
  then(onfulfilled, onrejected) {
    return this.execute().then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return this.execute().catch(onrejected);
  }
  finally(onfinally) {
    return this.execute().finally(onfinally);
  }
  getEqValue(field) {
    return this.filters.find(
      (filter) => filter.type === "eq" && filter.field === field,
    )?.value;
  }
  applyFilters(rows) {
    let filtered = [...rows];
    const compare = (left, right) => {
      const leftDate = typeof left === "string" ? Date.parse(left) : NaN;
      const rightDate = typeof right === "string" ? Date.parse(right) : NaN;
      if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
        return leftDate - rightDate;
      }
      if (left === right) return 0;
      return left > right ? 1 : -1;
    };
    for (const filter of this.filters) {
      if (filter.type === "eq") {
        filtered = filtered.filter(
          (row) => row?.[filter.field] === filter.value,
        );
      }
      if (filter.type === "neq") {
        filtered = filtered.filter(
          (row) => row?.[filter.field] !== filter.value,
        );
      }
      if (filter.type === "in") {
        filtered = filtered.filter(
          (row) =>
            Array.isArray(filter.value) &&
            filter.value.includes(row?.[filter.field]),
        );
      }
      if (filter.type === "gt") {
        filtered = filtered.filter(
          (row) => compare(row?.[filter.field], filter.value) > 0,
        );
      }
      if (filter.type === "gte") {
        filtered = filtered.filter(
          (row) => compare(row?.[filter.field], filter.value) >= 0,
        );
      }
      if (filter.type === "lt") {
        filtered = filtered.filter(
          (row) => compare(row?.[filter.field], filter.value) < 0,
        );
      }
      if (filter.type === "lte") {
        filtered = filtered.filter(
          (row) => compare(row?.[filter.field], filter.value) <= 0,
        );
      }
    }
    if (this.orderBy) {
      const { field, ascending } = this.orderBy;
      filtered.sort((a, b) => {
        const av = a?.[field];
        const bv = b?.[field];
        if (av === bv) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av > bv) return ascending ? 1 : -1;
        return ascending ? -1 : 1;
      });
    }
    if (typeof this.limitCount === "number") {
      filtered = filtered.slice(0, this.limitCount);
    }
    return filtered;
  }
  makeResult(data, error, count) {
    const result = {
      data,
      error,
    };
    if (typeof count !== "undefined") {
      result.count = count;
    }
    return result;
  }
  async runProfiles() {
    if (this.operation === "select") {
      const authClient = createClient();
      const { data: sessionData } = await authClient.auth.getSession();
      const sessionUser = sessionData.session?.user || null;
      const idFilter = this.getEqValue("id");
      const roleFilter = this.getEqValue("role");
      let rows = [];
      if (idFilter && sessionUser && idFilter === sessionUser.id) {
        rows = [
          {
            id: sessionUser.id,
            full_name: sessionUser.user_metadata?.full_name || "",
            city: sessionUser.city || sessionUser.user_metadata?.city || "",
            phone: sessionUser.phone || sessionUser.user_metadata?.phone || "",
            email: sessionUser.email,
            role: sessionUser.role,
            created_at: sessionUser.created_at,
          },
        ];
      } else if (roleFilter || !idFilter) {
        const response = await rawApiFetch("/admin/users", {
          method: "GET",
          auth: true,
        });
        if (response.ok) {
          const payload = await response.json();
          rows = (payload.users || []).map((user) => ({
            id: String(user.id || user._id),
            email: user.email,
            phone: user.phone,
            full_name: user.full_name || user.fullName || "",
            city: user.city || "",
            role: mapRoleToFrontend(user.role),
            created_at: user.created_at || user.createdAt,
          }));
        }
      }
      const filtered = this.applyFilters(rows);
      if (this.headOnly) {
        return this.makeResult(null, null, filtered.length);
      }
      if (this.returnSingle) {
        if (filtered.length === 0) {
          return this.makeResult(
            this.allowEmptySingle ? null : null,
            this.allowEmptySingle
              ? null
              : {
                  message: "No rows found",
                },
          );
        }
        return this.makeResult(filtered[0], null);
      }
      return this.makeResult(
        filtered,
        null,
        this.countMode ? filtered.length : undefined,
      );
    }
    if (this.operation === "update") {
      const response = await rawApiFetch("/auth/complete-profile", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          phone: this.payload?.phone,
          city: this.payload?.city,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        return this.makeResult(null, {
          message:
            payload?.message || payload?.error || "Failed to update profile",
        });
      }
      const user = mapBackendUser(payload.user || {});
      return this.makeResult(
        {
          id: user.id,
          full_name: user.user_metadata.full_name,
          city: user.city,
          phone: user.phone,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
        },
        null,
      );
    }
    return this.makeResult([], null);
  }
  async runEvents() {
    if (this.operation === "select") {
      const id = this.getEqValue("event_id");
      if (id) {
        const response = await rawApiFetch(`/events/${id}`, {
          method: "GET",
        });
        const payload = await response.json();
        if (!response.ok) {
          return this.makeResult(this.returnSingle ? null : [], {
            message: payload?.message || payload?.error || "Event not found",
          });
        }
        const mapped = mapBackendEvent(payload.event || {});
        return this.makeResult(this.returnSingle ? mapped : [mapped], null);
      }
      const response = await rawApiFetch("/events/public", {
        method: "GET",
      });
      const payload = await response.json();
      if (!response.ok) {
        return this.makeResult([], {
          message:
            payload?.message || payload?.error || "Failed to fetch events",
        });
      }
      const rows = (payload.events || []).map((event) =>
        mapBackendEvent(event),
      );
      const filtered = this.applyFilters(rows);
      if (this.returnSingle) {
        if (filtered.length === 0) {
          return this.makeResult(
            this.allowEmptySingle ? null : null,
            this.allowEmptySingle
              ? null
              : {
                  message: "No rows found",
                },
          );
        }
        return this.makeResult(filtered[0], null);
      }
      return this.makeResult(
        filtered,
        null,
        this.countMode ? filtered.length : undefined,
      );
    }
    if (this.operation === "insert") {
      const body = Array.isArray(this.payload) ? this.payload[0] : this.payload;
      const capacity = Number(body?.capacity || 1);
      const ticketPrice = Number(body?.ticket_price || 0);
      const hasVipTier =
        body?.vip_ticket_price !== undefined &&
        body?.vip_ticket_price !== null &&
        String(body?.vip_ticket_price).trim() !== "";
      const vipTicketPrice = hasVipTier ? Number(body?.vip_ticket_price) : null;
      if (capacity < 1) {
        return this.makeResult(null, {
          message: "Capacity must be at least 1",
        });
      }
      const vipQuantity = hasVipTier
        ? Math.max(1, Math.floor(capacity * 0.2))
        : 0;
      const generalQuantity = capacity - vipQuantity;
      const ticketTiers = [
        {
          name: "General",
          price: ticketPrice,
          quantity: generalQuantity,
        },
        ...(hasVipTier && vipTicketPrice !== null
          ? [
              {
                name: "VIP",
                price: vipTicketPrice,
                quantity: vipQuantity,
              },
            ]
          : []),
      ];
      const response = await rawApiFetch("/events", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          title: body?.title,
          description: body?.description,
          venue: body?.venue_name || body?.venue_address || body?.venue,
          city: body?.city,
          dateTime: body?.date_time
            ? new Date(body.date_time).toISOString()
            : new Date().toISOString(),
          capacity,
          status: body?.status || "draft",
          eventImage: body?.event_image || null,
          entryInstructions: body?.entry_instructions || null,
          terms: body?.terms || null,
          ticketTiers,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        return this.makeResult(null, {
          message:
            payload?.message || payload?.error || "Failed to create event",
        });
      }
      return this.makeResult([mapBackendEvent(payload.event || {})], null);
    }
    if (this.operation === "update") {
      const id = this.getEqValue("event_id");
      if (!id) {
        return this.makeResult(null, {
          message: "Missing event_id filter for update",
        });
      }
      const hasTierPriceUpdate =
        this.payload?.ticket_price !== undefined ||
        this.payload?.vip_ticket_price !== undefined;
      const generalPrice = Number(this.payload?.ticket_price ?? 0);
      const hasVipTier =
        this.payload?.vip_ticket_price !== undefined &&
        this.payload?.vip_ticket_price !== null &&
        String(this.payload?.vip_ticket_price).trim() !== "";
      const vipPrice = hasVipTier
        ? Number(this.payload?.vip_ticket_price)
        : null;
      const response = await rawApiFetch(`/events/${id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({
          title: this.payload?.title,
          description: this.payload?.description,
          venue: this.payload?.venue_name || this.payload?.venue_address,
          city: this.payload?.city,
          status: this.payload?.status,
          dateTime: this.payload?.date_time,
          eventImage: this.payload?.event_image || null,
          entryInstructions: this.payload?.entry_instructions || null,
          terms: this.payload?.terms || null,
          ticketTiers: hasTierPriceUpdate
            ? [
                {
                  name: "General",
                  price: generalPrice,
                },
                ...(hasVipTier && vipPrice !== null
                  ? [
                      {
                        name: "VIP",
                        price: vipPrice,
                      },
                    ]
                  : []),
              ]
            : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        return this.makeResult(null, {
          message:
            payload?.message || payload?.error || "Failed to update event",
        });
      }
      return this.makeResult([mapBackendEvent(payload.event || {})], null);
    }
    if (this.operation === "delete") {
      const id = this.getEqValue("event_id");
      if (!id) {
        return this.makeResult(null, {
          message: "Missing event_id filter for delete",
        });
      }
      const response = await rawApiFetch(`/events/${id}`, {
        method: "DELETE",
        auth: true,
      });
      const payload = await response.json();
      if (!response.ok) {
        return this.makeResult(null, {
          message:
            payload?.message || payload?.error || "Failed to delete event",
        });
      }
      return this.makeResult([], null);
    }
    return this.makeResult([], null);
  }
  async runBookings() {
    if (this.operation !== "select") {
      return this.makeResult([], null);
    }
    const response = await rawApiFetch("/bookings", {
      method: "GET",
      auth: true,
    });
    const payload = await response.json();
    if (!response.ok) {
      return this.makeResult([], {
        message:
          payload?.message || payload?.error || "Failed to fetch bookings",
      });
    }
    const rows = (payload.bookings || []).map((booking) =>
      mapBackendBooking(booking),
    );
    const filtered = this.applyFilters(rows);
    if (this.headOnly) {
      return this.makeResult(null, null, filtered.length);
    }
    if (this.returnSingle) {
      if (filtered.length === 0) {
        return this.makeResult(
          this.allowEmptySingle ? null : null,
          this.allowEmptySingle
            ? null
            : {
                message: "No rows found",
              },
        );
      }
      return this.makeResult(filtered[0], null);
    }
    return this.makeResult(
      filtered,
      null,
      this.countMode ? filtered.length : undefined,
    );
  }
  async execute() {
    try {
      if (this.table === "profiles") return await this.runProfiles();
      if (this.table === "events") return await this.runEvents();
      if (this.table === "bookings") return await this.runBookings();
      if (this.table === "audit_logs") {
        if (this.operation === "insert")
          return this.makeResult(this.payload, null);
        return this.makeResult([], null);
      }
      if (this.table === "event-images") {
        if (this.operation === "select") return this.makeResult([], null);
        return this.makeResult(this.payload || [], null);
      }
      return this.makeResult([], null);
    } catch (error) {
      return this.makeResult(null, {
        message: error?.message || "Unexpected error",
      });
    }
  }
}
const auth = {
  async getSession() {
    const validatedSession = await ensureValidSession();
    if (!validatedSession) {
      return {
        data: {
          session: null,
        },
        error: null,
      };
    }
    const session = {
      access_token: validatedSession.accessToken,
      refresh_token: validatedSession.refreshToken,
      user: validatedSession.user,
    };
    return {
      data: {
        session,
      },
      error: null,
    };
  },
  async getUser() {
    const { data } = await this.getSession();
    return {
      data: {
        user: data.session?.user || null,
      },
      error: null,
    };
  },
  async signInWithPassword(credentials) {
    const response = await rawApiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    const payload = await response.json();
    if (!response.ok || !payload?.accessToken || !payload?.user) {
      return {
        data: {
          user: null,
          session: null,
        },
        error: {
          message: payload?.message || payload?.error || "Login failed",
          code: payload?.code,
        },
      };
    }
    const user = mapBackendUser(payload.user);
    const session = {
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken,
      user,
    };
    setStoredSession(session.access_token, session.refresh_token, user);
    return {
      data: {
        user,
        session,
      },
      error: null,
    };
  },
  async signUp(payload) {
    const body = {
      email: payload.email,
      password: payload.password,
      ...(payload.options?.data || {}),
      role: payload.options?.data?.role
        ? mapRoleToBackend(payload.options.data.role)
        : undefined,
    };
    const response = await rawApiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok || !json?.accessToken || !json?.user) {
      return {
        data: {
          user: null,
          session: null,
        },
        error: {
          message: json?.message || json?.error || "Sign up failed",
        },
      };
    }
    const user = mapBackendUser(json.user);
    const session = {
      access_token: json.accessToken,
      refresh_token: json.refreshToken,
      user,
    };
    setStoredSession(session.access_token, session.refresh_token, user);
    return {
      data: {
        user,
        session,
      },
      error: null,
    };
  },
  async signOut() {
    try {
      await rawApiFetch("/auth/signout", {
        method: "POST",
        auth: true,
      });
    } catch {
      // ignore network failures during signout compatibility flow
    }
    clearStoredSession();
    return {
      error: null,
    };
  },
  async signInWithOtp(payload) {
    const type =
      payload.options?.type ||
      (payload.options?.shouldCreateUser === false ? "recovery" : "signup");
    const response = await rawApiFetch("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({
        email: payload.email,
        type,
        options: payload.options,
      }),
    });
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      return {
        data: null,
        error: {
          message: json?.message || json?.error || "Failed to send OTP",
        },
      };
    }
    return {
      data: {
        sent: true,
      },
      error: null,
    };
  },
  async verifyOtp(payload) {
    const response = await rawApiFetch("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({
        email: payload.email,
        otp: payload.token,
        type: payload.type,
      }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        data: {
          session: null,
        },
        error: {
          message: json?.message || json?.error || "OTP verification failed",
        },
      };
    }
    const user = json?.user ? mapBackendUser(json.user) : null;
    if (!json?.accessToken || !user) {
      return {
        data: {
          session: null,
        },
        error: {
          message: "OTP verification failed",
        },
      };
    }
    const session = {
      access_token: json.accessToken,
      refresh_token: json.refreshToken,
      user,
    };
    setStoredSession(session.access_token, session.refresh_token, session.user);
    return {
      data: {
        session,
      },
      error: null,
    };
  },
  async updateUser(payload) {
    const response = await rawApiFetch("/auth/reset-password", {
      method: "POST",
      auth: true,
      body: JSON.stringify({
        password: payload.password,
      }),
    });
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      return {
        data: null,
        error: {
          message: json?.message || json?.error || "Failed to update user",
        },
      };
    }
    return {
      data: {
        user: (await this.getUser()).data.user,
      },
      error: null,
    };
  },
  async signInWithOAuth(payload) {
    if (typeof window === "undefined") {
      return {
        data: null,
        error: {
          message: "OAuth can only be started in the browser.",
        },
      };
    }
    const provider = payload?.provider;
    if (provider !== "google") {
      return {
        data: null,
        error: {
          message: `Unsupported OAuth provider: ${provider || "unknown"}`,
        },
      };
    }
    const pendingSignupRaw = getCookieValue("pending_google_signup");
    const movieTeamCookie = getCookieValue("movie_team_login");
    const pendingSignup = safeJsonParse(
      pendingSignupRaw ? decodeURIComponent(pendingSignupRaw) : null,
    );
    const redirectTo =
      typeof payload?.options?.redirectTo === "string"
        ? payload.options.redirectTo
        : "";
    const movieTeamFromRedirect = redirectTo.includes("movie_team=true");
    const isMovieTeamFlow =
      movieTeamCookie === "true" ||
      movieTeamFromRedirect ||
      pendingSignup?.role === "organizer" ||
      pendingSignup?.role === "movie_team";
    const intent = pendingSignup ? "signup" : "signin";
    const params = new URLSearchParams();
    params.set("intent", intent);
    params.set(
      "role",
      isMovieTeamFlow ? "organizer" : pendingSignup?.role || "user",
    );
    params.set("movie_team", isMovieTeamFlow ? "true" : "false");
    if (pendingSignup?.city) params.set("city", pendingSignup.city);
    if (pendingSignup?.phone) params.set("phone", pendingSignup.phone);
    window.location.assign(`${API_BASE}/auth/google?${params.toString()}`);
    return {
      data: null,
      error: null,
    };
  },
  onAuthStateChange(callback) {
    const listener = (event) => {
      const custom = event;
      callback(
        custom.detail?.event || "SIGNED_IN",
        custom.detail?.session || null,
      );
    };
    window.addEventListener(AUTH_EVENT, listener);
    const syncListener = () => {
      const user = getStoredUser();
      callback(
        user ? "SIGNED_IN" : "SIGNED_OUT",
        user
          ? {
              user,
            }
          : null,
      );
    };
    window.addEventListener("storage", syncListener);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            window.removeEventListener(AUTH_EVENT, listener);
            window.removeEventListener("storage", syncListener);
          },
        },
      },
    };
  },
};
const storage = {
  from(_bucket) {
    return {
      async upload(path, file, _options) {
        try {
          const session = await ensureValidSession();
          if (!session) {
            return {
              data: null,
              error: {
                message:
                  "Your session has expired. Please sign in again and retry the upload.",
              },
            };
          }
          const buffer = await file.arrayBuffer();
          const base64 = btoa(
            Array.from(new Uint8Array(buffer), (byte) =>
              String.fromCharCode(byte),
            ).join(""),
          );
          const response = await rawApiFetch("/uploads/images", {
            method: "POST",
            auth: true,
            body: JSON.stringify({
              path,
              fileName: file.name,
              contentType: file.type,
              data: base64,
            }),
          });
          const payload = await response.json();
          if (!response.ok) {
            return {
              data: null,
              error: {
                message:
                  payload?.message ||
                  payload?.error ||
                  "Failed to upload image",
              },
            };
          }
          return {
            data: {
              path: payload?.path || path,
              publicUrl: resolveAssetUrl(
                payload?.publicUrl || payload?.path || path,
              ),
            },
            error: null,
          };
        } catch (error) {
          return {
            data: null,
            error: {
              message: error?.message || "Failed to upload image",
            },
          };
        }
      },
      async remove(paths) {
        try {
          const session = await ensureValidSession();
          if (!session) {
            return {
              data: null,
              error: {
                message:
                  "Your session has expired. Please sign in again and retry the delete.",
              },
            };
          }
          const normalizedPaths = paths
            .map((entry) => extractUploadPath(entry))
            .filter(Boolean);
          if (normalizedPaths.length === 0) {
            return {
              data: {
                deletedPaths: [],
              },
              error: null,
            };
          }
          const response = await rawApiFetch("/uploads/images", {
            method: "DELETE",
            auth: true,
            body: JSON.stringify({
              paths: normalizedPaths,
            }),
          });
          const payload = await response.json();
          if (!response.ok) {
            return {
              data: null,
              error: {
                message:
                  payload?.message ||
                  payload?.error ||
                  "Failed to delete image",
              },
            };
          }
          return {
            data: payload,
            error: null,
          };
        } catch (error) {
          return {
            data: null,
            error: {
              message: error?.message || "Failed to delete image",
            },
          };
        }
      },
      async list(_path) {
        return {
          data: [],
          error: null,
        };
      },
      getPublicUrl(path) {
        return {
          data: {
            publicUrl: resolveAssetUrl(path || ""),
          },
        };
      },
    };
  },
};
function createRealtimeChannel() {
  return {
    on() {
      return this;
    },
    subscribe() {
      return this;
    },
    unsubscribe() {
      return;
    },
  };
}
export const createClient = () => {
  return {
    auth,
    storage,
    from(table) {
      return new QueryBuilder(table);
    },
    channel(_name) {
      return createRealtimeChannel();
    },
  };
};
