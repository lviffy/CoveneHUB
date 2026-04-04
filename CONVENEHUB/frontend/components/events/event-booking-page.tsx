'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ArrowLeft,
  Shield,
  Film,
  CheckCircle2,
  Info,
  Ticket,
  AlertCircle,
  Plus,
  Minus,
  X
} from 'lucide-react'
import { motion } from 'framer-motion'
import { EventsHeader } from '@/components/events-header'
import { cn } from '@/lib/utils'
import type { Event } from '@/types/database.types'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/components/ui/spinner'
import RazorpayCheckout from '@/components/payments/RazorpayCheckout'

const MAX_TICKETS_PER_USER = 10
import Footer from '@/components/footer'
import dynamic from 'next/dynamic'

// Dynamically import VenueMap to avoid SSR issues with Leaflet
const VenueMap = dynamic(() => import('@/components/events/venue-map').then(mod => ({ default: mod.VenueMap })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="text-center text-gray-500">
        <p className="text-sm">Loading map...</p>
      </div>
    </div>
  )
})

interface EventBookingPageProps {
  eventId: string
}

interface EventData extends Event {
  actualRemaining: number
  bookingCount: number
}

interface UserProfile {
  id: string
  full_name: string
  email?: string
  phone?: string
  city: string
  role: string
}

export default function EventBookingPage({ eventId }: EventBookingPageProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Core state
  const [event, setEvent] = useState<EventData | null>(null)
  const [existingBooking, setExistingBooking] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // Loading states
  const [isInitializing, setIsInitializing] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [showPaymentCancelledModal, setShowPaymentCancelledModal] = useState(false)
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [qrCodeData, setQrCodeData] = useState('')
  const [bookingCode, setBookingCode] = useState('')
  const [ticketsCount, setTicketsCount] = useState(1)

  // Tickets state
  const [tickets, setTickets] = useState<any[]>([])
  const [selectedTicketForQR, setSelectedTicketForQR] = useState<any>(null)
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [loadingQrTicketId, setLoadingQrTicketId] = useState<string | null>(null)

  // Coupon state
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [couponError, setCouponError] = useState('')
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false)
  const [discount, setDiscount] = useState(0)

  // Payment error state
  const [paymentError, setPaymentError] = useState('')

  // T&C state
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPaymentConfirmModal, setShowPaymentConfirmModal] = useState(false)
  const [proceedToPayment, setProceedToPayment] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Fetch event data with real-time booking count using public API
  const fetchEventData = useCallback(async () => {
    try {
      // Use public API to get accurate booking count (bypasses RLS)
      // Add cache busting parameter to ensure fresh data
      const response = await fetch(`/api/v1/events/public?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        setEvent(null)
        return
      }

      const { events: allEvents, timestamp } = await response.json()

      // Find the specific event
      const eventData = allEvents.find((e: any) => e.event_id === eventId)

      if (!eventData) {
        setEvent(null)
        return
      }

      // The API already calculated the remaining count
      const enhancedEvent: EventData = {
        ...eventData,
        actualRemaining: eventData.remaining,
        bookingCount: eventData.booked || 0
      }

      setEvent(enhancedEvent)
    } catch (error) {
      setEvent(null)
    }
  }, [eventId])

  // Fetch tickets for the booking
  const fetchTickets = useCallback(async (bookingId: string) => {
    if (!bookingId) return

    try {
      setLoadingTickets(true)
      const response = await fetch(`/api/bookings/${bookingId}/tickets`)

      if (!response.ok) {
        throw new Error('Failed to fetch tickets')
      }

      const data = await response.json()
      setTickets(data.tickets || [])
    } catch (error) {
      setTickets([])
    } finally {
      setLoadingTickets(false)
    }
  }, [])

  // Check user's existing booking
  const checkUserBooking = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          booking_id,
          booking_code,
          booking_status,
          payment_status,
          tickets_count,
          total_amount,
          booked_at,
          checked_in,
          qr_nonce
        `)
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .neq('booking_status', 'cancelled')
        .in('payment_status', ['NOT_REQUIRED', 'SUCCESSFUL', 'PAID']) // Only show confirmed bookings
        .maybeSingle()

      if (error) {
      }

      // Only set as existing booking if payment was successful or not required
      const validBooking = data &&
        ((data as any).payment_status === 'NOT_REQUIRED' ||
          (data as any).payment_status === 'SUCCESSFUL' ||
          (data as any).payment_status === 'PAID')

      setExistingBooking(validBooking ? data : null)

      // Fetch tickets if valid booking exists
      if (validBooking && data && (data as any).booking_id) {
        await fetchTickets((data as any).booking_id)
      }
    } catch (error) {
      setExistingBooking(null)
    }
  }, [eventId, supabase, fetchTickets])

  // Initialize all data
  const initializePageData = useCallback(async () => {
    try {
      setIsInitializing(true)

      // Get authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      if (authError) {
        // Handle error silently or with proper error handling
      }

      setUser(authUser)

      // Fetch user profile if authenticated
      if (authUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profileData) {
          setProfile(profileData as UserProfile)
        }

        // Check existing booking
        await checkUserBooking(authUser.id)
      }

      // Fetch event data
      await fetchEventData()

    } catch (error) {
      // Handle error silently or with proper error handling
    } finally {
      setIsInitializing(false)
    }
  }, [supabase, fetchEventData, checkUserBooking])

  // Initialize on mount
  useEffect(() => {
    initializePageData()
  }, [initializePageData])

  // Set up real-time subscription for booking changes
  useEffect(() => {
    const channel = supabase
      .channel(`event-bookings-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          // Refresh event data when any booking changes
          fetchEventData()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [eventId, supabase, fetchEventData])

  // Handle QR code display for individual ticket
  const handleShowTicketQR = async (ticket: any) => {
    setLoadingQrTicketId(ticket.ticket_id)
    try {
      const response = await fetch(`/api/tickets/${ticket.ticket_id}/qr`)

      if (!response.ok) {
        throw new Error('Failed to generate QR code')
      }

      const data = await response.json()
      setSelectedTicketForQR(ticket)
      setQrCodeData(data.qr_code)
      setShowQRModal(true)
    } catch (error) {
      alert('Failed to generate QR code. Please try again.')
    } finally {
      setLoadingQrTicketId(null)
    }
  }

  // Handle QR code display (legacy - for backward compatibility)
  const handleShowQR = async () => {
    if (!existingBooking) return

    // If we have tickets, show the first ticket's QR
    if (tickets.length > 0) {
      handleShowTicketQR(tickets[0])
      return
    }

    try {
      const response = await fetch(`/api/bookings/${existingBooking.booking_id}/qr`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate QR code')
      }

      const data = await response.json()
      setQrCodeData(data.qr_code)
      setShowQRModal(true)
    } catch (error) {
      alert('Failed to generate QR code. Please try again.')
    }
  }

  // Handle booking submission
  const handleBooking = async () => {
    if (isSubmitting || !user || !event) return

    // Check if user needs to login
    if (!user) {
      router.push(`/login?redirect=/events/${eventId}`)
      return
    }

    // Check if profile is complete
    if (!profile?.full_name || !profile?.city) {
      router.push(`/complete-profile?redirect=/events/${eventId}`)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: event.event_id,
          tickets_count: ticketsCount,
          coupon_code: appliedCoupon?.code || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle "already booked" error specially
        if (response.status === 409 && data.existing_booking) {
          // User already has a booking - refresh to show it
          await fetchEventData()
          if (user) {
            await checkUserBooking(user.id)
          }

          if (data.existing_booking.can_add_more) {
            alert(`You already have a booking for this event with ${data.existing_booking.current_tickets} ticket(s). You can add up to ${data.existing_booking.max_additional_tickets} more tickets using the "Add More Tickets" section.`)
          } else {
            alert(`You already have a booking for this event with the maximum of 10 tickets.`)
          }
          return
        }

        throw new Error(data.error || 'Failed to create booking')
      }

      // Success
      setBookingCode(data.booking.booking_code)
      setShowSuccessModal(true)

      // Refresh data immediately and wait for completion
      await fetchEventData()
      if (user) {
        await checkUserBooking(user.id)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Booking failed. Please try again.'
      alert(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle coupon validation
  const validateCoupon = async () => {
    if (!couponCode.trim() || !event) return

    setIsValidatingCoupon(true)
    setCouponError('')

    try {
      const originalAmount = event.ticket_price * ticketsCount

      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: couponCode.toUpperCase(),
          eventId: event.event_id,
          ticketsCount,
          originalAmount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setCouponError(data.error || 'Invalid coupon code')
        setAppliedCoupon(null)
        setDiscount(0)
        return
      }

      // Check if coupon validation was successful
      if (!data.valid) {
        setCouponError(data.error || 'Invalid coupon code')
        setAppliedCoupon(null)
        setDiscount(0)
        return
      }

      // Database function returns data directly, not nested in 'coupon'
      setAppliedCoupon(data)
      setDiscount(data.discount_amount || 0)
      setCouponError('')
    } catch (error) {
      setCouponError('Failed to validate coupon')
      setAppliedCoupon(null)
      setDiscount(0)
    } finally {
      setIsValidatingCoupon(false)
    }
  }

  // Remove applied coupon
  const removeCoupon = () => {
    setCouponCode('')
    setAppliedCoupon(null)
    setDiscount(0)
    setCouponError('')
  }

  // Calculate final amount
  const originalAmount = event ? event.ticket_price * ticketsCount : 0
  const finalAmount = Math.max(0, originalAmount - discount)

  // Loading state
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner className="w-16 h-16 text-[#195ADC] mx-auto mb-4" />
          <p className="text-gray-600">Loading event details...</p>
        </div>
      </div>
    )
  }

  // Event not found
  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Event Not Found</h1>
          <p className="text-gray-600 mb-6">The event you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.push('/events')} className="rounded-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    )
  }

  // Event not available
  if (!['published', 'checkin_open', 'draft'].includes(event.status)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Event Not Available</h1>
          <p className="text-gray-600 mb-6">
            {event.status === 'in_progress'
              ? 'This event is currently in progress and not accepting new bookings.'
              : 'This event has ended and is no longer available for booking.'}
          </p>
          <Button onClick={() => router.push('/events')} className="rounded-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    )
  }

  // Calculate booking status
  const isSoldOut = event.actualRemaining === 0
  const isBookingOpen = event.status === 'published' || event.status === 'checkin_open'
  const isEventVisible = ['published', 'checkin_open'].includes(event.status)
  const canBook = isBookingOpen && !isSoldOut && isEventVisible && !existingBooking
  const booked = event.bookingCount
  const fillPercentage = (booked / event.capacity) * 100
  const eventDate = new Date(event.date_time)

  return (
    <div className="min-h-screen bg-gray-50">
      <EventsHeader />

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">🎉 Booking Confirmed!</h2>
              <p className="text-gray-600 mb-6">Your ticket has been successfully booked</p>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-600 mb-1">Booking Code</p>
                <p className="text-2xl font-bold text-gray-900 font-mono tracking-wider">
                  {bookingCode}
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => {
                    setShowSuccessModal(false)
                    router.push('/bookings')
                  }}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white h-12 rounded-xl"
                >
                  View My Bookings
                </Button>
                <Button
                  onClick={() => setShowSuccessModal(false)}
                  variant="outline"
                  className="w-full h-12 rounded-xl"
                >
                  Stay on This Page
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Hero Section — full-width blurred backdrop */}
      <section className="relative pt-20 pb-0 bg-gray-900 overflow-hidden">
        {/* Blurred backdrop */}
        {event.event_image && (
          <div className="absolute inset-0">
            <Image
              src={event.event_image}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover scale-110 blur-2xl opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/80 to-gray-900" />
          </div>
        )}
        {!event.event_image && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        )}

        <div className="relative mx-auto max-w-7xl px-4 md:px-6">
          {/* Back button */}
          <div className="pt-4 pb-6">
            <Button
              variant="ghost"
              onClick={() => router.push('/events')}
              className="text-white/80 hover:text-white hover:bg-white/10 pl-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Button>
          </div>

          {/* Content: info left + poster right */}
          <div className="flex flex-col md:flex-row gap-8 pb-10">
            {/* Event Meta */}
            <div className="flex-1 flex flex-col justify-end pb-2">
              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <Badge className={cn(
                  "text-xs font-semibold px-3 py-1",
                  event.status === 'published' ? "bg-green-500 hover:bg-green-600" :
                    event.status === 'checkin_open' ? "bg-blue-500 hover:bg-blue-600" :
                      event.status === 'in_progress' ? "bg-orange-500 hover:bg-orange-600" :
                        "bg-gray-500 hover:bg-gray-600"
                )}>
                  {event.status.replace('_', ' ').toUpperCase()}
                </Badge>
                {isSoldOut && (
                  <Badge variant="destructive" className="text-xs font-semibold px-3 py-1">
                    SOLD OUT
                  </Badge>
                )}
                {!isSoldOut && event.actualRemaining <= 10 && (
                  <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1">
                    ONLY {event.actualRemaining} LEFT
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-5xl font-bold text-white mb-5 leading-tight">
                {event.title}
              </h1>

              {/* Info rows — BookMyShow style */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-200">
                  <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-base">
                    {eventDate.toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-gray-200">
                  <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-base">
                    {eventDate.toLocaleTimeString('en-IN', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-gray-200">
                  <Users className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-base">
                    {event.actualRemaining} of {event.capacity} slots available
                  </span>
                </div>
                <div className="flex items-center gap-3 text-gray-200">
                  <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-base">{event.venue_name}, {event.city}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-200">
                  <Film className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-base">Event Access Pass</span>
                </div>
              </div>

              {/* Capacity progress bar */}
              <div className="mt-6 max-w-md">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                  <span>Booking Progress</span>
                  <span className="font-medium">{Math.round(fillPercentage)}% filled</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${fillPercentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      fillPercentage >= 90 ? "bg-red-500" :
                        fillPercentage >= 70 ? "bg-orange-500" :
                          "bg-green-500"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Poster — landscape, right side */}
            <div className="flex-shrink-0 mx-auto md:mx-0 w-full md:w-[600px] order-first md:order-last">
              <div className="rounded-2xl overflow-hidden shadow-2xl bg-gray-800">
                {event.event_image ? (
                  <Image
                    src={event.event_image}
                    alt={event.title}
                    width={600}
                    height={340}
                    priority
                    className="w-full aspect-video object-cover"
                  />
                ) : (
                  <div className="w-full aspect-video flex items-center justify-center bg-gray-700">
                    <Film className="w-16 h-16 text-gray-500" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid lg:grid-cols-3 gap-8">

            {/* Left Column - Event Details */}
            <div className="lg:col-span-2 space-y-6">

              {/* About the Event */}
              {event.description && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100"
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-4">About The Event</h2>
                  <p className="text-gray-700 leading-relaxed">{event.description}</p>
                </motion.div>
              )}

              {/* Venue Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  Venue Details
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Location</p>
                    <p className="text-base font-semibold text-gray-900">{event.venue_name}</p>
                    <p className="text-sm text-gray-500">{event.venue_address}</p>
                  </div>
                  {event.latitude && event.longitude && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Coordinates</p>
                      <p className="text-sm text-gray-500 font-mono">
                        {event.latitude}, {event.longitude}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Entry Instructions */}
              {event.entry_instructions && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="bg-blue-50 rounded-2xl p-6 md:p-8 border border-blue-100"
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-600" />
                    Important Information
                  </h2>
                  <div className="prose prose-sm text-gray-700">
                    <p className="whitespace-pre-wrap">{event.entry_instructions}</p>
                  </div>
                </motion.div>
              )}

              {/* What's Included */}
             {/* <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-gray-500" />
                  What's Included
                </h2>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Priority entry with QR-based verification</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">QR code ticket with instant email confirmation</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Refreshments during the event</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Certificate of participation</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Photography opportunities in designated areas</span>
                  </li>
                </ul>
              </motion.div>*/}

              {/* Venue Location Map */}
              {event.latitude && event.longitude && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100"
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-500" />
                    Venue Location
                  </h2>
                  <VenueMap
                    latitude={event.latitude}
                    longitude={event.longitude}
                    venueName={event.venue_name}
                    venueAddress={event.venue_address}
                  />
                </motion.div>
              )}
            </div>

            {/* Right Column - Booking Widget */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="sticky top-24 bg-white rounded-2xl shadow-lg border border-gray-100 z-10 overflow-hidden"
              >
                {/* Event meta summary card — BMS style */}
                <div className="p-5 border-b border-gray-100 space-y-3">
                  <div className="flex items-center gap-3 text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm">
                      {eventDate.toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm">
                      {eventDate.toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm">{event.venue_name}: {event.city}</span>
                  </div>
                </div>

                {/* Urgency notice */}
                {event.actualRemaining > 0 && event.actualRemaining <= 20 && (
                  <div className="px-5 py-3 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
                    <div className="relative flex-shrink-0">
                      <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
                      <div className="absolute inset-0 w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping opacity-75" />
                    </div>
                    <p className="text-xs font-semibold text-orange-800">
                      Only {event.actualRemaining} {event.actualRemaining === 1 ? 'spot' : 'spots'} left!{' '}
                      <span className="font-normal text-orange-700">Book now before they're gone</span>
                    </p>
                  </div>
                )}

                <div className="p-5 md:p-6">
                {existingBooking ? (
                  // User already has booking
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Booking</h2>
                      <p className="text-gray-600">You have already booked this event</p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Booking Code:</span>
                        <span className="text-base font-bold text-gray-900 font-mono">
                          {existingBooking.booking_code}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                          {(existingBooking as any).booking_status || 'confirmed'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Tickets:</span>
                        <span className="text-base font-semibold text-gray-900">
                          {existingBooking.tickets_count}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Booked On:</span>
                        <span className="text-sm text-gray-900">
                          {new Date(existingBooking.booked_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      {existingBooking.checked_in && (
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm font-medium">Checked In</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tickets Section - Show all individual tickets */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">Your Tickets</h3>
                        <span className="text-xs text-gray-500">
                          {tickets.filter(t => t.checked_in).length}/{tickets.length} checked in
                        </span>
                      </div>

                      {loadingTickets ? (
                        <div className="text-center py-4">
                          <Spinner className="mx-auto" />
                          <p className="text-sm text-gray-500 mt-2">Loading tickets...</p>
                        </div>
                      ) : tickets.length > 0 ? (
                        <div className="space-y-2">
                          {tickets.map((ticket: any) => (
                            <div
                              key={ticket.ticket_id}
                              className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    Ticket {ticket.ticket_number}
                                  </div>
                                  <div className="text-xs text-gray-500 font-mono">
                                    {ticket.ticket_code}
                                  </div>
                                </div>
                                {ticket.checked_in && (
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    ✓ Checked In
                                  </Badge>
                                )}
                              </div>
                              <Button
                                onClick={() => handleShowTicketQR(ticket)}
                                disabled={ticket.checked_in || loadingQrTicketId === ticket.ticket_id}
                                className="w-full h-9 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
                              >
                                {loadingQrTicketId === ticket.ticket_id ? (
                                  <>
                                    <Spinner className="w-4 h-4 mr-2" />
                                    Loading...
                                  </>
                                ) : (
                                  <>
                                    <Ticket className="w-4 h-4 mr-2" />
                                    {ticket.checked_in ? 'Already Used' : 'Show QR Code'}
                                  </>
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">No tickets found</p>
                        </div>
                      )}
                    </div>

                    {/* Add More Tickets Section */}
                    {existingBooking &&
                      (existingBooking.booking_status === 'confirmed' || existingBooking.booking_status === 'checked_in') &&
                      (existingBooking.payment_status === 'SUCCESSFUL' || existingBooking.payment_status === 'NOT_REQUIRED') &&
                      existingBooking.tickets_count < MAX_TICKETS_PER_USER &&
                      isBookingOpen && !isSoldOut && (
                        <div className="pt-4 border-t border-gray-200 space-y-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-2 mb-3">
                              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <h4 className="text-sm font-semibold text-blue-900 mb-1">Add More Tickets</h4>
                                <p className="text-xs text-blue-700">
                                  You can add up to {Math.min(MAX_TICKETS_PER_USER - existingBooking.tickets_count, event.actualRemaining)} more ticket{Math.min(MAX_TICKETS_PER_USER - existingBooking.tickets_count, event.actualRemaining) !== 1 ? 's' : ''} to this booking (max {MAX_TICKETS_PER_USER} per user)
                                </p>
                              </div>
                            </div>

                            {/* Ticket Counter for Additional Tickets */}
                            <div className="flex items-center justify-between bg-white rounded-lg p-3 mb-3">
                              <span className="text-sm font-medium text-gray-700">Additional Tickets:</span>
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTicketsCount(Math.max(1, ticketsCount - 1))}
                                  disabled={ticketsCount <= 1}
                                  className="h-8 w-8 p-0 rounded-full"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="text-lg font-bold text-gray-900 min-w-[2rem] text-center">
                                  {ticketsCount}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTicketsCount(Math.min(MAX_TICKETS_PER_USER - existingBooking.tickets_count, event.actualRemaining, ticketsCount + 1))}
                                  disabled={ticketsCount >= Math.min(MAX_TICKETS_PER_USER - existingBooking.tickets_count, event.actualRemaining)}
                                  className="h-8 w-8 p-0 rounded-full"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {event.ticket_price > 0 && (
                              <div className="text-sm text-gray-700 bg-white rounded-lg p-2 mb-3">
                                <div className="flex justify-between">
                                  <span>Price per ticket:</span>
                                  <span className="font-semibold">₹{event.ticket_price.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between font-bold mt-1 pt-1 border-t">
                                  <span>Additional cost:</span>
                                  <span>₹{(event.ticket_price * ticketsCount).toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            )}

                            <Button
                              onClick={async () => {
                                if (isSubmitting) return
                                setIsSubmitting(true)
                                try {
                                  const response = await fetch(`/api/bookings/${existingBooking.booking_id}/add-tickets`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ additional_tickets: ticketsCount })
                                  })
                                  const data = await response.json()

                                  if (!response.ok) {
                                    throw new Error(data.error || 'Failed to add tickets')
                                  }

                                  if (data.payment_required) {
                                    // For paid events, initiate payment
                                    const paymentResponse = await fetch(`/api/bookings/${existingBooking.booking_id}/add-tickets/create-payment`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        additional_tickets: ticketsCount,
                                        additional_amount: data.additional_amount
                                      })
                                    })

                                    const paymentData = await paymentResponse.json()

                                    if (!paymentResponse.ok) {
                                      throw new Error(paymentData.error || 'Failed to create payment')
                                    }

                                    // Open Razorpay checkout
                                    const options = {
                                      key: paymentData.key_id,
                                      amount: paymentData.amount * 100,
                                      currency: paymentData.currency,
                                      name: 'ConveneHub',
                                      description: `Add ${ticketsCount} ticket${ticketsCount > 1 ? 's' : ''} to ${paymentData.event.title}`,
                                      order_id: paymentData.order_id,
                                      handler: async (response: any) => {
                                        try {
                                          // Verify payment and add tickets
                                          const verifyResponse = await fetch(`/api/bookings/${existingBooking.booking_id}/add-tickets/verify-payment`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              razorpay_order_id: response.razorpay_order_id,
                                              razorpay_payment_id: response.razorpay_payment_id,
                                              razorpay_signature: response.razorpay_signature,
                                              additional_tickets: ticketsCount
                                            })
                                          })

                                          const verifyData = await verifyResponse.json()

                                          if (verifyResponse.ok) {
                                            setSuccessMessage(verifyData.message)
                                            setShowPaymentSuccessModal(true)
                                            await fetchEventData()
                                            await checkUserBooking(user.id)
                                            setTicketsCount(1)
                                          } else {
                                            throw new Error(verifyData.error || 'Payment verification failed')
                                          }
                                        } catch (error: any) {
                                          setErrorMessage(error.message || 'Failed to verify payment')
                                          setShowErrorModal(true)
                                        }
                                      },
                                      modal: {
                                        ondismiss: () => {
                                          setIsSubmitting(false)
                                          setShowPaymentCancelledModal(true)
                                        }
                                      },
                                      theme: {
                                        color: '#2563eb'
                                      }
                                    }

                                    const razorpay = new (window as any).Razorpay(options)
                                    razorpay.open()
                                  } else {
                                    // Free event - tickets added
                                    alert(data.message)
                                    await fetchEventData()
                                    await checkUserBooking(user.id)
                                    setTicketsCount(1)
                                  }
                                } catch (error: any) {
                                  alert(error.message || 'Failed to add tickets')
                                } finally {
                                  setIsSubmitting(false)
                                }
                              }}
                              disabled={isSubmitting || ticketsCount < 1}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 text-sm font-semibold rounded-lg"
                            >
                              {isSubmitting ? (
                                <>
                                  <Spinner className="w-4 h-4 mr-2" />
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add {ticketsCount} More Ticket{ticketsCount !== 1 ? 's' : ''}
                                  {event.ticket_price > 0 && ` (₹${(event.ticket_price * ticketsCount).toLocaleString('en-IN')})`}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                    <div className="space-y-3 pt-3 border-t border-gray-200">
                      <Button
                        onClick={() => router.push('/bookings')}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white h-12 rounded-xl"
                      >
                        View My Bookings
                      </Button>
                      <Button
                        onClick={() => router.push('/events')}
                        variant="outline"
                        className="w-full h-12 rounded-xl"
                      >
                        Browse Other Events
                      </Button>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p>Your QR code ticket was sent to your email. Check your inbox or spam folder.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Booking form
                  <div className="space-y-5">
                    {/* Price header — BMS style */}
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-2xl font-bold text-gray-900">
                          {event.ticket_price === 0 ? (
                            <span className="text-green-600">FREE</span>
                          ) : (
                            <>₹{event.ticket_price.toLocaleString('en-IN')}</>
                          )}
                        </span>
                        {event.ticket_price > 0 && (
                          <span className="ml-1 text-sm text-gray-500">onwards</span>
                        )}
                      </div>
                      <Badge className="bg-green-100 text-green-800 text-xs font-medium hover:bg-green-100">
                        {event.actualRemaining > 0 ? 'Available' : 'Sold Out'}
                      </Badge>
                    </div>

                    <div>
                      <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-gray-500" />
                        Book Your Slot
                      </h2>

                      {!canBook && !isSoldOut && isEventVisible && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
                          <p className="text-sm text-yellow-800 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>
                              {event.status === 'checkin_open'
                                ? 'Bookings are now closed for this event. Check-in has started.'
                                : `Booking is currently not available. Event status: ${event.status.replace('_', ' ')}`}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>

                    {!user ? (
                      // User not logged in - show login prompt
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                          <p className="text-sm text-blue-800 flex items-start gap-2">
                            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>Please log in to book tickets for this event.</span>
                          </p>
                        </div>
                        <Button
                          onClick={() => router.push(`/login?redirect=/events/${eventId}`)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-bold rounded-xl"
                        >
                          Login to Book
                        </Button>
                        <p className="text-xs text-center text-gray-400">
                          Don't have an account? You can sign up during login.
                        </p>
                      </div>
                    ) : canBook ? (
                      <div className="space-y-4">
                        {/* Ticket Quantity Selector */}
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Number of Tickets
                          </label>
                          <div className="flex items-center justify-between gap-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setTicketsCount(Math.max(1, ticketsCount - 1))}
                              disabled={ticketsCount <= 1 || isSubmitting}
                              className="h-10 w-10 p-0 rounded-lg"
                            >
                              -
                            </Button>
                            <div className="text-center flex-1">
                              <div className="text-3xl font-bold text-gray-900">{ticketsCount}</div>
                              <div className="text-xs text-gray-500">
                                {ticketsCount === 1 ? 'ticket' : 'tickets'}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setTicketsCount(Math.min(MAX_TICKETS_PER_USER, event.actualRemaining, ticketsCount + 1))}
                              disabled={ticketsCount >= Math.min(MAX_TICKETS_PER_USER, event.actualRemaining) || isSubmitting}
                              className="h-10 w-10 p-0 rounded-lg"
                            >
                              +
                            </Button>
                          </div>
                          <div className="mt-3 text-xs text-gray-500 text-center">
                            <span className="text-orange-600 font-medium">
                              {Math.min(MAX_TICKETS_PER_USER, event.actualRemaining)} ticket{Math.min(MAX_TICKETS_PER_USER, event.actualRemaining) !== 1 ? 's' : ''} available
                            </span>
                            <span className="ml-1">(max {MAX_TICKETS_PER_USER} per user)</span>
                          </div>
                        </div>

                        {/* Coupon Code Input */}
                        {event.ticket_price > 0 && (
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <label className="block text-xs font-medium text-gray-600 mb-2">
                              Have a Coupon Code?
                            </label>
                            {!appliedCoupon ? (
                              <>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    placeholder="ENTER CODE"
                                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase font-mono text-xs h-8"
                                    disabled={isValidatingCoupon}
                                  />
                                  <Button
                                    type="button"
                                    onClick={validateCoupon}
                                    disabled={!couponCode.trim() || isValidatingCoupon}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 text-xs h-8 rounded-md"
                                  >
                                    {isValidatingCoupon ? (
                                      <Spinner className="w-3 h-3 text-white" />
                                    ) : (
                                      'Apply'
                                    )}
                                  </Button>
                                </div>
                                {couponError && (
                                  <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
                                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                    <span>{couponError}</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md p-2">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                  <span className="font-mono font-semibold text-green-900 text-xs">{appliedCoupon.code}</span>
                                  <span className="text-xs text-green-700">
                                    {appliedCoupon.discount_type === 'percentage'
                                      ? `${appliedCoupon.discount_value}% off`
                                      : appliedCoupon.discount_type === 'fixed'
                                        ? `₹${appliedCoupon.discount_value} off`
                                        : 'Free tickets!'}
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={removeCoupon}
                                  className="text-green-700 hover:text-green-900 hover:bg-green-100 h-6 w-6 p-0"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Payment Error Alert */}
                        {paymentError && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-red-900 mb-1">Payment Failed</h4>
                                <p className="text-sm text-red-700">{paymentError}</p>
                              </div>
                              <button
                                onClick={() => setPaymentError('')}
                                className="text-red-400 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Price Summary */}
                        {event.ticket_price > 0 && (
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">Subtotal:</span>
                              <span className="text-lg font-semibold text-gray-900">
                                ₹{(originalAmount || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 text-right">
                              ₹{event.ticket_price.toLocaleString('en-IN')} × {ticketsCount} {ticketsCount === 1 ? 'ticket' : 'tickets'}
                            </div>

                            {appliedCoupon && discount > 0 && (
                              <>
                                <div className="border-t border-blue-200 pt-2"></div>
                                <div className="flex items-center justify-between text-green-700">
                                  <span className="text-sm font-medium">Discount ({appliedCoupon.code}):</span>
                                  <span className="text-lg font-semibold">
                                    -₹{(discount || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </>
                            )}

                            <div className="border-t border-blue-200 pt-2"></div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-gray-900">Total Amount:</span>
                              <span className="text-2xl font-bold text-gray-900">
                                {isNaN(finalAmount) ? (
                                  '₹0'
                                ) : finalAmount === 0 ? (
                                  <span className="text-green-600">FREE</span>
                                ) : (
                                  `₹${finalAmount.toLocaleString('en-IN')}`
                                )}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Payment or Free Booking Button */}
                        {event.ticket_price > 0 && finalAmount > 0 ? (
                          // Paid Event - Show confirmation popup first
                          <>
                            <Button
                              onClick={() => setShowPaymentConfirmModal(true)}
                              disabled={isProcessingPayment}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isProcessingPayment ? (
                                <>
                                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                  </svg>
                                  Pay ₹{finalAmount.toLocaleString('en-IN')}
                                </>
                              )}
                            </Button>
                            
                            {/* Razorpay component - rendered when proceedToPayment is true */}
                            {proceedToPayment && (
                              <RazorpayCheckout
                                eventId={event.event_id}
                                ticketsCount={ticketsCount}
                                couponCode={appliedCoupon?.code}
                                autoTrigger={true}
                                onReady={() => setIsProcessingPayment(false)}
                                onSuccess={(bookingId, paymentId) => {
                                  setBookingCode(bookingId)
                                  setShowSuccessModal(true)
                                  setPaymentError('')
                                  setProceedToPayment(false)
                                  setIsProcessingPayment(false)
                                  fetchEventData()
                                  if (user) {
                                    checkUserBooking(user.id)
                                  }
                                }}
                                onFailure={(error) => {
                                  setPaymentError(error)
                                  setProceedToPayment(false)
                                  setIsProcessingPayment(false)
                                  fetchEventData()
                                  if (user) {
                                    checkUserBooking(user.id)
                                  }
                                }}
                              />
                            )}
                          </>
                        ) : (
                          // Free Event or Fully Discounted - Direct Booking
                          <Button
                            onClick={() => setShowPaymentConfirmModal(true)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-bold rounded-xl"
                          >
                            {isSubmitting ? (
                              <>
                                <Spinner className="w-4 h-4 text-white mr-2" />
                                Processing...
                              </>
                            ) : (
                              <>
                                Confirm Free Booking {ticketsCount > 1 && `(${ticketsCount} Tickets)`}
                                <CheckCircle2 className="w-4 h-4 ml-2" />
                              </>
                            )}
                          </Button>
                        )}

                        <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                          <Shield className="w-4 h-4" />
                          <span>Secure booking • Instant QR ticket via email</span>
                        </div>

                        <div className="pt-4 border-t border-gray-200 text-xs text-gray-600 space-y-1">
                          <p>• QR code required for entry</p>
                          <p>• Check email spam folder if not received</p>
                        </div>
                      </div>
                    ) : isSoldOut ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-lg font-semibold text-gray-900 mb-2">Event Sold Out</p>
                        <p className="text-sm text-gray-600 mb-6">
                          This event has reached maximum capacity
                        </p>
                        <Button
                          onClick={() => router.push('/events')}
                          variant="outline"
                          className="w-full rounded-xl"
                        >
                          Browse Other Events
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <AlertCircle className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-lg font-semibold text-gray-900 mb-2">Booking Closed</p>
                        <p className="text-sm text-gray-600 mb-6">
                          {event.status === 'checkin_open'
                            ? 'Bookings are now closed. Check-in has started for this event.'
                            : 'This event is not currently accepting bookings.'}
                        </p>
                        <Button
                          onClick={() => router.push('/events')}
                          variant="outline"
                          className="w-full rounded-xl"
                        >
                          Browse Other Events
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                </div>{/* end p-5 md:p-6 */}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* QR Code Modal */}
      {showQRModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedTicketForQR ? `Ticket ${selectedTicketForQR.ticket_number}` : 'Your QR Code'}
              </h3>
              {selectedTicketForQR && (
                <p className="text-sm text-gray-600 font-mono mb-4">
                  {selectedTicketForQR.ticket_code}
                </p>
              )}
              {qrCodeData ? (
                <>
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-200 mb-4">
                    <img
                      src={qrCodeData}
                      alt="QR Code"
                      className="w-full max-w-[350px] mx-auto"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Show this QR code at the venue entrance
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Ticket ID: {selectedTicketForQR?.ticket_id || 'N/A'}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = qrCodeData
                        link.download = `ticket-${selectedTicketForQR?.ticket_code || 'qr'}.png`
                        link.click()
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Download
                    </Button>
                    <Button
                      onClick={() => setShowQRModal(false)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                <div className="py-8">
                  <Spinner className="mx-auto mb-4" />
                  <p className="text-sm text-gray-600">Loading QR code...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Cancelled Modal */}
      {showPaymentCancelledModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowPaymentCancelledModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Cancelled
              </h3>
              <p className="text-gray-600 mb-6">
                Your payment was cancelled. No tickets were added to your booking.
              </p>
              <Button
                onClick={() => setShowPaymentCancelledModal(false)}
                className="w-full bg-gray-900 hover:bg-gray-800"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Success Modal */}
      {showPaymentSuccessModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowPaymentSuccessModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Successful!
              </h3>
              <p className="text-gray-600 mb-6">
                {successMessage}
              </p>
              <Button
                onClick={() => {
                  setShowPaymentSuccessModal(false)
                  router.push('/bookings')
                }}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                View My Bookings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowErrorModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Error
              </h3>
              <p className="text-gray-600 mb-6">
                {errorMessage}
              </p>
              <Button
                onClick={() => setShowErrorModal(false)}
                className="w-full bg-gray-900 hover:bg-gray-800"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Event Specific Terms Modal */}
      {showTermsModal && event.terms && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowTermsModal(false)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Event Specific Terms</h3>
                <p className="text-sm text-gray-500 mt-1">{event.title}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowTermsModal(false)}
                className="rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="prose prose-sm prose-blue max-w-none text-gray-700">
                <p className="whitespace-pre-wrap leading-relaxed">{event.terms}</p>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <Button 
                onClick={() => {
                  setAgreedToTerms(true)
                  setShowTermsModal(false)
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-semibold shadow-lg shadow-blue-200"
              >
                I Understand and Agree
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Payment Confirmation Modal - Shows T&C before Razorpay */}
      {showPaymentConfirmModal && event && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowPaymentConfirmModal(false)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl max-w-lg w-full max-h-[65vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Confirm Booking</h3>
                <p className="text-sm text-gray-500 mt-1">{event.title}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowPaymentConfirmModal(false)}
                className="rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Booking Summary */}
            <div className="p-4 bg-blue-50 border-b border-blue-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Tickets:</span>
                <span className="font-semibold text-gray-900">{ticketsCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600">Amount:</span>
                <span className="font-bold text-lg text-gray-900">₹{finalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Terms Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">Terms & Conditions</h4>
              </div>
              
              {event.terms ? (
                <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="whitespace-pre-wrap leading-relaxed text-sm">{event.terms}</p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    By proceeding with this booking, you agree to our{' '}
                    <Link href="/terms" target="_blank" className="text-blue-600 hover:underline font-medium">
                      Terms and Conditions
                    </Link>
                    , including:
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>QR code ticket is required for entry</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>All bookings are final and non-transferable</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Follow all venue and safety guidelines</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl space-y-3">
              <Button 
                onClick={() => {
                  if (event.ticket_price <= 0 || finalAmount <= 0) {
                    // Free event - call handleBooking directly
                    setShowPaymentConfirmModal(false)
                    handleBooking()
                  } else {
                    // Paid event - proceed to Razorpay
                    setIsProcessingPayment(true)
                    setShowPaymentConfirmModal(false)
                    setProceedToPayment(true)
                  }
                }}
                disabled={isProcessingPayment || isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {(isProcessingPayment || isSubmitting) ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {event.ticket_price <= 0 || finalAmount <= 0
                      ? 'I Agree & Confirm Booking'
                      : `I Agree & Pay ₹${finalAmount.toLocaleString('en-IN')}`}
                  </>
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowPaymentConfirmModal(false)}
                className="w-full h-10 rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Payment Processing Overlay */}
      {isProcessingPayment && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <div className="text-white text-base font-medium flex items-center gap-1">
            Please wait
            <span className="inline-flex w-8 ml-1">
              <span className="animate-[pulse_1.4s_ease-in-out_infinite]">.</span>
              <span className="animate-[pulse_1.4s_ease-in-out_0.2s_infinite]">.</span>
              <span className="animate-[pulse_1.4s_ease-in-out_0.4s_infinite]">.</span>
            </span>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
