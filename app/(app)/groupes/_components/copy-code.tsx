"use client";

import { useState } from "react";

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable (insecure context); ignore silently.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="press inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-sm font-semibold tracking-widest transition-colors hover:border-border-strong"
      aria-label="Copier le code d'invitation"
    >
      {code}
      <span className="font-sans text-xs font-medium text-faint">
        {copied ? "Copié ✓" : "Copier"}
      </span>
    </button>
  );
}
