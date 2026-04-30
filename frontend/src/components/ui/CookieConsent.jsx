import React, { useState, useEffect } from 'react';

const CookieConsent = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Small delay so it slides in smoothly after page load
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 glass-surface-strong rounded-2xl border border-white/70 p-4 shadow-xl z-50 animate-glass-rise flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
          <span className="material-symbols-outlined text-white">cookie</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-blue-950 text-sm">Chấp nhận Cookie?</h3>
          <p className="text-[11px] text-glass-subtle mt-0.5 leading-relaxed">
            Chúng tôi sử dụng cookie để lưu tiến trình học và cá nhân hóa trải nghiệm của bạn.
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-1">
        <button 
          onClick={handleDecline}
          className="flex-1 px-3 py-1.5 rounded-xl glass-chip text-glass-subtle text-xs font-medium transition"
        >
          Từ chối
        </button>
        <button 
          onClick={handleAccept}
          className="flex-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition shadow-sm"
        >
          Đồng ý
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
