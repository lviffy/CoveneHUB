'use client'
import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowDown, Search, MapPin, Calendar, Film, ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const GENRES = [
  { value: '', label: 'All Categories' },
  { value: 'conference', label: 'Conference' },
  { value: 'concert', label: 'Concert' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'festival', label: 'Festival' },
  { value: 'networking', label: 'Networking' },
  { value: 'sports', label: 'Sports' },
]

export default function EventsHeroSection() {
  const router = useRouter()
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [genre, setGenre] = useState('')
  const [isGenreOpen, setIsGenreOpen] = useState(false)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const genreRef = useRef<HTMLDivElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  // Prevent hydration mismatch and initial flash
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (genreRef.current && !genreRef.current.contains(event.target as Node)) {
        setIsGenreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Ensure video plays on mount
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.play().then(() => {
        setIsVideoLoaded(true)
      }).catch((err) => {
        console.log('Initial video play failed:', err)
      })
    }
  }, [])

  const handleSearch = () => {
    // Build search params
    const params = new URLSearchParams()
    if (location.trim()) params.set('location', location.trim())
    if (date) params.set('date', date)
    if (genre) params.set('genre', genre)

    // Navigate with search params if any filters are set
    if (params.toString()) {
      router.push(`/?${params.toString()}#events-list`)
    } else {
      // Just scroll if no filters
      document.getElementById('events-list')?.scrollIntoView({ behavior: 'smooth' })
    }
  }


  return (
    <section className="relative px-2.5 pb-2.5 z-20 bg-white">
      {/* Main Container with rounded corners */}
      <div className="relative w-full min-h-[calc(100vh-10px)] rounded-b-[20px] md:rounded-b-[24px] overflow-hidden flex flex-col items-center justify-center bg-white border-x border-b border-gray-100">

        {/* Background Video */}
        <div className="absolute inset-0 z-0">
          {/* Poster Image - Always rendered as fallback, hidden when video plays */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
            style={{
              backgroundImage: 'url(/hero-poster.jpg)',
              opacity: isVideoLoaded ? 0 : 1
            }}
            aria-hidden="true"
          />

          {/* Only render video after client-side mount to prevent hydration issues */}
          {isMounted && (
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              poster="/hero-poster.jpg"
              onCanPlayThrough={() => {
                setIsVideoLoaded(true)
                videoRef.current?.play().catch(err => console.log('Video play error:', err))
              }}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isVideoLoaded ? 'opacity-100' : 'opacity-0'
                }`}
            >
              {/* MP4 first - better compatibility */}
              <source src="/hero-bg.mp4" type="video/mp4" />
              {/* WebM as alternative */}
              <source src="/hero-bg.webm" type="video/webm" />
            </video>
          )}
        </div>

        {/* Dark Overlay */}
        <div className="absolute inset-0 z-[1] bg-black/60 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-5xl px-4 xs:px-5 sm:px-6 py-24 xs:py-28 sm:py-32">
          <div className="text-center">
            {/* Small Label - No initial opacity:0 to prevent flash */}
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-3 mb-8 xs:mb-10 sm:mb-12 text-xs xs:text-sm text-white/70 tracking-widest uppercase font-medium"
            >
              <div className="w-8 xs:w-10 h-[1px] bg-white/40" />
              Live Event Experiences
              <div className="w-8 xs:w-10 h-[1px] bg-white/40" />
            </motion.div>

            {/* Main Heading - No initial:false to prevent flash on mobile */}
            <div className="mb-8 xs:mb-10 sm:mb-12">
              <motion.h1
                initial={false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight leading-[1.1]"
              >
                Plan, Book,
              </motion.h1>
              <motion.span
                initial={false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-blue-500 tracking-tight leading-[1.1] block"
              >
                Attend
              </motion.span>
            </div>

            {/* Subtitle - No initial flash */}
            <motion.p
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-base xs:text-lg md:text-xl text-white max-w-2xl mx-auto mb-10 xs:mb-12 sm:mb-14 leading-relaxed font-light px-2"
            >
              Discover curated events near you, book in seconds, and walk in with secure QR-based entry.
            </motion.p>

            {/* Search Bar */}
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8 xs:mb-10 sm:mb-12"
            >
              <div className="inline-flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0 bg-white border border-gray-200 rounded-2xl sm:rounded-full p-3 sm:p-2 shadow-sm max-w-3xl w-full sm:w-auto">
                {/* Location */}
                <div className="flex items-center gap-2 px-4 py-2 sm:border-r border-gray-200">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full sm:w-28 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  />
                </div>

                {/* Date */}
                {/* Date */}
                <div
                  className="relative flex items-center gap-2 px-4 py-2 sm:border-r border-gray-200 cursor-pointer"
                  onClick={() => dateInputRef.current?.showPicker()}
                >
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  {/* Show placeholder text or formatted date */}
                  <span className={`text-sm ${!date ? 'text-gray-400' : 'text-gray-900'}`}>
                    {date ? date : 'Select Date'}
                  </span>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                </div>

                {/* Genre - Custom Dropdown */}
                <div ref={genreRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsGenreOpen(!isGenreOpen)}
                    className="flex items-center gap-2 px-4 py-2 w-full sm:w-auto"
                  >
                    <Film className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className={`text-sm ${genre ? 'text-gray-900' : 'text-gray-400'}`}>
                      {genre ? GENRES.find(g => g.value === genre)?.label : 'Category'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isGenreOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isGenreOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
                      >
                        <div className="py-1">
                          {GENRES.map((g) => (
                            <button
                              key={g.value}
                              type="button"
                              onClick={() => {
                                setGenre(g.value)
                                setIsGenreOpen(false)
                              }}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${genre === g.value
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                              <span>{g.label}</span>
                              {genre === g.value && (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Search Button */}
                <Button
                  onClick={handleSearch}
                  className="bg-gray-900 hover:bg-gray-800 text-white rounded-full h-10 w-full sm:w-10 sm:ml-2 flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span className="sm:hidden">Search</span>
                </Button>
              </div>
            </motion.div>

            {/* Single Prominent CTA */}
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                size="lg"
                className="group relative bg-gray-900 text-white hover:bg-gray-800 font-medium px-8 xs:px-10 h-12 xs:h-14 text-sm xs:text-base rounded-full overflow-hidden"
                onClick={() => {
                  document.getElementById('events-list')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span className="relative z-10">Explore Events</span>
                <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Button>
            </motion.div>


          </div>
        </div>
      </div>
    </section>
  )
}
