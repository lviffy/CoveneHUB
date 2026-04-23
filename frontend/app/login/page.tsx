import { Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
