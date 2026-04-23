"use client";

import { motion, useInView, Variants } from "framer-motion";
import { ReactNode, RefObject } from "react";

interface TimelineContentProps {
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
  animationNum: number;
  timelineRef: RefObject<HTMLElement>;
  customVariants?: Variants;
  className?: string;
}

export function TimelineContent({
  children,
  as: Component = "div",
  animationNum,
  timelineRef,
  customVariants,
  className = "",
}: TimelineContentProps) {
  const isInView = useInView(timelineRef, { once: true, amount: 0.3 });

  const defaultVariants = {
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.2,
        duration: 0.6,
      },
    }),
    hidden: {
      opacity: 0,
      y: 20,
    },
  };

  const variants = customVariants || defaultVariants;

  return (
    <motion.div
      custom={animationNum}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      className={className}
    >
      {Component === "div" ? (
        children
      ) : (
        <Component className={className}>{children}</Component>
      )}
    </motion.div>
  );
}
