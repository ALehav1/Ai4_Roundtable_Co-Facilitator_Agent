"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  title?: string;
  message: string;
  durationMs?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  showToast: (opts: ToastOptions) => string; // returns toast id
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastItem({ id, type, title, message, action, onDismiss }: { id: string; type: ToastType; title?: string; message: string; action?: { label: string; onClick: () => void }; onDismiss: (id: string) => void; }) {
  const colors: Record<ToastType, string> = {
    info: "border-blue-500",
    success: "border-green-600",
    warning: "border-yellow-500",
    error: "border-red-600",
  };
  const icons: Record<ToastType, string> = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    error: "🛑",
  };
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto w-96 rounded-lg bg-white shadow-lg ring-1 ring-black/5 border-l-4 ${colors[type]} p-4 mb-3`}
    >
      <div className="flex">
        <div className="shrink-0 mr-3 text-xl" aria-hidden>{icons[type]}</div>
        <div className="flex-1">
          {title && <p className="font-semibold text-gray-900">{title}</p>}
          <p className="text-sm text-gray-700">{message}</p>
        </div>
        {action && (
          <button
            type="button"
            className="ml-3 text-blue-600 hover:text-blue-800 underline focus-ring"
            aria-label={action.label}
            onClick={() => { try { action.onClick(); } finally { onDismiss(id); } }}
          >
            {action.label}
          </button>
        )}
        <button
          type="button"
          className="ml-3 text-gray-500 hover:text-gray-700 focus-ring"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(id)}
        >
          ✖
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  type ToastItemData = {
    id: string;
    type: ToastType;
    title?: string;
    message: string;
    durationMs: number;
    action?: { label: string; onClick: () => void };
  };
  const [toasts, setToasts] = useState<ToastItemData[]>([]);
  const timeouts = useRef<Record<string, any>>({});

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timeouts.current[id];
    if (t) {
      clearTimeout(t);
      delete timeouts.current[id];
    }
  }, []);

  const showToast = useCallback((opts: ToastOptions) => {
    const id = opts.id || `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const type: ToastType = opts.type || "info";
    const durationDefaults: Record<ToastType, number> = {
      info: 3500,
      success: 3000,
      warning: 5000,
      error: 6000,
    };
    const durationMs = opts.durationMs ?? durationDefaults[type];

    const next: ToastItemData = {
      id,
      type,
      title: opts.title ?? undefined,
      message: opts.message,
      durationMs,
      action: opts.action,
    };

    setToasts((prev) => [...prev, next]);

    // auto-dismiss
    timeouts.current[id] = setTimeout(() => dismissToast(id), durationMs);

    return id;
  }, [dismissToast]);

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  useEffect(() => {
    return () => {
      // cleanup timeouts on unmount
      Object.values(timeouts.current).forEach((t) => clearTimeout(t));
      timeouts.current = {};
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div className="pointer-events-none fixed top-4 right-4 z-[1000] flex flex-col items-end">
        {toasts.map((t) => (
          <ToastItem key={t.id} id={t.id} type={t.type} title={t.title} message={t.message} action={t.action} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
