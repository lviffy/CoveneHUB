import { ReactNode } from 'react';
import { EventsHeader } from '@/components/events-header';

export default function EventsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <EventsHeader />
      {children}
    </>
  );
}
