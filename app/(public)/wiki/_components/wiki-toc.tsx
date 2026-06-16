"use client";

import { useEffect, useState } from "react";

export function WikiToc({
  sections,
}: {
  sections: { id: string; label: string }[];
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the topmost section currently intersecting the viewport band.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    for (const { id } of sections) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Sommaire" className="space-y-1">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-faint">
        Sommaire
      </div>
      {sections.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <a
            key={id}
            href={`#${id}`}
            className={`block border-l-2 py-1.5 pl-3 text-sm transition-colors ${
              isActive
                ? "border-accent font-medium text-accent"
                : "border-border text-muted hover:border-border-strong hover:text-foreground"
            }`}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
}
