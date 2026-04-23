'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  FileText,
  Mail
} from 'lucide-react';
import { sanitizeCSVValue } from '@/lib/csv-sanitizer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';
import SettlementModal from './settlement-modal';

interface FinancialSummary {
  total_bookings: number;
  total_tickets_sold: number;
  gross_revenue: string;
  processing_fees: string;
  platform_commission: string;
  platform_commission_percentage: number;
  net_payout_to_movie_team: string;
}

interface EventFinancial {
  event_id: string;
  title: string;
  date_time: string;
  venue_name: string;
  city: string;
  status: string;
  settlement_status: string | null;
  settlement_details?: {
    transaction_reference: string;
    transfer_date: string;
    payment_method: string;
    notes?: string;
  } | null;
  financial_summary: FinancialSummary;
  bookings: Array<{
    booking_id: string;
    tickets_count: number;
    total_amount: string;
    booking_status: string;
    payment_required: boolean;
    payment_status: string;
    booked_at: string;
  }>;
}

interface FinancialData {
  events: EventFinancial[];
  summary: {
    total_events: number;
    total_tickets_sold: number;
    total_gross_revenue: string;
    total_processing_fees: string;
    total_platform_commission: string;
    total_net_payout: string;
  };
  fee_structure: {
    processing_fee_percentage: number;
    platform_commission_note?: string;
    processing_percentage?: number;
    platform_percentage?: number;
  };
}

interface FinancialDashboardProps {
  apiBasePath?: string;
  showAdminActions?: boolean;
}

export default function FinancialDashboard({
  apiBasePath = '/api/admin',
  showAdminActions = true,
}: FinancialDashboardProps) {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [settlementModal, setSettlementModal] = useState<{
    isOpen: boolean;
    event: { id: string; title: string; net_payout: number; settlement_status?: string | null } | null;
  }>({
    isOpen: false,
    event: null,
  });
  const [emailModal, setEmailModal] = useState<{
    isOpen: boolean;
    event: { id: string; title: string } | null;
    loading: boolean;
    error: string | null;
    success: boolean;
  }>({
    isOpen: false,
    event: null,
    loading: false,
    error: null,
    success: false,
  });
  const [movieTeamEmail, setMovieTeamEmail] = useState('');
  const [summaryEmailModal, setSummaryEmailModal] = useState<{
    isOpen: boolean;
    loading: boolean;
    error: string | null;
    success: boolean;
  }>({
    isOpen: false,
    loading: false,
    error: null,
    success: false,
  });
  const [summaryRecipientEmail, setSummaryRecipientEmail] = useState('');

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBasePath}/financial-summary`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch financial data');
      }

      const result = await response.json();
      
      // Debug: Log settlement details for each event
      result.events?.forEach((event: any) => {
        if (event.settlement_status === 'settled') {
        }
      });
      
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleEventExpanded = (eventId: string) => {
    setExpandedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const downloadCSV = (event: EventFinancial) => {
    // Create CSV content with sanitized values to prevent CSV injection
    const headers = ['Booking ID', 'Tickets', 'Amount (₹)', 'Payment Status', 'Booking Date'];
    const rows = event.bookings.map(booking => [
      booking.booking_id,
      booking.tickets_count,
      parseFloat(booking.total_amount).toFixed(2),
      booking.payment_status,
      new Date(booking.booked_at).toLocaleDateString()
    ]);

    // Add summary rows with proper formatting
    rows.push(['', '', '', '', '']); // Empty row for spacing
    rows.push(['Financial Summary', '', '', '', '']);
    rows.push(['Gross Revenue', '', parseFloat(event.financial_summary.gross_revenue).toFixed(2), '', '']);
    rows.push(['Processing Fees', '', parseFloat(event.financial_summary.processing_fees).toFixed(2), '', '']);
    rows.push([`CONVENEHUB Commission (${event.financial_summary.platform_commission_percentage}%)`, '', parseFloat(event.financial_summary.platform_commission).toFixed(2), '', '']);
    rows.push(['NET PAYOUT', '', parseFloat(event.financial_summary.net_payout_to_movie_team).toFixed(2), '', '']);

    const csvContent = [
      headers.map(sanitizeCSVValue).join(','),
      ...rows.map(row => row.map(sanitizeCSVValue).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, '-')}-financial-report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const downloadAllData = () => {
    if (!data) return;

    // Create comprehensive CSV with all events and summary
    const rows: string[][] = [];

    // Overall Summary Section
    rows.push(['OVERALL FINANCIAL SUMMARY']);
    rows.push(['Generated on:', new Date().toLocaleString('en-IN')]);
    rows.push(['']);
    rows.push(['Metric', 'Value']);
    rows.push(['Total Events', data.summary.total_events.toString()]);
    rows.push(['Total Tickets Sold', data.summary.total_tickets_sold.toString()]);
    rows.push(['Total Gross Revenue', `₹${parseFloat(data.summary.total_gross_revenue).toFixed(2)}`]);
    rows.push(['Total Processing Fees', `₹${parseFloat(data.summary.total_processing_fees).toFixed(2)}`]);
    rows.push(['Total CONVENEHUB Commission', `₹${parseFloat(data.summary.total_platform_commission).toFixed(2)}`]);
    rows.push(['Total Net Payout', `₹${parseFloat(data.summary.total_net_payout).toFixed(2)}`]);
    rows.push(['']);

    // Event-wise breakdown
    rows.push(['EVENT-WISE BREAKDOWN']);
    rows.push(['']);

    data.events.forEach((event, index) => {
      rows.push([`Event ${index + 1}: ${event.title}`]);
      rows.push(['Date:', new Date(event.date_time).toLocaleDateString('en-IN')]);
      rows.push(['Venue:', event.venue_name]);
      rows.push(['City:', event.city]);
      rows.push(['Status:', event.status]);
      rows.push(['Settlement Status:', event.settlement_status || 'Pending']);
      rows.push(['']);
      rows.push(['Financial Details', '']);
      rows.push(['Tickets Sold', event.financial_summary.total_tickets_sold.toString()]);
      rows.push(['Gross Revenue', `₹${parseFloat(event.financial_summary.gross_revenue).toFixed(2)}`]);
      rows.push(['Processing Fees', `₹${parseFloat(event.financial_summary.processing_fees).toFixed(2)}`]);
      rows.push([`CONVENEHUB Commission (${event.financial_summary.platform_commission_percentage}%)`, `₹${parseFloat(event.financial_summary.platform_commission).toFixed(2)}`]);
      rows.push(['Net Payout', `₹${parseFloat(event.financial_summary.net_payout_to_movie_team).toFixed(2)}`]);
      rows.push(['']);
      
      // Booking details
      rows.push(['Booking ID', 'Tickets', 'Amount (₹)', 'Payment Status', 'Date']);
      event.bookings.forEach(booking => {
        rows.push([
          booking.booking_id,
          booking.tickets_count.toString(),
          parseFloat(booking.total_amount).toFixed(2),
          booking.payment_status,
          new Date(booking.booked_at).toLocaleDateString('en-IN')
        ]);
      });
      rows.push(['']);
      rows.push(['─'.repeat(80)]);
      rows.push(['']);
    });

    const csvContent = rows.map(row => row.map(sanitizeCSVValue).join(',')).join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    a.download = `CONVENEHUB-Financial-Report-${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const openSettlementModal = (event: EventFinancial) => {
    setSettlementModal({
      isOpen: true,
      event: {
        id: event.event_id,
        title: event.title,
        net_payout: parseFloat(event.financial_summary.net_payout_to_movie_team),
        settlement_status: event.settlement_status,
      },
    });
  };

  const closeSettlementModal = () => {
    setSettlementModal({
      isOpen: false,
      event: null,
    });
  };

  const handleSettlementSuccess = () => {
    // Refresh financial data after successful settlement
    fetchFinancialData();
  };

  const openEmailModal = (event: EventFinancial) => {
    setEmailModal({
      isOpen: true,
      event: {
        id: event.event_id,
        title: event.title,
      },
      loading: false,
      error: null,
      success: false,
    });
    setMovieTeamEmail('');
  };

  const closeEmailModal = () => {
    setEmailModal({
      isOpen: false,
      event: null,
      loading: false,
      error: null,
      success: false,
    });
    setMovieTeamEmail('');
  };

  const openSummaryEmailModal = () => {
    setSummaryEmailModal({
      isOpen: true,
      loading: false,
      error: null,
      success: false,
    });
    setSummaryRecipientEmail('');
  };

  const closeSummaryEmailModal = () => {
    setSummaryEmailModal({
      isOpen: false,
      loading: false,
      error: null,
      success: false,
    });
    setSummaryRecipientEmail('');
  };

  const handleSendSummaryEmail = async () => {
    if (!summaryRecipientEmail.trim()) {
      setSummaryEmailModal((prev) => ({
        ...prev,
        error: 'Please enter a valid email address',
      }));
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(summaryRecipientEmail)) {
      setSummaryEmailModal((prev) => ({
        ...prev,
        error: 'Please enter a valid email address',
      }));
      return;
    }

    setSummaryEmailModal((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const response = await fetch(`${apiBasePath}/financial-summary/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_email: summaryRecipientEmail,
          summary_data: data,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send summary email');
      }

      setSummaryEmailModal((prev) => ({
        ...prev,
        loading: false,
        success: true,
      }));

      // Close modal after success
      setTimeout(() => {
        closeSummaryEmailModal();
      }, 2000);
    } catch (err) {
      setSummaryEmailModal((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'An error occurred',
      }));
    }
  };

  const handleSendEmail = async () => {
    if (!emailModal.event || !movieTeamEmail.trim()) {
      setEmailModal((prev) => ({
        ...prev,
        error: 'Please enter a valid email address',
      }));
      return;
    }

    setEmailModal((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const response = await fetch(`${apiBasePath}/settlements/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: emailModal.event.id,
          movie_team_email: movieTeamEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setEmailModal((prev) => ({
        ...prev,
        loading: false,
        success: true,
      }));

      // Show success and close after delay
      setTimeout(() => {
        closeEmailModal();
        // Optionally refresh data
        fetchFinancialData();
      }, 2000);
    } catch (err) {
      setEmailModal((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'An error occurred',
      }));
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <Clock className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Financial Data</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          Calculating revenue, fees, and settlements...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Data</h3>
        <p className="text-gray-500 max-w-sm mx-auto mb-4">{error}</p>
        <Button onClick={fetchFinancialData} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (!data || data.events.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <FileText className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Financial Data</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          No completed events with paid bookings found. Financial data will appear here once events are completed.
        </p>
      </div>
    );
  }

  // Calculate additional summary statistics
  const averageRevenuePerEvent = data.summary.total_events > 0 
    ? parseFloat(data.summary.total_gross_revenue) / data.summary.total_events 
    : 0;
  const averageTicketsPerEvent = data.summary.total_events > 0 
    ? data.summary.total_tickets_sold / data.summary.total_events 
    : 0;
  const effectiveFeePercentage = parseFloat(data.summary.total_gross_revenue) > 0
    ? ((parseFloat(data.summary.total_processing_fees) + parseFloat(data.summary.total_platform_commission)) / parseFloat(data.summary.total_gross_revenue)) * 100
    : 0;
  
  // Calculate settlement status
  const settledEvents = data.events.filter(e => e.settlement_status === 'settled').length;
  const pendingEvents = data.events.filter(e => e.settlement_status !== 'settled').length;

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card className="border-[#195ADC] bg-gradient-to-br from-blue-50 to-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl sm:text-2xl">Overall Financial Summary</CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                {data.summary.total_events} event{data.summary.total_events !== 1 ? 's' : ''} • {data.summary.total_tickets_sold} tickets sold
              </CardDescription>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xs text-gray-500 mb-1">Fee Structure</div>
              <Badge variant="outline" className="font-mono text-xs">
                {data.fee_structure.processing_fee_percentage}% processing + variable CONVENEHUB
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {/* Gross Revenue */}
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-xs sm:text-sm text-gray-600">Gross Revenue</span>
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-gray-900">
                {formatCurrency(parseFloat(data.summary.total_gross_revenue))}
              </div>
            </div>

            {/* Processing Fees */}
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-xs sm:text-sm text-gray-600">Processing Fees</span>
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-red-600">
                -{formatCurrency(parseFloat(data.summary.total_processing_fees))}
              </div>
            </div>

            {/* CONVENEHUB Commission */}
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-xs sm:text-sm text-gray-600">CONVENEHUB</span>
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-green-600">
                -{formatCurrency(parseFloat(data.summary.total_platform_commission))}
              </div>
            </div>

            {/* Net Payout */}
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border-2 border-[#195ADC]">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-xs sm:text-sm text-gray-600 font-medium">Net Payout</span>
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-[#195ADC]" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-[#195ADC]">
                {formatCurrency(parseFloat(data.summary.total_net_payout))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Summary Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detailed Summary Report
          </CardTitle>
          <CardDescription>
            Comprehensive financial insights and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Average Revenue per Event */}
              <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-lg p-3 sm:p-4">
                <div className="text-xs font-medium text-purple-600 mb-1">Avg Revenue/Event</div>
                <div className="text-xl sm:text-2xl font-bold text-purple-900">
                  {formatCurrency(averageRevenuePerEvent)}
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  {data.summary.total_events} event{data.summary.total_events !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Average Tickets per Event */}
              <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-lg p-3 sm:p-4">
                <div className="text-xs font-medium text-orange-600 mb-1">Avg Tickets/Event</div>
                <div className="text-xl sm:text-2xl font-bold text-orange-900">
                  {averageTicketsPerEvent.toFixed(1)}
                </div>
                <div className="text-xs text-orange-600 mt-1">
                  {data.summary.total_tickets_sold} total
                </div>
              </div>

              {/* Effective Fee Percentage */}
              <div className="bg-gradient-to-br from-cyan-50 to-white border border-cyan-200 rounded-lg p-3 sm:p-4">
                <div className="text-xs font-medium text-cyan-600 mb-1">Effective Fee</div>
                <div className="text-xl sm:text-2xl font-bold text-cyan-900">
                  {effectiveFeePercentage.toFixed(2)}%
                </div>
                <div className="text-xs text-cyan-600 mt-1">
                  Processing + CONVENEHUB
                </div>
              </div>
            </div>

            {/* Settlement Status */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Settlement Status</h4>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="flex items-center justify-between p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm text-gray-600">Settled</div>
                      <div className="text-xl sm:text-2xl font-bold text-green-900">{settledEvents}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs hidden sm:inline-flex">
                    {data.summary.total_events > 0 ? ((settledEvents / data.summary.total_events) * 100).toFixed(0) : 0}%
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm text-gray-600">Pending</div>
                      <div className="text-xl sm:text-2xl font-bold text-yellow-900">{pendingEvents}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs hidden sm:inline-flex">
                    {data.summary.total_events > 0 ? ((pendingEvents / data.summary.total_events) * 100).toFixed(0) : 0}%
                  </Badge>
                </div>
              </div>
            </div>

            {/* Financial Breakdown Table */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Financial Breakdown</h4>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900">Category</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900">Amount</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-900">Gross Revenue</td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right font-semibold text-gray-900">
                        {formatCurrency(parseFloat(data.summary.total_gross_revenue))}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-gray-600">100%</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-700">
                        <span className="flex items-center gap-1 sm:gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span>
                          <span className="truncate">Processing Fees</span>
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right font-medium text-red-600">
                        -{formatCurrency(parseFloat(data.summary.total_processing_fees))}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-gray-600">
                        {data.fee_structure.processing_fee_percentage}%
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-700">
                        <span className="flex items-center gap-1 sm:gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
                          <span className="truncate">CONVENEHUB</span>
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right font-medium text-green-600">
                        -{formatCurrency(parseFloat(data.summary.total_platform_commission))}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-gray-600">
                        {parseFloat(data.summary.total_gross_revenue) > 0 
                          ? ((parseFloat(data.summary.total_platform_commission) / parseFloat(data.summary.total_gross_revenue)) * 100).toFixed(1)
                          : 0}%
                      </td>
                    </tr>
                    <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-[#195ADC]">Net Payout</td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-[#195ADC]">
                        {formatCurrency(parseFloat(data.summary.total_net_payout))}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-[#195ADC]">
                        {parseFloat(data.summary.total_gross_revenue) > 0 
                          ? ((parseFloat(data.summary.total_net_payout) / parseFloat(data.summary.total_gross_revenue)) * 100).toFixed(1)
                          : 0}%
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-gray-200 pt-4 flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={downloadAllData}
                  variant="outline"
                  size="sm"
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export Full Report</span>
                  <span className="sm:hidden">Export</span>
                </Button>
                {showAdminActions && (
                  <Button
                    onClick={openSummaryEmailModal}
                    variant="outline"
                    size="sm"
                    className="gap-2 flex-1 sm:flex-none"
                  >
                    <Mail className="h-4 w-4" />
                    <span className="hidden sm:inline">Email Summary</span>
                    <span className="sm:hidden">Email</span>
                  </Button>
                )}
              </div>
              <div className="text-xs text-gray-500 text-center sm:text-left">
                {data.summary.total_events} event{data.summary.total_events !== 1 ? 's' : ''} • {data.summary.total_tickets_sold} tickets
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Event-wise Breakdown</h3>
        {data.events.map((event) => {
          const isExpanded = expandedEvents.has(event.event_id);
          const netPayout = parseFloat(event.financial_summary.net_payout_to_movie_team);

          return (
            <Card key={event.event_id} className="border-gray-200">
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors p-3 sm:p-6" onClick={() => toggleEventExpanded(event.event_id)}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1 sm:mb-2">
                      <CardTitle className="text-base sm:text-lg truncate">{event.title}</CardTitle>
                      <Badge variant={event.status === 'ended' ? 'secondary' : 'outline'} className="text-xs flex-shrink-0">
                        {event.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs sm:text-sm">
                      {new Date(event.date_time).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })} • {event.bookings.length} booking{event.bookings.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <div className="text-xs text-gray-500 mb-0.5">Net Payout</div>
                    <div className="text-lg sm:text-xl font-bold text-[#195ADC]">
                      {formatCurrency(netPayout)}
                    </div>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="border-t border-gray-100 pt-4 sm:pt-6">
                  {/* Financial Breakdown */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-600 mb-1">Gross Revenue</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(parseFloat(event.financial_summary.gross_revenue))}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-600 mb-1">Processing Fees</div>
                      <div className="text-lg font-semibold text-red-600">
                        -{formatCurrency(parseFloat(event.financial_summary.processing_fees))}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-600 mb-1">
                        CONVENEHUB Commission ({event.financial_summary.platform_commission_percentage}%)
                      </div>
                      <div className="text-lg font-semibold text-green-600">
                        -{formatCurrency(parseFloat(event.financial_summary.platform_commission))}
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 border-2 border-[#195ADC]">
                      <div className="text-xs text-[#195ADC] font-medium mb-1">Net Payout</div>
                      <div className="text-lg font-semibold text-[#195ADC]">
                        {formatCurrency(netPayout)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-100">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <Button
                        onClick={() => downloadCSV(event)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Report
                      </Button>
                      {showAdminActions && (
                        event.settlement_status === 'settled' ? (
                          <Button
                            disabled
                            variant="default"
                            size="sm"
                            className="gap-2 bg-green-600 hover:bg-green-600 cursor-default"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            ✓ Settled
                          </Button>
                        ) : (
                          <Button
                            onClick={() => openSettlementModal(event)}
                            variant="default"
                            size="sm"
                            className="gap-2 bg-[#195ADC] hover:bg-[#1451c4]"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Mark as Paid
                          </Button>
                        )
                      )}
                    </div>
                    {showAdminActions && (
                      <Button
                        onClick={() => openEmailModal(event)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        Send Email
                      </Button>
                    )}
                  </div>

                  {/* Settlement Details - Show when settled */}
                  {(() => {
                    // Debug logging
                    if (event.settlement_status === 'settled') {
                    }
                    return null;
                  })()}
                  {event.settlement_status === 'settled' && event.settlement_details && (
                    <div className="mb-6 pb-6 border-b border-gray-100">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Settlement Details
                      </h4>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-green-700 font-medium mb-1">Transaction Reference</div>
                            <div className="text-sm font-mono text-green-900">{event.settlement_details.transaction_reference}</div>
                          </div>
                          <div>
                            <div className="text-xs text-green-700 font-medium mb-1">Transfer Date</div>
                            <div className="text-sm text-green-900">
                              {new Date(event.settlement_details.transfer_date).toLocaleDateString('en-IN', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-green-700 font-medium mb-1">Payment Method</div>
                            <div className="text-sm text-green-900">
                              {event.settlement_details.payment_method.replace(/_/g, ' ').toUpperCase()}
                            </div>
                          </div>
                          {event.settlement_details.notes && (
                            <div className="md:col-span-2">
                              <div className="text-xs text-green-700 font-medium mb-1">Notes</div>
                              <div className="text-sm text-green-900">{event.settlement_details.notes}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bookings Table */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Bookings</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-y border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-600">Booking ID</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-600">Tickets</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-600">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {event.bookings.map((booking) => (
                            <tr key={booking.booking_id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-900 font-mono text-sm">{booking.booking_id.slice(0, 8)}</td>
                              <td className="px-4 py-3 text-center text-gray-900">{booking.tickets_count}</td>
                              <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                                {formatCurrency(parseFloat(booking.total_amount))}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge 
                                  variant={booking.payment_status === 'paid' ? 'default' : 'outline'}
                                  className="font-medium"
                                >
                                  {booking.payment_status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-center text-gray-600">
                                {new Date(booking.booked_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 sm:pt-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-semibold text-blue-900 mb-1">About Financial Calculations</h4>
              <p className="text-xs sm:text-sm text-blue-700 leading-relaxed">
                All calculations use precise decimal arithmetic. 
                Processing charges are {data.fee_structure.processing_fee_percentage}% per transaction, 
                CONVENEHUB commission varies by event. 
                Net payout = Gross - processing fees - CONVENEHUB commission.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settlement Modal */}
      {showAdminActions && settlementModal.event && (
        <SettlementModal
          isOpen={settlementModal.isOpen}
          onClose={closeSettlementModal}
          onSuccess={handleSettlementSuccess}
          event={settlementModal.event}
        />
      )}

      {/* Email Modal */}
      <Dialog open={showAdminActions && emailModal.isOpen} onOpenChange={closeEmailModal}>
        <DialogContent className="sm:max-w-[450px]">
          {emailModal.success ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">Email Sent Successfully</DialogTitle>
              </DialogHeader>
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Settlement report has been sent to
                </p>
                <p className="font-medium text-gray-900 break-all">
                  {movieTeamEmail}
                </p>
                <p className="text-xs text-gray-500 mt-4">
                  The CSV report and financial details have been attached
                </p>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Send Settlement Report</DialogTitle>
                <DialogDescription>
                  Send the financial settlement report for <strong>{emailModal.event?.title}</strong> to the event operations team.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="movie_team_email">
                    Event Operations Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="movie_team_email"
                    type="email"
                    placeholder="ops@convenehub.com"
                    value={movieTeamEmail}
                    onChange={(e) => setMovieTeamEmail(e.target.value)}
                    disabled={emailModal.loading}
                  />
                  <p className="text-xs text-gray-500">
                    The settlement report will be sent to this email address with CSV attachment
                  </p>
                </div>

                {emailModal.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{emailModal.error}</AlertDescription>
                  </Alert>
                )}

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Details included:</strong> Financial breakdown, CSV report attachment, gross revenue, fees, and net payout.
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEmailModal}
                  disabled={emailModal.loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendEmail}
                  disabled={emailModal.loading || !movieTeamEmail.trim()}
                  className="bg-[#195ADC] hover:bg-[#1451c4]"
                >
                  {emailModal.loading ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Report
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Summary Email Modal */}
      <Dialog open={showAdminActions && summaryEmailModal.isOpen} onOpenChange={closeSummaryEmailModal}>
        <DialogContent className="sm:max-w-[500px]">
          {summaryEmailModal.success ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  Email Sent Successfully!
                </DialogTitle>
                <DialogDescription>
                  The overall financial summary report has been sent successfully.
                </DialogDescription>
              </DialogHeader>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Overall Summary Report
                </DialogTitle>
                <DialogDescription>
                  Send a comprehensive financial summary report via email
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="summary_recipient_email">
                    Recipient Email Address *
                  </Label>
                  <Input
                    id="summary_recipient_email"
                    type="email"
                    placeholder="admin@example.com"
                    value={summaryRecipientEmail}
                    onChange={(e) => setSummaryRecipientEmail(e.target.value)}
                    disabled={summaryEmailModal.loading}
                  />
                  <p className="text-xs text-gray-500">
                    The complete financial summary with all events will be sent to this email
                  </p>
                </div>

                {summaryEmailModal.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{summaryEmailModal.error}</AlertDescription>
                  </Alert>
                )}

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Report includes:</strong>
                    <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                      <li>Overall financial summary</li>
                      <li>Event-wise breakdown with commission rates</li>
                      <li>Settlement status for all events</li>
                      <li>Complete booking details</li>
                      <li>CSV attachment for offline analysis</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeSummaryEmailModal}
                  disabled={summaryEmailModal.loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendSummaryEmail}
                  disabled={summaryEmailModal.loading || !summaryRecipientEmail.trim()}
                  className="bg-[#195ADC] hover:bg-[#1451c4]"
                >
                  {summaryEmailModal.loading ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Summary Report
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
