'use client'

import React from 'react'
import { ArrowRight, Bell, Gift, LayoutDashboard, Megaphone, Settings2, Shield, Ticket } from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
  {
    icon: Ticket,
    title: 'Instant QR Tickets',
    description: 'Digital tickets delivered instantly via email. Simple, secure check-in.',
  },
  {
    icon: Shield,
    title: 'Verified Events',
    description: 'Trusted organizers and verified listings for a secure experience.',
  },
  {
    icon: Bell,
    title: 'Real-time Updates',
    description: 'Stay informed with instant notifications about your booking status.',
  },
  {
    icon: Gift,
    title: 'Exclusive Access',
    description: 'Limited seats and early-access drops for high-demand events.',
  },
]

const flows = [
  {
    title: 'Organizer Flow',
    icon: LayoutDashboard,
    accent: 'from-blue-500 to-cyan-500',
    steps: ['Organizer', 'Create Event', 'Set Ticket Tiers', 'Monitor Dashboard'],
  },
  {
    title: 'Attendee Flow',
    icon: Ticket,
    accent: 'from-emerald-500 to-teal-500',
    steps: ['Attendee', 'Register', 'Buy Ticket', 'Receive QR Code', 'Check-in'],
  },
  {
    title: 'Promoter Flow',
    icon: Megaphone,
    accent: 'from-amber-500 to-orange-500',
    steps: ['Promoter', 'Share Referral Link', 'Track Sales', 'Earn Commission'],
  },
  {
    title: 'Admin Flow',
    icon: Settings2,
    accent: 'from-violet-500 to-fuchsia-500',
    steps: ['Admin', 'Monitor Platform', 'Manage Tenants'],
  },
]

export default function EventsFeaturesSection() {
  return (
    <>
      <section className="relative bg-white px-6 py-32">
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="mb-6 inline-flex items-center gap-2 text-sm uppercase tracking-wide text-gray-500"
            >
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="h-[1px] w-8 origin-left bg-gray-300"
              />
              Role Flows
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="h-[1px] w-8 origin-right bg-gray-300"
              />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl"
            >
              Flow By Role
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="mx-auto max-w-2xl text-lg text-gray-600"
            >
              The platform now follows the organizer, attendee, promoter, and admin flows exactly as defined.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {flows.map((flow, index) => {
              const Icon = flow.icon

              return (
                <motion.div
                  key={flow.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.12,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className="relative overflow-hidden rounded-2xl border border-gray-200 bg-[#F9FAFB] p-8"
                >
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${flow.accent}`} />

                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                      <Icon className="h-5 w-5 text-gray-900" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{flow.title}</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {flow.steps.map((step, stepIndex) => (
                      <React.Fragment key={`${flow.title}-${step}`}>
                        <span className="rounded-full bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm">
                          {step}
                        </span>
                        {stepIndex < flow.steps.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-gray-300" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="relative bg-white px-6 py-32">
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="mb-6 inline-flex items-center gap-2 text-sm uppercase tracking-wide text-gray-500"
            >
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="h-[1px] w-8 origin-left bg-gray-300"
              />
              Why Book With Us
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="h-[1px] w-8 origin-right bg-gray-300"
              />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-4xl font-bold text-gray-900 md:text-5xl"
            >
              Seamless Experience
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className="group rounded-2xl bg-[#F9FAFB] p-8 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-gray-900 shadow-sm">
                  <feature.icon className="h-5 w-5" />
                </div>

                <h3 className="mb-3 text-lg font-bold text-gray-900">{feature.title}</h3>
                <p className="text-[15px] font-medium leading-relaxed text-gray-500">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
