import React, { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useNotification, type NotificationType } from "./useNotification";
import { useConfirmDialog } from "./useConfirmDialog";
import ConfirmDialog from "./ConfirmDialog";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

interface NotificationContextType {
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  addNotification: (message: string, type: NotificationType, duration?: number) => string;
  removeNotification: (id: string) => void;
  notifications: any[];
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    warning,
    info,
  } = useNotification();

  const { confirmState, confirm } = useConfirmDialog();

  const value: NotificationContextType = {
    success,
    error,
    warning,
    info,
    addNotification,
    removeNotification,
    notifications,
    confirm,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
        onConfirm={confirmState.onConfirm}
        onCancel={confirmState.onCancel}
      />
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationContext debe usarse dentro de NotificationProvider"
    );
  }
  return context;
}
