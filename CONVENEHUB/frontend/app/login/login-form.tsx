'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/convene/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { CityInput } from '@/components/ui/city-input';
import { OTPVerificationModal } from '@/components/auth/otp-verification-modal';
import Image from 'next/image';
import Link from 'next/link';
import { validateName as validateFullName } from '@/lib/validation/name';

// Password validation helper
const validatePassword = (password: string) => {
  const requirements = {
    minLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
  const isValid = Object.values(requirements).every(Boolean);
  return { isValid, requirements };
};

export function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [fullName, setFullName] = useState('');
  const [fullNameError, setFullNameError] = useState('');
  const [phone, setPhone] = useState('');  
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [showGoogleSignupForm, setShowGoogleSignupForm] = useState(false);
  const [googleSignupData, setGoogleSignupData] = useState({
    phone: '',
    city: '',
  });
  const handledAuthErrorRef = useRef<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast, dismiss } = useToast();
  const supabase = createClient();

  const switchToSignUp = (prefillEmail?: string, notice?: string) => {
    setIsSignUp(true);
    setPassword('');
    setPasswordTouched(false);
    setFullName('');
    setFullNameError('');
    setPhone('');
    setCity('');
    setAuthNotice(notice || '');
    if (prefillEmail) {
      setEmail(prefillEmail);
    }
    dismiss();
  };

  // Handle OTP verification success
  const handleOTPVerified = (role?: string) => {
    setShowOTPModal(false);
    
    toast({
      title: 'Account Verified!',
      description: 'Redirecting to your dashboard...',
    });
    
    // Redirect based on role
    setTimeout(() => {
      if (role === 'admin_team') {
        window.location.href = '/admin';
      } else if (role === 'movie_team') {
        window.location.href = '/movie-team';
      } else {
        window.location.href = '/events';
      }
    }, 500);
  };

  // Handle OAuth errors from URL parameters
  useEffect(() => {
    const error = searchParams.get('error');

    if (!error) {
      handledAuthErrorRef.current = null;
      return;
    }

    const errorDescription = searchParams.get('error_description');
    const details = searchParams.get('details');
    const prefillEmail = searchParams.get('email') || '';
    const errorKey = `${error}|${errorDescription || ''}|${details || ''}|${prefillEmail}`;

    if (handledAuthErrorRef.current === errorKey) {
      return;
    }
    handledAuthErrorRef.current = errorKey;

    let message = 'An error occurred during authentication.';

    if (error === 'user_not_found') {
      message = 'No account found for this email. Please sign up first.';
      switchToSignUp(prefillEmail || undefined, message);
    } else {
      if (error === 'auth_failed') {
        message = details || 'Authentication failed. Please try again.';
      } else if (error === 'no_code') {
        message = 'No authorization code received. Please try again.';
      } else if (errorDescription) {
        message = errorDescription;
      }

      setAuthNotice(message);
    }

    // Clean up URL query params to avoid re-processing error state on rerender.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      url.searchParams.delete('error_description');
      url.searchParams.delete('details');
      url.searchParams.delete('email');
      const query = url.searchParams.toString();
      window.history.replaceState({}, '', `${url.pathname}${query ? `?${query}` : ''}${url.hash}`);
    }
  }, [searchParams]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthNotice('');

    // Validate full name
    const { isValid: isNameValid, error: nameError } = validateFullName(fullName);
    if (!isNameValid) {
      setFullNameError(nameError);
      toast({
        title: 'Invalid Name',
        description: nameError,
        variant: 'destructive',
      });
      return;
    }
    setFullNameError('');
    
    // Validate password
    const { isValid: isPasswordValid } = validatePassword(password);
    if (!isPasswordValid) {
      toast({
        title: 'Password Requirements Not Met',
        description: 'Password must contain lowercase, uppercase, digits, and symbols.',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate phone number
    if (!phone || phone.trim().length < 10) {
      toast({
        title: 'Phone Number Required',
        description: 'Please enter a valid phone number (at least 10 digits).',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            city: city,
            role: 'user',
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create account');
      }

      // Keep OTP step for UI compatibility even in Mongo mode.
      await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token: 'mongo-compat',
        }),
      });

      // Store email for OTP verification
      setPendingVerificationEmail(email);

      // Clear form
      setEmail('');
      setPassword('');
      setFullName('');
      setPhone('');
      setCity('');
      
      // Show OTP verification modal
      setShowOTPModal(true);
      
      toast({
        title: 'Verification Code Sent',
        description: 'Check your email for the 6-digit code.',
      });
    } catch (error: any) {
      toast({
        title: 'Sign Up Failed',
        description: error.message || 'Failed to create account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthNotice('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // The API now returns user info with role directly
      const userRole = data.user?.role || 'user';
      const userPhone = data.user?.phone || data.user?.user_metadata?.phone;

      // Check if phone number is missing
      if (!userPhone) {
        toast({
          title: 'Profile Incomplete',
          description: 'Please add your phone number to continue.',
        });
        await new Promise(resolve => setTimeout(resolve, 100));
        window.location.href = '/complete-profile';
        return;
      }

      toast({
        title: 'Welcome back!',
        description: 'Redirecting...',
      });

      // Use window.location for a full page navigation to ensure server picks up the new session
      // Small delay to ensure local auth state is persisted before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (userRole === 'admin_team') {
        window.location.href = '/admin';
      } else if (userRole === 'movie_team') {
        window.location.href = '/movie-team';
      } else {
        window.location.href = '/events';
      }
      return; // Prevent finally block from running setIsLoading(false)
    } catch (error: any) {
      const errorMessage = error.message || 'Incorrect email or password. Please try again.';
      const errorCode = error?.code || '';

      if (errorCode === 'USER_NOT_FOUND' || errorMessage.toLowerCase().includes('no account found')) {
        const message = 'No account found for this email. Please sign up first.';
        switchToSignUp(email, message);
        return;
      }

      setAuthNotice(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const supabase = createClient();
      // Ensure sign-in flow is treated as sign-in (not stale sign-up intent)
      document.cookie = 'pending_google_signup=; Max-Age=0; Path=/; SameSite=Lax';
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign in with Google',
        variant: 'destructive',
      });
    }
  };

  const handleGoogleSignUp = async () => {
    // Show form to collect details before OAuth
    setShowGoogleSignupForm(true);
  };

  const proceedWithGoogleSignup = async () => {
    // Validate required fields
    if (!googleSignupData.phone || googleSignupData.phone.trim().length < 10) {
      toast({
        title: 'Required Field',
        description: 'Please enter a valid phone number (at least 10 digits)',
        variant: 'destructive',
      });
      return;
    }

    if (!googleSignupData.city) {
      toast({
        title: 'Required Field',
        description: 'Please enter your city',
        variant: 'destructive',
      });
      return;
    }

    try {
      const supabase = createClient();
      
      // Store signup data in cookie so server can access it
      // Role is always 'user' for regular login page
      const signupDataWithRole = {
        ...googleSignupData,
        role: 'user',
      };
      
      // SECURITY: Use Secure flag in production, SameSite=Lax for OAuth flow to ensure cookie is sent on callback
      const isSecure = window.location.protocol === 'https:';
      const secureFlag = isSecure ? ' Secure;' : '';
      document.cookie = `pending_google_signup=${encodeURIComponent(JSON.stringify(signupDataWithRole))}; path=/; max-age=600; SameSite=Lax;${secureFlag}`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign up with Google',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      {/* OTP Verification Modal */}
      <OTPVerificationModal
        open={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        email={pendingVerificationEmail}
        type="signup"
        onVerified={handleOTPVerified}
      />

      <Card className="w-full max-w-md border border-slate-200 shadow-sm">
        <CardHeader className="space-y-6 text-center pb-8">
          {/* CONVENEHUB Logo */}
          <div className="mx-auto">
            <Image
              src="/logo/Logomark_Cerulean_Blue.svg"
              alt="CONVENEHUB"
              width={80}
              height={80}
              className="mx-auto"
              priority
            />
          </div>
          
          {/* Title */}
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-[#010101]">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="text-sm text-slate-600">
              {isSignUp ? 'Join CONVENEHUB to discover and book live events' : 'Sign in to your account'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {authNotice && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {authNotice}
            </div>
          )}

          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
            {/* Full Name Field - Only for Sign Up */}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium text-[#010101]">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFullName(val);
                    // Live validation feedback once user has started typing
                    if (val.length > 0) {
                      const { error } = validateFullName(val);
                      setFullNameError(error);
                    } else {
                      setFullNameError('');
                    }
                  }}
                  required
                  disabled={isLoading}
                  maxLength={100}
                  aria-describedby={fullNameError ? 'fullNameError' : undefined}
                  className={`h-11 border-2 transition-all duration-200 focus:ring-2 focus:ring-[#195ADC]/20 ${
                    fullNameError
                      ? 'border-red-400 focus:border-red-400'
                      : 'border-slate-200 focus:border-[#195ADC]'
                  }`}
                />
                {fullNameError && (
                  <p id="fullNameError" className="text-xs text-red-500 mt-1">
                    {fullNameError}
                  </p>
                )}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#010101]">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 border-2 border-slate-200 focus:border-[#195ADC] focus:ring-2 focus:ring-[#195ADC]/20 transition-all duration-200"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-[#010101]">
                  Password <span className="text-red-500">*</span>
                </Label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push('/forgot-password');
                    }}
                    className="text-xs text-[#195ADC] hover:text-[#195ADC]/80 font-medium cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (!passwordTouched) setPasswordTouched(true);
                }}
                onBlur={() => setPasswordTouched(true)}
                required
                disabled={isLoading}
                className="h-11 border-2 border-slate-200 focus:border-[#195ADC] focus:ring-2 focus:ring-[#195ADC]/20 transition-all duration-200"
              />
              {/* Password Requirements - Only show during signup */}
              {isSignUp && passwordTouched && password.length > 0 && (() => {
                const { requirements } = validatePassword(password);
                return (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-700 mb-2">Password must contain:</p>
                    <ul className="text-xs space-y-1">
                      <li className={`flex items-center gap-1.5 ${requirements.minLength ? 'text-green-600' : 'text-slate-500'}`}>
                        {requirements.minLength ? '✓' : '○'} At least 8 characters
                      </li>
                      <li className={`flex items-center gap-1.5 ${requirements.hasLowercase ? 'text-green-600' : 'text-slate-500'}`}>
                        {requirements.hasLowercase ? '✓' : '○'} Lowercase letter (a-z)
                      </li>
                      <li className={`flex items-center gap-1.5 ${requirements.hasUppercase ? 'text-green-600' : 'text-slate-500'}`}>
                        {requirements.hasUppercase ? '✓' : '○'} Uppercase letter (A-Z)
                      </li>
                      <li className={`flex items-center gap-1.5 ${requirements.hasDigit ? 'text-green-600' : 'text-slate-500'}`}>
                        {requirements.hasDigit ? '✓' : '○'} Number (0-9)
                      </li>
                      <li className={`flex items-center gap-1.5 ${requirements.hasSymbol ? 'text-green-600' : 'text-slate-500'}`}>
                        {requirements.hasSymbol ? '✓' : '○'} Symbol (!@#$%^&*...)
                      </li>
                    </ul>
                  </div>
                );
              })()}
            </div>

            {/* Phone Field - Only for Sign Up */}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-[#010101]">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 border-2 border-slate-200 focus:border-[#195ADC] focus:ring-2 focus:ring-[#195ADC]/20 transition-all duration-200"
                />
              </div>
            )}

            {/* City Field - Only for Sign Up */}
            {isSignUp && (
              <CityInput
                value={city}
                onChange={setCity}
                required
                disabled={isLoading}
                label="City"
                placeholder="e.g., Mumbai, Delhi, Bangalore"
              />
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-10 bg-[#195ADC] hover:bg-[#195ADC]/90 text-white font-medium mt-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4 text-white" />
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (
                <>
                  {isSignUp ? (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </>
                  )}
                </>
              )}
            </Button>
          </form>

          {/* Toggle Sign In / Sign Up */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthNotice('');
                setEmail('');
                setPassword('');
                setPasswordTouched(false);
                setFullName('');
                setFullNameError('');
                setCity('');
              }}
              disabled={isLoading}
              className="text-sm text-[#195ADC] hover:text-[#195ADC]/80 font-medium transition-colors disabled:opacity-50"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {/* Google Sign Up - Only for Sign Up mode */}
          {isSignUp && (
            <>
              {/* Divider */}
              <div className="relative">
                <Separator className="bg-slate-200" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-slate-500">
                  or
                </span>
              </div>

              {/* Google Sign Up */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 border-slate-300 hover:bg-slate-50"
                onClick={handleGoogleSignUp}
                disabled={isLoading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign Up with Google
              </Button>
            </>
          )}

          {/* Only show Google Sign In for Sign In mode */}
          {!isSignUp && (
            <>
              {/* Divider */}
              <div className="relative">
                <Separator className="bg-slate-200" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-slate-500">
                  or
                </span>
              </div>

              {/* Google Sign In */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 border-slate-300 hover:bg-slate-50"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Google Sign Up Details Modal */}
      <Dialog open={showGoogleSignupForm} onOpenChange={setShowGoogleSignupForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#010101]">Complete Your Profile</DialogTitle>
            <DialogDescription>
              Please provide the following details to continue with Google sign up
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Phone Field */}
            <div className="space-y-2">
              <Label htmlFor="google-phone" className="text-sm font-medium text-[#010101]">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="google-phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={googleSignupData.phone}
                onChange={(e) => setGoogleSignupData({...googleSignupData, phone: e.target.value})}
                className="h-11 border-2 border-slate-200 focus:border-[#195ADC] focus:ring-2 focus:ring-[#195ADC]/20"
              />
            </div>

            {/* City Field */}
            <CityInput
              value={googleSignupData.city}
              onChange={(val) => setGoogleSignupData({...googleSignupData, city: val})}
              required
              label="City"
              placeholder="e.g., Mumbai, Delhi, Bangalore"
              id="google-city"
            />
          </div>

          <DialogFooter className="flex flex-row gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowGoogleSignupForm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={proceedWithGoogleSignup}
              className="flex-1 bg-[#195ADC] hover:bg-[#195ADC]/90 text-white"
              disabled={!googleSignupData.city || !googleSignupData.phone || googleSignupData.phone.trim().length < 10}
            >
              Continue with Google
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
