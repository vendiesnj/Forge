'use client'

import { useState } from 'react'
import { NewProjectModal } from './new-project-modal'
import { TopbarProgressBar } from './analysis-progress'

interface TopbarProps {
  title: string
  subtitle?: string
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <header className="relative h-12 bg-surface border-b border-border flex items-center justify-between px-5 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-ink">{title}</h1>
          {subtitle && (
            <span className="text-xs text-ink4 hidden sm:block">· {subtitle}</span>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          New project
        </button>
        <TopbarProgressBar />
      </header>
      {showModal && <NewProjectModal onClose={() => setShowModal(false)} />}
    </>
  )
}
