"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { cn } from "../utils/cn";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  title?: string;
  duration?: number;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  show: (type: ToastType, message: string, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  dismiss: (id: string) => void;
}

const noopToastContext: ToastContextValue = {
  toasts: [],
  show: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
  dismiss: () => {},
};

const ToastContext = createContext<ToastContextValue>(noopToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (type: ToastType, message: string, options?: ToastOptions) => {
      const id = Math.random().toString(36).substring(2, 9);
      const duration = options?.duration ?? 4500;

      const newToast: ToastItem = {
        id,
        type,
        message,
        title: options?.title,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss],
  );

  const success = useCallback(
    (message: string, options?: ToastOptions) =>
      show("success", message, options),
    [show],
  );
  const error = useCallback(
    (message: string, options?: ToastOptions) =>
      show("error", message, options),
    [show],
  );
  const warning = useCallback(
    (message: string, options?: ToastOptions) =>
      show("warning", message, options),
    [show],
  );
  const info = useCallback(
    (message: string, options?: ToastOptions) => show("info", message, options),
    [show],
  );

  const toastsRef = React.useRef<ToastItem[]>(toasts);
  toastsRef.current = toasts;

  const contextValue = useMemo(
    () => ({
      get toasts() {
        return toastsRef.current;
      },
      show,
      success,
      error,
      warning,
      info,
      dismiss,
    }),
    [show, success, error, warning, info, dismiss],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  return context || noopToastContext;
};

const toastIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles: Record<
  ToastType,
  { container: string; icon: string; title: string }
> = {
  success: {
    container:
      "bg-white border-emerald-200 text-slate-800 shadow-emerald-500/10",
    icon: "text-emerald-600 bg-emerald-50 border-emerald-100",
    title: "text-emerald-900",
  },
  error: {
    container: "bg-white border-rose-200 text-slate-800 shadow-rose-500/10",
    icon: "text-rose-600 bg-rose-50 border-rose-100",
    title: "text-rose-900",
  },
  warning: {
    container: "bg-white border-amber-200 text-slate-800 shadow-amber-500/10",
    icon: "text-amber-600 bg-amber-50 border-amber-100",
    title: "text-amber-900",
  },
  info: {
    container: "bg-white border-purple-200 text-slate-800 shadow-purple-500/10",
    icon: "text-[#23055c] bg-purple-50 border-purple-100",
    title: "text-[#23055c]",
  },
};

const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const Icon = toastIcons[toast.type];
        const style = toastStyles[toast.type];

        return (
          <div
            key={toast.id}
            role="alert"
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 animate-in fade-in slide-in-from-top-3",
              style.container,
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5",
                style.icon,
              )}
            >
              <Icon className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0 pr-2">
              {toast.title && (
                <h4
                  className={cn(
                    "text-xs font-bold leading-tight mb-0.5",
                    style.title,
                  )}
                >
                  {toast.title}
                </h4>
              )}
              <p className="text-xs text-slate-600 leading-snug font-normal">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              aria-label="Close notification"
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors shrink-0 -mr-1 -mt-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
