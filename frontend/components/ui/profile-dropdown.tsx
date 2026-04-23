'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, Home, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ProfileDropdownProps {
  userName: string;
  userCity: string;
  userInitial: string;
  onSignOut: () => void;
  onOpenProfile: () => void;
  accentColor?: string;
}

export default function ProfileDropdown({ 
  userName, 
  userCity, 
  userInitial, 
  onSignOut,
  onOpenProfile,
  accentColor = '#195ADC'
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative z-[60]" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div className="hidden md:flex flex-col text-right">
          <p className="text-sm font-medium text-gray-900">{userName}</p>
          <p className="text-xs text-gray-500">{userCity}</p>
        </div>
        <div 
          className="h-10 w-10 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
          style={{ backgroundColor: `${accentColor}10` }}
        >
          <span className="text-sm font-semibold" style={{ color: accentColor }}>
            {userInitial}
          </span>
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed right-4 top-20 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-visible"
            style={{ zIndex: 9999 }}
          >
            {/* Profile Info */}
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <div 
                  className="h-12 w-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor}10` }}
                >
                  <span className="text-base font-semibold" style={{ color: accentColor }}>
                    {userInitial}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                  <p className="text-xs text-gray-500">{userCity}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <Link
                href="/"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Home className="h-4 w-4 text-gray-500" />
                <span>Home</span>
              </Link>

              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => {
                  onOpenProfile();
                  setIsOpen(false);
                }}
              >
                <User className="h-4 w-4 text-gray-500" />
                <span>Profile</span>
              </button>

              <div className="border-t border-gray-100 my-2"></div>

              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                onClick={() => {
                  onSignOut();
                  setIsOpen(false);
                }}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
