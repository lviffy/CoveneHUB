import { Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { CompleteProfileForm } from './complete-profile-form';

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    }>
      <CompleteProfileForm />
    </Suspense>
  );
}
