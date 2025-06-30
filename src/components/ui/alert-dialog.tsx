import React, { createContext, useContext, useState } from 'react';
import { Button } from './button';

interface AlertDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive: boolean;
}

interface AlertDialogContextType {
  showAlert: (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
}

const AlertDialogContext = createContext<AlertDialogContextType | null>(null);

export function AlertDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AlertDialogState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '确定',
    cancelText: '取消',
    onConfirm: () => {},
    onCancel: () => {},
    destructive: false,
  });

  const showAlert = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => {
    setState({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || '确定',
      cancelText: options.cancelText || '取消',
      onConfirm: options.onConfirm,
      onCancel: options.onCancel || (() => {}),
      destructive: options.destructive || false,
    });
  };

  const handleConfirm = () => {
    state.onConfirm();
    setState(prev => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    state.onCancel();
    setState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <AlertDialogContext.Provider value={{ showAlert }}>
      {children}
      
      {state.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={handleCancel}
          />
          <div className="relative bg-background rounded-lg shadow-lg border max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-2">{state.title}</h3>
            <p className="text-sm text-muted-foreground mb-6">{state.message}</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
              >
                {state.cancelText}
              </Button>
              <Button
                variant={state.destructive ? "destructive" : "default"}
                onClick={handleConfirm}
              >
                {state.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AlertDialogContext.Provider>
  );
}

export function useAlertDialog() {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error('useAlertDialog must be used within an AlertDialogProvider');
  }
  return context;
} 