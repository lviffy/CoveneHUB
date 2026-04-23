'use client'
import React, { useState, useRef, useEffect } from 'react'
import { Shield, Ticket, Bell, Gift } from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
    {
        icon: Ticket,
        title: "Instant QR Tickets",
        description: "Digital tickets delivered instantly via email. Simple, secure check-in."
    },
    {
        icon: Shield,
        title: "Verified Events",
        description: "Trusted organizers and vetted listings for a reliable booking experience."
    },
    {
        icon: Bell,
        title: "Real-time Updates",
        description: "Stay informed with instant notifications about your booking status."
    },
    {
        icon: Gift,
        title: "Exclusive Access",
        description: "Limited seats and early-access drops for high-demand events."
    }
]

// Mobile Carousel Component
const MobileFeatureCarousel = () => {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPaused, setIsPaused] = useState(false)
    const touchStartX = useRef(0)
    const touchEndX = useRef(0)

    // Auto-scroll effect
    useEffect(() => {
        if (isPaused) return

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % features.length)
        }, 4000)

        return () => clearInterval(interval)
    }, [isPaused])

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsPaused(true)
        touchStartX.current = e.touches[0].clientX
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX
    }

    const handleTouchEnd = () => {
        const diff = touchStartX.current - touchEndX.current
        if (Math.abs(diff) > 50) {
            if (diff > 0 && currentIndex < features.length - 1) {
                setCurrentIndex(currentIndex + 1)
            } else if (diff < 0 && currentIndex > 0) {
                setCurrentIndex(currentIndex - 1)
            }
        }
        // Resume auto-scroll after 5 seconds
        setTimeout(() => setIsPaused(false), 5000)
    }

    const goToSlide = (index: number) => {
        setCurrentIndex(index)
        setIsPaused(true)
        setTimeout(() => setIsPaused(false), 5000)
    }

    const currentFeature = features[currentIndex]
    const Icon = currentFeature.icon

    return (
        <div className="md:hidden">
            {/* Carousel Container */}
            <div
                className="relative overflow-hidden rounded-2xl"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <motion.div
                    className="flex"
                    animate={{ x: `-${currentIndex * 100}%` }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    {features.map((feature, index) => {
                        const FeatureIcon = feature.icon
                        return (
                            <div
                                key={index}
                                className="w-full flex-shrink-0 bg-[#F9FAFB] rounded-2xl p-8"
                            >
                                {/* Icon */}
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-900 mb-6 shadow-sm">
                                    <FeatureIcon className="w-6 h-6" />
                                </div>

                                {/* Content */}
                                <h3 className="text-xl font-bold text-gray-900 mb-3">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-500 leading-relaxed text-base">
                                    {feature.description}
                                </p>
                            </div>
                        )
                    })}
                </motion.div>
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-6">
                {features.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentIndex
                            ? "bg-gray-900 w-6"
                            : "bg-gray-300"
                            }`}
                        aria-label={`Go to feature ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    )
}

// Desktop Grid Component
const DesktopFeaturesGrid = () => (
    <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-2">
        {features.map((feature, index) => (
            <motion.div
                key={index}
                initial={false}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                    duration: 0.4,
                    delay: index * 0.05,
                    ease: [0.25, 0.1, 0.25, 1]
                }}
                className="group bg-[#F9FAFB] p-8 rounded-2xl transition-all duration-300 hover:translate-y-[-4px]"
            >
                {/* Icon */}
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-gray-900 mb-6 shadow-sm">
                    <feature.icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                    {feature.title}
                </h3>
                <p className="text-gray-500 leading-relaxed text-[15px] font-medium">
                    {feature.description}
                </p>
            </motion.div>
        ))}
    </div>
)

export default function SeamlessExperienceSection() {
    return (
        <section className="relative py-20 md:py-32 px-4 md:px-6 bg-white">
            <div className="relative mx-auto max-w-7xl">

                {/* Section Label */}
                <div className="text-center mb-12 md:mb-20">
                    <motion.div
                        initial={false}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                        className="inline-flex items-center gap-2 mb-6 text-sm text-gray-500 tracking-wide uppercase"
                    >
                        <motion.div
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                            className="w-8 h-[1px] bg-gray-300 origin-left"
                        />
                        Why Attend With Us
                        <motion.div
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                            className="w-8 h-[1px] bg-gray-300 origin-right"
                        />
                    </motion.div>
                    <motion.h2
                        initial={false}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                        className="text-3xl md:text-5xl font-bold text-gray-900"
                    >
                        Built for Smooth Event Days
                    </motion.h2>
                </div>

                {/* Mobile Carousel */}
                <MobileFeatureCarousel />

                {/* Desktop Grid */}
                <DesktopFeaturesGrid />
            </div>
        </section>
    )
}
