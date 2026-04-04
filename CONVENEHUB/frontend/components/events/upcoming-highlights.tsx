'use client'
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/convene/client'
import type { Event } from '@/types/database.types'
import Image from 'next/image'

export default function UpcomingHighlights() {
    const [event, setEvent] = useState<Event | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchUpcomingEvent = async () => {
            const supabase = createClient()
            const today = new Date().toISOString()

            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('status', 'published')
                .gte('date_time', today)
                .order('date_time', { ascending: true })
                .limit(1)
                .single()

            if (!error && data) {
                setEvent(data as Event)
            }
            setLoading(false)
        }

        fetchUpcomingEvent()
    }, [])

    const getDateLabel = (dateStr: string) => {
        const eventDate = new Date(dateStr)
        const today = new Date()
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        if (eventDate.toDateString() === today.toDateString()) {
            return 'Today'
        } else if (eventDate.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow'
        } else {
            const dayOfWeek = eventDate.toLocaleDateString('en-US', { weekday: 'long' })
            return `This ${dayOfWeek}`
        }
    }

    if (loading) {
        return (
            <section className="py-16 sm:py-20 bg-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <div className="animate-pulse">
                        <div className="h-64 bg-gray-100 rounded-2xl" />
                    </div>
                </div>
            </section>
        )
    }

    if (!event) return null

    return (
        <section className="py-16 sm:py-20 bg-white">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
                {/* Header */}
                <div className="mb-8">
                    <motion.p
                        initial={false}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-xs uppercase tracking-widest text-gray-500 mb-3"
                    >
                        Coming up next
                    </motion.p>
                    <motion.h2
                        initial={false}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.05 }}
                        className="text-2xl sm:text-3xl font-bold text-gray-900"
                    >
                        Upcoming Highlights
                    </motion.h2>
                </div>

                {/* Featured Event Card */}
                <motion.a
                    href={`/events/${event.event_id}`}
                    initial={false}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="group block"
                >
                    <div className="relative bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                        <div className="flex flex-col lg:flex-row">
                            {/* Image */}
                            <div className="relative w-full lg:w-1/2 h-64 lg:h-80">
                                <Image
                                    src={event.event_image || '/event-placeholder.jpg'}
                                    alt={event.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                {/* Date Label */}
                                <div className="absolute top-4 left-4 bg-white text-gray-900 text-sm font-medium px-4 py-2 rounded-full flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {getDateLabel(event.date_time)}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 p-6 lg:p-10 flex flex-col justify-center">
                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 group-hover:text-gray-700 transition-colors">
                                    {event.title}
                                </h3>

                                <p className="text-gray-600 mb-6 line-clamp-2">
                                    {event.description}
                                </p>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">{event.venue_name}, {event.city}</p>
                                        <p className="text-lg font-semibold text-gray-900 mt-1">
                                            {event.ticket_price === 0 ? 'Free' : `₹${event.ticket_price}`}
                                        </p>
                                    </div>

                                    <Button className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6 group/btn">
                                        Book Now
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.a>
            </div>
        </section>
    )
}
