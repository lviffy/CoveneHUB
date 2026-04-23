'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'motion/react'
import { useState } from 'react'

export default function NotFound() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-blue-600">
            404
          </h1>
        </div>

        {/* Error Message */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Page Not Found
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            Sorry, the page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Back Button with shine effect */}
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}>
          <Link href="/">
            <button
              className={cn(
                'bg-blue-600 text-white hover:bg-blue-700',
                'font-semibold px-6 h-10 text-base',
                'group transition-all duration-300 border border-blue-500',
                'hover:border-blue-600 flex items-center gap-2 mx-auto rounded-lg',
                'relative overflow-hidden'
              )}>
              {/* Animated shine effect */}
              <motion.div
                animate={isHovered ? { x: ['100%', '-100%'] } : { x: '-100%' }}
                transition={{ duration: 0.8, repeat: isHovered ? Infinity : 0 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              />

              <ArrowLeft className="w-4 h-4 relative" />
              <span className="relative">Back to Home</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
