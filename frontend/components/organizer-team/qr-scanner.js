"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, XCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export default function QRScanner({ isOpen, onClose, onScanSuccess }) {
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [stream, setStream] = useState(null);
  const scanIntervalRef = useRef(null);

  // Camera management
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  // Refs to always hold the latest function versions — prevents stale closure bugs
  const handleScanResultRef = useRef(() => {});
  const startScanningRef = useRef(() => {});
  const processingRef = useRef(false); // guard against double-processing same scan

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  useEffect(() => {
    if (isOpen) {
      initializeCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);
  const initializeCamera = async () => {
    try {
      // 1. Enumerate devices first
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === "videoinput");
      setVideoDevices(cameras);
      if (cameras.length === 0) {
        throw new Error("No cameras found");
      }

      // 2. Try to find the back camera
      let targetDeviceId;

      // Look for "back" or "environment" in label (if available)
      const backCameraIndex = cameras.findIndex(
        (c) =>
          c.label.toLowerCase().includes("back") ||
          c.label.toLowerCase().includes("environment"),
      );
      if (backCameraIndex !== -1) {
        targetDeviceId = cameras[backCameraIndex].deviceId;
        setSelectedDeviceId(targetDeviceId);
      } else {
        // If labels are empty (permission not granted yet) or no back camera found,
        // we'll rely on facingMode in startCameraStream
        // But for tracking index, default to last camera (often back on mobile) if > 1
        if (cameras.length > 1) {
          setSelectedDeviceId(cameras[cameras.length - 1].deviceId);
        } else if (cameras.length > 0) {
          setSelectedDeviceId(cameras[0].deviceId);
        }
      }
      await startCameraStream(targetDeviceId);
    } catch (error) {
      setHasCamera(false);
      setScanning(false);
    }
  };
  const startCameraStream = async (deviceId) => {
    // 1. Define constraints
    // If deviceId provided: use it
    // If NO deviceId (initial load): strict preference for environment (back) camera
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
      console.warn(
        "Strict environment camera failed, trying relaxed mode...",
        err,
      );
      // Fallback 1: try relaxed facingMode
      try {
        await requestStream({
          video: {
            facingMode: "environment",
          },
        });
      } catch (err2) {
        console.warn(
          "Relaxed environment camera failed, trying any video...",
          err2,
        );
        // Fallback 2: try any video camera
        try {
          await requestStream({
            video: true,
          });
        } catch (err3) {
          console.error("All camera attempts failed:", err3);
          setHasCamera(false);
          setScanning(false);
        }
      }
    }
  };
  const requestStream = async (constraints) => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    try {
      const mediaStream =
        await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current
            ?.play()
            .catch((e) => console.error("Play error:", e));
        };
        setStream(mediaStream);
        setScanning(true);
        startScanning();

        // NOW that we have permission, enumerate devices to populate switch list
        updateDeviceList(mediaStream);
      }
    } catch (err) {
      throw err;
    }
  };
  const updateDeviceList = async (activeStream) => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === "videoinput");
      setVideoDevices(cameras);

      // Try to determine which camera is currently active
      const activeTrack = activeStream.getVideoTracks()[0];
      const activeDeviceId = activeTrack.getSettings().deviceId;
      if (activeDeviceId) {
        setSelectedDeviceId(activeDeviceId);
      } else if (cameras.length > 0) {
        // Fallback if activeDeviceId is missing (rare)
        setSelectedDeviceId(cameras[0].deviceId);
      }
    } catch (e) {
      console.error("Error enumerating devices:", e);
    }
  };
  const handleCameraChange = async (deviceId) => {
    if (deviceId === selectedDeviceId) return;
    stopCamera();
    await startCameraStream(deviceId);
  };
  const stopCamera = () => {
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
  const startScanning = () => {
    // Import QR code scanner library dynamically
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
                // Always call the latest handleScanResult via ref — avoids stale closure
                handleScanResultRef.current(code.data);
              }
            }
          }
        }, 150); // was 300ms
      })
      .catch(() => {});
  };

  // Keep refs pointing to the latest function versions on every render
  startScanningRef.current = startScanning;
  const handleScanResult = (data) => {
    // Prevent double-processing the same scan
    if (processingRef.current) return;
    processingRef.current = true;

    // Stop scanning immediately
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    // Simulate checking the QR code
    // In production, this would verify against the backend
    const isValid = data.length > 0;
    setScanResult({
      success: isValid,
      message: isValid
        ? `Check-in successful! Booking: ${data.substring(0, 8)}...`
        : "Invalid QR code",
    });
    if (onScanSuccess && isValid) {
      onScanSuccess(data);
    }

    // Resume scanning after 3 seconds
    // Use refs to avoid stale closure — scanIntervalRef.current is always current
    setTimeout(() => {
      setScanResult(null);
      processingRef.current = false;
      // Only start if no interval is already running
      if (!scanIntervalRef.current) {
        startScanningRef.current();
      }
    }, 3000);
  };

  // Keep handleScanResultRef pointing to the latest version on every render
  handleScanResultRef.current = handleScanResult;
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
        onClick: onClose,
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
          className: "w-full max-w-2xl",
        },
        /*#__PURE__*/ React.createElement(
          Card,
          {
            className: "border-gray-200 shadow-2xl overflow-hidden",
          },
          /*#__PURE__*/ React.createElement(
            CardHeader,
            {
              className: "border-b border-gray-100 bg-gray-50/50",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center justify-between",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex items-center gap-2",
                },
                /*#__PURE__*/ React.createElement(Camera, {
                  className: "h-5 w-5 text-[#195ADC]",
                }),
                /*#__PURE__*/ React.createElement(
                  "div",
                  null,
                  /*#__PURE__*/ React.createElement(
                    CardTitle,
                    {
                      className: "text-xl",
                    },
                    "QR Code Scanner",
                  ),
                  /*#__PURE__*/ React.createElement(
                    CardDescription,
                    {
                      className: "mt-1",
                    },
                    "Position the QR code within the frame",
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex items-center gap-2 w-full sm:w-auto",
                },
                videoDevices.length > 1 &&
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "w-full sm:w-[200px]",
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
                          className: "h-8 text-xs",
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
                  Button,
                  {
                    variant: "ghost",
                    size: "sm",
                    onClick: onClose,
                    className: "h-8 w-8 p-0 hidden sm:flex",
                  },
                  /*#__PURE__*/ React.createElement(X, {
                    className: "h-4 w-4",
                  }),
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            CardContent,
            {
              className: "p-6",
            },
            !hasCamera
              ? /*#__PURE__*/ React.createElement(
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
                      className: "text-gray-500 max-w-sm mx-auto",
                    },
                    "Please allow camera access in your browser settings to use the QR scanner.",
                  ),
                )
              : /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "relative",
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "relative bg-black rounded-lg overflow-hidden aspect-video",
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
                          !scanResult &&
                          /*#__PURE__*/ React.createElement(motion.div, {
                            className:
                              "absolute left-0 right-0 h-0.5 bg-[#195ADC] shadow-[0_0_10px_rgba(25,90,220,0.8)]",
                            initial: {
                              top: 0,
                            },
                            animate: {
                              top: "100%",
                            },
                            transition: {
                              duration: 2,
                              repeat: Infinity,
                              ease: "linear",
                            },
                          }),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      AnimatePresence,
                      null,
                      scanResult &&
                        /*#__PURE__*/ React.createElement(
                          motion.div,
                          {
                            initial: {
                              opacity: 0,
                              y: 20,
                            },
                            animate: {
                              opacity: 1,
                              y: 0,
                            },
                            exit: {
                              opacity: 0,
                              y: -20,
                            },
                            className:
                              "absolute inset-0 flex items-center justify-center bg-black/70",
                          },
                          /*#__PURE__*/ React.createElement(
                            "div",
                            {
                              className: cn(
                                "p-6 rounded-lg text-center max-w-sm",
                                scanResult.success
                                  ? "bg-green-500/90"
                                  : "bg-red-500/90",
                              ),
                            },
                            scanResult.success
                              ? /*#__PURE__*/ React.createElement(CheckCircle, {
                                  className:
                                    "h-12 w-12 text-white mx-auto mb-3",
                                })
                              : /*#__PURE__*/ React.createElement(XCircle, {
                                  className:
                                    "h-12 w-12 text-white mx-auto mb-3",
                                }),
                            /*#__PURE__*/ React.createElement(
                              "p",
                              {
                                className: "text-white font-semibold text-lg",
                              },
                              scanResult.message,
                            ),
                          ),
                        ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement("canvas", {
                    ref: canvasRef,
                    className: "hidden",
                  }),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "mt-4 text-center",
                    },
                    /*#__PURE__*/ React.createElement(
                      "p",
                      {
                        className: "text-sm text-gray-600 mb-4",
                      },
                      scanning
                        ? "Scanning for QR codes..."
                        : "Initializing camera...",
                    ),
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "flex flex-col gap-2 sm:hidden",
                      },
                      /*#__PURE__*/ React.createElement(
                        Button,
                        {
                          variant: "outline",
                          onClick: onClose,
                          className: "w-full",
                        },
                        "Close Scanner",
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
