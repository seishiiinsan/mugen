"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/wiki", label: "Wiki" },
  { href: "/changelog", label: "Nouveautés" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || open
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight"
          onClick={() => setOpen(false)}
        >
          Mugen
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 sm:flex">
          {LINKS.filter((l) => l.href !== "/").map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(pathname, href)
                  ? "text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Single CTA */}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="press rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong"
          >
            Jouer
          </Link>

          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="press grid size-9 place-items-center rounded-lg border border-border text-foreground transition-colors hover:bg-surface-2 sm:hidden"
          >
            <Burger open={open} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border bg-background/95 backdrop-blur-md sm:hidden"
          >
            <ul className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-6 py-4">
              {LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive(pathname, href)
                        ? "bg-accent/10 text-accent"
                        : "text-muted hover:bg-surface-2 hover:text-foreground"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/** Animated hamburger ↔ close icon. */
function Burger({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <line
        x1="2"
        x2="16"
        y1={open ? "9" : "5"}
        y2={open ? "9" : "5"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        style={{
          transform: open ? "rotate(45deg)" : "none",
          transformOrigin: "center",
          transition: "transform 0.2s ease, y1 0.2s ease, y2 0.2s ease",
        }}
      />
      <line
        x1="2"
        x2="16"
        y1="9"
        y2="9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity={open ? 0 : 1}
        style={{ transition: "opacity 0.15s ease" }}
      />
      <line
        x1="2"
        x2="16"
        y1={open ? "9" : "13"}
        y2={open ? "9" : "13"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        style={{
          transform: open ? "rotate(-45deg)" : "none",
          transformOrigin: "center",
          transition: "transform 0.2s ease, y1 0.2s ease, y2 0.2s ease",
        }}
      />
    </svg>
  );
}
