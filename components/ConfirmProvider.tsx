"use client";
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ConfirmOptions = {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type ConfirmContextType = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({});
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options || {});
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const onClose = useCallback((val: boolean) => {
    setOpen(false);
    resolver?.(val);
    setResolver(null);
  }, [resolver]);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {open && (
        <div className="backdrop grid place-items-center" role="dialog" aria-modal="true">
          <div className="modal max-w-sm w-[92vw] p-4">
            {opts.title && <h3 className="text-lg font-semibold mb-2">{opts.title}</h3>}
            {opts.message && <p className="text-sm text-brand-white/80 mb-4">{opts.message}</p>}
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => onClose(false)}>{opts.cancelText || 'Anulează'}</button>
              <button className={`btn ${opts.danger ? 'btn-primary' : 'btn-primary'}`} onClick={() => onClose(true)}>{opts.confirmText || 'OK'}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
