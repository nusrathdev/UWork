import { useEffect, useState } from "react";

interface NotificationProps {
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
  onClose?: () => void;
}

export function Notification({ message, type, duration = 5000, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  const bgColor = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200", 
    info: "bg-blue-50 border-blue-200"
  }[type];

  const textColor = {
    success: "text-green-800",
    error: "text-red-800",
    info: "text-blue-800"
  }[type];

  return (
    <div className={`fixed top-4 right-4 p-4 rounded-md border ${bgColor} shadow-lg z-50 max-w-sm`}>
      <div className="flex justify-between items-start">
        <p className={`${textColor} text-sm`}>{message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className={`ml-2 ${textColor} hover:opacity-70`}
        >
          ×
        </button>
      </div>
    </div>
  );
}
