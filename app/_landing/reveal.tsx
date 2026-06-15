"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fade + slide-up when scrolled into view. Respects reduced-motion. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Stagger container — children using `revealItem` animate in sequence. */
export function RevealGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{ show: { transition: { staggerChildren: 0.12 } } }}
    >
      {children}
    </motion.div>
  );
}

const revealItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/** A single staggered item — place inside a `RevealGroup`. */
export function RevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={revealItem}>
      {children}
    </motion.div>
  );
}

/** A bar that fills to `pct`% the first time it scrolls into view. */
export function ScoreBar({ pct, barClass }: { pct: number; barClass: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
      <motion.div
        className={`h-full rounded-full ${barClass}`}
        initial={reduce ? false : { width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
    </div>
  );
}
