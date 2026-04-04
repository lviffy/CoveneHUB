'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/convene/client';
import { Event } from '@/types/database.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Eye, Edit, Trash2, Download, MoreVertical, FileText, RefreshCw } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { downloadCSV, formatBookingsForCSV, formatCheckInsForCSV, generateCSVFilename } from '@/lib/csv-export';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import EventNotesModal from './event-notes-modal';

export default function EventsList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportingEvent, setExportingEvent] = useState<string | null>(null);
  const [selectedEventNotes, setSelectedEventNotes] = useState<{ title: string; notes: string } | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Calculate REAL remaining count for each event from actual bookings (same as movie team dashboard)
      const eventsWithRealCount = await Promise.all(
        (data || []).map(async (event: Event) => {
          // Get all tickets from confirmed bookings
          const { data: bookings } = await supabase
            .from('bookings')
            .select('tickets_count')
            .eq('event_id', event.event_id)
            .neq('booking_status', 'cancelled')

          // Sum up all tickets
          const totalTickets = bookings?.reduce((sum: number, booking: any) => sum + (booking.tickets_count || 1), 0) ?? 0;
          const calculatedRemaining = event.capacity - totalTickets;
          
          return {
            ...event,
            remaining: calculatedRemaining,
            notes: event.notes || '' // Include notes field
          } as Event
        })
      )

      setEvents(eventsWithRealCount);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load events',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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

  const handleView = (eventId: string) => {
    // Navigate to event detail page
    router.push(`/events/${eventId}`);
  };

  const handleEdit = (eventId: string) => {
    // Navigate to edit page
    router.push(`/admin/events/edit?id=${eventId}`);
  };

  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event);
  };

  const handleExportBookings = async (eventId: string, eventTitle: string) => {
    try {
      setExportingEvent(`${eventId}-bookings`);
      
      const response = await fetch(`/api/admin/events/${eventId}/export-bookings`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to export bookings');
      }
      
      // Generate CSV
      const csvContent = formatBookingsForCSV(data.bookings);
      const filename = generateCSVFilename(eventTitle, 'bookings');
      
      // Download
      downloadCSV(csvContent, filename);
      
      toast({
        title: 'Export successful',
        description: `Downloaded ${data.bookings.length} bookings`,
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export bookings',
        variant: 'destructive',
      });
    } finally {
      setExportingEvent(null);
    }
  };

  const handleExportCheckIns = async (eventId: string, eventTitle: string) => {
    try {
      setExportingEvent(`${eventId}-checkins`);
      
      const response = await fetch(`/api/admin/events/${eventId}/export-checkins`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to export check-ins');
      }
      
      if (data.checkIns.length === 0) {
        toast({
          title: 'No check-ins',
          description: 'This event has no check-ins yet',
          variant: 'destructive',
        });
        return;
      }
      
      // Generate CSV
      const csvContent = formatCheckInsForCSV(data.checkIns);
      const filename = generateCSVFilename(eventTitle, 'checkins');
      
      // Download
      downloadCSV(csvContent, filename);
      
      toast({
        title: 'Export successful',
        description: `Downloaded ${data.checkIns.length} check-ins`,
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export check-ins',
        variant: 'destructive',
      });
    } finally {
      setExportingEvent(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;

    setIsDeleting(true);
    try {
      // Delete image from storage if it exists
      if (eventToDelete.event_image) {
        try {
          // Extract the file path from the public URL
          const url = new URL(eventToDelete.event_image);
          const pathParts = url.pathname.split('/');
          const bucketIndex = pathParts.findIndex(part => part === 'event-images');
          
          if (bucketIndex !== -1 && pathParts.length > bucketIndex + 1) {
            // Get the file path after the bucket name
            const filePath = pathParts.slice(bucketIndex + 1).join('/');
            
            
            // Delete from storage
            const { data, error: storageError } = await supabase.storage
              .from('event-images')
              .remove([filePath]);
            
            
            if (storageError) {
              // Don't throw - still proceed with event deletion
            } else {
            }
          }
        } catch (urlError) {
          // Continue with event deletion even if image deletion fails
        }
      }

      // Delete the event from database
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('event_id', eventToDelete.event_id);

      if (error) throw error;

      toast({
        title: 'Event deleted',
        description: `"${eventToDelete.title}" has been deleted successfully.`,
      });

      // Refresh events list
      fetchEvents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete event',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setEventToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8 text-[#195ADC]" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">No events yet</h3>
        <p className="text-slate-500">Create your first event to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Refresh Button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-600">
          {events.length} {events.length === 1 ? 'event' : 'events'} total
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchEvents}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Event</TableHead>
              <TableHead className="min-w-[80px]">City</TableHead>
              <TableHead className="min-w-[120px]">Date & Time</TableHead>
              <TableHead className="min-w-[90px]">Capacity</TableHead>
              <TableHead className="min-w-[80px]">Price</TableHead>
              <TableHead className="min-w-[100px]">Status</TableHead>
              <TableHead className="text-right min-w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.event_id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{event.title}</p>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" />
                      {event.venue_name}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{event.city}</Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {format(new Date(event.date_time), 'MMM dd, yyyy')}
                    <div className="text-xs text-slate-500">
                      {format(new Date(event.date_time), 'hh:mm a')}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">
                      {event.remaining}/{event.capacity}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">
                    {event.ticket_price === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      <span>₹{event.ticket_price.toLocaleString('en-IN')}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(event.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedEventNotes({ title: event.title, notes: event.notes || '' })}
                      title="View notes"
                      className={event.notes && event.notes.trim() !== '' ? 'text-blue-600 hover:text-blue-700' : ''}
                    >
                      <FileText className="h-4 w-4" />
                      {event.notes && event.notes.trim() !== '' && (
                        <span className="ml-1 text-xs">•</span>
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleView(event.event_id)}
                      title="View event"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEdit(event.event_id)}
                      title="Edit event"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={exportingEvent === `${event.event_id}-bookings` || exportingEvent === `${event.event_id}-checkins`}
                          title="Export data"
                        >
                          {(exportingEvent === `${event.event_id}-bookings` || exportingEvent === `${event.event_id}-checkins`) ? (
                            <Spinner className="h-4 w-4" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => handleExportBookings(event.event_id, event.title)}
                          disabled={exportingEvent !== null}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export All Bookings
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleExportCheckIns(event.event_id, event.title)}
                          disabled={exportingEvent !== null}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export Check-ins
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteClick(event)}
                      title="Delete event"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the event "{eventToDelete?.title}". 
              This action cannot be undone. All bookings and assignments related to this event will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Event'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Event Notes Modal */}
      {selectedEventNotes && (
        <EventNotesModal
          isOpen={true}
          onClose={() => setSelectedEventNotes(null)}
          eventTitle={selectedEventNotes.title}
          notes={selectedEventNotes.notes}
        />
      )}
    </div>
  );
}
