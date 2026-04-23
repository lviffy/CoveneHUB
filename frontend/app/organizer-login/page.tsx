import { Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { OrganizerLoginForm } from './organizer-login-form';

export default function OrganizerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Spinner className="w-8 h-8" />
        </div>
      }
    >
      <OrganizerLoginForm />
    </Suspense>
  );
}
