import React from "react";

type Size = "sm" | "md" | "lg" | "full";

interface ModalProps {
  /** controlled open state (preferred) */
  open?: boolean;
  /** legacy prop name still supported */
  isOpen?: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** optional footer area (buttons, actions) */
  footer?: React.ReactNode;
  /** size of the modal */
  size?: Size;
  /** extra classes for the dialog container */
  className?: string;
  /** whether a close button (X) is shown */
  showCloseButton?: boolean;
  /** whether clicking the overlay closes the modal */
  closeOnOverlayClick?: boolean;
  /** basic focus trap to keep keyboard focus inside modal */
  trapFocus?: boolean;
}

export default function Modal({
  open,
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className = "",
  showCloseButton = true,
  closeOnOverlayClick = true,
  trapFocus = true,
}: ModalProps) {
  const isOpenEffective = open ?? isOpen;
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  const onCloseRef = React.useRef(onClose);

  // keep latest onClose in a ref so main effect doesn't need onClose as dependency
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!isOpenEffective) return;
    // Save focused element and move focus into modal
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // small delay to ensure element exists; prefer focusing the first focusable element
    requestAnimationFrame(() => {
      try {
        const first = containerRef.current?.querySelector<HTMLElement>(
          'input, textarea, select, button, [tabindex]:not([tabindex="-1"])'
        );
        if (first) first.focus();
        else containerRef.current?.focus();
      } catch (e) {
        containerRef.current?.focus();
      }
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // call latest onClose from ref
        onCloseRef.current && onCloseRef.current();
      }
      if (trapFocus && e.key === "Tab" && containerRef.current) {
        // Basic focus trap
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // restore focus
      try {
        previouslyFocused.current?.focus();
      } catch (e) {
        // ignore
      }
    };
  }, [isOpenEffective, trapFocus]);


  if (!isOpenEffective) return null;

  const sizeClass = (() => {
    switch (size) {
      case "sm":
        return "max-w-sm";
      case "lg":
        return "max-w-3xl";
      case "full":
        return "w-full h-full max-w-none";
      default:
        return "max-w-md"; // md
    }
  })();

  const onOverlayClick = (e: React.MouseEvent) => {
    if (!closeOnOverlayClick) return;
    if (e.target === e.currentTarget) onClose();
  };


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-hidden={!isOpenEffective}
    >
      <div className="absolute inset-0 bg-gray-900/30" onClick={onOverlayClick} />

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`relative bg-white rounded-2xl shadow-lg w-full ${sizeClass} p-6 m-4 ${className}`}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            aria-label="Cerrar"
          >
            ✕
          </button>
        )}

        {title && <div className="mb-4"><h2 className="text-xl font-semibold">{title}</h2></div>}

        <div className="min-h-[40px]">{children}</div>

        {footer && <div className="mt-4 border-t pt-4">{footer}</div>}
      </div>
    </div>
  );
}

export type { ModalProps };
