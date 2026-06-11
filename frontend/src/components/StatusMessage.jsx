import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const variants = {
  loading: {
    icon: Loader2,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    spin: true,
  },
  success: {
    icon: CheckCircle,
    className: 'bg-green-50 text-green-700 border-green-200',
    spin: false,
  },
  error: {
    icon: AlertCircle,
    className: 'bg-red-50 text-red-700 border-red-200',
    spin: false,
  },
};

export default function StatusMessage({ type, message }) {
  if (!type || !message) return null;

  const variant = variants[type];
  if (!variant) return null;

  const Icon = variant.icon;

  return (
    <div
      role="status"
      className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium ${variant.className}`}
    >
      <Icon size={18} className={variant.spin ? 'animate-spin shrink-0' : 'shrink-0'} />
      <span>{message}</span>
    </div>
  );
}
