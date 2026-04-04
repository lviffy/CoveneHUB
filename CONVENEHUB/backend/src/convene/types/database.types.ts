// Database types based on the PRD schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      events: {
        Row: Event
        Insert: Omit<Event, 'event_id' | 'created_at' | 'remaining'>
        Update: Partial<Omit<Event, 'event_id' | 'created_at' | 'created_by'>>
      }
      bookings: {
        Row: Booking
        Insert: Omit<Booking, 'booking_id' | 'created_at'>
        Update: Partial<Omit<Booking, 'booking_id' | 'created_at'>>
      }
      checkins: {
        Row: CheckIn
        Insert: Omit<CheckIn, 'checkin_id' | 'scanned_at'>
        Update: Partial<Omit<CheckIn, 'checkin_id' | 'scanned_at'>>
      }
      movie_team_assignments: {
        Row: MovieTeamAssignment
        Insert: Omit<MovieTeamAssignment, 'assignment_id' | 'assigned_at'>
        Update: Partial<Omit<MovieTeamAssignment, 'assignment_id' | 'assigned_at'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'log_id' | 'created_at'>
        Update: Partial<Omit<AuditLog, 'log_id' | 'created_at'>>
      }
      event_financials: {
        Row: EventFinancial
        Insert: Omit<EventFinancial, 'financial_id' | 'locked_at'>
        Update: Partial<Omit<EventFinancial, 'financial_id'>>
      }
      coupons: {
        Row: Coupon
        Insert: Omit<Coupon, 'id' | 'created_at' | 'updated_at' | 'current_usage_count'>
        Update: Partial<Omit<Coupon, 'id' | 'created_at' | 'created_by'>>
      }
      coupon_usage: {
        Row: CouponUsage
        Insert: Omit<CouponUsage, 'id' | 'used_at'>
        Update: never
      }
    }
    Functions: {
      validate_and_calculate_coupon: {
        Args: {
          p_coupon_code: string
          p_event_id: string
          p_user_id: string
          p_tickets_count: number
          p_original_amount: number
        }
        Returns: CouponValidationResult
      }
      add_tickets_to_booking: {
        Args: {
          p_booking_id: string
          p_user_id: string
          p_additional_tickets: number
        }
        Returns: Array<{
          booking_id: string
          new_tickets_count: number
          new_total_amount: number
          new_tickets_created: number
          booking_code: string
        }>
      }
    }
  }
}

export interface Profile {
  id: string // uuid, FK to auth.users.id
  full_name: string
  city: string
  phone?: string
  email?: string
  role: 'user' | 'movie_team' | 'eon_team'
  created_at: string
}

export interface Event {
  event_id: string // uuid
  title: string
  description: string
  venue_name: string
  venue_address: string
  city: string
  latitude?: number
  longitude?: number
  date_time: string // timestamptz
  capacity: number
  remaining: number
  ticket_price: number // decimal(10,2) - Price in INR, 0 for free events
  convene_commission_percentage: number // decimal(5,2) - Commission rate (0-100), default 10%
  event_image?: string // Path to storage
  entry_instructions?: string
  terms?: string // Event-specific terms and conditions
  notes?: string // On-ground notes from movie team
  status: 'draft' | 'published' | 'checkin_open' | 'in_progress' | 'ended'
  created_by: string // uuid, FK to profiles.id
  created_at: string
}

export interface Booking {
  booking_id: string // uuid
  event_id: string // FK to events.event_id
  user_id: string // FK to profiles.id
  booking_code: string
  qr_nonce: string // uuid
  tickets_count: number // Number of tickets in this booking
  coupon_id?: number | null // FK to coupons.id (optional, only ONE coupon per booking)
  original_amount: number // decimal(10,2) - Original price before discount
  discount_amount: number // decimal(10,2) - Amount discounted (0 if no coupon)
  total_amount: number // decimal(10,2) - Final amount (original_amount - discount_amount)
  status: 'confirmed'
  created_at: string
}

export interface CheckIn {
  checkin_id: string // uuid
  event_id: string // FK to events.event_id
  booking_id: string // FK to bookings.booking_id
  scanned_by: string // FK to profiles.id
  scanned_at: string
  method: 'qr' | 'manual'
  notes?: string
}

export interface MovieTeamAssignment {
  assignment_id: string // uuid
  event_id: string // FK to events.event_id
  user_id: string // FK to profiles.id
  assigned_at: string
}

export interface AuditLog {
  log_id: number // bigserial
  actor_id: string // FK to profiles.id
  actor_role: 'eon_team' | 'movie_team' | 'user'
  action: string // e.g., CREATE_EVENT, CHECKIN, EXPORT_CSV
  entity: string // events, bookings, checkins
  entity_id: string // uuid
  created_at: string
}

// Phase 2: Event Financials
export interface EventFinancial {
  financial_id: string // uuid
  event_id: string // FK to events.event_id
  tickets_sold: number
  gross_amount: number
  gateway_fees: number
  commission: number
  net_payout: number
  settlement_status: 'to_pay' | 'paid'
  locked_at: string
}

// Phase 2: Coupons System
export interface Coupon {
  id: number // bigserial
  code: string // Unique coupon code (e.g., WELCOME50)
  discount_type: 'percentage' | 'fixed' | 'free'
  discount_value: number // 0-100 for percentage, any amount for fixed, 100 for free
  event_id: string // UUID - REQUIRED: Coupons are always event-specific
  usage_limit?: number | null // Total uses allowed (NULL = unlimited)
  per_user_limit?: number | null // Max uses per user (NULL = unlimited)
  min_tickets: number // Minimum tickets required (default 1)
  valid_from?: string | null // timestamptz
  valid_until?: string | null // timestamptz
  is_active: boolean
  current_usage_count: number
  created_by?: string | null // FK to auth.users.id
  created_at: string
  updated_at: string
}

export interface CouponUsage {
  id: number // bigserial
  coupon_id: number // FK to coupons.id
  booking_id: string // FK to bookings.booking_id
  user_id: string // FK to auth.users.id
  discount_amount: number // Snapshot of discount applied
  original_amount: number // Snapshot of original amount
  used_at: string // timestamptz
}

export interface CouponValidationResult {
  valid: boolean
  error?: string
  coupon_id?: number
  coupon_code?: string
  discount_type?: 'percentage' | 'fixed' | 'free'
  discount_value?: number
  original_amount?: number
  discount_amount?: number
  final_amount?: number
}

