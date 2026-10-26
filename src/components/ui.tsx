import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Devotional } from '../lib/store';
import type { ShareInput } from '../lib/share';
import { ShareModal } from './ShareModal';
import { DevotionalModal } from './DevotionalModal';

export interface DevotionalDraft {
  bookId?: string;
  episode?: number;
  verse?: string;
  existing?: Devotional;
}

interface UI {
  toast(msg: string): void;
  openShare(input: Omit<ShareInput, 'profile' | 'format'>): void;
  openDevotional(d: DevotionalDraft): void;
}

const Ctx = createContext<UI | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [share, setShare] = useState<Omit<ShareInput, 'profile' | 'format'> | null>(null);
  const [dev, setDev] = useState<DevotionalDraft | null>(null);
  const idRef = useRef(0);

  const toast = useCallback((msg: string) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const value = useMemo<UI>(() => ({ toast, openShare: setShare, openDevotional: setDev }), [toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {share && <ShareModal input={share} onClose={() => setShare(null)} />}
      {dev && <DevotionalModal draft={dev} onClose={() => setDev(null)} />}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useUI(): UI {
  const v = useContext(Ctx);
  if (!v) throw new Error('UIProvider ausente');
  return v;
}

/** Overlay modal com fechamento por ESC/clique fora e bloqueio de rolagem. */
export function Modal({
  onClose,
  children,
  className = '',
  label,
}: {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
