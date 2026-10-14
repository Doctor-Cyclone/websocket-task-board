import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './JobModal.module.scss';

type Props = { headingId: string; onDismiss: () => void; children: ReactNode };

export function Modal({ headingId, onDismiss, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    (
      dialog?.querySelector<HTMLElement>('input') ??
      dialog?.querySelector<HTMLElement>('[aria-label="Close dialog"]') ??
      dialog?.querySelector<HTMLElement>('button')
    )?.focus();

    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;

      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;

        const bounds = event.currentTarget.getBoundingClientRect();

        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onDismiss();
      }}
    >
      {children}
    </dialog>,
    document.body,
  );
}
