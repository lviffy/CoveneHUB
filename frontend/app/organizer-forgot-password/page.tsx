'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/convene/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, KeyRound, Film } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { OTPInput } from '@/components/ui/otp-input';
import Link from 'next/link';
import Image from 'next/image';

function MovieTeamForgotPasswordContent() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Start countdown for resend
  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Send OTP for password recovery
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          type: 'recovery',
          shouldCreateUser: false,
        },
      });

      if (error) {
        throw error;
      }

      setStep('otp');
      startCountdown();
      toast({
        title: 'Code Sent',
        description: 'Check your email for the 6-digit verification code.',
      });
    } catch (error: any) {
      // Handle common error messages
      let errorMessage = error.message || 'Failed to send reset code. Please try again.';
      
      if (errorMessage.includes('Signups not allowed') || errorMessage.includes('User not found')) {
        errorMessage = 'This email is not registered. Please sign up first.';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Verify OTP - this will create a session
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery',
      });

      if (error) {
        throw error;
      }

      if (!data?.session) {
        throw new Error('Verification failed');
      }

      toast({
        title: 'Verified!',
        description: 'Redirecting to password reset...',
      });

      // Redirect to reset password page with organizer context
      setTimeout(() => {
        router.push('/reset-password?from=organizer');
      }, 500);
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid or expired code. Please try again.',
        variant: 'destructive',
      });
      setOtp('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          type: 'recovery',
          shouldCreateUser: false,
        },
      });

      if (error) throw error;

      toast({
        title: 'Code Sent',
        description: 'A new verification code has been sent to your email.',
      });

      startCountdown();
      setOtp('');
    } catch (error: any) {
      let errorMessage = error.message || 'Please try again later.';
      
      if (errorMessage.includes('Signups not allowed') || errorMessage.includes('User not found')) {
        errorMessage = 'This email is not registered. Please sign up first.';
      }
      
      toast({
        title: 'Failed to Resend',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4">
      <Card className="w-full max-w-md border border-purple-200 shadow-lg">
        <CardHeader className="space-y-6 text-center pb-8">
          {/* ConveneHub Logo */}
          <div className="mx-auto">
            <Image
              src="/logo/Logomark_Cerulean_Blue.svg"
              alt="ConveneHub"
              width={80}
              height={80}
              className="mx-auto"
              priority
            />
          </div>
          
          {/* Title */}
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-[#010101]">
              {step === 'email' ? 'Reset Password' : 'Enter Verification Code'}
            </CardTitle>
            <CardDescription className="text-sm text-slate-600">
              {step === 'email' 
                ? 'Enter your email address and we\'ll send you a verification code.'
                : `We've sent a 6-digit code to ${email}`}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 'email' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-[#010101]">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 border-2 border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white font-medium mt-6"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4 text-white" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Verification Code
                  </>
                )}
              </Button>

              {/* Back to Login */}
              <div className="text-center pt-4">
                <Link 
                  href="/organizer-login" 
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* OTP Input */}
              <OTPInput
                value={otp}
                onChange={setOtp}
                disabled={isVerifying}
              />

              {isVerifying && (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                  <Spinner className="h-4 w-4" />
                  <span>Verifying...</span>
                </div>
              )}

              {/* Verify Button */}
              <Button
                type="button"
                onClick={handleVerifyOTP}
                className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white font-medium"
                disabled={otp.length !== 6 || isVerifying}
              >
                {isVerifying ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4 text-white" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Verify & Continue
                  </>
                )}
              </Button>

              {/* Resend Code */}
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
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className="text-purple-600 hover:text-purple-700"
                  >
                    {isLoading ? (
                      <>
                        <Spinner className="mr-2 h-3 w-3" />
                        Sending...
                      </>
                    ) : (
                      'Resend Code'
                    )}
                  </Button>
                )}
              </div>

              {/* Change Email */}
              <div className="text-center pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Use a different email
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MovieTeamForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white">
        <Spinner className="w-8 h-8" />
      </div>
    }>
      <MovieTeamForgotPasswordContent />
    </Suspense>
  );
}
