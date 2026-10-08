import { useState, useCallback } from "react";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  autoClose?: boolean;
  duration?: number;
}

export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (message: string, type: NotificationType = "info", duration: number = 3000) => {
      const id = `${Date.now()}-${Math.random()}`;
      const notification: Notification = {
        id,
        message,
        type,
        autoClose: duration > 0,
        duration,
      };

      setNotifications((prev) => [...prev, notification]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }

      return id;
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const success = useCallback(
    (message: string, duration?: number) =>
      addNotification(message, "success", duration ?? 3000),
    [addNotification]
  );

  const error = useCallback(
    (message: string, duration?: number) =>
      addNotification(message, "error", duration ?? 5000),
    [addNotification]
  );

  const warning = useCallback(
    (message: string, duration?: number) =>
      addNotification(message, "warning", duration ?? 4000),
    [addNotification]
  );

  const info = useCallback(
    (message: string, duration?: number) =>
      addNotification(message, "info", duration ?? 3000),
    [addNotification]
  );

  return {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    warning,
    info,
  };
}
