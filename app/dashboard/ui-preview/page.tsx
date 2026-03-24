'use client'

import { useState, useRef } from 'react'
import { Topbar } from '@/components/topbar'
import { cn } from '@/lib/utils'

interface Block {
  id: string
  type: string
  label: string
  preview: React.ReactNode
}

const THEMES = [
  { name: 'Forge', bg: '#eeebe0', surface: '#fff', accent: '#e5820a' },
  { name: 'Dark', bg: '#1a1915', surface: '#2a2924', accent: '#e5820a' },
  { name: 'Ocean', bg: '#e8f4ff', surface: '#fff', accent: '#2854a0' },
  { name: 'Forest', bg: '#e8f5eb', surface: '#fff', accent: '#2d7a45' },
  { name: 'Rose', bg: '#fff0f3', surface: '#fff', accent: '#b03030' },
]

const COMPONENTS = [
  { label: 'Button', preview: <button className="px-3 py-1.5 bg-ink text-white text-xs rounded-forge">Click me</button> },
  { label: 'Input', preview: <input readOnly placeholder="Type here..." className="border border-border px-2 py-1 text-xs rounded-forge bg-surface2 w-32" /> },
  { label: 'Badge', preview: <span className="tag tag-green">Active</span> },
  { label: 'Card', preview: <div className="border border-border rounded-forge p-2 bg-surface text-xs text-ink3 w-24">Card content</div> },
  { label: 'Alert', preview: <div className="px-2 py-1 bg-amber-bg border border-amber-border text-xs text-amber rounded-forge">Warning</div> },
]

function makeBlocks(): Block[] {
  return [
    {
      id: '1',
      type: 'hero',
      label: 'Hero Section',
      preview: (
        <div className="bg-surface border border-border rounded-forge p-4">
          <div className="h-2 bg-ink rounded w-32 mb-2" />
          <div className="h-1.5 bg-border rounded w-48 mb-3" />
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-ink rounded" />
            <div className="h-6 w-16 bg-border rounded" />
          </div>
        </div>
      ),
    },
    {
      id: '2',
      type: 'features',
      label: 'Features Grid',
      preview: (
        <div className="bg-surface border border-border rounded-forge p-4">
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-surface2 rounded p-2">
                <div className="w-4 h-4 bg-amber rounded mb-1" />
                <div className="h-1.5 bg-border rounded w-full mb-1" />
                <div className="h-1 bg-border rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: '3',
      type: 'cta',
      label: 'CTA Banner',
      preview: (
        <div className="bg-ink rounded-forge p-4 flex items-center justify-between">
          <div>
            <div className="h-2 bg-white/80 rounded w-24 mb-1" />
            <div className="h-1.5 bg-white/40 rounded w-36" />
          </div>
          <div className="h-6 w-16 bg-amber rounded" />
        </div>
      ),
    },
    {
      id: '4',
      type: 'pricing',
      label: 'Pricing Table',
      preview: (
        <div className="bg-surface border border-border rounded-forge p-4">
          <div className="grid grid-cols-3 gap-2">
            {['Free', 'Pro', 'Team'].map((plan, i) => (
              <div key={plan} className={cn('rounded p-2 border', i === 1 ? 'border-amber bg-amber-bg' : 'border-border bg-surface2')}>
                <div className="h-1.5 bg-border rounded w-8 mb-1" />
                <div className="h-2 bg-ink/20 rounded w-12 mb-2" />
                <div className={cn('h-5 rounded', i === 1 ? 'bg-amber' : 'bg-border')} />
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: '5',
      type: 'testimonials',
      label: 'Testimonials',
      preview: (
        <div className="bg-surface border border-border rounded-forge p-4 space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-2 bg-surface2 rounded p-2">
              <div className="w-5 h-5 rounded-full bg-border shrink-0" />
              <div className="flex-1">
                <div className="h-1.5 bg-border rounded w-full mb-1" />
                <div className="h-1 bg-border rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ]
}

export default function UIPreviewPage() {
  const [blocks, setBlocks] = useState<Block[]>(makeBlocks())
  const [activeTheme, setActiveTheme] = useState(0)
  const [prompt, setPrompt] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const handleDragStart = (idx: number) => setDragIdx(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setDragOverIdx(idx)
  }
  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return

    const newBlocks = [...blocks]
    const [removed] = newBlocks.splice(dragIdx, 1)
    newBlocks.splice(idx, 0, removed)
    setBlocks(newBlocks)
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
    setDragOverIdx(null)
  }

  return (
    <>
      <Topbar title="UI Preview" subtitle="Design your landing page" />
      <div className="p-5 flex gap-4 max-w-5xl mx-auto">
        {/* Left panel */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Prompt bar */}
          <div className="bg-surface border border-border rounded-forge p-3 flex gap-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g. "Make the CTA section dark with orange text"'
              className="flex-1 text-sm bg-surface2 border border-border rounded px-3 py-1.5 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
            />
            <button className="px-3 py-1.5 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors whitespace-nowrap">
              Apply Changes
            </button>
          </div>

          {/* Theme swatches */}
          <div className="bg-surface border border-border rounded-forge p-4">
            <p className="text-xs font-medium text-ink2 mb-3">Theme</p>
            <div className="flex gap-2">
              {THEMES.map((theme, i) => (
                <button
                  key={theme.name}
                  onClick={() => setActiveTheme(i)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-forge border transition-all',
                    activeTheme === i ? 'border-ink' : 'border-border hover:border-border2'
                  )}
                >
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-sm" style={{ background: theme.bg }} />
                    <div className="w-4 h-4 rounded-sm" style={{ background: theme.surface, border: '1px solid #ccc' }} />
                    <div className="w-4 h-4 rounded-sm" style={{ background: theme.accent }} />
                  </div>
                  <span className="text-[10px] text-ink4">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Blocks */}
          <div className="bg-surface border border-border rounded-forge p-4">
            <p className="text-xs font-medium text-ink2 mb-1">Page Blocks</p>
            <p className="text-xs text-ink4 mb-3">Drag to reorder sections</p>
            <div className="space-y-2">
              {blocks.map((block, idx) => (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'border rounded-forge overflow-hidden cursor-grab active:cursor-grabbing transition-all',
                    dragOverIdx === idx ? 'border-amber ring-1 ring-amber' : 'border-border',
                    dragIdx === idx ? 'opacity-50' : ''
                  )}
                >
                  <div className="flex items-center gap-2 px-3 py-2 bg-surface2 border-b border-border">
                    <svg className="w-3.5 h-3.5 text-ink4" viewBox="0 0 16 16" fill="none">
                      <path d="M3 5h10M3 8h10M3 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span className="text-xs font-medium text-ink2">{block.label}</span>
                    <span className="ml-auto text-[10px] text-ink4 uppercase">{block.type}</span>
                  </div>
                  <div className="p-3 pointer-events-none">
                    {block.preview}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel - Component library */}
        <div className="w-52 shrink-0 space-y-4">
          <div className="bg-surface border border-border rounded-forge p-4">
            <p className="text-xs font-medium text-ink2 mb-3">Component Library</p>
            <div className="space-y-3">
              {COMPONENTS.map((comp) => (
                <div key={comp.label}>
                  <p className="text-[10px] text-ink4 mb-1.5 uppercase">{comp.label}</p>
                  <div className="flex items-center">
                    {comp.preview}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
