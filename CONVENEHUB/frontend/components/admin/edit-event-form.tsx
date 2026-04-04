'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/convene/client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, Upload, X, ImageIcon } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { format } from 'date-fns';
import { validateImageFile, generateSecureFilename } from '@/lib/validation/file';

// Form validation schema
const eventFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  venue_name: z.string().min(3, 'Venue name is required'),
  venue_address: z.string().min(5, 'Venue address must be at least 5 characters'),
  city: z.string().min(2, 'City is required'),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  date_time: z.string().min(1, 'Date and time are required'),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1'),
  ticket_price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  platform_commission_percentage: z.coerce.number().min(0, 'Commission must be 0 or greater').max(100, 'Commission cannot exceed 100%'),
  event_image: z.string().optional(),
  entry_instructions: z.string().optional(),
  terms: z.string().optional(),
  status: z.enum(['draft', 'published', 'checkin_open', 'in_progress', 'ended']),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EditEventFormProps {
  event: any;
}

export default function EditEventForm({ event }: EditEventFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(event.event_image || '');
  const [bookedTickets, setBookedTickets] = useState(0);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Fetch actual booked tickets count
  useEffect(() => {
    const fetchBookedTickets = async () => {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('tickets_count')
        .eq('event_id', event.event_id)
        .neq('booking_status', 'cancelled');
      
      const total = bookings?.reduce((sum: number, booking: any) => sum + (booking.tickets_count || 1), 0) ?? 0;
      setBookedTickets(total);
    };
    
    fetchBookedTickets();
  }, [event.event_id, supabase]);

  // Format date_time for input (YYYY-MM-DDTHH:MM format)
  const formatDateTimeForInput = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "yyyy-MM-dd'T'HH:mm");
    } catch (error) {
      return '';
    }
  };

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event.title || '',
      description: event.description || '',
      venue_name: event.venue_name || '',
      venue_address: event.venue_address || '',
      city: event.city || '',
      latitude: event.latitude?.toString() || '',
      longitude: event.longitude?.toString() || '',
      date_time: formatDateTimeForInput(event.date_time),
      capacity: event.capacity || 50,
      ticket_price: event.ticket_price || 0,
      platform_commission_percentage: event.platform_commission_percentage || 10,
      event_image: event.event_image || '',
      entry_instructions: event.entry_instructions || '',
      terms: event.terms || '',
      status: event.status || 'draft',
    },
  });

  const onSubmit = async (data: EventFormValues) => {
    setIsSubmitting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate remaining slots based on actual tickets booked
      const { data: bookings } = await supabase
        .from('bookings')
        .select('tickets_count')
        .eq('event_id', event.event_id)
        .neq('booking_status', 'cancelled');
      
      const totalTickets = bookings?.reduce((sum: number, booking: any) => sum + (booking.tickets_count || 1), 0) ?? 0;
      const newRemaining = data.capacity - totalTickets;

      if (newRemaining < 0) {
        toast({
          title: 'Invalid capacity',
          description: `Capacity cannot be less than current tickets booked (${totalTickets} tickets booked)`,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Update event in database
      const updateData = {
        title: data.title,
        description: data.description,
        venue_name: data.venue_name,
        venue_address: data.venue_address,
        city: data.city,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        date_time: new Date(data.date_time).toISOString(),
        capacity: data.capacity,
        remaining: newRemaining,
        ticket_price: data.ticket_price,
        platform_commission_percentage: data.platform_commission_percentage,
        event_image: data.event_image || null,
        entry_instructions: data.entry_instructions || null,
        terms: data.terms || null,
        status: data.status,
      };

      // @ts-ignore - Supabase type mismatch
      const { error } = await (supabase as any)
        .from('events')
        .update(updateData)
        .eq('event_id', event.event_id);

      if (error) {
        throw error;
      }

      // Log the action in audit logs
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        actor_role: 'admin_team',
        action: 'UPDATE_EVENT',
        entity: 'events',
        entity_id: event.event_id,
      } as any);

      toast({
        title: 'Success!',
        description: `Event "${data.title}" has been updated.`,
      });

      // Navigate back to admin dashboard
      router.push('/admin');
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update event. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Comprehensive validation using validation utility
    const validation = validateImageFile(file);
    
    if (!validation.valid) {
      toast({
        title: 'Invalid file',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Delete old image from storage if it exists
      const currentImage = form.getValues('event_image');
      if (currentImage) {
        try {
          const url = new URL(currentImage);
          const pathParts = url.pathname.split('/');
          const bucketIndex = pathParts.findIndex(part => part === 'event-images');
          
          if (bucketIndex !== -1) {
            const filePath = pathParts.slice(bucketIndex + 1).join('/');
            await supabase.storage
              .from('events')
              .remove([filePath]);
          }
        } catch (urlError) {
        }
      }

      // Generate secure filename with validated extension
      const fileName = generateSecureFilename(file.name);
      const filePath = `events/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('events')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('events')
        .getPublicUrl(filePath);

      // Update form field and preview
      form.setValue('event_image', publicUrl);
      setImagePreview(publicUrl);

      toast({
        title: 'Image uploaded',
        description: 'Event poster uploaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    const currentImage = form.getValues('event_image');
    
    // Delete from storage if image exists
    if (currentImage) {
      try {
        // Extract the file path from the public URL
        const url = new URL(currentImage);
        const pathParts = url.pathname.split('/');
        
        // Find the position of 'event-images' in the path
        const bucketIndex = pathParts.findIndex(part => part === 'event-images');
        
        if (bucketIndex !== -1 && pathParts.length > bucketIndex + 1) {
          // Get the file path after the bucket name (everything after 'event-images/')
          const filePath = pathParts.slice(bucketIndex + 1).join('/');
          
          
          // Delete from storage
          const { data, error: storageError } = await supabase.storage
            .from('event-images')
            .remove([filePath]);
          
          
          if (storageError) {
            toast({
              title: 'Warning',
              description: `Storage cleanup failed: ${storageError.message}`,
              variant: 'destructive',
            });
          } else {
            
            // Verify deletion by trying to get the file (should fail)
            const { data: listData, error: listError } = await supabase.storage
              .from('event-images')
              .list(filePath.split('/')[0], {
                search: filePath.split('/').pop()
              });
            
            
            toast({
              title: 'Image removed',
              description: 'Event poster has been removed and deleted from storage',
            });
          }
        } else {
          toast({
            title: 'Warning',
            description: 'Could not parse image URL for storage deletion',
            variant: 'destructive',
          });
        }
      } catch (urlError) {
        toast({
          title: 'Error',
          description: 'Failed to parse image URL',
          variant: 'destructive',
        });
      }
    }
    
    form.setValue('event_image', '');
    setImagePreview('');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Title *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Startup Summit 2026 - Day 1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the event experience..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Event Image Upload */}
        <FormField
          control={form.control}
          name="event_image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Poster</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Event poster preview"
                        className="w-full max-w-md h-64 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="image-upload"
                        className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <ImageIcon className="w-12 h-12 mb-3 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG (MAX. 5MB)</p>
                          <p className="text-xs text-gray-400 mt-1">Recommended: 1920x560px</p>
                        </div>
                        <input
                          id="image-upload"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  )}
                  {isUploading && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Spinner className="h-4 w-4 text-[#195ADC]" />
                      Uploading image...
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Upload a poster image for the event (optional). Recommended dimensions: 1920x560px for best display quality.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Venue Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="venue_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Venue Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Film City Studios" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Mumbai, Hyderabad, Bangalore" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="venue_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue Address *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Full venue address..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Coordinates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 19.0760" {...field} />
                </FormControl>
                <FormDescription>Optional GPS coordinate</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="longitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Longitude</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 72.8777" {...field} />
                </FormControl>
                <FormDescription>Optional GPS coordinate</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Date and Time */}
        <FormField
          control={form.control}
          name="date_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date & Time *</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Capacity and Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity *</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormDescription>
                  Current tickets booked: {bookedTickets}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ticket_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ticket Price (₹) *</FormLabel>
                <FormControl>
                  <Input type="number" min="0" placeholder="0" {...field} />
                </FormControl>
                <FormDescription>Enter 0 for free events</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="platform_commission_percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CONVENEHUB Commission (%) *</FormLabel>
                <FormControl>
                  <Input type="number" min="0" max="100" step="0.01" placeholder="10" {...field} />
                </FormControl>
                <FormDescription>Platform commission (0-100). Default: 10%</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Entry Instructions */}
        <FormField
          control={form.control}
          name="entry_instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entry Instructions</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Important information for attendees..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Share any special instructions or requirements
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Terms and Conditions */}
        <FormField
          control={form.control}
          name="terms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Specific Terms & Conditions</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter specific rules, NDA clauses, or terms for this event..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                These terms will be shown to the user in a popup and they must agree before booking.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Status *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="draft">Draft - Not visible to public</SelectItem>
                  <SelectItem value="published">Published - Visible, bookings open</SelectItem>
                  <SelectItem value="checkin_open">Check-in Open - Visible, bookings closed</SelectItem>
                  <SelectItem value="in_progress">In Progress - Not visible, event ongoing</SelectItem>
                  <SelectItem value="ended">Ended - Not visible, event completed</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Control event visibility and booking availability
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Spinner className="mr-2 h-4 w-4 text-white" />
                Updating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Update Event
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
