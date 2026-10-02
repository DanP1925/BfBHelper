"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./ConfirmDialog.module.css";

type ConfirmDialogProps = {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * A small, framework-free confirm modal. The caller controls mount/unmount
 * (no internal `open` prop) — conditionally render this when a
 * confirmation is needed. Escape and a backdrop click both act as Cancel.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Escape acts as Cancel, and Tab/Shift+Tab is trapped within the
  // panel's own focusable elements — without this, Shift+Tab from Cancel
  // (the first/default-focused control) would move focus to whatever's
  // behind the backdrop (e.g. a NumberStepper button), which stays
  // keyboard-activatable despite being visually covered.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
        return;
      }

      if (event.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;

        const focusable = panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p className={styles.body}>{body}</p>
        <div className={styles.actions}>
          <button type="button" ref={cancelRef} className={styles.cancelButton} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={styles.confirmButton} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
