import "./globals.css";
import localFont from "next/font/local";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/toaster";
const openSauceOne = localFont({
  src: [
    {
      path: "../public/fonts/OpenSauceOne-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/OpenSauceOne-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/OpenSauceOne-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/OpenSauceOne-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-open-sauce-one",
});
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};
export const metadata = {
  title: "ConveneHub booking portal",
  description:
    "Discover and book live events with secure tickets, QR-based check-ins, and organizer-friendly workflows.",
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/logo/logo.jpg",
        type: "image/jpeg",
      },
    ],
    shortcut: "/logo/logo.jpg",
    apple: [
      {
        url: "/logo/logo.jpg",
        type: "image/jpeg",
      },
    ],
  },
};
export default function RootLayout({ children }) {
  return /*#__PURE__*/ React.createElement(
    "html",
    {
      lang: "en",
      className: `${openSauceOne.variable}`,
      suppressHydrationWarning: true,
    },
    /*#__PURE__*/ React.createElement(
      "head",
      null,
      /*#__PURE__*/ React.createElement("link", {
        rel: "preconnect",
        href: "https://cdn.jsdelivr.net",
      }),
      /*#__PURE__*/ React.createElement("link", {
        rel: "dns-prefetch",
        href: "https://cdn.jsdelivr.net",
      }),
      /*#__PURE__*/ React.createElement("link", {
        rel: "preconnect",
        href: "https://prod.spline.design",
      }),
      /*#__PURE__*/ React.createElement("link", {
        rel: "dns-prefetch",
        href: "https://prod.spline.design",
      }),
      /*#__PURE__*/ React.createElement("link", {
        rel: "preload",
        href: "/fonts/OpenSauceOne-Regular.ttf",
        as: "font",
        type: "font/ttf",
        crossOrigin: "anonymous",
      }),
      /*#__PURE__*/ React.createElement("link", {
        rel: "preload",
        href: "/fonts/OpenSauceOne-Bold.ttf",
        as: "font",
        type: "font/ttf",
        crossOrigin: "anonymous",
      }),
    ),
    /*#__PURE__*/ React.createElement(
      "body",
      {
        className: `${openSauceOne.className} antialiased`,
        suppressHydrationWarning: true,
      },
      /*#__PURE__*/ React.createElement(Script, {
        src: "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.25/dist/unicornStudio.umd.js",
        strategy: "afterInteractive",
      }),
      children,
      /*#__PURE__*/ React.createElement(Analytics, null),
      /*#__PURE__*/ React.createElement(Toaster, null),
    ),
  );
}
