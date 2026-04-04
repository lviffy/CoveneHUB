'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/convene/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import EditEventForm from '@/components/admin/edit-event-form';

function EditEventContent() {
  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('id');
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    if (!eventId) {
      toast({
        title: 'Error',
        description: 'No event ID provided',
        variant: 'destructive',
      });
      router.push('/admin');
      return;
    }

    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    if (!eventId) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (error) throw error;

      if (!data) {
        toast({
          title: 'Error',
          description: 'Event not found',
          variant: 'destructive',
        });
        router.push('/admin');
        return;
      }

      setEvent(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load event',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8 text-[#195ADC]" />
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-6">Edit Event</h1>
          <EditEventForm event={event} />
        </div>
      </div>
    </div>
  );
}

export default function EditEventPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8 text-[#195ADC]" />
      </div>
    }>
      <EditEventContent />
    </Suspense>
  );
}
