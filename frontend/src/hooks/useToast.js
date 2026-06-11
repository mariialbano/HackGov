import { useState, useCallback, useEffect } from 'react';

export function useToast() {
  const [notification, setNotification] = useState(null);

  const clear = useCallback(() => setNotification(null), []);

  const showToast = useCallback((type, message) => {
    setNotification({ type, message });
  }, []);

  const showSuccess = useCallback((message) => showToast('success', message), [showToast]);
  const showError = useCallback((message) => showToast('error', message), [showToast]);

  useEffect(() => {
    if (!notification) return undefined;
    const timer = setTimeout(clear, 4000);
    return () => clearTimeout(timer);
  }, [notification, clear]);

  return { notification, showSuccess, showError, clear };
}
