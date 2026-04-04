import React, { useEffect, useState } from 'react';

const readThemePreference = () => {
  try {
    const stored = localStorage.getItem('ui-theme');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
  } catch {
    // no-op
  }

  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  return false;
};

const ThemeToggleButton = () => {
  const [isDarkMode, setIsDarkMode] = useState(readThemePreference);

  useEffect(() => {
    document.body.classList.toggle('theme-dark', isDarkMode);
    localStorage.setItem('ui-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === 'ui-theme') {
        setIsDarkMode(readThemePreference());
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <button
      type="button"
      onClick={() => setIsDarkMode((prev) => !prev)}
      className={`fixed bottom-4 right-4 z-[60] glass-chip rounded-full p-3 shadow-lg transition ${isDarkMode ? 'glass-chip-active' : ''}`}
      title={isDarkMode ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
      aria-label={isDarkMode ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
    >
      <span className="material-symbols-outlined text-xl">
        {isDarkMode ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
};

export default ThemeToggleButton;
