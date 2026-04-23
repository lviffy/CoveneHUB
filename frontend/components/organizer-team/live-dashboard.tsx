'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  Play,
  Pause,
  Square,
  CheckCircle2,
  FileText,
  Save,
  RefreshCw,
  User,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface LiveDashboardProps {
  eventId: string;
  eventTitle: string;
  eventStatus: string;
  eventDateTime: string;
  capacity: number;
  onStatusChange?: (newStatus: string) => void;
}

interface EventStats {
  totalBooked: number;
  checkedIn: number;
  remaining: number;
  percentageFilled: number;
  percentageCheckedIn: number;
}

interface CheckedInUser {
  ticketId: string;
  ticketCode: string;
  ticketNumber: number;
  bookingId: string;
  bookingCode: string;
  checkedInAt: string;
  checkedInBy: string;
  ticketsCount: number;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    city: string;
  };
}

export default function LiveDashboard({
  eventId,
  eventTitle,
  eventStatus,
  eventDateTime,
  capacity,
  onStatusChange
}: LiveDashboardProps) {
  const [stats, setStats] = useState<EventStats>({
    totalBooked: 0,
    checkedIn: 0,
    remaining: capacity,
    percentageFilled: 0,
    percentageCheckedIn: 0
  });
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [checkedInUsers, setCheckedInUsers] = useState<CheckedInUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchNotes();
    fetchCheckedInUsers();

    // Poll for updates every 3 seconds for real-time feel
    const interval = setInterval(() => {
      fetchStats();
      fetchCheckedInUsers();
    }, 3000);
    return () => clearInterval(interval);
  }, [eventId]);

  // Auto-open check-in when event time arrives
  useEffect(() => {
    const checkAndOpenCheckin = () => {
      const now = new Date();
      const eventTime = new Date(eventDateTime);

      // Auto-open check-in 30 minutes before event time
      const checkinOpenTime = new Date(eventTime.getTime() - 30 * 60 * 1000);

      // If current time >= checkin time and status is still published, auto-open check-in
      if (now >= checkinOpenTime && eventStatus === 'published') {
        handleStatusChange('checkin_open');
      }

      // Auto-start event when actual event time arrives
      if (now >= eventTime && eventStatus === 'checkin_open') {
        handleStatusChange('in_progress');
      }
    };

    // Check immediately
    checkAndOpenCheckin();

    // Then check every minute
    const interval = setInterval(checkAndOpenCheckin, 60000);

    return () => clearInterval(interval);
  }, [eventDateTime, eventStatus]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/stats`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || '');
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const fetchCheckedInUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch(`/api/organizer/events/${eventId}/checked-in-users`);
      if (response.ok) {
        const data = await response.json();
        setCheckedInUsers(data.checkedInUsers || []);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });

      if (response.ok) {
        // Show success feedback
      }
    } catch (error) {
    } finally {
      setSavingNotes(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatusChanging(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok && onStatusChange) {
        onStatusChange(newStatus);
      }
    } catch (error) {
    } finally {
      setStatusChanging(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; icon: React.ReactNode }> = {
      draft: { label: 'Draft', icon: <FileText className="h-4 w-4" /> },
      published: { label: 'Published', icon: <Clock className="h-4 w-4" /> },
      checkin_open: { label: 'Check-in Open', icon: <Play className="h-4 w-4" /> },
      in_progress: { label: 'In Progress', icon: <TrendingUp className="h-4 w-4" /> },
      ended: { label: 'Ended', icon: <Square className="h-4 w-4" /> },
    };
    return configs[status] || configs.draft;
  };

  const statusConfig = getStatusConfig(eventStatus);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Event Header with Status */}
      <Card className="border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-white border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl sm:text-2xl mb-2">{eventTitle}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="border-gray-300">
                  {statusConfig.icon}
                  <span className="ml-1">{statusConfig.label}</span>
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchStats}
                  className="h-7 px-2"
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                </Button>
              </div>
            </div>

            {/* Status Controls */}
            <div className="flex flex-wrap gap-2">
              {eventStatus === 'published' && (
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-blue-700">
                    Check-in opens 30 min before
                  </span>
                </div>
              )}

              {eventStatus === 'checkin_open' && (
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-green-700">
                    Check-in is now open
                  </span>
                </div>
              )}

              {eventStatus === 'in_progress' && (
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-50 rounded-lg border border-purple-200">
                  <TrendingUp className="h-4 w-4 text-purple-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-purple-700">
                    Event in progress
                  </span>
                </div>
              )}

              {eventStatus === 'ended' && (
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <CheckCircle2 className="h-4 w-4 text-gray-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700">
                    Event ended
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Loading/Error State */}
      {loading && (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">Loading statistics...</p>
        </div>
      )}

      {/* Live Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Booked */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card className="border border-gray-200 bg-white">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
                </div>
                <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                  {stats.percentageFilled.toFixed(0)}%
                </Badge>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Booked</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalBooked}</p>
                <p className="text-xs text-gray-500 mt-1">of {capacity} capacity</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Checked In */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card className="border border-gray-200 bg-white">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
                </div>
                <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                  {stats.percentageCheckedIn.toFixed(0)}%
                </Badge>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Checked In</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.checkedIn}</p>
                <p className="text-xs text-gray-500 mt-1">of {stats.totalBooked} booked</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Remaining */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card className="border border-gray-200 bg-white">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
                </div>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Remaining Slots</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.remaining}</p>
                <p className="text-xs text-gray-500 mt-1">available spots</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Attendance Rate */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card className="border border-gray-200 bg-white">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
                </div>
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Attendance Rate</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {stats.totalBooked > 0 ? stats.percentageCheckedIn.toFixed(0) : 0}%
                </p>
                <p className="text-xs text-gray-500 mt-1">check-in completion</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Progress Visualization */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Event Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Capacity Filled</span>
              <span className="font-medium">{stats.totalBooked} / {capacity}</span>
            </div>
            <Progress value={stats.percentageFilled} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Check-in Progress</span>
              <span className="font-medium">{stats.checkedIn} / {stats.totalBooked}</span>
            </div>
            <Progress value={stats.percentageCheckedIn} className="h-2 [&>div]:bg-green-500" />
          </div>
        </CardContent>
      </Card>

      {/* Checked-In Users Section */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <div>
                <CardTitle className="text-lg">Checked-In Attendees</CardTitle>
                <CardDescription className="mt-1">
                  {checkedInUsers.length} {checkedInUsers.length === 1 ? 'ticket has' : 'tickets have'} been checked in
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchCheckedInUsers}
              disabled={loadingUsers}
            >
              <RefreshCw className={cn("h-4 w-4", loadingUsers && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loadingUsers && checkedInUsers.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Loading checked-in users...</p>
            </div>
          ) : checkedInUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No attendees have checked in yet</p>
              <p className="text-sm text-gray-400 mt-1">Check-in data will appear here in real-time</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {checkedInUsers.map((checkedIn) => (
                <motion.div
                  key={checkedIn.ticketId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-2 sm:gap-0">
                    <div className="flex items-center gap-3 w-full sm:flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-gray-900">{checkedIn.user.fullName}</h4>
                        <p className="text-xs text-gray-500 break-words">
                          Ticket: {checkedIn.ticketCode} • Booking: {checkedIn.bookingCode}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0 sm:ml-2 pl-[52px] sm:pl-0">
                      {checkedIn.user.city && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span>{checkedIn.user.city}</span>
                        </div>
                      )}
                      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 whitespace-nowrap">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Checked In
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 text-sm pl-[52px] sm:pl-0">
                    <div className="space-y-1 flex-1 min-w-0">
                      {checkedIn.user.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{checkedIn.user.email}</span>
                        </div>
                      )}
                      {checkedIn.user.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span>{checkedIn.user.phone}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 flex-shrink-0">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                        {new Date(checkedIn.checkedInAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Checked in by: <span className="font-medium text-gray-700">{checkedIn.checkedInBy}</span></span>
                    <span>Ticket #{checkedIn.ticketNumber} of {checkedIn.ticketsCount}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
