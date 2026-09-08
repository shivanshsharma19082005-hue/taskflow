import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className="theme-icon-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      <span className="text-base" aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  );
};
export default ThemeToggle;
