'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { OTPInput } from '@/components/ui/otp-input';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { Mail, RefreshCw, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/convene/client';

interface OTPVerificationModalProps {
  open: boolean;
  onClose: () => void;
  email: string;
  type: 'signup' | 'email' | 'recovery';
  onVerified: (role?: string) => void;
}

export function OTPVerificationModal({
  open,
  onClose,
  email,
  type,
  onVerified,
}: OTPVerificationModalProps) {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setOtp('');
      setCountdown(60);
      setIsVerified(false);
      setError(null);
    }
  }, [open]);

  // Countdown timer for resend
  useEffect(() => {
    if (!open || countdown === 0) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [open, countdown]);

  const handleVerify = useCallback(async () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    // If already verified, don't try again
    if (isVerified) {
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp, type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // Mark as verified IMMEDIATELY
      setIsVerified(true);
      // Close modal BEFORE calling onVerified to prevent any modal-related errors
      onClose();
      // Then call the callback which will handle the redirect
      onVerified(data.role);
    } catch (error: any) {
      // Only show error if not already verified
      if (!isVerified) {
        setError(error.message || 'Invalid or expired code. Please try again.');
        setOtp('');
      }
    } finally {
      setIsVerifying(false);
    }
  }, [otp, email, type, onVerified, onClose, isVerified]);

  // Auto-verify when OTP is complete
  useEffect(() => {
    if (otp.length === 6 && !isVerifying) {
      handleVerify();
    }
  }, [otp, isVerifying, handleVerify]);

  const handleResend = async () => {
    setIsResending(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
        }
      });

      if (error) throw error;

      toast({
        title: 'Code Sent',
        description: 'A new verification code has been sent to your email.',
      });

      setCountdown(60);
      setOtp('');
    } catch (error: any) {
      setError(error.message || 'Failed to resend code. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-[#195ADC]" />
          </div>
          <DialogTitle className="text-xl font-bold text-center">Enter Verification Code</DialogTitle>
          <DialogDescription className="text-center">
            We&apos;ve sent a 6-digit code to
            <br />
            <span className="font-medium text-[#010101]">{email}</span>
            <br />
            <span className="text-xs text-slate-500 mt-1 inline-block">Code expires in 10 minutes</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Error Alert - Shows inside modal */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Verification Failed</p>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          )}

          <OTPInput
            value={otp}
            onChange={(val) => {
              setOtp(val);
              if (error) setError(null);
            }}
            disabled={isVerifying}
          />

          {isVerifying && (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
              <Spinner className="h-4 w-4" />
              <span>Verifying...</span>
            </div>
          )}

          <div className="text-center space-y-2">
            <p className="text-sm text-slate-600">
              Didn&apos;t receive the code?
            </p>
            {countdown > 0 ? (
              <p className="text-sm text-slate-500">
                Resend in {countdown}s
              </p>
            ) : (
              <Button
                type="button"
                variant="link"
                onClick={handleResend}
                disabled={isResending}
                className="text-[#195ADC] hover:text-[#195ADC]/80"
              >
                {isResending ? (
                  <>
                    <Spinner className="mr-2 h-3 w-3" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Resend Code
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="text-center">
            <Button
              type="button"
              onClick={handleVerify}
              disabled={otp.length !== 6 || isVerifying}
              className="w-full bg-[#195ADC] hover:bg-[#195ADC]/90 text-white"
            >
              {isVerifying ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
