'use client'
import { useEffect } from 'react'

const THEMES = [
  {
    id: 'default',
    name: 'Parchment',
    vars: {
      '--bg': '#eeebe0',
      '--surface': '#fff',
      '--surface2': '#f9f7f2',
      '--border': '#d0cdc4',
      '--border2': '#b8b4aa',
      '--ink': '#1a1915',
      '--ink2': '#3d3b35',
      '--ink3': '#6b6860',
      '--ink4': '#9c9a94',
      '--amber': '#e5820a',
      '--amber-bg': '#fff8ee',
      '--amber-border': '#f0b04a',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    vars: {
      '--bg': '#f1f5f9',
      '--surface': '#ffffff',
      '--surface2': '#f8fafc',
      '--border': '#e2e8f0',
      '--border2': '#cbd5e1',
      '--ink': '#0f172a',
      '--ink2': '#1e293b',
      '--ink3': '#475569',
      '--ink4': '#94a3b8',
      '--amber': '#3b82f6',
      '--amber-bg': '#eff6ff',
      '--amber-border': '#93c5fd',
    },
  },
  {
    id: 'dark',
    name: 'Dark',
    vars: {
      '--bg': '#111111',
      '--surface': '#1c1c1c',
      '--surface2': '#262626',
      '--border': '#333333',
      '--border2': '#444444',
      '--ink': '#f5f5f5',
      '--ink2': '#d4d4d4',
      '--ink3': '#a3a3a3',
      '--ink4': '#737373',
      '--amber': '#f59e0b',
      '--amber-bg': '#292300',
      '--amber-border': '#78520a',
    },
  },
  {
    id: 'ivory',
    name: 'Ivory',
    vars: {
      '--bg': '#faf8f4',
      '--surface': '#ffffff',
      '--surface2': '#f5f2ec',
      '--border': '#e5e0d5',
      '--border2': '#d0c8b8',
      '--ink': '#2c2c2c',
      '--ink2': '#4a4a4a',
      '--ink3': '#7a7a7a',
      '--ink4': '#b0b0b0',
      '--amber': '#7c5c3e',
      '--amber-bg': '#fdf5ec',
      '--amber-border': '#d4a574',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    vars: {
      '--bg': '#eef2ee',
      '--surface': '#ffffff',
      '--surface2': '#f2f6f2',
      '--border': '#c8d8c0',
      '--border2': '#a8c8a0',
      '--ink': '#1a2e1a',
      '--ink2': '#2d4a2d',
      '--ink3': '#5a7a5a',
      '--ink4': '#8aaa8a',
      '--amber': '#2d7a45',
      '--amber-bg': '#f0faf4',
      '--amber-border': '#86c99a',
    },
  },
  {
    id: 'violet',
    name: 'Violet',
    vars: {
      '--bg': '#f4f0ff',
      '--surface': '#ffffff',
      '--surface2': '#f9f7ff',
      '--border': '#ddd6fe',
      '--border2': '#c4b5fd',
      '--ink': '#1e1b4b',
      '--ink2': '#312e81',
      '--ink3': '#6d5cf5',
      '--ink4': '#a5b4fc',
      '--amber': '#7c3aed',
      '--amber-bg': '#faf5ff',
      '--amber-border': '#c4b5fd',
    },
  },
]

export function ThemeInit() {
  useEffect(() => {
    const saved = localStorage.getItem('forge:theme') ?? 'default'
    const theme = THEMES.find(t => t.id === saved) ?? THEMES[0]
    if (theme) {
      Object.entries(theme.vars).forEach(([k, v]) => {
        document.documentElement.style.setProperty(k, v)
      })
    }
  }, [])
  return null
}
