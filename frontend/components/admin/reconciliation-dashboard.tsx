'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { AlertCircle, CheckCircle2, Clock, TrendingUp, Users, UserCheck, UserX, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ReconciliationData {
  event_id: string;
  event_title: string;
  event_date: string;
  total_bookings: number;
  total_checkins: number;
  no_shows: number;
  paid_bookings: number;
  free_bookings: number;
  pending_payments: number;
  failed_payments: number;
  gross_revenue: number;
  reconciliation_status: 'matched' | 'discrepancy' | 'pending';
  discrepancy_reason?: string;
  checkin_to_payment_ratio: number;
}

interface ReconciliationSummary {
  total_events: number;
  matched_events: number;
  discrepancy_events: number;
  pending_events: number;
  total_bookings: number;
  total_checkins: number;
  overall_checkin_rate: number;
  discrepancies: Array<{
    type: string;
    count: number;
    description: string;
  }>;
}

interface ReconciliationDashboardProps {
  apiBasePath?: string;
}

export default function ReconciliationDashboard({ apiBasePath = '/api/admin' }: ReconciliationDashboardProps) {
  const [data, setData] = useState<ReconciliationData[] | null>(null);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReconciliationData();
  }, []);

  const fetchReconciliationData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${apiBasePath}/reconciliation`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch reconciliation data');
      }

      const result = await response.json();
      setData(result.events || []);
      setSummary(result.summary || null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      setData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500">Loading reconciliation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-800 ml-2">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500">No reconciliation data available</p>
        </div>
      </div>
    );
  }

  const totalNoShows = data.reduce((sum, e) => sum + e.no_shows, 0);
  const totalPendingPayments = data.reduce((sum, e) => sum + e.pending_payments, 0);
  
  const overviewData = [
    {
      name: 'Bookings',
      value: summary.total_bookings,
      color: '#3B82F6',
      icon: Users,
    },
    {
      name: 'Check-ins',
      value: summary.total_checkins,
      color: '#10B981',
      icon: UserCheck,
    },
    {
      name: 'No-shows',
      value: totalNoShows,
      color: '#F59E0B',
      icon: UserX,
    },
    {
      name: 'Pending',
      value: totalPendingPayments,
      color: '#6366F1',
      icon: Clock,
    },
  ];

  const statusDistribution = [
    { name: 'Matched', value: summary.matched_events, color: '#10B981' },
    { name: 'Discrepancies', value: summary.discrepancy_events, color: '#EF4444' },
    { name: 'Pending', value: summary.pending_events, color: '#F59E0B' },
  ].filter(item => item.value > 0);

  // Prepare event-wise chart data
  const checkinVsBookingsData = data.slice(0, 5).map((event) => ({
    name: event.event_title.length > 15 ? event.event_title.substring(0, 15) + '...' : event.event_title,
    fullName: event.event_title,
    Bookings: event.total_bookings,
    'Check-ins': event.total_checkins,
    'No-shows': event.no_shows,
  }));

  const paymentStatusData = data.slice(0, 5).map((event) => ({
    name: event.event_title.length > 15 ? event.event_title.substring(0, 15) + '...' : event.event_title,
    fullName: event.event_title,
    Paid: event.paid_bookings,
    Pending: event.pending_payments,
    Failed: event.failed_payments,
    Free: event.free_bookings,
  }));

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-blue-100">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">Reconciliation Overview</h2>
            <p className="text-sm sm:text-base text-gray-600">Track attendance vs bookings across all events</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm w-full sm:w-auto">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600">{summary.overall_checkin_rate.toFixed(0)}%</div>
            <div className="text-xs text-gray-500 mt-1">Check-in Rate</div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {overviewData.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.name}
              className="bg-white rounded-xl p-4 sm:p-6 border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${metric.color}15` }}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: metric.color }} />
                </div>
                {metric.name === 'No-shows' && metric.value > 0 && (
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{metric.value}</div>
              <div className="text-xs sm:text-sm text-gray-500">{metric.name}</div>
            </div>
          );
        })}
      </div>

      {/* Discrepancies Alert */}
      {summary.discrepancy_events > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <AlertDescription className="ml-2 text-orange-800">
            <span className="font-semibold">{summary.discrepancy_events} event(s)</span> have discrepancies between bookings and check-ins.
            {summary.discrepancies.map((disc, idx) => (
              <div key={idx} className="mt-1 text-sm">
                • {disc.description}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Status Distribution Pie */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Event Status Distribution</CardTitle>
            <CardDescription>Reconciliation status across events</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220} className="sm:!h-[280px]">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              {statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-gray-600">{item.name}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Key Insights */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Key Insights</CardTitle>
            <CardDescription>Analysis & recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  {summary.matched_events} events perfectly reconciled
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Check-ins match bookings with no discrepancies
                </p>
              </div>
            </div>

            {totalNoShows > summary.total_bookings * 0.15 && (
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-900">
                    High no-show rate detected
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    {((totalNoShows / summary.total_bookings) * 100).toFixed(1)}% of bookings didn't show up
                  </p>
                </div>
              </div>
            )}

            {totalPendingPayments > 0 && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {totalPendingPayments} pending payments
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Awaiting payment verification
                  </p>
                </div>
              </div>
            )}

            {summary.matched_events === summary.total_events && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Perfect reconciliation
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    All events are fully reconciled
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Event-wise Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Check-in vs Bookings Chart */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Check-in vs Bookings</CardTitle>
            <CardDescription>Attendance rate by event</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={checkinVsBookingsData}
                margin={{ top: 20, right: 20, left: 10, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  angle={0}
                  textAnchor="middle"
                  interval={0}
                  tick={{ fontSize: 11 }}
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-medium text-sm mb-2">{payload[0].payload.fullName}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} className="text-xs" style={{ color: entry.color }}>
                              {entry.name}: {entry.value}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar dataKey="Bookings" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Check-ins" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="No-shows" fill="#EF4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Status Distribution Chart */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Payment Status Distribution</CardTitle>
            <CardDescription>Payment status by event</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={paymentStatusData}
                margin={{ top: 20, right: 20, left: 10, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  angle={0}
                  textAnchor="middle"
                  interval={0}
                  tick={{ fontSize: 11 }}
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-medium text-sm mb-2">{payload[0].payload.fullName}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} className="text-xs" style={{ color: entry.color }}>
                              {entry.name}: {entry.value}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar dataKey="Paid" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Pending" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Failed" fill="#EF4444" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Free" fill="#6B7280" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Details Table */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Event Details</CardTitle>
          <CardDescription>Detailed reconciliation status for each event</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Event</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Bookings</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Check-ins</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Rate</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Paid</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((event) => (
                  <tr key={event.event_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{event.event_title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(event.event_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-sm font-medium text-gray-900">{event.total_bookings}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-sm font-medium text-gray-900">{event.total_checkins}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full" 
                            style={{ width: `${event.checkin_to_payment_ratio}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 ml-1">
                          {event.checkin_to_payment_ratio.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-sm font-medium text-gray-900">{event.paid_bookings}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {event.reconciliation_status === 'matched' ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Matched
                        </Badge>
                      ) : event.reconciliation_status === 'discrepancy' ? (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Discrepancy
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
