'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/convene/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EventsHeader } from '@/components/events-header';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  MapPin,
  Ticket,
  QrCode,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  X,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

interface Booking {
  booking_id: string;
  booking_code: string;
  booking_status: string;
  tickets_count: number;
  total_amount: number;
  booked_at: string;
  qr_nonce: string;
  checked_in?: boolean;
  checked_in_at?: string;
  payment_required?: boolean;
  payment_status?: string;
  event: {
    event_id: string;
    title: string;
    description: string;
    venue_name: string;
    venue_address: string;
    city: string;
    date_time: string;
    event_image: string;
    status: string;
    entry_instructions: string;
    ticket_price?: number;
  };
}

interface TicketData {
  ticket_id: string;
  ticket_number: number;
  ticket_code: string;
  qr_nonce: string;
  checked_in: boolean;
  checked_in_at?: string;
  checked_in_by?: string;
}

export default function MyBookingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  // Tickets per booking cache: booking_id -> TicketData[]
  const [ticketsMap, setTicketsMap] = useState<Record<string, TicketData[]>>({});
  const [loadingTicketsMap, setLoadingTicketsMap] = useState<Record<string, boolean>>({});
  // QR images per ticket cache: ticket_id -> qr image url/base64
  const [ticketQrMap, setTicketQrMap] = useState<Record<string, string>>({});
  const [loadingTicketQrMap, setLoadingTicketQrMap] = useState<Record<string, boolean>>({});
  // Modal state for viewing individual ticket QR
  const [selectedTicketQR, setSelectedTicketQR] = useState<{ ticket: TicketData, qrCode: string, bookingCode: string } | null>(null);
  // Delete booking state
  const [deletingBooking, setDeletingBooking] = useState<string | null>(null);
  // Confirmation dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<{ id: string, code: string, tickets: number } | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bookings, filterStatus]);

  const applyFilters = () => {
    let filtered = [...bookings];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(booking => {
        switch (filterStatus) {
          case 'free':
            return !booking.payment_required;
          case 'paid':
            return booking.payment_status === 'SUCCESSFUL' || booking.payment_status === 'paid';
          case 'pending':
            return booking.payment_status === 'PENDING' || booking.payment_status === 'pending';
          case 'failed':
            return booking.payment_status === 'FAILED' || booking.payment_status === 'failed';
          case 'confirmed':
            return booking.booking_status === 'confirmed';
          case 'checked_in':
            return booking.booking_status === 'checked_in';
          default:
            return true;
        }
      });
    }

    setFilteredBookings(filtered);
  };

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login?redirect=/bookings');
      return;
    }

    fetchBookings();
  };

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/bookings');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bookings');
      }

      const bookingsList = data.bookings || [];
      setBookings(bookingsList);

      // Auto-load tickets and QR codes for all confirmed/checked_in bookings
      bookingsList.forEach(async (booking: Booking) => {
        if (booking.booking_status === 'confirmed' || booking.booking_status === 'checked_in') {
          await fetchTicketsForBooking(booking.booking_id);
          // Wait a tiny bit for tickets to populate state, then fetch all QRs
          setTimeout(() => fetchAllTicketQrsForBooking(booking.booking_id), 100);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQRCode = async (bookingId: string) => {
    try {
      setLoadingQR(bookingId);
      setQrCode(null);

      const response = await fetch(`/api/bookings/${bookingId}/qr`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate QR code');
      }

      // guard: make sure the qr_code is a valid data URL before setting
      if (data.qr_code && /^data:image\//.test(data.qr_code)) {
        setQrCode(data.qr_code);
      } else {
        setQrCode(null);
      }
      setSelectedBooking(bookingId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load QR code');
    } finally {
      setLoadingQR(null);
    }
  };

  const fetchTicketsForBooking = useCallback(async (bookingId: string) => {
    if (!bookingId) return;
    try {
      setLoadingTicketsMap(prev => ({ ...prev, [bookingId]: true }));
      const resp = await fetch(`/api/bookings/${bookingId}/tickets`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to fetch tickets');

      const tickets = data.tickets || [];
      setTicketsMap(prev => ({ ...prev, [bookingId]: tickets }));

      // If no tickets found for a confirmed paid booking, try to create them
      if (tickets.length === 0 && data.booking) {
        try {
          const createResp = await fetch(`/api/bookings/${bookingId}/create-missing-tickets`, {
            method: 'POST',
          });
          const createData = await createResp.json();

          if (createResp.ok) {
            // Refresh tickets after creation
            const refreshResp = await fetch(`/api/bookings/${bookingId}/tickets`);
            const refreshData = await refreshResp.json();
            if (refreshResp.ok) {
              setTicketsMap(prev => ({ ...prev, [bookingId]: refreshData.tickets || [] }));
            }
          } else {
          }
        } catch (createErr) {
          // Silently fail - don't disrupt the user experience
        }
      }
    } catch (err) {
      setTicketsMap(prev => ({ ...prev, [bookingId]: [] }));
    } finally {
      setLoadingTicketsMap(prev => ({ ...prev, [bookingId]: false }));
    }
  }, []);

  const fetchTicketQr = useCallback(async (ticketId: string) => {
    if (!ticketId) return;
    try {
      setLoadingTicketQrMap(prev => ({ ...prev, [ticketId]: true }));
      const resp = await fetch(`/api/tickets/${ticketId}/qr`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to fetch ticket QR');
      // guard: only set if we got a valid data URI for the QR image
      if (data.qr_code && /^data:image\//.test(data.qr_code)) {
        setTicketQrMap(prev => ({ ...prev, [ticketId]: data.qr_code }));
      } else {
        setTicketQrMap(prev => ({ ...prev, [ticketId]: '' }));
      }
    } catch (err) {
    } finally {
      setLoadingTicketQrMap(prev => ({ ...prev, [ticketId]: false }));
    }
  }, []);

  const fetchAllTicketQrsForBooking = useCallback(async (bookingId: string) => {
    const tickets = ticketsMap[bookingId] || [];
    await Promise.all(tickets.map(t => fetchTicketQr(t.ticket_id)));
  }, [ticketsMap, fetchTicketQr]);

  const downloadQRCode = (bookingCode: string) => {
    if (!qrCode) return;

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `ticket-${bookingCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTicketQR = (ticketCode: string, qrImage: string) => {
    const link = document.createElement('a');
    link.href = qrImage;
    link.download = `ticket-${ticketCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTicketClick = async (ticket: TicketData, bookingCode: string) => {
    // If QR already loaded, show modal immediately
    const existingQR = ticketQrMap[ticket.ticket_id];
    if (existingQR) {
      setSelectedTicketQR({ ticket, qrCode: existingQR, bookingCode });
      return;
    }

    // Load QR first
    try {
      setLoadingTicketQrMap(prev => ({ ...prev, [ticket.ticket_id]: true }));
      const resp = await fetch(`/api/tickets/${ticket.ticket_id}/qr`);
      const data = await resp.json();
      if (resp.ok && data.qr_code && /^data:image\//.test(data.qr_code)) {
        setTicketQrMap(prev => ({ ...prev, [ticket.ticket_id]: data.qr_code }));
        setSelectedTicketQR({ ticket, qrCode: data.qr_code, bookingCode });
      } else {
      }
    } catch (err) {
    } finally {
      setLoadingTicketQrMap(prev => ({ ...prev, [ticket.ticket_id]: false }));
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      setDeletingBooking(bookingId);

      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel booking');
      }

      // Show success toast
      toast({
        title: "✅ Booking Cancelled Successfully",
        description: `${data.tickets_released} ticket(s) have been released and are now available for others to book.`,
        duration: 5000,
      });

      // Close dialog
      setShowCancelDialog(false);
      setBookingToCancel(null);

      // Refresh bookings list from backend to ensure sync
      await fetchBookings();

    } catch (err: any) {
      toast({
        title: "❌ Cancellation Failed",
        description: err.message || 'Failed to cancel booking. Please try again.',
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setDeletingBooking(null);
    }
  };

  const confirmCancelBooking = (booking: Booking) => {
    setBookingToCancel({
      id: booking.booking_id,
      code: booking.booking_code,
      tickets: booking.tickets_count
    });
    setShowCancelDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case 'checked_in':
        return <Badge className="bg-blue-500">Checked In</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPaymentBadge = (paymentStatus?: string, paymentRequired?: boolean) => {
    if (!paymentRequired) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-700">Free</Badge>;
    }

    switch (paymentStatus?.toUpperCase()) {
      case 'SUCCESSFUL':
      case 'PAID':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-500">Payment Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <EventsHeader />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <Spinner className="mx-auto mb-4" />
            <p className="text-gray-600">Loading your bookings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <EventsHeader />

      <div className="container mx-auto px-4 pb-8 pt-24 md:pt-32 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          {/* Mobile: Simple heading (left aligned) */}
          <h1 className="md:hidden text-2xl font-bold py-4">Bookings</h1>

          {/* Desktop: Full header with back button and subtitle */}
          <div className="hidden md:block">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <h1 className="text-4xl font-bold mb-2">My Bookings</h1>
            <p className="text-gray-600">View and manage your event bookings</p>
          </div>
        </div>

        {/* Filter Buttons */}
        {!error && bookings.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              All ({bookings.length})
            </Button>
            <Button
              variant={filterStatus === 'confirmed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('confirmed')}
            >
              Confirmed ({bookings.filter(b => b.booking_status === 'confirmed').length})
            </Button>
            <Button
              variant={filterStatus === 'checked_in' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('checked_in')}
            >
              Checked In ({bookings.filter(b => b.booking_status === 'checked_in').length})
            </Button>
            <Button
              variant={filterStatus === 'free' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('free')}
            >
              Free ({bookings.filter(b => !b.payment_required).length})
            </Button>
            <Button
              variant={filterStatus === 'paid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('paid')}
            >
              Paid ({bookings.filter(b => b.payment_status === 'SUCCESSFUL' || b.payment_status === 'paid').length})
            </Button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!error && bookings.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="pt-12 pb-12 text-center">
              <Ticket className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
              <p className="text-gray-600 mb-6">
                You haven't booked any events. Start exploring and book your first experience!
              </p>
              <Button onClick={() => router.push('/events')}>
                Browse Events
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Bookings List */}
        {bookings.length > 0 && (
          <>
            {filteredBookings.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-12 pb-12 text-center">
                  <Ticket className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2">No bookings match this filter</h3>
                  <p className="text-gray-600 mb-6">
                    Try selecting a different filter to see your bookings.
                  </p>
                  <Button onClick={() => setFilterStatus('all')} variant="outline">
                    Show All Bookings
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {filteredBookings.map((booking) => (
                  <Card key={booking.booking_id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start mb-2">
                        <CardTitle className="text-xl">{booking.event.title}</CardTitle>
                        <div className="flex gap-2 flex-wrap">
                          {getStatusBadge(booking.booking_status)}
                          {getPaymentBadge(booking.payment_status, booking.payment_required)}
                        </div>
                      </div>
                      <CardDescription>
                        Booking Code: <span className="font-mono font-bold text-black">{booking.booking_code}</span>
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Event Image */}
                      {booking.event.event_image && (
                        <div className="relative w-full h-40 rounded-lg overflow-hidden">
                          <Image
                            src={booking.event.event_image}
                            alt={booking.event.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}

                      {/* Event Details */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
                          <span>
                            {format(new Date(booking.event.date_time), 'EEEE, MMMM d, yyyy • h:mm a')}
                          </span>
                        </div>

                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
                          <div>
                            <div className="font-medium">{booking.event.venue_name}</div>
                            <div className="text-gray-600">{booking.event.city}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-gray-500" />
                          <span>{booking.tickets_count} {booking.tickets_count === 1 ? 'Ticket' : 'Tickets'}</span>
                        </div>

                        {booking.total_amount > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">₹{booking.total_amount.toFixed(2)}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-gray-500">
                          <Clock className="h-4 w-4" />
                          <span>Booked on {format(new Date(booking.booked_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>

                      {/* Payment Pending/Failed Actions */}
                      {((booking.payment_status === 'PENDING' || booking.payment_status === 'pending') ||
                        (booking.payment_status === 'FAILED' || booking.payment_status === 'failed')) && (
                          <div className="pt-4 border-t">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                              <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="font-medium text-yellow-900 mb-1">
                                    {(booking.payment_status === 'PENDING' || booking.payment_status === 'pending')
                                      ? 'Payment Pending'
                                      : 'Payment Failed'}
                                  </p>
                                  <p className="text-sm text-yellow-700 mb-3">
                                    {(booking.payment_status === 'PENDING' || booking.payment_status === 'pending')
                                      ? 'Complete your payment to confirm this booking. Pending bookings will be automatically cancelled after 15 minutes.'
                                      : 'Your payment was not successful. This booking has been cancelled and slots have been released. You can try booking again.'}
                                  </p>
                                  <div className="flex gap-2 flex-wrap">
                                    {(booking.payment_status === 'PENDING' || booking.payment_status === 'pending') && (
                                      <>
                                        <Button
                                          onClick={() => router.push(`/events/${booking.event.event_id}`)}
                                          size="sm"
                                          className="bg-blue-600 hover:bg-blue-700"
                                        >
                                          Complete Payment
                                        </Button>
                                        <Button
                                          onClick={() => confirmCancelBooking(booking)}
                                          size="sm"
                                          variant="outline"
                                          disabled={deletingBooking === booking.booking_id}
                                          className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                                        >
                                          {deletingBooking === booking.booking_id ? (
                                            <>
                                              <Spinner className="w-4 h-4 mr-2" />
                                              Cancelling...
                                            </>
                                          ) : (
                                            <>
                                              <X className="w-4 h-4 mr-1" />
                                              Cancel Booking
                                            </>
                                          )}
                                        </Button>
                                      </>
                                    )}
                                    {(booking.payment_status === 'FAILED' || booking.payment_status === 'failed') && (
                                      <Button
                                        onClick={() => router.push(`/events/${booking.event.event_id}`)}
                                        size="sm"
                                        className="bg-yellow-600 hover:bg-yellow-700"
                                      >
                                        Book Again
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Add More Tickets Button */}
                      {(booking.booking_status === 'confirmed' || booking.booking_status === 'checked_in') &&
                        (booking.payment_status === 'SUCCESSFUL' || booking.payment_status === 'NOT_REQUIRED') &&
                        booking.tickets_count < 10 &&
                        new Date(booking.event.date_time) > new Date() && // Event hasn't happened yet
                        (booking.event.status === 'published' || booking.event.status === 'checkin_open') && (
                          <div className="pt-4 border-t">
                            <Button
                              onClick={() => router.push(`/events/${booking.event.event_id}`)}
                              variant="outline"
                              className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
                              size="sm"
                            >
                              <Ticket className="w-4 h-4 mr-2" />
                              Add More Tickets
                            </Button>
                          </div>
                        )}

                      {/* Tickets & QRs Section */}
                      {(booking.booking_status === 'confirmed' || booking.booking_status === 'checked_in') && (
                        <div className="pt-4 border-t">
                          {/* Booking-level QR (existing) */}
                          <div className="mb-3">
                            {selectedBooking === booking.booking_id && qrCode ? (
                              <div className="space-y-3">
                                <div className="relative w-full aspect-square max-w-[220px] mx-auto bg-white p-4 rounded-lg border-2">
                                  <Image
                                    src={qrCode}
                                    alt="Booking QR Code"
                                    fill
                                    className="object-contain"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => downloadQRCode(booking.booking_code)}
                                    className="flex-1"
                                    variant="outline"
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                  </Button>
                                  <Button onClick={() => setSelectedBooking(null)} variant="outline">Hide</Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                onClick={() => fetchQRCode(booking.booking_id)}
                                disabled={loadingQR === booking.booking_id}
                                className="w-full"
                              >
                                {loadingQR === booking.booking_id ? (
                                  <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <QrCode className="mr-2 h-4 w-4" />
                                    Show Booking QR
                                  </>
                                )}
                              </Button>
                            )}
                          </div>

                          {/* Tickets list */}
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-semibold">Tickets</div>
                              <div className="text-xs text-gray-500">{booking.tickets_count} total</div>
                            </div>

                            {loadingTicketsMap[booking.booking_id] ? (
                              <div className="text-center py-4">
                                <Spinner className="mx-auto" />
                                <p className="text-sm text-gray-500 mt-2">Loading tickets...</p>
                              </div>
                            ) : (ticketsMap[booking.booking_id] && ticketsMap[booking.booking_id].length > 0 ? (
                              <div className="grid grid-cols-2 gap-3">
                                {ticketsMap[booking.booking_id].map((t) => (
                                  <button
                                    key={t.ticket_id}
                                    onClick={() => handleTicketClick(t, booking.booking_code)}
                                    className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-center hover:bg-gray-100 hover:border-blue-400 transition-all cursor-pointer"
                                  >
                                    <div className="text-sm font-semibold">Ticket {t.ticket_number}</div>
                                    <div className="text-xs font-mono text-gray-600 mb-2">{t.ticket_code}</div>
                                    {t.checked_in && (
                                      <Badge className="bg-green-100 text-green-800 text-xs mb-2">✓ Checked In</Badge>
                                    )}
                                    {loadingTicketQrMap[t.ticket_id] ? (
                                      <div className="text-center py-4">
                                        <Spinner className="mx-auto h-6 w-6" />
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center gap-1 text-xs text-blue-600 mt-2">
                                        <QrCode className="w-3 h-3" />
                                        Click to view QR
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-2 text-sm text-gray-500">No tickets found</div>
                            ))}
                          </div>

                          {booking.event.entry_instructions && (
                            <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded mt-4">
                              <strong>Entry Instructions:</strong>
                              <p className="mt-1">{booking.event.entry_instructions}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {booking.booking_status === 'checked_in' && (
                        <div className="pt-4 border-t">
                          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium">
                              {ticketsMap[booking.booking_id]?.some(t => !t.checked_in)
                                ? `Partially checked in (${ticketsMap[booking.booking_id]?.filter(t => t.checked_in).length}/${ticketsMap[booking.booking_id]?.length} tickets)`
                                : "You've checked in to this event"
                              }
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Ticket QR Modal */}
      {selectedTicketQR && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTicketQR(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">Ticket {selectedTicketQR.ticket.ticket_number}</h3>
                <p className="text-sm text-gray-600 font-mono">{selectedTicketQR.ticket.ticket_code}</p>
              </div>
              <button
                onClick={() => setSelectedTicketQR(null)}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {selectedTicketQR.ticket.checked_in && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="w-5 h-5" />
                  <div>
                    <div className="font-semibold">Already Checked In</div>
                    {selectedTicketQR.ticket.checked_in_at && (
                      <div className="text-xs text-green-700">
                        {new Date(selectedTicketQR.ticket.checked_in_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="relative w-full aspect-square bg-white p-4 rounded-lg border-2 border-gray-200 mb-4">
              <Image
                src={selectedTicketQR.qrCode}
                alt={`QR Code for ${selectedTicketQR.ticket.ticket_code}`}
                fill
                className="object-contain"
              />
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => downloadTicketQR(selectedTicketQR.ticket.ticket_code, selectedTicketQR.qrCode)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Download QR Code
              </Button>
              <Button
                onClick={() => setSelectedTicketQR(null)}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-gray-700">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                <p>Present this QR code at the event entrance for check-in. Each ticket must be scanned individually.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Confirmation Dialog */}
      {showCancelDialog && bookingToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  Cancel Booking?
                </h3>
                <p className="text-sm text-gray-600">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Booking Code:</span>
                <span className="font-mono font-bold text-gray-900">{bookingToCancel.code}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tickets to Release:</span>
                <span className="font-semibold text-gray-900">{bookingToCancel.tickets}</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                <p className="text-xs text-blue-900">
                  {bookingToCancel.tickets} ticket(s) will be released and become available for other users to book.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowCancelDialog(false);
                  setBookingToCancel(null);
                }}
                variant="outline"
                className="flex-1"
                disabled={deletingBooking === bookingToCancel.id}
              >
                Keep Booking
              </Button>
              <Button
                onClick={() => handleDeleteBooking(bookingToCancel.id)}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={deletingBooking === bookingToCancel.id}
              >
                {deletingBooking === bookingToCancel.id ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Yes, Cancel Booking
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
