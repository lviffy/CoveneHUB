"use client";

import React, { useState, useRef, useEffect } from "react";
import { Shield, Ticket, Bell, Gift } from "lucide-react";
import { motion } from "framer-motion";
const features = [
  {
    icon: Ticket,
    title: "Instant QR Tickets",
    description:
      "Digital tickets delivered instantly via email. Simple, secure check-in.",
  },
  {
    icon: Shield,
    title: "Verified Events",
    description:
      "Trusted organizers and vetted listings for a reliable booking experience.",
  },
  {
    icon: Bell,
    title: "Real-time Updates",
    description:
      "Stay informed with instant notifications about your booking status.",
  },
  {
    icon: Gift,
    title: "Exclusive Access",
    description: "Limited seats and early-access drops for high-demand events.",
  },
];

// Mobile Carousel Component
const MobileFeatureCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Auto-scroll effect
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused]);
  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < features.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
    // Resume auto-scroll after 5 seconds
    setTimeout(() => setIsPaused(false), 5000);
  };
  const goToSlide = (index) => {
    setCurrentIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 5000);
  };
  const currentFeature = features[currentIndex];
  const Icon = currentFeature.icon;
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "md:hidden",
    },
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "relative overflow-hidden rounded-2xl",
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
      },
      /*#__PURE__*/ React.createElement(
        motion.div,
        {
          className: "flex",
          animate: {
            x: `-${currentIndex * 100}%`,
          },
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 30,
          },
        },
        features.map((feature, index) => {
          const FeatureIcon = feature.icon;
          return /*#__PURE__*/ React.createElement(
            "div",
            {
              key: index,
              className: "w-full flex-shrink-0 bg-[#F9FAFB] rounded-2xl p-8",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-900 mb-6 shadow-sm",
              },
              /*#__PURE__*/ React.createElement(FeatureIcon, {
                className: "w-6 h-6",
              }),
            ),
            /*#__PURE__*/ React.createElement(
              "h3",
              {
                className: "text-xl font-bold text-gray-900 mb-3",
              },
              feature.title,
            ),
            /*#__PURE__*/ React.createElement(
              "p",
              {
                className: "text-gray-500 leading-relaxed text-base",
              },
              feature.description,
            ),
          );
        }),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "flex justify-center gap-2 mt-6",
      },
      features.map((_, index) =>
        /*#__PURE__*/ React.createElement("button", {
          key: index,
          onClick: () => goToSlide(index),
          className: `w-2 h-2 rounded-full transition-all duration-300 ${index === currentIndex ? "bg-gray-900 w-6" : "bg-gray-300"}`,
          "aria-label": `Go to feature ${index + 1}`,
        }),
      ),
    ),
  );
};

// Desktop Grid Component
const DesktopFeaturesGrid = () =>
  /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-2",
    },
    features.map((feature, index) =>
      /*#__PURE__*/ React.createElement(
        motion.div,
        {
          key: index,
          initial: false,
          whileInView: {
            opacity: 1,
            x: 0,
          },
          viewport: {
            once: true,
            margin: "-50px",
          },
          transition: {
            duration: 0.4,
            delay: index * 0.05,
            ease: [0.25, 0.1, 0.25, 1],
          },
          className:
            "group bg-[#F9FAFB] p-8 rounded-2xl transition-all duration-300 hover:translate-y-[-4px]",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "w-12 h-12 bg-white rounded-xl flex items-center justify-center text-gray-900 mb-6 shadow-sm",
          },
          /*#__PURE__*/ React.createElement(feature.icon, {
            className: "w-5 h-5",
          }),
        ),
        /*#__PURE__*/ React.createElement(
          "h3",
          {
            className: "text-lg font-bold text-gray-900 mb-3",
          },
          feature.title,
        ),
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-gray-500 leading-relaxed text-[15px] font-medium",
          },
          feature.description,
        ),
      ),
    ),
  );
function useVideoContrast(videoRef, textRef, threshold = 160, sampleFps = 20) {
  const [color, setColor] = useState("#fff");
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!ctx) return;
    let rafId = 0;
    let lastSampleTime = 0;
    let lastColor = "#fff";
    const frameInterval = 1000 / sampleFps;
    const update = (now) => {
      const video = videoRef.current;
      const text = textRef.current;
      if (!video || !text || video.readyState < 2) {
        rafId = requestAnimationFrame(update);
        return;
      }
      if (now - lastSampleTime < frameInterval) {
        rafId = requestAnimationFrame(update);
        return;
      }
      lastSampleTime = now;
      const videoRect = video.getBoundingClientRect();
      const textRect = text.getBoundingClientRect();
      if (
        videoRect.width <= 0 ||
        videoRect.height <= 0 ||
        textRect.width <= 0 ||
        textRect.height <= 0
      ) {
        rafId = requestAnimationFrame(update);
        return;
      }
      const intersectLeft = Math.max(textRect.left, videoRect.left);
      const intersectTop = Math.max(textRect.top, videoRect.top);
      const intersectRight = Math.min(textRect.right, videoRect.right);
      const intersectBottom = Math.min(textRect.bottom, videoRect.bottom);
      const intersectW = intersectRight - intersectLeft;
      const intersectH = intersectBottom - intersectTop;
      if (intersectW <= 0 || intersectH <= 0) {
        rafId = requestAnimationFrame(update);
        return;
      }

      // Keep canvas tiny for performance while preserving luminance accuracy.
      const targetW = 64;
      const targetH = Math.max(
        1,
        Math.round((intersectH / intersectW) * targetW),
      );
      canvas.width = targetW;
      canvas.height = targetH;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) {
        rafId = requestAnimationFrame(update);
        return;
      }

      // Map screen-space sample area to source video pixels for object-cover rendering.
      const coverScale = Math.max(videoRect.width / vw, videoRect.height / vh);
      const renderedVideoW = vw * coverScale;
      const renderedVideoH = vh * coverScale;
      const offsetX = (videoRect.width - renderedVideoW) / 2;
      const offsetY = (videoRect.height - renderedVideoH) / 2;
      const localX = intersectLeft - videoRect.left;
      const localY = intersectTop - videoRect.top;
      const srcX = (localX - offsetX) / coverScale;
      const srcY = (localY - offsetY) / coverScale;
      const srcW = intersectW / coverScale;
      const srcH = intersectH / coverScale;
      const clampedX = Math.max(0, Math.min(vw - 1, srcX));
      const clampedY = Math.max(0, Math.min(vh - 1, srcY));
      const clampedW = Math.max(1, Math.min(vw - clampedX, srcW));
      const clampedH = Math.max(1, Math.min(vh - clampedY, srcH));
      ctx.drawImage(
        video,
        clampedX,
        clampedY,
        clampedW,
        clampedH,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let luminanceTotal = 0;
      for (let i = 0; i < frame.length; i += 4) {
        luminanceTotal +=
          0.299 * frame[i] + 0.587 * frame[i + 1] + 0.114 * frame[i + 2];
      }
      const avg = luminanceTotal / (frame.length / 4);
      const nextColor = avg > threshold ? "#000" : "#fff";
      if (nextColor !== lastColor) {
        lastColor = nextColor;
        setColor(nextColor);
      }
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [videoRef, textRef, threshold, sampleFps]);
  return color;
}
export default function SeamlessExperienceSection() {
  const videoRef = useRef(null);
  const headingRef = useRef(null);
  const headingColor = useVideoContrast(videoRef, headingRef);
  return /*#__PURE__*/ React.createElement(
    "section",
    {
      className: "relative isolate overflow-hidden py-20 md:py-32 px-4 md:px-6",
    },
    /*#__PURE__*/ React.createElement(
      "video",
      {
        ref: videoRef,
        className:
          "pointer-events-none absolute inset-0 h-full w-full object-cover",
        autoPlay: true,
        muted: true,
        loop: true,
        playsInline: true,
        preload: "metadata",
        poster: "/hero-bg0-poster.webp",
        "aria-hidden": "true",
      },
      /*#__PURE__*/ React.createElement("source", {
        src: "/hero-bg0.webm",
        type: "video/webm",
      }),
      /*#__PURE__*/ React.createElement("source", {
        src: "/hero-bg0.mp4",
        type: "video/mp4",
      }),
    ),
    /*#__PURE__*/ React.createElement("div", {
      className: "absolute inset-0 bg-black/20",
    }),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "relative z-10 mx-auto max-w-7xl",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "text-center mb-12 md:mb-20",
        },
        /*#__PURE__*/ React.createElement(
          motion.div,
          {
            initial: false,
            whileInView: {
              opacity: 1,
              y: 0,
            },
            viewport: {
              once: true,
              margin: "-50px",
            },
            transition: {
              duration: 0.5,
              ease: [0.25, 0.1, 0.25, 1],
            },
            className:
              "inline-flex items-center gap-2 mb-6 text-sm text-gray-500 tracking-wide uppercase",
          },
          /*#__PURE__*/ React.createElement(motion.div, {
            initial: {
              scaleX: 0,
            },
            whileInView: {
              scaleX: 1,
            },
            viewport: {
              once: true,
            },
            transition: {
              duration: 0.5,
              delay: 0.2,
              ease: [0.25, 0.1, 0.25, 1],
            },
            className: "w-8 h-[1px] bg-gray-300 origin-left",
          }),
          "Why Attend With Us",
          /*#__PURE__*/ React.createElement(motion.div, {
            initial: {
              scaleX: 0,
            },
            whileInView: {
              scaleX: 1,
            },
            viewport: {
              once: true,
            },
            transition: {
              duration: 0.5,
              delay: 0.2,
              ease: [0.25, 0.1, 0.25, 1],
            },
            className: "w-8 h-[1px] bg-gray-300 origin-right",
          }),
        ),
        /*#__PURE__*/ React.createElement(
          motion.h2,
          {
            ref: headingRef,
            initial: false,
            whileInView: {
              opacity: 1,
              y: 0,
            },
            viewport: {
              once: true,
              margin: "-50px",
            },
            transition: {
              duration: 0.6,
              delay: 0.1,
              ease: [0.25, 0.1, 0.25, 1],
            },
            className: "text-3xl md:text-5xl font-bold",
            style: {
              color: headingColor,
              transition: "color 160ms linear",
            },
          },
          "Built for Smooth Event Days",
        ),
      ),
      /*#__PURE__*/ React.createElement(MobileFeatureCarousel, null),
      /*#__PURE__*/ React.createElement(DesktopFeaturesGrid, null),
    ),
  );
}
