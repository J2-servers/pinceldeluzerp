import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'pincel-theme';

function applyTheme(theme) {
  const isDark = theme === 'dark';
  // Suporta ambas as classes para compatibilidade total
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('dark-theme', isDark);
  document.body.classList.toggle('dark', isDark);
  document.body.classList.toggle('dark-theme', isDark);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || 'light');

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-9 h-9 rounded-[12px] flex items-center justify-center transition-all"
      title={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-flat)'; }}
      onMouseDown={e => { e.currentTarget.style.boxShadow = 'var(--shadow-pressed)'; }}
      onMouseUp={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
    >
      {isDark
        ? <Sun  className="w-4 h-4" style={{ color: 'var(--yellow)' }} />
        : <Moon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
      }
    </button>
  );
}
