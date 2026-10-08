import React from "react";
// @ts-ignore - flowbite-react types may need reinstall
import { Toast } from "flowbite-react";
import { HiCheck, HiExclamation, HiInformationCircle } from "react-icons/hi";
import { MdWarning } from "react-icons/md";
import type { Notification } from "./useNotification";

interface NotificationContainerProps {
  notifications: Notification[];
  onClose: (id: string) => void;
}

const iconMap = {
  success: <HiCheck className="h-5 w-5" />,
  error: <HiExclamation className="h-5 w-5" />,
  warning: <MdWarning className="h-5 w-5" />,
  info: <HiInformationCircle className="h-5 w-5" />,
};

const colorMap = {
  success: "bg-green-100 text-green-500",
  error: "bg-red-100 text-red-500",
  warning: "bg-yellow-100 text-yellow-600",
  info: "bg-blue-100 text-blue-500",
};

export default function NotificationContainer({
  notifications,
  onClose,
}: NotificationContainerProps) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm">
      {notifications.map((notification) => (
        <Toast key={notification.id}>
          <div
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              colorMap[notification.type]
            }`}
          >
            {iconMap[notification.type]}
          </div>
          <div className="ml-3 text-sm font-normal">{notification.message}</div>
          <button
            type="button"
            className="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8"
            onClick={() => onClose(notification.id)}
            aria-label="Close"
          >
            <span className="sr-only">Close</span>
            ✕
          </button>
        </Toast>
      ))}
    </div>
  );
}
