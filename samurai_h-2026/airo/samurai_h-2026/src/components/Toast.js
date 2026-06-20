import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

export default function Toast({ message, visible }) {
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setRendered(true);
    } else {
      const t = setTimeout(() => setRendered(false), 400);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!rendered) return null;

  return (
    <div
      data-testid="toast-notification"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 border border-teal-500/30 shadow-2xl max-w-sm transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
        <Bell className="w-4 h-4 text-teal-400" />
      </div>
      <p className="text-sm text-slate-200 flex-1 leading-snug">{message}</p>
    </div>
  );
}
