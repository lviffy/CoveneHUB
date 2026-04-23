'use client';

import { useRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function OTPInput({ 
  length = 6, 
  value, 
  onChange,
  disabled = false 
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));

  useEffect(() => {
    // Sync with external value
    const otpArray = value.split('').slice(0, length);
    const paddedArray = [...otpArray, ...Array(length - otpArray.length).fill('')];
    setOtp(paddedArray);
  }, [value, length]);

  const handleChange = (index: number, digit: string) => {
    if (!/^\d*$/.test(digit)) return; // Only digits

    const newOtp = [...otp];
    newOtp[index] = digit.slice(-1); // Take last character
    setOtp(newOtp);
    onChange(newOtp.join(''));

    // Auto-focus next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    const newOtp = [...otp];
    
    pastedData.split('').forEach((digit, idx) => {
      if (idx < length) newOtp[idx] = digit;
    });
    
    setOtp(newOtp);
    onChange(newOtp.join(''));
    
    // Focus last filled input or next empty
    const nextIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {otp.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-12 h-14 text-center text-2xl font-bold border-2 border-slate-300 focus:border-[#195ADC] focus:ring-2 focus:ring-[#195ADC]/20"
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
