'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet'
import { MapPin, Navigation, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import 'leaflet/dist/leaflet.css'

interface VenueMapProps {
    latitude: number
    longitude: number
    venueName: string
    venueAddress?: string
}

// Custom marker icon
const customIcon = new Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

export function VenueMap({ latitude, longitude, venueName, venueAddress }: VenueMapProps) {
    const [isMounted, setIsMounted] = useState(false)

    // Prevent SSR issues with Leaflet
    useEffect(() => {
        setIsMounted(true)
    }, [])

    const openInGoogleMaps = () => {
        const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
        window.open(url, '_blank')
    }

    const getDirections = () => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
        window.open(url, '_blank')
    }

    if (!isMounted) {
        return (
            <div className="w-full h-[300px] bg-gray-100 rounded-xl flex items-center justify-center">
                <div className="text-center text-gray-500">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Loading map...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="relative w-full h-[300px] rounded-xl overflow-hidden border border-gray-200">
                <MapContainer
                    center={[latitude, longitude]}
                    zoom={15}
                    scrollWheelZoom={false}
                    className="w-full h-full z-0"
                    style={{ borderRadius: '0.75rem' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[latitude, longitude]} icon={customIcon}>
                        <Popup>
                            <div className="text-center p-1">
                                <p className="font-semibold text-gray-900">{venueName}</p>
                                {venueAddress && (
                                    <p className="text-xs text-gray-600 mt-1">{venueAddress}</p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                </MapContainer>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={openInGoogleMaps}
                    className="flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-lg 
                               bg-gray-50 text-gray-700 text-sm font-medium border border-gray-200
                               hover:bg-gray-100 hover:border-gray-300
                               active:scale-[0.98] transition-all duration-150"
                >
                    <ExternalLink className="w-4 h-4" />
                    View on Maps
                </button>
                <button
                    onClick={getDirections}
                    className="flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-lg 
                               bg-gray-900 text-white text-sm font-medium
                               hover:bg-gray-800
                               active:scale-[0.98] transition-all duration-150"
                >
                    <Navigation className="w-4 h-4" />
                    Directions
                </button>
            </div>
        </div>
    )
}
