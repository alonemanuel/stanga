'use client';

import React, { useState, useCallback, ReactNode } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AlertDialog } from '@/components/ui/alert-dialog';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'secondary' | 'ghost' | 'outline';
  showDontShowAgain?: boolean;
}

interface AlertOptions {
  title?: string;
  message: string;
  buttonText?: string;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve?: (result: boolean | { confirmed: boolean; dontShowAgain?: boolean }) => void;
}

interface AlertState extends AlertOptions {
  open: boolean;
  resolve?: () => void;
}

// Context for providing dialog state across the app
const DialogContext = React.createContext<{
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  confirmWithOptions: (options: ConfirmOptions) => Promise<{ confirmed: boolean; dontShowAgain?: boolean }>;
  alert: (options: AlertOptions) => Promise<void>;
} | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    message: '',
  });

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: '',
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        ...options,
        title: options.title || 'Confirm',
        open: true,
        resolve: (result) => {
          if (typeof result === 'boolean') {
            resolve(result);
          } else {
            resolve(result.confirmed);
          }
        },
      });
    });
  }, []);

  const confirmWithOptions = useCallback((options: ConfirmOptions): Promise<{ confirmed: boolean; dontShowAgain?: boolean }> => {
    return new Promise((resolve) => {
      setConfirmState({
        ...options,
        title: options.title || 'Confirm',
        open: true,
        resolve: (result) => {
          if (typeof result === 'boolean') {
            resolve({ confirmed: result });
          } else {
            resolve(result);
          }
        },
      });
    });
  }, []);

  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({
        ...options,
        title: options.title || 'Alert',
        open: true,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback((dontShowAgain?: boolean) => {
    if (confirmState.resolve) {
      if (confirmState.showDontShowAgain) {
        confirmState.resolve({ confirmed: true, dontShowAgain });
      } else {
        confirmState.resolve(true);
      }
    }
    setConfirmState(prev => ({ ...prev, open: false }));
  }, [confirmState.resolve, confirmState.showDontShowAgain]);

  const handleCancel = useCallback(() => {
    if (confirmState.resolve) {
      if (confirmState.showDontShowAgain) {
        confirmState.resolve({ confirmed: false });
      } else {
        confirmState.resolve(false);
      }
    }
    setConfirmState(prev => ({ ...prev, open: false }));
  }, [confirmState.resolve, confirmState.showDontShowAgain]);

  const handleAlertClose = useCallback(() => {
    if (alertState.resolve) {
      alertState.resolve();
    }
    setAlertState(prev => ({ ...prev, open: false }));
  }, [alertState.resolve]);

  return (
    <DialogContext.Provider value={React.useMemo(() => ({ confirm, confirmWithOptions, alert }), [confirm, confirmWithOptions, alert])}>
      {children}
      
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title || 'Confirm'}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
        showDontShowAgain={confirmState.showDontShowAgain}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <AlertDialog
        open={alertState.open}
        title={alertState.title || 'Alert'}
        message={alertState.message}
        buttonText={alertState.buttonText}
        onClose={handleAlertClose}
      />
    </DialogContext.Provider>
  );
}

export function useConfirm() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('useConfirm must be used within a DialogProvider');
  }
  return context.confirm;
}

export function useConfirmWithOptions() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('useConfirmWithOptions must be used within a DialogProvider');
  }
  return context.confirmWithOptions;
}

export function useAlert() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('useAlert must be used within a DialogProvider');
  }
  return context.alert;
}
