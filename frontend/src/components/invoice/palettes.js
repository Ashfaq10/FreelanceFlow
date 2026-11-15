/** Colour palettes and template list shared by the preview and the invoice page picker. */

// ── Colour palettes ───────────────────────────────────────────────────
export const COLOR_PALETTES = [
  {
    id: 'indigo',
    name: 'Indigo',
    swatch: '#4f46e5',
    primary: '#4f46e5',
    light: '#eef2ff',
    dark: '#1e1b4b',
    text: '#ffffff',
  },
  {
    id: 'blue',
    name: 'Deep Blue',
    swatch: '#2563eb',
    primary: '#2563eb',
    light: '#eef4ff',
    dark: '#141d2e',
    text: '#ffffff',
  },
  {
    id: 'slate',
    name: 'Slate',
    swatch: '#334155',
    primary: '#334155',
    light: '#f1f5f9',
    dark: '#0f172a',
    text: '#ffffff',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    swatch: '#059669',
    primary: '#059669',
    light: '#ecfdf5',
    dark: '#064e3b',
    text: '#ffffff',
  },
  {
    id: 'rose',
    name: 'Rose',
    swatch: '#e11d48',
    primary: '#e11d48',
    light: '#fff1f2',
    dark: '#881337',
    text: '#ffffff',
  },
  {
    id: 'amber',
    name: 'Amber',
    swatch: '#d97706',
    primary: '#d97706',
    light: '#fffbeb',
    dark: '#78350f',
    text: '#ffffff',
  },
  {
    id: 'cyan',
    name: 'Cyan',
    swatch: '#06b6d4',
    primary: '#06b6d4',
    light: '#cffafe',
    dark: '#155e75',
    text: '#ffffff',
  },
]

// ── Template definitions ──────────────────────────────────────────────
export const TEMPLATES = [
  { id: 'professional', name: 'Professional', description: 'Logo, meta bar and bank details' },
  { id: 'classic', name: 'Classic', description: 'Clean, timeless two-column layout' },
  { id: 'modern', name: 'Modern', description: 'Bold header with full-width accent bar' },
  { id: 'minimal', name: 'Minimal', description: 'Ultra-clean, typography-first design' },
  { id: 'bold', name: 'Bold', description: 'Vibrant coloured sidebar + strong type' },
  { id: 'compact', name: 'Compact', description: 'Dense layout, fits more on one page' },
]
