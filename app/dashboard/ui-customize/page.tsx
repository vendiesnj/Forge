'use client'

import { useState, useEffect, Suspense } from 'react'
import { Topbar } from '@/components/topbar'
import { cn } from '@/lib/utils'

const THEMES = [
  {
    id: 'default',
    name: 'Parchment',
    description: 'Warm & focused',
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
    description: 'Clean & minimal',
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
    description: 'Easy on the eyes',
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
    description: 'Soft & elegant',
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
    description: 'Natural & grounded',
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
    description: 'Bold & creative',
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

const PREVIEW_PAGES = [
  { id: 'idea-lab', label: 'Idea Lab' },
  { id: 'market', label: 'Market' },
  { id: 'build-guide', label: 'Build Guide' },
  { id: 'checks', label: 'Keys & Services' },
  { id: 'distribution', label: 'Distribution' },
  { id: 'feature-suggestions', label: 'Features' },
]

// Mini page preview layouts – each returns a set of content block arrangements
function PagePreview({ pageId }: { pageId: string }) {
  const contentBlocks: Record<string, React.ReactNode> = {
    'idea-lab': (
      <>
        <div className="flex gap-1.5 mb-2">
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, height: 10, flex: 2 }} />
          <div style={{ background: 'var(--amber)', borderRadius: 4, height: 10, width: 32 }} />
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '8px', marginBottom: 6 }}>
          <div style={{ background: 'var(--border)', borderRadius: 2, height: 6, width: '70%', marginBottom: 4 }} />
          <div style={{ background: 'var(--border)', borderRadius: 2, height: 5, width: '90%', marginBottom: 3 }} />
          <div style={{ background: 'var(--border)', borderRadius: 2, height: 5, width: '55%' }} />
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {[0, 1].map(i => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: 6 }}>
              <div style={{ background: 'var(--amber)', borderRadius: 2, height: 5, width: '40%', marginBottom: 4 }} />
              <div style={{ background: 'var(--border)', borderRadius: 2, height: 4, width: '80%' }} />
            </div>
          ))}
        </div>
      </>
    ),
    'market': (
      <>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: 8, marginBottom: 6 }}>
          <div style={{ background: 'var(--amber)', borderRadius: 2, height: 6, width: '30%', marginBottom: 5 }} />
          <div className="grid gap-1" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ background: 'var(--surface2)', borderRadius: 3, height: 20 }} />
            ))}
          </div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: 8 }}>
          <div style={{ background: 'var(--border)', borderRadius: 2, height: 5, width: '60%', marginBottom: 4 }} />
          <div style={{ background: 'var(--border)', borderRadius: 2, height: 5, width: '85%', marginBottom: 3 }} />
          <div style={{ background: 'var(--border)', borderRadius: 2, height: 5, width: '50%' }} />
        </div>
      </>
    ),
    'build-guide': (
      <>
        <div className="flex gap-2" style={{ height: '100%' }}>
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, width: 48, padding: 6, flexShrink: 0 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ background: 'var(--border)', borderRadius: 2, height: 5, marginBottom: 5 }} />
            ))}
          </div>
          <div style={{ flex: 1 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: 6, marginBottom: 5 }}>
                <div style={{ background: 'var(--ink)', borderRadius: 2, height: 5, width: '50%', marginBottom: 3 }} />
                <div style={{ background: 'var(--border)', borderRadius: 2, height: 4, width: '80%' }} />
              </div>
            ))}
          </div>
        </div>
      </>
    ),
    'checks': (
      <>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: 6, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ background: i % 2 === 0 ? '#2d7a45' : 'var(--border)', borderRadius: '50%', width: 8, height: 8, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ background: 'var(--border)', borderRadius: 2, height: 5, width: '55%' }} />
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 3, height: 14, width: 28 }} />
          </div>
        ))}
      </>
    ),
    'distribution': (
      <>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: 8, marginBottom: 6 }}>
          <div style={{ background: 'var(--amber)', borderRadius: 2, height: 6, width: '40%', marginBottom: 6 }} />
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 3, padding: 5 }}>
                <div style={{ background: 'var(--border)', borderRadius: 2, height: 4, width: '60%', marginBottom: 3 }} />
                <div style={{ background: 'var(--amber)', borderRadius: 2, height: 4, width: '40%' }} />
              </div>
            ))}
          </div>
        </div>
      </>
    ),
    'feature-suggestions': (
      <>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: 6, marginBottom: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <div style={{ background: 'var(--ink)', borderRadius: 2, height: 5, flex: 1 }} />
              <div style={{ background: 'var(--amber)', borderRadius: 3, height: 8, width: 20 }} />
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 3, height: 12, marginBottom: 4 }} />
            <div style={{ background: 'var(--border)', borderRadius: 2, height: 4, width: '70%' }} />
          </div>
        ))}
      </>
    ),
  }

  return (
    <div
      style={{
        background: 'var(--bg)',
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        aspectRatio: '16/10',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', height: 22, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6, flexShrink: 0 }}>
        <div style={{ background: 'var(--ink)', borderRadius: 2, height: 6, width: 40 }} />
        <div style={{ flex: 1 }} />
        <div style={{ background: 'var(--amber)', borderRadius: 3, height: 10, width: 28 }} />
      </div>
      {/* Body: sidebar + content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)', width: 52, padding: 6, flexShrink: 0 }}>
          <div style={{ background: 'var(--border)', borderRadius: 2, height: 5, marginBottom: 5 }} />
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ background: i === 0 ? 'var(--surface2)' : 'transparent', borderRadius: 3, padding: '3px 4px', marginBottom: 2 }}>
              <div style={{ background: 'var(--border)', borderRadius: 2, height: 4 }} />
            </div>
          ))}
        </div>
        {/* Main content */}
        <div style={{ flex: 1, padding: 8, overflowY: 'hidden' }}>
          {contentBlocks[pageId] ?? contentBlocks['idea-lab']}
        </div>
      </div>
    </div>
  )
}

function UICustomizeInner() {
  const [activeTheme, setActiveTheme] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('forge:theme') ?? 'default'
    }
    return 'default'
  })
  const [previewPage, setPreviewPage] = useState('idea-lab')

  // Apply theme when activeTheme changes
  useEffect(() => {
    const theme = THEMES.find(t => t.id === activeTheme) ?? THEMES[0]
    if (theme) {
      Object.entries(theme.vars).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value)
      })
    }
    localStorage.setItem('forge:theme', activeTheme)
  }, [activeTheme])

  const selectedTheme = THEMES.find(t => t.id === activeTheme) ?? THEMES[0]

  return (
    <>
      <Topbar title="UI Customize" subtitle="Personalize your workspace" />
      <div className="p-5 max-w-5xl mx-auto">
        <div className="grid grid-cols-3 gap-6">

          {/* Left column: Theme Picker */}
          <div className="col-span-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink4 mb-3">
              Color Theme
            </p>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setActiveTheme(theme.id)}
                  className={cn(
                    'flex flex-col gap-2 p-3 rounded-forge border transition-all text-left',
                    activeTheme === theme.id
                      ? 'border-ink bg-surface2'
                      : 'border-border hover:border-border2 bg-surface'
                  )}
                >
                  {/* Swatches */}
                  <div className="flex gap-1">
                    <div
                      className="w-4 h-4 rounded-full border border-border2"
                      style={{ background: theme.vars['--bg'] }}
                      title="Background"
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-border2"
                      style={{ background: theme.vars['--surface'] }}
                      title="Surface"
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-border2"
                      style={{ background: theme.vars['--ink'] }}
                      title="Ink"
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-border2"
                      style={{ background: theme.vars['--amber'] }}
                      title="Accent"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink leading-tight">{theme.name}</p>
                    <p className="text-xs text-ink4">{theme.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right column: Page Previews */}
          <div className="col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink4 mb-3">
              Page Previews
            </p>

            {/* Tab row */}
            <div className="flex gap-1 mb-4 flex-wrap">
              {PREVIEW_PAGES.map(page => (
                <button
                  key={page.id}
                  onClick={() => setPreviewPage(page.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-forge text-xs font-medium transition-colors',
                    previewPage === page.id
                      ? 'bg-ink text-white'
                      : 'bg-surface border border-border text-ink3 hover:text-ink hover:border-border2'
                  )}
                >
                  {page.label}
                </button>
              ))}
            </div>

            {/* Preview */}
            <div className="bg-surface border border-border rounded-forge p-4">
              <PagePreview pageId={previewPage} />
              <p className="text-[10px] text-ink4 mt-3 text-center">
                Preview — <span className="font-medium text-ink3">{selectedTheme.name}</span> theme
              </p>
            </div>

            {/* Note */}
            <p className="text-xs text-ink4 mt-4 text-center">
              Theme is applied instantly across all pages and saved to your browser.
            </p>
          </div>

        </div>
      </div>
    </>
  )
}

export default function UICustomizePage() {
  return (
    <Suspense>
      <UICustomizeInner />
    </Suspense>
  )
}
