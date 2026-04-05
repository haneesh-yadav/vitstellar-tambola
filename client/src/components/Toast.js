import React, { useState, useCallback, useEffect } from 'react';

let toastId = 0;
let globalAddToast = null;

export function toast(message, type = 'info') {
  if (globalAddToast) globalAddToast(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    globalAddToast = addToast;
    return () => { globalAddToast = null; };
  }, [addToast]);

  const iconMap = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    gold: 'emoji_events',
    warning: 'warning',
  };

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="material-icons" style={{ fontSize: 18 }}>{iconMap[t.type] || 'info'}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
