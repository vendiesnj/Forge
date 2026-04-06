'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useProfile } from '@/components/profile-context'
import type { SkillLevel } from '@/types'

const options: { value: SkillLevel; emoji: string; label: string; desc: string }[] = [
  {
    value: 'beginner',
    emoji: '🌱',
    label: "I'm just getting started",
    desc: "I've never built anything — I need step-by-step guidance",
  },
  {
    value: 'intermediate',
    emoji: '🔨',
    label: 'I can follow along',
    desc: "I've built a few things and can follow tutorials",
  },
  {
    value: 'developer',
    emoji: '⚡',
    label: "I'm a developer",
    desc: 'Skip the basics — I want technical depth and speed',
  },
]

export function SkillLevelModal() {
  const { skillLevel, loading, saveSkillLevel } = useProfile()
  const [selected, setSelected] = useState<SkillLevel | null>(null)
  const [saving, setSaving] = useState(false)

  if (loading || skillLevel !== null) return null

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    await saveSkillLevel(selected)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-forge w-full max-w-md mx-4 p-6 shadow-2xl">
        <div className="mb-6">
          <div className="w-10 h-10 bg-ink rounded-forge flex items-center justify-center mb-4">
            <span className="text-white text-lg font-bold">F</span>
          </div>
          <h2 className="text-lg font-semibold text-ink mb-1">Welcome to Forge</h2>
          <p className="text-sm text-ink3">
            Tell us where you&apos;re at so we can give you the right level of guidance.
            You can change this any time in your profile.
          </p>
        </div>

        <div className="space-y-2 mb-6">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => setSelected(o.value)}
              className={cn(
                'w-full flex items-start gap-4 p-4 rounded-forge border text-left transition-all',
                selected === o.value
                  ? 'border-ink bg-ink text-white'
                  : 'border-border bg-surface2 text-ink hover:border-border2'
              )}
            >
              <span className="text-2xl shrink-0 mt-0.5">{o.emoji}</span>
              <div>
                <p className={cn('text-sm font-medium', selected === o.value ? 'text-white' : 'text-ink')}>
                  {o.label}
                </p>
                <p className={cn('text-xs mt-0.5', selected === o.value ? 'text-white/70' : 'text-ink4')}>
                  {o.desc}
                </p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={!selected || saving}
          className="w-full py-2.5 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving && (
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
            </svg>
          )}
          {saving ? 'Saving...' : 'Get started →'}
        </button>
      </div>
    </div>
  )
}
