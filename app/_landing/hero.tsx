"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { CrownIcon } from "@/app/(app)/_components/icons";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export function Hero() {
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useGSAP(
    () => {
      if (reduce) return;
      gsap.registerPlugin(ScrollTrigger);

      // Count points up from 0.
      const obj = { v: 0 };
      gsap.to(obj, {
        v: 312,
        duration: 1.8,
        delay: 0.4,
        ease: "power2.out",
        onUpdate() {
          if (counter.current) {
            counter.current.textContent = Math.round(obj.v).toString();
          }
        },
      });

      // Floating chips drift in, then breathe.
      gsap.from(".hero-chip", {
        y: 24,
        opacity: 0,
        stagger: 0.15,
        duration: 0.8,
        delay: 0.5,
        ease: "power3.out",
      });
      gsap.to(".hero-chip", {
        y: "+=8",
        duration: 2.4,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: 0.3,
      });

      // Parallax on the blurred backdrop.
      gsap.to(".hero-bg", {
        yPercent: 18,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.5,
        },
      });
    },
    { scope: root, dependencies: [reduce] },
  );

  return (
    <section
      ref={root}
      className="relative overflow-hidden px-6 pb-20 pt-32 sm:pt-40"
    >
      {/* Blurred pitch backdrop + light accent veil */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/auth-bg.jpg"
        alt=""
        aria-hidden
        className="hero-bg pointer-events-none absolute inset-x-0 -top-10 h-[120%] w-full scale-110 object-cover opacity-60 blur-md"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/85 via-background/92 to-background" />

      <div className="relative mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2">
        {/* Copy */}
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.span
            variants={item}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted"
          >
            <span className="size-1.5 rounded-full bg-accent" />
            Classement mondial · saison ouverte
          </motion.span>

          <motion.h1
            variants={item}
            className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
          >
            Pronostique le
            <br />
            <span className="text-accent">score exact</span>.
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-5 max-w-md text-lg text-muted"
          >
            Chaque match, ton pronostic. Plus tu vises juste, plus tu marques.
            Grimpe dans le classement mondial et vise le podium.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="press rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong"
            >
              Créer mon compte
            </Link>
            <Link
              href="/matchs"
              className="press rounded-lg border border-border bg-surface px-6 py-3 text-sm font-semibold transition-colors hover:border-border-strong"
            >
              Voir les matchs
            </Link>
          </motion.div>
        </motion.div>

        {/* Visual */}
        <div className="relative mx-auto h-80 w-full max-w-sm">
          {/* Prediction card */}
          <div className="absolute left-1/2 top-1/2 w-72 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-faint">
              Ligue 1 · ce soir
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="font-medium">PSG</span>
              <div className="flex items-center gap-1.5 font-mono text-xl font-bold tabular-nums">
                <span className="grid size-9 place-items-center rounded-lg bg-accent/10 text-accent">
                  2
                </span>
                <span className="text-faint">-</span>
                <span className="grid size-9 place-items-center rounded-lg bg-accent/10 text-accent">
                  1
                </span>
              </div>
              <span className="font-medium">OM</span>
            </div>
            <div className="mt-4 rounded-lg bg-success/10 py-2 text-center text-sm font-semibold text-success">
              +10 pts · score exact
            </div>
          </div>

          {/* Floating chips */}
          <div className="hero-chip absolute -right-2 top-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-gold">
            <CrownIcon className="size-4" />
            #1 mondial
          </div>
          <div className="hero-chip absolute -left-3 top-16 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-sm font-semibold tabular-nums">
            <span ref={counter}>312</span>
            <span className="ml-1 text-xs font-normal text-faint">pts</span>
          </div>
          <div className="hero-chip absolute bottom-3 right-0 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-accent">
            +6 pts
          </div>
        </div>
      </div>
    </section>
  );
}
