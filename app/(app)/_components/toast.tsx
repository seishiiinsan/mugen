"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckIcon, InfoIcon, XIcon } from "./icons";

export type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}

type Push = (input: { type?: ToastType; title?: string; message: string }) => void;

/** Default heading per toast type when none is supplied. */
const DEFAULT_TITLES: Record<ToastType, string> = {
  success: "Succès",
  error: "Une erreur est survenue",
  info: "Information",
};

const ToastContext = createContext<Push>(() => {});

/** Imperative toast trigger — call inside client event handlers. */
export function useToast(): Push {
  return useContext(ToastContext);
}

/**
 * Toasts whenever a `useActionState` result changes: `error` → error toast,
 * truthy `ok` → success toast (using `message`, a string `ok`, or the fallback).
 */
export function useActionToast(
  state: { ok?: boolean | string; error?: string; message?: string } | undefined,
  successMessage?: string,
) {
  const push = useToast();
  useEffect(() => {
    if (!state) return;
    if (state.error) {
      push({ type: "error", message: state.error });
    } else if (state.ok) {
      push({
        type: "success",
        message:
          state.message ??
          (typeof state.ok === "string" ? state.ok : successMessage ?? "Enregistré."),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

const STYLES: Record<ToastType, { ring: string; badge: string; icon: React.ReactNode }> = {
  success: {
    ring: "border-success/40",
    badge: "bg-success/10 text-success",
    icon: <CheckIcon className="size-5" />,
  },
  error: {
    ring: "border-danger/40",
    badge: "bg-danger/10 text-danger",
    icon: <XIcon className="size-5" />,
  },
  info: {
    ring: "border-accent/40",
    badge: "bg-accent/10 text-accent",
    icon: <InfoIcon className="size-5" />,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback<Push>(({ type = "success", title, message }) => {
    if (!message) return;
    const id = Date.now() + Math.random();
    setToasts((t) => [
      ...t,
      { id, type, title: title ?? DEFAULT_TITLES[type], message },
    ]);
    setTimeout(() => remove(id), 5000);
  }, [remove]);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-md flex-col gap-3">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const s = STYLES[toast.type];
  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface px-4 py-3.5 shadow-xl transition-all duration-200 ${s.ring} ${
        show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <span
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${s.badge}`}
      >
        {s.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{toast.title}</p>
        <p className="mt-0.5 text-sm text-muted">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="-mr-1 -mt-1 shrink-0 text-faint transition-colors hover:text-foreground"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}

/**
 * Fires a toast from `?t=<message>&tt=<type>` query params, then strips them.
 * Lets redirect-based server actions surface a toast on the destination page.
 * Must be rendered inside <Suspense> (uses useSearchParams).
 */
export function ToastFromParams() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const push = useToast();

  const message = params.get("t");
  const type = (params.get("tt") as ToastType | null) ?? "success";

  useEffect(() => {
    if (!message) return;
    push({ type, message });
    const next = new URLSearchParams(params);
    next.delete("t");
    next.delete("tt");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, type]);

  return null;
}
