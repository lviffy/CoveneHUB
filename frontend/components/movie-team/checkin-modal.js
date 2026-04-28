"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ScanLine,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Phone,
  Hash,
  Camera,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export default function CheckinModal({ isOpen, onClose, eventId, eventTitle }) {
  const [mounted, setMounted] = useState(false);
  const [activeMethod, setActiveMethod] = useState("qr");

  // QR Scanner states
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [cameraState, setCameraState] = useState("idle");
  const [stream, setStream] = useState(null);
  const scanIntervalRef = useRef(null);
  const cameraInitializing = useRef(false);

  // Camera selection state
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  // Refs to always hold the latest function versions — prevents stale closure bugs
  const handleQRScanRef = useRef(async () => {});
  const startScanningRef = useRef(() => {});
  const processingRef = useRef(false); // guard against double-processing same scan

  // Manual lookup states
  const [lookupType, setLookupType] = useState("booking");
  const [bookingId, setBookingId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  // Result states
  const [checkinResult, setCheckinResult] = useState(null);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  useEffect(() => {
    // Only start camera when modal opens and QR tab is active
    if (isOpen && activeMethod === "qr" && mounted) {
      // Check if camera is not already active or initializing
      if (!stream && !cameraInitializing.current) {
        const timer = setTimeout(() => {
          startCamera();
        }, 150);
        return () => {
          clearTimeout(timer);
        };
      }
    } else if (!isOpen || activeMethod !== "qr") {
      // Clean up when modal closes or tab switches
      if (stream) {
        stopCamera();
      }
    }
  }, [isOpen, activeMethod, mounted, stream]);
  const startCamera = async (deviceId) => {
    // Prevent multiple simultaneous camera initialization attempts
    if (cameraInitializing.current) {
      return;
    }
    cameraInitializing.current = true;
    setCameraState("requesting");
    try {
      // Check if we're in a secure context (required for camera access)
      if (typeof window !== "undefined" && !window.isSecureContext) {
        setCameraState("denied");
        return;
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState("denied");
        return;
      }

      // Check available devices first
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        if (videoDevices.length === 0) {
          cameraInitializing.current = false;
          setCameraState("denied");
          return;
        }
      } catch (enumError) {
        // Device enumeration failed
      }
      // 1. Define constraints
      const constraints = {
        video: deviceId
          ? {
              deviceId: {
                exact: deviceId,
              },
            }
          : {
              facingMode: {
                exact: "environment",
              },
            },
      };
      try {
        await requestStream(constraints);
      } catch (err) {
        // Fallback 1: try relaxed facingMode
        try {
          await requestStream({
            video: {
              facingMode: "environment",
            },
          });
        } catch (err2) {
          // Fallback 2: try any video camera
          try {
            await requestStream({
              video: true,
            });
          } catch (err3) {
            setCameraState("denied");
            setScanning(false);
            cameraInitializing.current = false;
          }
        }
      }
    } catch (error) {
      setCameraState("denied");
      setScanning(false);
      cameraInitializing.current = false;
    }
  };
  const handleCameraChange = async (deviceId) => {
    if (deviceId === selectedDeviceId) return;
    cameraInitializing.current = false;
    stopCameraForSwitch();
    await startCamera(deviceId);
  };
  const stopCameraForSwitch = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanning(false);
  };
  const requestStream = async (constraints) => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    setStream(mediaStream);
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      const handleCanPlay = () => {
        videoRef.current
          ?.play()
          .then(() => {
            setCameraState("active");
            setScanning(true);
            cameraInitializing.current = false;
            if (!scanIntervalRef.current) {
              startScanning();
            }
            updateDeviceList(mediaStream);
          })
          .catch((err) => {
            setCameraState("denied");
            cameraInitializing.current = false;
          });
      };
      videoRef.current.oncanplay = handleCanPlay;
      if (videoRef.current.readyState >= 3) {
        handleCanPlay();
      }
    } else {
      setCameraState("active");
      cameraInitializing.current = false;
      updateDeviceList(mediaStream);
    }
  };
  const updateDeviceList = async (activeStream) => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === "videoinput");
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
    setCameraState("idle");
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
        videoRef.current
          ?.play()
          .then(() => {
            setCameraState("active");
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
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanning(false);
    // Only reset to idle if not in denied/error state
    if (cameraState === "active" || cameraState === "requesting") {
      setCameraState("idle");
    }
  };
  const startScanning = () => {
    import("jsqr")
      .then(({ default: jsQR }) => {
        // Clear any existing interval before starting a new one
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
        }
        scanIntervalRef.current = setInterval(() => {
          if (processingRef.current) return; // skip frame if still processing previous scan
          if (
            videoRef.current &&
            canvasRef.current &&
            videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
          ) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            // willReadFrequently: true improves repeated getImageData performance
            const context = canvas.getContext("2d", {
              willReadFrequently: true,
            });
            if (context) {
              // Smart scaling: cap at 640px max dimension to speed up jsQR
              // but never scale below 640px — dense QR codes need enough pixels
              const maxDim = 640;
              const vw = video.videoWidth;
              const vh = video.videoHeight;
              const scale =
                Math.max(vw, vh) > maxDim ? maxDim / Math.max(vw, vh) : 1;
              canvas.width = Math.floor(vw * scale);
              canvas.height = Math.floor(vh * scale);
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = context.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              );
              // dontInvert skips the inverted-colour pass — ~2× faster
              const code = jsQR(
                imageData.data,
                imageData.width,
                imageData.height,
                {
                  inversionAttempts: "dontInvert",
                },
              );
              if (code) {
                // Always call the latest handleQRScan via ref — avoids stale closure
                handleQRScanRef.current(code.data);
              }
            }
          }
        }, 150); // was 300ms
      })
      .catch(() => {});
  };

  // Keep refs pointing to the latest function versions on every render
  startScanningRef.current = startScanning;
  const handleQRScan = async (qrData) => {
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
      const response = await fetch("/api/organizer/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          qrCode: qrData,
          method: "qr",
        }),
      });
      const data = await response.json();
      if (response.ok) {
        // Check if this is a ticket check-in or booking check-in
        const isTicketCheckIn = data.ticket !== undefined;
        setCheckinResult({
          success: true,
          type: "success",
          message: data.message || "Check-in successful!",
          details: isTicketCheckIn
            ? {
                ticketCode: data.ticket.ticketCode,
                ticketNumber: data.ticket.ticketNumber,
                bookingCode: data.ticket.bookingCode,
                attendeeName: data.ticket.attendeeName,
                checkInTime: data.ticket.checkInTime,
              }
            : data.booking,
        });
      } else {
        setCheckinResult({
          success: false,
          type: data.isDuplicate ? "warning" : "error",
          message: data.error || "Check-in failed",
          details: data.isDuplicate ? data.ticket || data.booking : undefined,
        });
      }
    } catch (error) {
      setCheckinResult({
        success: false,
        type: "error",
        message: "Failed to process check-in. Please try again.",
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
    if (lookupType === "booking" && !bookingId.trim()) {
      setCheckinResult({
        success: false,
        type: "error",
        message: "Please enter a booking ID",
      });
      return;
    }
    if (lookupType === "phone" && !phoneNumber.trim()) {
      setCheckinResult({
        success: false,
        type: "error",
        message: "Please enter a phone number",
      });
      return;
    }
    setLookupLoading(true);
    try {
      const response = await fetch("/api/organizer/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          [lookupType === "booking" ? "bookingId" : "phoneNumber"]:
            lookupType === "booking" ? bookingId : phoneNumber,
          method: "manual",
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setCheckinResult({
          success: true,
          type: "success",
          message: data.message || "Check-in successful!",
          details: data.booking,
        });
        // Clear inputs
        setBookingId("");
        setPhoneNumber("");
      } else {
        setCheckinResult({
          success: false,
          type: data.isDuplicate ? "warning" : "error",
          message: data.error || "Check-in failed",
          details: data.isDuplicate ? data.booking : undefined,
        });
      }
    } catch (error) {
      setCheckinResult({
        success: false,
        type: "error",
        message: "Failed to process check-in. Please try again.",
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
    setCameraState("idle");
    setCheckinResult(null);
    setBookingId("");
    setPhoneNumber("");
    onClose();
  };
  if (!mounted || !isOpen) return null;
  const modalContent = /*#__PURE__*/ React.createElement(
    AnimatePresence,
    null,
    /*#__PURE__*/ React.createElement(
      motion.div,
      {
        initial: {
          opacity: 0,
        },
        animate: {
          opacity: 1,
        },
        exit: {
          opacity: 0,
        },
        className:
          "fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4",
        onClick: handleClose,
      },
      /*#__PURE__*/ React.createElement(
        motion.div,
        {
          initial: {
            scale: 0.95,
            opacity: 0,
          },
          animate: {
            scale: 1,
            opacity: 1,
          },
          exit: {
            scale: 0.95,
            opacity: 0,
          },
          transition: {
            duration: 0.2,
          },
          onClick: (e) => e.stopPropagation(),
          className: "w-full max-w-3xl",
        },
        /*#__PURE__*/ React.createElement(
          Card,
          {
            className: "border-gray-200 shadow-2xl overflow-hidden",
          },
          /*#__PURE__*/ React.createElement(
            CardHeader,
            {
              className:
                "border-b border-gray-100 bg-gradient-to-br from-[#195ADC]/5 to-white",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center justify-between",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex items-center gap-3",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "h-10 w-10 rounded-full bg-[#195ADC]/10 flex items-center justify-center",
                  },
                  /*#__PURE__*/ React.createElement(ScanLine, {
                    className: "h-5 w-5 text-[#195ADC]",
                  }),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  null,
                  /*#__PURE__*/ React.createElement(
                    CardTitle,
                    {
                      className: "text-xl",
                    },
                    "Event Check-in",
                  ),
                  /*#__PURE__*/ React.createElement(
                    CardDescription,
                    {
                      className: "mt-1 text-sm",
                    },
                    eventTitle,
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                Button,
                {
                  variant: "ghost",
                  size: "sm",
                  onClick: handleClose,
                  className: "h-8 w-8 p-0",
                },
                /*#__PURE__*/ React.createElement(X, {
                  className: "h-4 w-4",
                }),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            CardContent,
            {
              className: "p-4 sm:p-6",
            },
            /*#__PURE__*/ React.createElement(
              Tabs,
              {
                value: activeMethod,
                onValueChange: (v) => setActiveMethod(v),
                className: "w-full",
              },
              /*#__PURE__*/ React.createElement(
                TabsList,
                {
                  className: "grid w-full grid-cols-2 mb-6",
                },
                /*#__PURE__*/ React.createElement(
                  TabsTrigger,
                  {
                    value: "qr",
                    className: "flex items-center gap-2",
                  },
                  /*#__PURE__*/ React.createElement(Camera, {
                    className: "h-4 w-4",
                  }),
                  /*#__PURE__*/ React.createElement("span", null, "QR Scanner"),
                ),
                /*#__PURE__*/ React.createElement(
                  TabsTrigger,
                  {
                    value: "manual",
                    className: "flex items-center gap-2",
                  },
                  /*#__PURE__*/ React.createElement(Search, {
                    className: "h-4 w-4",
                  }),
                  /*#__PURE__*/ React.createElement(
                    "span",
                    null,
                    "Manual Lookup",
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                TabsContent,
                {
                  value: "qr",
                  className: "mt-0",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "space-y-4 relative",
                  },
                  videoDevices.length > 1 &&
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "w-full",
                      },
                      /*#__PURE__*/ React.createElement(
                        Select,
                        {
                          value: selectedDeviceId,
                          onValueChange: handleCameraChange,
                        },
                        /*#__PURE__*/ React.createElement(
                          SelectTrigger,
                          {
                            className: "w-full",
                          },
                          /*#__PURE__*/ React.createElement(SelectValue, {
                            placeholder: "Select Camera",
                          }),
                        ),
                        /*#__PURE__*/ React.createElement(
                          SelectContent,
                          null,
                          videoDevices.map((device, index) =>
                            /*#__PURE__*/ React.createElement(
                              SelectItem,
                              {
                                key: device.deviceId,
                                value: device.deviceId,
                              },
                              device.label || `Camera ${index + 1}`,
                            ),
                          ),
                        ),
                      ),
                    ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: cn(
                        "relative bg-black rounded-lg overflow-hidden aspect-video transition-opacity duration-200",
                        cameraState === "active"
                          ? "opacity-100"
                          : "opacity-0 absolute pointer-events-none",
                      ),
                    },
                    /*#__PURE__*/ React.createElement("video", {
                      ref: videoRef,
                      autoPlay: true,
                      playsInline: true,
                      muted: true,
                      className: "w-full h-full object-cover",
                    }),
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className:
                          "absolute inset-0 flex items-center justify-center",
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "relative w-64 h-64",
                        },
                        /*#__PURE__*/ React.createElement("div", {
                          className:
                            "absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#195ADC]",
                        }),
                        /*#__PURE__*/ React.createElement("div", {
                          className:
                            "absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#195ADC]",
                        }),
                        /*#__PURE__*/ React.createElement("div", {
                          className:
                            "absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#195ADC]",
                        }),
                        /*#__PURE__*/ React.createElement("div", {
                          className:
                            "absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#195ADC]",
                        }),
                        scanning &&
                          /*#__PURE__*/ React.createElement(motion.div, {
                            className:
                              "absolute left-0 right-0 h-0.5 bg-[#195ADC]",
                            animate: {
                              top: ["0%", "100%", "0%"],
                            },
                            transition: {
                              duration: 2,
                              repeat: Infinity,
                              ease: "linear",
                            },
                          }),
                      ),
                      /*#__PURE__*/ React.createElement(
                        AnimatePresence,
                        null,
                        checkinResult &&
                          /*#__PURE__*/ React.createElement(
                            motion.div,
                            {
                              initial: {
                                opacity: 0,
                                scale: 0.8,
                              },
                              animate: {
                                opacity: 1,
                                scale: 1,
                              },
                              exit: {
                                opacity: 0,
                                scale: 0.8,
                              },
                              className: cn(
                                "absolute inset-0 flex items-center justify-center backdrop-blur-sm",
                                checkinResult.success
                                  ? "bg-green-500/90"
                                  : checkinResult.type === "warning"
                                    ? "bg-yellow-500/90"
                                    : "bg-red-500/90",
                              ),
                            },
                            /*#__PURE__*/ React.createElement(
                              "div",
                              {
                                className: "text-center p-4 sm:p-6",
                              },
                              checkinResult.success
                                ? /*#__PURE__*/ React.createElement(
                                    CheckCircle,
                                    {
                                      className:
                                        "h-12 w-12 sm:h-16 sm:w-16 text-white mx-auto mb-3 sm:mb-4",
                                    },
                                  )
                                : checkinResult.type === "warning"
                                  ? /*#__PURE__*/ React.createElement(
                                      AlertTriangle,
                                      {
                                        className:
                                          "h-12 w-12 sm:h-16 sm:w-16 text-white mx-auto mb-3 sm:mb-4",
                                      },
                                    )
                                  : /*#__PURE__*/ React.createElement(XCircle, {
                                      className:
                                        "h-12 w-12 sm:h-16 sm:w-16 text-white mx-auto mb-3 sm:mb-4",
                                    }),
                              /*#__PURE__*/ React.createElement(
                                "p",
                                {
                                  className:
                                    "text-white font-bold text-lg sm:text-xl mb-2",
                                },
                                checkinResult.message,
                              ),
                              checkinResult.details &&
                                /*#__PURE__*/ React.createElement(
                                  "div",
                                  {
                                    className:
                                      "text-white text-xs sm:text-sm space-y-1 bg-white/10 rounded-lg p-2 sm:p-3 mt-2 sm:mt-3",
                                  },
                                  checkinResult.details.ticketCode &&
                                    /*#__PURE__*/ React.createElement(
                                      "p",
                                      null,
                                      /*#__PURE__*/ React.createElement(
                                        "strong",
                                        null,
                                        "Ticket:",
                                      ),
                                      " ",
                                      checkinResult.details.ticketCode,
                                      " #",
                                      checkinResult.details.ticketNumber,
                                    ),
                                  /*#__PURE__*/ React.createElement(
                                    "p",
                                    null,
                                    /*#__PURE__*/ React.createElement(
                                      "strong",
                                      null,
                                      "Booking:",
                                    ),
                                    " ",
                                    checkinResult.details.bookingCode,
                                  ),
                                  /*#__PURE__*/ React.createElement(
                                    "p",
                                    null,
                                    /*#__PURE__*/ React.createElement(
                                      "strong",
                                      null,
                                      "Name:",
                                    ),
                                    " ",
                                    checkinResult.details.attendeeName,
                                  ),
                                  checkinResult.details.ticketsCount &&
                                    /*#__PURE__*/ React.createElement(
                                      "p",
                                      null,
                                      /*#__PURE__*/ React.createElement(
                                        "strong",
                                        null,
                                        "Total Tickets:",
                                      ),
                                      " ",
                                      checkinResult.details.ticketsCount,
                                    ),
                                  checkinResult.details.checkInTime &&
                                    /*#__PURE__*/ React.createElement(
                                      "p",
                                      null,
                                      /*#__PURE__*/ React.createElement(
                                        "strong",
                                        null,
                                        "Checked in:",
                                      ),
                                      " ",
                                      new Date(
                                        checkinResult.details.checkInTime,
                                      ).toLocaleString("en-US", {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                      }),
                                    ),
                                ),
                            ),
                          ),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement("canvas", {
                      ref: canvasRef,
                      className: "hidden",
                    }),
                  ),
                  (cameraState === "idle" || cameraState === "requesting") &&
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "text-center py-16",
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className:
                            "inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4",
                        },
                        /*#__PURE__*/ React.createElement(Loader2, {
                          className: "h-8 w-8 text-[#195ADC] animate-spin",
                        }),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "h3",
                        {
                          className: "text-lg font-semibold text-gray-900 mb-2",
                        },
                        cameraState === "idle"
                          ? "Starting Camera..."
                          : "Requesting Camera Access",
                      ),
                      /*#__PURE__*/ React.createElement(
                        "p",
                        {
                          className: "text-gray-500 max-w-sm mx-auto",
                        },
                        "Please allow camera access when prompted by your browser.",
                      ),
                    ),
                  cameraState === "denied" &&
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "text-center py-16",
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className:
                            "inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4",
                        },
                        /*#__PURE__*/ React.createElement(XCircle, {
                          className: "h-8 w-8 text-red-600",
                        }),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "h3",
                        {
                          className: "text-lg font-semibold text-gray-900 mb-2",
                        },
                        "Camera Access Denied",
                      ),
                      /*#__PURE__*/ React.createElement(
                        "p",
                        {
                          className: "text-gray-500 max-w-sm mx-auto mb-4",
                        },
                        "Please allow camera access in your browser settings to use the QR scanner.",
                      ),
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className:
                            "flex flex-col sm:flex-row gap-2 justify-center",
                        },
                        /*#__PURE__*/ React.createElement(
                          Button,
                          {
                            variant: "outline",
                            onClick: retryCamera,
                          },
                          /*#__PURE__*/ React.createElement(Camera, {
                            className: "h-4 w-4 mr-2",
                          }),
                          "Retry Camera Access",
                        ),
                        /*#__PURE__*/ React.createElement(
                          Button,
                          {
                            variant: "ghost",
                            onClick: () => setActiveMethod("manual"),
                            className: "text-[#195ADC]",
                          },
                          "Use Manual Lookup Instead",
                        ),
                      ),
                    ),
                  cameraState === "active" &&
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className:
                          "bg-gray-50 rounded-lg p-4 border border-gray-200",
                      },
                      /*#__PURE__*/ React.createElement(
                        "p",
                        {
                          className: "text-sm text-gray-700 text-center",
                        },
                        /*#__PURE__*/ React.createElement(
                          "span",
                          {
                            className: "font-medium",
                          },
                          "Position the QR code within the frame.",
                        ),
                        /*#__PURE__*/ React.createElement("br", null),
                        "The scanner will automatically detect and validate the code.",
                      ),
                    ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                TabsContent,
                {
                  value: "manual",
                  className: "mt-0",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "space-y-4",
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "flex gap-2",
                    },
                    /*#__PURE__*/ React.createElement(
                      Button,
                      {
                        variant:
                          lookupType === "booking" ? "default" : "outline",
                        className: cn(
                          "flex-1",
                          lookupType === "booking" &&
                            "bg-[#195ADC] hover:bg-[#195ADC]/90",
                        ),
                        onClick: () => setLookupType("booking"),
                      },
                      /*#__PURE__*/ React.createElement(Hash, {
                        className: "h-4 w-4 mr-2",
                      }),
                      "Booking ID",
                    ),
                    /*#__PURE__*/ React.createElement(
                      Button,
                      {
                        variant: lookupType === "phone" ? "default" : "outline",
                        className: cn(
                          "flex-1",
                          lookupType === "phone" &&
                            "bg-[#195ADC] hover:bg-[#195ADC]/90",
                        ),
                        onClick: () => setLookupType("phone"),
                      },
                      /*#__PURE__*/ React.createElement(Phone, {
                        className: "h-4 w-4 mr-2",
                      }),
                      "Phone Number",
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "space-y-3",
                    },
                    lookupType === "booking"
                      ? /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "space-y-2",
                          },
                          /*#__PURE__*/ React.createElement(
                            Label,
                            {
                              htmlFor: "bookingId",
                              className: "text-sm font-medium",
                            },
                            "Booking ID",
                          ),
                          /*#__PURE__*/ React.createElement(Input, {
                            id: "bookingId",
                            type: "text",
                            placeholder: "Enter booking ID (e.g., BK123456)",
                            value: bookingId,
                            onChange: (e) => setBookingId(e.target.value),
                            onKeyDown: (e) =>
                              e.key === "Enter" && handleManualLookup(),
                            className: "h-11",
                            disabled: lookupLoading,
                          }),
                        )
                      : /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "space-y-2",
                          },
                          /*#__PURE__*/ React.createElement(
                            Label,
                            {
                              htmlFor: "phoneNumber",
                              className: "text-sm font-medium",
                            },
                            "Phone Number",
                          ),
                          /*#__PURE__*/ React.createElement(Input, {
                            id: "phoneNumber",
                            type: "tel",
                            placeholder: "Enter phone number",
                            value: phoneNumber,
                            onChange: (e) => setPhoneNumber(e.target.value),
                            onKeyDown: (e) =>
                              e.key === "Enter" && handleManualLookup(),
                            className: "h-11",
                            disabled: lookupLoading,
                          }),
                        ),
                    /*#__PURE__*/ React.createElement(
                      Button,
                      {
                        className:
                          "w-full h-11 bg-[#195ADC] hover:bg-[#195ADC]/90",
                        onClick: handleManualLookup,
                        disabled: lookupLoading,
                      },
                      lookupLoading
                        ? /*#__PURE__*/ React.createElement(
                            React.Fragment,
                            null,
                            /*#__PURE__*/ React.createElement(Loader2, {
                              className: "h-4 w-4 mr-2 animate-spin",
                            }),
                            "Processing...",
                          )
                        : /*#__PURE__*/ React.createElement(
                            React.Fragment,
                            null,
                            /*#__PURE__*/ React.createElement(Search, {
                              className: "h-4 w-4 mr-2",
                            }),
                            "Check-in Attendee",
                          ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    AnimatePresence,
                    null,
                    checkinResult &&
                      /*#__PURE__*/ React.createElement(
                        motion.div,
                        {
                          initial: {
                            opacity: 0,
                            y: 10,
                          },
                          animate: {
                            opacity: 1,
                            y: 0,
                          },
                          exit: {
                            opacity: 0,
                            y: -10,
                          },
                          className: cn(
                            "p-4 rounded-lg border-2",
                            checkinResult.success
                              ? "bg-green-50 border-green-200"
                              : checkinResult.type === "warning"
                                ? "bg-yellow-50 border-yellow-200"
                                : "bg-red-50 border-red-200",
                          ),
                        },
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "flex items-start gap-3",
                          },
                          checkinResult.success
                            ? /*#__PURE__*/ React.createElement(CheckCircle, {
                                className:
                                  "h-5 w-5 text-green-600 flex-shrink-0 mt-0.5",
                              })
                            : checkinResult.type === "warning"
                              ? /*#__PURE__*/ React.createElement(
                                  AlertTriangle,
                                  {
                                    className:
                                      "h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5",
                                  },
                                )
                              : /*#__PURE__*/ React.createElement(XCircle, {
                                  className:
                                    "h-5 w-5 text-red-600 flex-shrink-0 mt-0.5",
                                }),
                          /*#__PURE__*/ React.createElement(
                            "div",
                            {
                              className: "flex-1",
                            },
                            /*#__PURE__*/ React.createElement(
                              "p",
                              {
                                className: cn(
                                  "font-medium mb-1",
                                  checkinResult.success
                                    ? "text-green-900"
                                    : checkinResult.type === "warning"
                                      ? "text-yellow-900"
                                      : "text-red-900",
                                ),
                              },
                              checkinResult.message,
                            ),
                            checkinResult.details &&
                              /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className: cn(
                                    "text-sm space-y-1 mt-3 p-3 rounded-lg border",
                                    checkinResult.success
                                      ? "bg-green-100 border-green-300 text-green-900"
                                      : checkinResult.type === "warning"
                                        ? "bg-yellow-100 border-yellow-300 text-yellow-900"
                                        : "bg-red-100 border-red-300 text-red-900",
                                  ),
                                },
                                /*#__PURE__*/ React.createElement(
                                  "p",
                                  null,
                                  /*#__PURE__*/ React.createElement(
                                    "span",
                                    {
                                      className: "font-semibold",
                                    },
                                    "Booking:",
                                  ),
                                  " ",
                                  checkinResult.details.bookingCode,
                                ),
                                /*#__PURE__*/ React.createElement(
                                  "p",
                                  null,
                                  /*#__PURE__*/ React.createElement(
                                    "span",
                                    {
                                      className: "font-semibold",
                                    },
                                    "Name:",
                                  ),
                                  " ",
                                  checkinResult.details.attendeeName,
                                ),
                                /*#__PURE__*/ React.createElement(
                                  "p",
                                  null,
                                  /*#__PURE__*/ React.createElement(
                                    "span",
                                    {
                                      className: "font-semibold",
                                    },
                                    "Tickets:",
                                  ),
                                  " ",
                                  checkinResult.details.ticketsCount,
                                ),
                                checkinResult.details.checkInTime &&
                                  /*#__PURE__*/ React.createElement(
                                    "p",
                                    null,
                                    /*#__PURE__*/ React.createElement(
                                      "span",
                                      {
                                        className: "font-semibold",
                                      },
                                      "Checked in:",
                                    ),
                                    " ",
                                    new Date(
                                      checkinResult.details.checkInTime,
                                    ).toLocaleString("en-US", {
                                      dateStyle: "medium",
                                      timeStyle: "short",
                                    }),
                                  ),
                              ),
                          ),
                        ),
                      ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "bg-gray-50 rounded-lg p-4 border border-gray-200",
                    },
                    /*#__PURE__*/ React.createElement(
                      "p",
                      {
                        className: "text-sm text-gray-700",
                      },
                      /*#__PURE__*/ React.createElement(
                        "span",
                        {
                          className: "font-medium",
                        },
                        "Manual Check-in:",
                      ),
                      /*#__PURE__*/ React.createElement("br", null),
                      "Search by Booking ID or Phone Number to check in attendees when QR codes are unavailable.",
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
  return /*#__PURE__*/ createPortal(modalContent, document.body);
}
