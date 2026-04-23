'use client'
import React from 'react'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Twitter,
  Linkedin,
  Mail
} from 'lucide-react'

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
  </svg>
)

const footerLinks = {
  platform: [
    { name: 'Events', href: '/events' },
    { name: 'My Bookings', href: '/bookings' }
  ],
  support: [
    { name: 'Contact Us', href: '/contact' },
    { name: 'FAQ', href: '/contact' }
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms and Conditions', href: '/terms' },
    { name: 'Refund Policy', href: '/refund' }
  ]
}

const socialLinks = [
  { name: 'Twitter', href: 'https://x.com/convenehub', icon: Twitter },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/company/convenehub/', icon: Linkedin },
  { name: 'Instagram', href: 'https://www.instagram.com/convenehub/', icon: InstagramIcon },
  { name: 'Email', href: 'mailto:Communication@convenehub.work', icon: Mail }
]

export default function Footer() {
  return (
    <footer className="relative bg-white border-t border-gray-200">
      <div className="mx-auto max-w-7xl px-4 xs:px-5 sm:px-6 pr-8 xs:pr-10 sm:pr-16">        {/* Main Footer Content */}
        <div className="py-8 xs:py-10 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xs:gap-10 lg:gap-8">
            {/* Logo and Description */}
            <div className="lg:col-span-4">
              <div className="mb-2 xs:mb-3">
                <Link href="/">
                  <Logo uniColor={true} />
                </Link>
              </div>
              <p className="text-gray-600 text-base xs:text-lg leading-relaxed mb-4 xs:mb-5 sm:mb-6 max-w-md">
                Discover and book standout events with instant tickets, QR check-ins, and smooth on-ground experiences.
              </p>

              {/* Social Links */}
              <div className="flex items-center gap-3 xs:gap-4">
                {socialLinks.map((social) => (
                  <Link
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 xs:w-10 xs:h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-all duration-300"
                  >
                    <social.icon className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </div>            {/* Links Grid */}
            <div className="lg:col-span-8">
              <div className="grid grid-cols-2 xs:grid-cols-3 gap-6 xs:gap-8">
                {/* Platform */}
                <div>
                  <h3 className="text-gray-900 font-semibold text-xs xs:text-sm uppercase tracking-wider mb-3 xs:mb-4">
                    Platform
                  </h3>
                  <ul className="space-y-2 xs:space-y-3">
                    {footerLinks.platform.map((link) => (
                      <li key={link.name}>
                        <Link
                          href={link.href}
                          className="text-gray-600 hover:text-gray-900 transition-colors duration-300 text-sm"
                        >
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Support */}
                <div>
                  <h3 className="text-gray-900 font-semibold text-xs xs:text-sm uppercase tracking-wider mb-3 xs:mb-4">
                    Support
                  </h3>
                  <ul className="space-y-2 xs:space-y-3">
                    {footerLinks.support.map((link) => (
                      <li key={link.name}>
                        <Link
                          href={link.href}
                          className="text-gray-600 hover:text-gray-900 transition-colors duration-300 text-sm"
                        >
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Legal */}
                <div className="col-span-2 xs:col-span-1">
                  <h3 className="text-gray-900 font-semibold text-xs xs:text-sm uppercase tracking-wider mb-3 xs:mb-4">
                    Legal
                  </h3>
                  <ul className="space-y-2 xs:space-y-3">
                    {footerLinks.legal.map((link) => (
                      <li key={link.name}>
                        <Link
                          href={link.href}
                          className="text-gray-600 hover:text-gray-900 transition-colors duration-300 text-sm"
                        >
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-gray-200" />        {/* Bottom Footer */}
        <div className="py-4 xs:py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 xs:gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 xs:gap-4 sm:gap-6 text-xs xs:text-sm text-gray-600">
              <p className="text-center sm:text-left">© 2026 CONVENEHUB. All rights reserved.</p>
              <div className="flex items-center gap-3 xs:gap-4">
                <Link href="/privacy" className="hover:text-gray-900 transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-gray-900 transition-colors">
                  Terms and Conditions
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </footer>
  )
}
