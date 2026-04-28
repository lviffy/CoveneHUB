"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
const faqs = [
  {
    question: "What is ConveneHub?",
    answer:
      "ConveneHub is an all-in-one event management platform for organizers, promoters, and attendees. It centralizes event publishing, ticketing, check-ins, and reporting in one workflow.",
  },
  {
    question: "How does multi-campus event management work?",
    answer:
      "You can manage multiple campuses or tenants from a single admin view while keeping each event, team assignment, and performance report organized by location.",
  },
  {
    question: "Is attendee and organizer data secure?",
    answer:
      "Security is a top priority. ConveneHub uses secure authentication, role-based access controls, and protected APIs to safeguard booking, attendee, and financial data.",
  },
  {
    question: "Can smaller organizers use ConveneHub?",
    answer:
      "Absolutely. ConveneHub is built for both high-volume events and smaller teams, so clubs, colleges, and communities can run events with the same reliability as larger organizers.",
  },
  {
    question: "How do check-ins work on event day?",
    answer:
      "Each booking includes a QR ticket that event staff can scan at the venue. This enables faster entry, real-time attendance updates, and fewer manual errors.",
  },
  {
    question: "Can I migrate from existing tools?",
    answer:
      "Yes. Our onboarding process helps teams move event and attendee workflows from disconnected tools into ConveneHub with minimal disruption.",
  },
];
export default function FAQSection() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [30, -30]);
  const handleWhatsAppClick = () => {
    const phoneNumber = "919032888489";
    const message = encodeURIComponent(
      "Hi! I have a question about ConveneHub.",
    );
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  };
  return /*#__PURE__*/ React.createElement(
    "section",
    {
      ref: sectionRef,
      id: "faq",
      className: "w-full py-12 xs:py-16 sm:py-20 lg:py-40 px-4 xs:px-5 sm:px-6",
    },
    /*#__PURE__*/ React.createElement(
      motion.div,
      {
        style: {
          y,
        },
        className: "mx-auto max-w-6xl",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "grid lg:grid-cols-2 gap-8 xs:gap-10 lg:gap-10",
        },
        /*#__PURE__*/ React.createElement(
          motion.div,
          {
            initial: {
              opacity: 0,
              x: -30,
            },
            whileInView: {
              opacity: 1,
              x: 0,
            },
            viewport: {
              once: true,
              margin: "-100px",
            },
            transition: {
              duration: 0.6,
            },
            className: "flex gap-6 xs:gap-8 lg:gap-10 flex-col",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "flex gap-3 xs:gap-4 flex-col",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              null,
              /*#__PURE__*/ React.createElement(
                Badge,
                {
                  variant: "outline",
                  className: "text-xs xs:text-sm",
                },
                "FAQ",
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex gap-2 flex-col",
              },
              /*#__PURE__*/ React.createElement(
                "h4",
                {
                  className:
                    "text-2xl xs:text-3xl md:text-4xl lg:text-5xl tracking-tighter max-w-xl text-left font-regular text-gray-900",
                },
                "Have Questions? ",
                /*#__PURE__*/ React.createElement("br", null),
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "text-blue-600",
                  },
                  "We Have Answers",
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className:
                    "text-base xs:text-lg max-w-xl lg:max-w-lg leading-relaxed tracking-tight text-muted-foreground text-left text-gray-600",
                },
                "Everything you need to know about ConveneHub and how it improves end-to-end event operations.",
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "mt-2 xs:mt-0",
              },
              /*#__PURE__*/ React.createElement(
                Button,
                {
                  className: "gap-3 xs:gap-4 text-sm xs:text-base",
                  variant: "outline",
                  onClick: handleWhatsAppClick,
                },
                "Any questions? Reach out ",
                /*#__PURE__*/ React.createElement(PhoneCall, {
                  className: "w-4 h-4",
                }),
              ),
            ),
          ),
        ),
        /*#__PURE__*/ React.createElement(
          motion.div,
          {
            initial: {
              opacity: 0,
              x: 30,
            },
            whileInView: {
              opacity: 1,
              x: 0,
            },
            viewport: {
              once: true,
              margin: "-100px",
            },
            transition: {
              duration: 0.6,
            },
          },
          /*#__PURE__*/ React.createElement(
            Accordion,
            {
              type: "single",
              collapsible: true,
              className: "w-full",
            },
            faqs.map((faq, index) =>
              /*#__PURE__*/ React.createElement(
                AccordionItem,
                {
                  key: index,
                  value: `item-${index}`,
                },
                /*#__PURE__*/ React.createElement(
                  AccordionTrigger,
                  {
                    className:
                      "text-left text-base xs:text-lg font-semibold text-gray-900 hover:text-blue-600",
                  },
                  faq.question,
                ),
                /*#__PURE__*/ React.createElement(
                  AccordionContent,
                  {
                    className:
                      "text-sm xs:text-base text-gray-600 leading-relaxed",
                  },
                  faq.answer,
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
