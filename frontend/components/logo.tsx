import { cn } from '../lib/utils'
import Image from 'next/image'

export const Logo = ({ className, uniColor }: { className?: string; uniColor?: boolean }) => {
    return (
        <div className={cn('flex items-center space-x-1', className)}>
            <Image
                src="/logo/logo.jpg"
                alt="ConveneHub Logo"
                width={40}
                height={40}
                className="h-10 w-10"
            />
            <span className="text-xl font-bold text-gray-900">convenehub</span>
        </div>
    )
}

export const BoltIcon = ({ className, uniColor }: { className?: string; uniColor?: boolean }) => {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('h-6 w-6', className)}>
            <path
                d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                fill={uniColor ? 'currentColor' : 'url(#bolt-gradient)'}
                stroke={uniColor ? 'currentColor' : 'url(#bolt-gradient)'}
                strokeWidth="0.5"
                strokeLinejoin="round"
            />
            <defs>
                <linearGradient
                    id="bolt-gradient"
                    x1="12"
                    y1="2"
                    x2="12"
                    y2="22"
                    gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3B82F6" />
                    <stop offset="0.5" stopColor="#1D4ED8" />
                    <stop offset="1" stopColor="#1E40AF" />
                </linearGradient>
            </defs>
        </svg>
    )
}

export const LogoIcon = ({ className, uniColor }: { className?: string; uniColor?: boolean }) => {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('h-6 w-6', className)}>
            <path
                d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                fill={uniColor ? 'currentColor' : 'url(#bolt-gradient-icon)'}
                stroke={uniColor ? 'currentColor' : 'url(#bolt-gradient-icon)'}
                strokeWidth="0.5"
                strokeLinejoin="round"
            />
            <defs>
                <linearGradient
                    id="bolt-gradient-icon"
                    x1="12"
                    y1="2"
                    x2="12"
                    y2="22"
                    gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3B82F6" />
                    <stop offset="0.5" stopColor="#1D4ED8" />
                    <stop offset="1" stopColor="#1E40AF" />
                </linearGradient>
            </defs>
        </svg>
    )
}

export const LogoStroke = ({ className }: { className?: string }) => {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('h-7 w-7', className)}>
            <path
                d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}