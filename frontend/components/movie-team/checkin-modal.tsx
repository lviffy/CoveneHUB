'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ScanLine, Search, CheckCircle, XCircle, AlertTriangle, Phone, Hash, Camera, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

interface CheckinResult {
  success: boolean;
  message: string;
  type: 'success' | 'error' | 'warning';
  details?: {
    bookingId?: string;
    bookingCode: string;
    attendeeName: string;
    ticketsCount?: number;
    checkInTime?: string;
    // Ticket-specific fields
    ticketCode?: string;
    ticketNumber?: number;
  };
}

export default function CheckinModal({ isOpen, onClose, eventId, eventTitle }: CheckinModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeMethod, setActiveMethod] = useState<'qr' | 'manual'>('qr');

  // QR Scanner states
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'active' | 'denied'>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cameraInitializing = useRef(false);

  // Camera selection state
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Refs to always hold the latest function versions — prevents stale closure bugs
  const handleQRScanRef = useRef<(data: string) => Promise<void>>(async () => {});
  const startScanningRef = useRef<() => void>(() => {});
  const processingRef = useRef(false); // guard against double-processing same scan

  // Manual lookup states
  const [lookupType, setLookupType] = useState<'booking' | 'phone'>('booking');
  const [bookingId, setBookingId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  // Result states
  const [checkinResult, setCheckinResult] = useState<CheckinResult | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    // Only start camera when modal opens and QR tab is active
    if (isOpen && activeMethod === 'qr' && mounted) {
      // Check if camera is not already active or initializing
      if (!stream && !cameraInitializing.current) {
        const timer = setTimeout(() => {
          startCamera();
        }, 150);
        return () => {
          clearTimeout(timer);
        };
      }
    } else if (!isOpen || activeMethod !== 'qr') {
      // Clean up when modal closes or tab switches
      if (stream) {
        stopCamera();
      }
    }
  }, [isOpen, activeMethod, mounted, stream]);

  const startCamera = async (deviceId?: string) => {
    // Prevent multiple simultaneous camera initialization attempts
    if (cameraInitializing.current) {
      return;
    }
    cameraInitializing.current = true;

    setCameraState('requesting');

    try {
      // Check if we're in a secure context (required for camera access)
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setCameraState('denied');
        return;
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState('denied');
        return;
      }

      // Check available devices first
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');

        if (videoDevices.length === 0) {
          cameraInitializing.current = false;
          setCameraState('denied');
          return;
        }
      } catch (enumError) {
        // Device enumeration failed
      }
      // 1. Define constraints
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { exact: 'environment' } }
      };

      try {
        await requestStream(constraints);
      } catch (err) {
        // Fallback 1: try relaxed facingMode
        try {
          await requestStream({ video: { facingMode: 'environment' } });
        } catch (err2) {
          // Fallback 2: try any video camera
          try {
            await requestStream({ video: true });
          } catch (err3) {
            setCameraState('denied');
            setScanning(false);
            cameraInitializing.current = false;
          }
        }
      }



    } catch (error: any) {
      setCameraState('denied');
      setScanning(false);
      cameraInitializing.current = false;
    }
  };

  const handleCameraChange = async (deviceId: string) => {
    if (deviceId === selectedDeviceId) return;

    cameraInitializing.current = false;
    stopCameraForSwitch();
    await startCamera(deviceId);
  };

  const stopCameraForSwitch = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanning(false);
  };

  const requestStream = async (constraints: MediaStreamConstraints) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

    setStream(mediaStream);

    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;

      const handleCanPlay = () => {
        videoRef.current?.play()
          .then(() => {
            setCameraState('active');
            setScanning(true);
            cameraInitializing.current = false;

            if (!scanIntervalRef.current) {
              startScanning();
            }
            updateDeviceList(mediaStream);
          })
          .catch((err) => {
            setCameraState('denied');
            cameraInitializing.current = false;
          });
      };

      videoRef.current.oncanplay = handleCanPlay;

      if (videoRef.current.readyState >= 3) {
        handleCanPlay();
      }
    } else {
      setCameraState('active');
      cameraInitializing.current = false;
      updateDeviceList(mediaStream);
    }
  };

  const updateDeviceList = async (activeStream: MediaStream) => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      setVideoDevices(cameras);

      const activeTrack = activeStream.getVideoTracks()[0];
      const activeDeviceId = activeTrack.getSettings().deviceId;

      if (activeDeviceId) {
        setSelectedDeviceId(activeDeviceId);
      } else if (cameras.length > 0) {
        setSelectedDeviceId(cameras[0].deviceId);
      }
    } catch (e) {
      console.error("Error enumerating devices:", e);
    }
  };

  const retryCamera = () => {
    cameraInitializing.current = false;
    setCameraState('idle');
    stopCamera();
    // Small delay before retrying
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  // Attach stream to video element when both are available (fallback)
  useEffect(() => {
    if (stream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;

      const handleCanPlay = () => {
        videoRef.current?.play()
          .then(() => {
            setCameraState('active');
            setScanning(true);
            if (!scanIntervalRef.current) {
              startScanning();
            }
          })
          .catch((err) => {
            // Error playing video
          });
      };

      videoRef.current.oncanplay = handleCanPlay;

      if (videoRef.current.readyState >= 3) {
        handleCanPlay();
      }
    }
  }, [stream]);

  const stopCamera = () => {
    // Always reset the flag when explicitly stopping
    cameraInitializing.current = false;

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanning(false);
    // Only reset to idle if not in denied/error state
    if (cameraState === 'active' || cameraState === 'requesting') {
      setCameraState('idle');
    }
  };

  const startScanning = () => {
    import('jsqr').then(({ default: jsQR }) => {
      // Clear any existing interval before starting a new one
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      scanIntervalRef.current = setInterval(() => {
        if (processingRef.current) return; // skip frame if still processing previous scan
        if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          // willReadFrequently: true improves repeated getImageData performance
          const context = canvas.getContext('2d', { willReadFrequently: true });

          if (context) {
            // Smart scaling: cap at 640px max dimension to speed up jsQR
            // but never scale below 640px — dense QR codes need enough pixels
            const maxDim = 640;
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const scale = Math.max(vw, vh) > maxDim ? maxDim / Math.max(vw, vh) : 1;
            canvas.width = Math.floor(vw * scale);
            canvas.height = Math.floor(vh * scale);
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            // dontInvert skips the inverted-colour pass — ~2× faster
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code) {
              // Always call the latest handleQRScan via ref — avoids stale closure
              handleQRScanRef.current(code.data);
            }
          }
        }
      }, 150); // was 300ms
    }).catch(() => {});
  };

  // Keep refs pointing to the latest function versions on every render
  startScanningRef.current = startScanning;

  const handleQRScan = async (qrData: string) => {
    // Prevent double-processing the same scan
    if (processingRef.current) return;
    processingRef.current = true;

    // Stop scanning immediately
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }


    try {
      // Call API to validate and check-in
      const response = await fetch('/api/organizer/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          qrCode: qrData,
          method: 'qr'
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Check if this is a ticket check-in or booking check-in
        const isTicketCheckIn = data.ticket !== undefined;

        setCheckinResult({
          success: true,
          type: 'success',
          message: data.message || 'Check-in successful!',
          details: isTicketCheckIn ? {
            ticketCode: data.ticket.ticketCode,
            ticketNumber: data.ticket.ticketNumber,
            bookingCode: data.ticket.bookingCode,
            attendeeName: data.ticket.attendeeName,
            checkInTime: data.ticket.checkInTime
          } : data.booking
        });
      } else {
        setCheckinResult({
          success: false,
          type: data.isDuplicate ? 'warning' : 'error',
          message: data.error || 'Check-in failed',
          details: data.isDuplicate ? (data.ticket || data.booking) : undefined
        });
      }
    } catch (error) {
      setCheckinResult({
        success: false,
        type: 'error',
        message: 'Failed to process check-in. Please try again.'
      });
    }

    // Resume scanning after 3 seconds
    // Use refs instead of captured state values to avoid stale-closure bugs
    setTimeout(() => {
      setCheckinResult(null);
      processingRef.current = false;
      // Only start if no interval is already running
      if (!scanIntervalRef.current) {
        startScanningRef.current();
      }
    }, 3000);
  };

  // Keep handleQRScanRef pointing to the latest version on every render
  handleQRScanRef.current = handleQRScan;

  const handleManualLookup = async () => {
    if (lookupType === 'booking' && !bookingId.trim()) {
      setCheckinResult({
        success: false,
        type: 'error',
        message: 'Please enter a booking ID'
      });
      return;
    }

    if (lookupType === 'phone' && !phoneNumber.trim()) {
      setCheckinResult({
        success: false,
        type: 'error',
        message: 'Please enter a phone number'
      });
      return;
    }

    setLookupLoading(true);

    try {
      const response = await fetch('/api/organizer/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          [lookupType === 'booking' ? 'bookingId' : 'phoneNumber']: lookupType === 'booking' ? bookingId : phoneNumber,
          method: 'manual'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setCheckinResult({
          success: true,
          type: 'success',
          message: data.message || 'Check-in successful!',
          details: data.booking
        });
        // Clear inputs
        setBookingId('');
        setPhoneNumber('');
      } else {
        setCheckinResult({
          success: false,
          type: data.isDuplicate ? 'warning' : 'error',
          message: data.error || 'Check-in failed',
          details: data.isDuplicate ? data.booking : undefined
        });
      }
    } catch (error) {
      setCheckinResult({
        success: false,
        type: 'error',
        message: 'Failed to process check-in. Please try again.'
      });
    } finally {
      setLookupLoading(false);
    }

    // Clear result after 3 seconds
    setTimeout(() => {
      setCheckinResult(null);
    }, 3000);
  };

  const handleClose = () => {
    stopCamera();
    setCameraState('idle');
    setCheckinResult(null);
    setBookingId('');
    setPhoneNumber('');
    onClose();
  };

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl"
        >
          <Card className="border-gray-200 shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-100 bg-gradient-to-br from-[#195ADC]/5 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#195ADC]/10 flex items-center justify-center">
                    <ScanLine className="h-5 w-5 text-[#195ADC]" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Event Check-in</CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      {eventTitle}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              <Tabs value={activeMethod} onValueChange={(v) => setActiveMethod(v as 'qr' | 'manual')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="qr" className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    <span>QR Scanner</span>
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    <span>Manual Lookup</span>
                  </TabsTrigger>
                </TabsList>

                {/* QR Scanner Tab */}
                <TabsContent value="qr" className="mt-0">
                  <div className="space-y-4 relative">
                    {/* Camera Select - Only show if multiple cameras available */}
                    {videoDevices.length > 1 && (
                      <div className="w-full">
                        <Select
                          value={selectedDeviceId}
                          onValueChange={handleCameraChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Camera" />
                          </SelectTrigger>
                          <SelectContent>
                            {videoDevices.map((device, index) => (
                              <SelectItem key={device.deviceId} value={device.deviceId}>
                                {device.label || `Camera ${index + 1}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Video Stream - Always in DOM, visible only when active */}
                    <div className={cn(
                      "relative bg-black rounded-lg overflow-hidden aspect-video transition-opacity duration-200",
                      cameraState === 'active' ? "opacity-100" : "opacity-0 absolute pointer-events-none"
                    )}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />

                      {/* Scanning Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-64 h-64">
                          {/* Corner Brackets */}
                          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#195ADC]"></div>
                          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#195ADC]"></div>
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#195ADC]"></div>
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#195ADC]"></div>

                          {/* Scanning Line Animation */}
                          {scanning && (
                            <motion.div
                              className="absolute left-0 right-0 h-0.5 bg-[#195ADC]"
                              animate={{
                                top: ['0%', '100%', '0%'],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'linear',
                              }}
                            />
                          )}
                        </div>

                        {/* Result Overlay */}
                        <AnimatePresence>
                          {checkinResult && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className={cn(
                                "absolute inset-0 flex items-center justify-center backdrop-blur-sm",
                                checkinResult.success ? "bg-green-500/90" :
                                  checkinResult.type === 'warning' ? "bg-yellow-500/90" : "bg-red-500/90"
                              )}
                            >
                              <div className="text-center p-4 sm:p-6">
                                {checkinResult.success ? (
                                  <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-white mx-auto mb-3 sm:mb-4" />
                                ) : checkinResult.type === 'warning' ? (
                                  <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-white mx-auto mb-3 sm:mb-4" />
                                ) : (
                                  <XCircle className="h-12 w-12 sm:h-16 sm:w-16 text-white mx-auto mb-3 sm:mb-4" />
                                )}
                                <p className="text-white font-bold text-lg sm:text-xl mb-2">
                                  {checkinResult.message}
                                </p>
                                {checkinResult.details && (
                                  <div className="text-white text-xs sm:text-sm space-y-1 bg-white/10 rounded-lg p-2 sm:p-3 mt-2 sm:mt-3">
                                    {checkinResult.details.ticketCode && (
                                      <p><strong>Ticket:</strong> {checkinResult.details.ticketCode} #{checkinResult.details.ticketNumber}</p>
                                    )}
                                    <p><strong>Booking:</strong> {checkinResult.details.bookingCode}</p>
                                    <p><strong>Name:</strong> {checkinResult.details.attendeeName}</p>
                                    {checkinResult.details.ticketsCount && (
                                      <p><strong>Total Tickets:</strong> {checkinResult.details.ticketsCount}</p>
                                    )}
                                    {checkinResult.details.checkInTime && (
                                      <p><strong>Checked in:</strong> {new Date(checkinResult.details.checkInTime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Hidden Canvas for Processing */}
                      <canvas ref={canvasRef} className="hidden" />
                    </div>

                    {/* Loading State */}
                    {(cameraState === 'idle' || cameraState === 'requesting') && (
                      <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                          <Loader2 className="h-8 w-8 text-[#195ADC] animate-spin" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {cameraState === 'idle' ? 'Starting Camera...' : 'Requesting Camera Access'}
                        </h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                          Please allow camera access when prompted by your browser.
                        </p>
                      </div>
                    )}

                    {/* Denied State */}
                    {cameraState === 'denied' && (
                      <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                          <XCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Camera Access Denied</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-4">
                          Please allow camera access in your browser settings to use the QR scanner.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 justify-center">
                          <Button variant="outline" onClick={retryCamera}>
                            <Camera className="h-4 w-4 mr-2" />
                            Retry Camera Access
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setActiveMethod('manual')}
                            className="text-[#195ADC]"
                          >
                            Use Manual Lookup Instead
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Instructions - only show when active */}
                    {cameraState === 'active' && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-sm text-gray-700 text-center">
                          <span className="font-medium">Position the QR code within the frame.</span>
                          <br />
                          The scanner will automatically detect and validate the code.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Manual Lookup Tab */}
                <TabsContent value="manual" className="mt-0">
                  <div className="space-y-4">
                    {/* Lookup Type Selector */}
                    <div className="flex gap-2">
                      <Button
                        variant={lookupType === 'booking' ? 'default' : 'outline'}
                        className={cn(
                          "flex-1",
                          lookupType === 'booking' && "bg-[#195ADC] hover:bg-[#195ADC]/90"
                        )}
                        onClick={() => setLookupType('booking')}
                      >
                        <Hash className="h-4 w-4 mr-2" />
                        Booking ID
                      </Button>
                      <Button
                        variant={lookupType === 'phone' ? 'default' : 'outline'}
                        className={cn(
                          "flex-1",
                          lookupType === 'phone' && "bg-[#195ADC] hover:bg-[#195ADC]/90"
                        )}
                        onClick={() => setLookupType('phone')}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Phone Number
                      </Button>
                    </div>

                    {/* Input Fields */}
                    <div className="space-y-3">
                      {lookupType === 'booking' ? (
                        <div className="space-y-2">
                          <Label htmlFor="bookingId" className="text-sm font-medium">
                            Booking ID
                          </Label>
                          <Input
                            id="bookingId"
                            type="text"
                            placeholder="Enter booking ID (e.g., BK123456)"
                            value={bookingId}
                            onChange={(e) => setBookingId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
                            className="h-11"
                            disabled={lookupLoading}
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="phoneNumber" className="text-sm font-medium">
                            Phone Number
                          </Label>
                          <Input
                            id="phoneNumber"
                            type="tel"
                            placeholder="Enter phone number"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
                            className="h-11"
                            disabled={lookupLoading}
                          />
                        </div>
                      )}

                      <Button
                        className="w-full h-11 bg-[#195ADC] hover:bg-[#195ADC]/90"
                        onClick={handleManualLookup}
                        disabled={lookupLoading}
                      >
                        {lookupLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
                            Check-in Attendee
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Result Display */}
                    <AnimatePresence>
                      {checkinResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={cn(
                            "p-4 rounded-lg border-2",
                            checkinResult.success
                              ? "bg-green-50 border-green-200"
                              : checkinResult.type === 'warning'
                                ? "bg-yellow-50 border-yellow-200"
                                : "bg-red-50 border-red-200"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {checkinResult.success ? (
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : checkinResult.type === 'warning' ? (
                              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p
                                className={cn(
                                  "font-medium mb-1",
                                  checkinResult.success
                                    ? "text-green-900"
                                    : checkinResult.type === 'warning'
                                      ? "text-yellow-900"
                                      : "text-red-900"
                                )}
                              >
                                {checkinResult.message}
                              </p>
                              {checkinResult.details && (
                                <div className={cn(
                                  "text-sm space-y-1 mt-3 p-3 rounded-lg border",
                                  checkinResult.success
                                    ? "bg-green-100 border-green-300 text-green-900"
                                    : checkinResult.type === 'warning'
                                      ? "bg-yellow-100 border-yellow-300 text-yellow-900"
                                      : "bg-red-100 border-red-300 text-red-900"
                                )}>
                                  <p><span className="font-semibold">Booking:</span> {checkinResult.details.bookingCode}</p>
                                  <p><span className="font-semibold">Name:</span> {checkinResult.details.attendeeName}</p>
                                  <p><span className="font-semibold">Tickets:</span> {checkinResult.details.ticketsCount}</p>
                                  {checkinResult.details.checkInTime && (
                                    <p><span className="font-semibold">Checked in:</span> {new Date(checkinResult.details.checkInTime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Instructions */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Manual Check-in:</span>
                        <br />
                        Search by Booking ID or Phone Number to check in attendees when QR codes are unavailable.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
