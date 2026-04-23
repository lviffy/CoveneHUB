'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, LogIn, RefreshCw } from 'lucide-react';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const details = searchParams.get('details');
  const errorDescription = searchParams.get('error_description');

  // Map error codes to user-friendly messages
  const errorMessages: Record<string, { title: string; description: string; action: string }> = {
    verification_failed: {
      title: 'Email Verification Failed',
      description: details || 'The verification link may have expired or is invalid. Please request a new one.',
      action: 'Try signing up again',
    },
    invalid_link: {
      title: 'Invalid Link',
      description: details || 'This confirmation link is invalid or has expired.',
      action: 'Request new link',
    },
    invalid_callback: {
      title: 'Authentication Error',
      description: details || 'The authentication callback did not receive proper data.',
      action: 'Try again',
    },
    access_denied: {
      title: 'Access Denied',
      description: details || 'You do not have permission to access this resource.',
      action: 'Go to login',
    },
    auth_failed: {
      title: 'Authentication Failed',
      description: details || errorDescription || 'Something went wrong during authentication.',
      action: 'Try again',
    },
    no_code: {
      title: 'Missing Authorization',
      description: 'No authorization code was received from the provider.',
      action: 'Try again',
    },
  };

  const errorInfo = errorMessages[error || 'unknown'] || {
    title: 'Something Went Wrong',
    description: details || errorDescription || 'An unexpected error occurred during authentication.',
    action: 'Go back',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white p-4">
      <Card className="w-full max-w-md border-red-200 shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#010101]">
            {errorInfo.title}
          </CardTitle>
          <CardDescription className="text-sm text-slate-600">
            {errorInfo.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Technical Details (for debugging) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-slate-100 rounded-lg p-3 text-xs font-mono break-all">
              <div className="font-semibold mb-1">Debug Info:</div>
              <div>Error: {error || 'unknown'}</div>
              {details && <div>Details: {details}</div>}
              {errorDescription && <div>Description: {errorDescription}</div>}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              asChild
              className="w-full h-11 bg-[#195ADC] hover:bg-[#1451C3]"
            >
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                {errorInfo.action}
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full h-11"
            >
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go to Homepage
              </Link>
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-slate-500">
              If this problem persists, please contact support at{' '}
              <a href="mailto:technical@convenehub.in" className="text-[#195ADC] hover:underline">
                technical@convenehub.in
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}
