'use client';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--button-primary)',
        color: 'var(--text-color)',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 12,
        padding: '8px 12px',
        cursor: 'pointer',
        transition: 'background 0.2s, color 0.2s, border-color 0.2s',
      }}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      <span style={{ fontSize: 12, fontWeight: 600 }}>{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}