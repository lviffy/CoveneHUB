'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/convene/client';
import { Event, Profile } from '@/types/database.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, MapPin, Users, UserPlus, X, AlertCircle, Search, Mail, Phone } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Assignment {
  assignment_id: string;
  event_id: string;
  user_id: string;
  assigned_at: string;
  event_title?: string;
  event_date_time?: string;
  event_city?: string;
  user_full_name?: string;
  user_city?: string;
}

interface EventWithAssignments extends Event {
  assignments: Assignment[];
}

export default function TeamAssignments() {
  const [events, setEvents] = useState<EventWithAssignments[]>([]);
  const [movieTeamMembers, setMovieTeamMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignmentLoading, setAssignmentLoading] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchEvents(),
        fetchMovieTeamMembers(),
        fetchAssignments()
      ]);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .in('status', ['published', 'checkin_open', 'in_progress'])
      .order('date_time', { ascending: true });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load events',
        variant: 'destructive',
      });
      return;
    }

    const eventsWithAssignments: EventWithAssignments[] = (data || []).map(event => ({
      ...(event as Event),
      assignments: [] as Assignment[]
    }));
    setEvents(eventsWithAssignments);
  };

  const fetchMovieTeamMembers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'movie_team')
      .order('full_name', { ascending: true });

    if (error) {
      return;
    }

    setMovieTeamMembers(data || []);
  };

  const fetchAssignments = async () => {
    try {
      const response = await fetch('/api/admin/movie-team-assignments');
      if (!response.ok) throw new Error('Failed to fetch assignments');
      
      const { assignments } = await response.json();
      
      // Group assignments by event
      setEvents(prevEvents => 
        prevEvents.map(event => ({
          ...event,
          assignments: (assignments || []).filter((a: Assignment) => a.event_id === event.event_id)
        }))
      );
    } catch (error) {
    }
  };

  const handleAssignMember = async () => {
    if (!selectedEvent || !selectedMember) {
      toast({
        title: 'Error',
        description: 'Please select both an event and a team member',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAssignmentLoading(selectedEvent);

      const response = await fetch('/api/admin/movie-team-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedMember,
          eventId: selectedEvent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign member');
      }

      toast({
        title: 'Success',
        description: 'Team member assigned successfully',
      });

      // Refresh assignments
      await fetchAssignments();
      setIsDialogOpen(false);
      setSelectedMember('');
      setSelectedEvent(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign team member',
        variant: 'destructive',
      });
    } finally {
      setAssignmentLoading(null);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string, eventId: string) => {
    try {
      setAssignmentLoading(assignmentId);

      const response = await fetch('/api/admin/movie-team-assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove assignment');
      }

      toast({
        title: 'Success',
        description: 'Assignment removed successfully',
      });

      // Refresh assignments
      await fetchAssignments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove assignment',
        variant: 'destructive',
      });
    } finally {
      setAssignmentLoading(null);
    }
  };

  const getStatusBadge = (status: Event['status']) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const },
      published: { label: 'Published', variant: 'default' as const },
      checkin_open: { label: 'Check-in Open', variant: 'default' as const },
      in_progress: { label: 'In Progress', variant: 'default' as const },
      ended: { label: 'Ended', variant: 'outline' as const },
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getAssignedMemberNames = (eventId: string) => {
    const event = events.find(e => e.event_id === eventId);
    if (!event || !event.assignments.length) return [];
    
    return event.assignments.map(assignment => {
      const member = movieTeamMembers.find(m => m.id === assignment.user_id);
      return member?.full_name || 'Unknown';
    });
  };

  // Filter movie team members based on search query
  const filteredMovieTeamMembers = movieTeamMembers.filter(member => {
    if (!searchQuery.trim()) return true; // Show all if no search query
    
    const searchLower = searchQuery.toLowerCase();
    return (
      member.full_name.toLowerCase().includes(searchLower) ||
      member.city.toLowerCase().includes(searchLower)
    );
  });

  const isAlreadyAssigned = (eventId: string, memberId: string) => {
    const event = events.find(e => e.event_id === eventId);
    return event?.assignments.some(a => a.user_id === memberId) || false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8 text-[#195ADC]" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <Calendar className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Events</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          Create and publish events to start assigning event operations members.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Event Team Assignments</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Assign event operations members to events for check-in and management
          </p>
        </div>
        <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-full border border-primary/10 self-start sm:self-auto">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
          </span>
          <span className="text-sm font-medium text-primary">
            {events.length} Active {events.length === 1 ? 'Event' : 'Events'}
          </span>
        </div>
      </div>

      {/* Event Operations Members Summary */}
      {movieTeamMembers.length === 0 && (
        <Card className="border-amber-200 bg-amber-50 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900">No Event Operations Members</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Create event operations accounts before assigning them to events.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events List with Assignments */}
      <div className="space-y-6">
        <AnimatePresence>
          {events.map((event, index) => (
            <motion.div
              key={event.event_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row justify-between gap-6 mb-6">
                    <div className="space-y-4 flex-1">
                      <div className="flex flex-wrap items-start gap-3">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight group-hover:text-primary transition-colors">
                          {event.title}
                        </h3>
                        {getStatusBadge(event.status)}
                      </div>
                      
                      <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100">
                          <Calendar className="h-4 w-4 text-primary/70" />
                          <span>{format(new Date(event.date_time), 'MMM dd, yyyy • hh:mm a')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100">
                          <MapPin className="h-4 w-4 text-primary/70" />
                          <span>{event.city}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100">
                          <Users className="h-4 w-4 text-primary/70" />
                          <span>{event.capacity} capacity</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Assign Button */}
                    <div className="flex-shrink-0 self-start sm:self-center w-full sm:w-auto">
                      <Dialog open={isDialogOpen && selectedEvent === event.event_id} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) {
                          setSelectedEvent(null);
                          setSelectedMember('');
                          setSearchQuery('');
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className="w-full sm:w-auto shadow-sm"
                            onClick={() => setSelectedEvent(event.event_id)}
                            disabled={movieTeamMembers.length === 0}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign Member
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Assign Team Member</DialogTitle>
                            <DialogDescription>
                              Assign an event operations member to <span className="font-semibold text-foreground">{event.title}</span>
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            {/* Search and Select Combined */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Search and Select Team Member
                                {searchQuery && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({filteredMovieTeamMembers.length} result{filteredMovieTeamMembers.length !== 1 ? 's' : ''})
                                  </span>
                                )}
                              </label>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                                <Select value={selectedMember} onValueChange={setSelectedMember}>
                                  <SelectTrigger className="pl-9 h-10 overflow-hidden">
                                    <SelectValue placeholder="Search by name or city..." className="truncate" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[300px] z-[10000]">
                                    {/* Search Input inside dropdown */}
                                    <div className="px-2 pb-2 sticky top-0 bg-white border-b z-50 pt-2">
                                      <Input
                                        placeholder="Type to search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-8"
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    {filteredMovieTeamMembers.length === 0 ? (
                                      <SelectItem value="no-results" disabled>
                                        No team members found
                                      </SelectItem>
                                    ) : (
                                      filteredMovieTeamMembers.map((member) => {
                                        const alreadyAssigned = isAlreadyAssigned(event.event_id, member.id);
                                        return (
                                          <SelectItem 
                                            key={member.id} 
                                            value={member.id}
                                            disabled={alreadyAssigned}
                                            textValue={member.full_name}
                                            triggerText={member.full_name}
                                            className="py-2"
                                          >
                                            <div className="flex flex-col items-start w-full min-w-0">
                                              <span className="font-medium text-sm truncate w-full">{member.full_name}</span>
                                              {member.city && (
                                                <span className="text-xs text-muted-foreground truncate w-full">{member.city}</span>
                                              )}
                                              {member.email && (
                                                <span className="text-xs text-muted-foreground truncate w-full">{member.email}</span>
                                              )}
                                              {member.phone && (
                                                <span className="text-xs text-muted-foreground truncate w-full">{member.phone}</span>
                                              )}
                                              {alreadyAssigned && (
                                                <span className="text-xs font-medium text-amber-600 mt-0.5">(Already assigned)</span>
                                              )}
                                            </div>
                                          </SelectItem>
                                        );
                                      })
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setIsDialogOpen(false);
                                  setSelectedEvent(null);
                                  setSelectedMember('');
                                  setSearchQuery('');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleAssignMember}
                                disabled={!selectedMember || assignmentLoading === event.event_id}
                              >
                                {assignmentLoading === event.event_id ? (
                                  <>
                                    <Spinner className="h-4 w-4 mr-2 text-white" />
                                    Assigning...
                                  </>
                                ) : (
                                  'Assign Member'
                                )}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  
                  {/* Assigned Team Members Section */}
                  <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                    {event.assignments.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            Assigned Team ({event.assignments.length})
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {event.assignments.map((assignment) => {
                            const member = movieTeamMembers.find(m => m.id === assignment.user_id);
                            if (!member) return null;
                            
                            return (
                              <motion.div
                                key={assignment.assignment_id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex items-center justify-between gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm group/card hover:border-primary/30 transition-all"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="h-9 w-9 flex-shrink-0 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center text-primary font-bold text-sm border border-primary/10">
                                    {member.full_name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                      {member.full_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                      <MapPin className="h-3 w-3 flex-shrink-0" /> {member.city}
                                    </p>
                                    {member.email && (
                                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                        <Mail className="h-3 w-3 flex-shrink-0" /> {member.email}
                                      </p>
                                    )}
                                    {member.phone && (
                                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                        <Phone className="h-3 w-3 flex-shrink-0" /> {member.phone}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100 transition-opacity"
                                  onClick={() => handleRemoveAssignment(assignment.assignment_id, event.event_id)}
                                  disabled={assignmentLoading === assignment.assignment_id}
                                >
                                  {assignmentLoading === assignment.assignment_id ? (
                                    <Spinner className="h-4 w-4 text-red-600" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                </Button>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-white/50">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 mb-3">
                          <UserPlus className="h-5 w-5 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">No team members assigned</p>
                        <p className="text-xs text-muted-foreground mt-1">Assign members to manage check-ins</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
