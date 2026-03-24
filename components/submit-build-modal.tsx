'use client'

import { useState } from 'react'

interface SubmitBuildModalProps {
  requestId: string
  requestTitle: string
  onClose: () => void
  onSuccess: () => void
}

export function SubmitBuildModal({ requestId, requestTitle, onClose, onSuccess }: SubmitBuildModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const body = {
      demo_url: fd.get('demo_url'),
      source_url: fd.get('source_url') || null,
      description: fd.get('description'),
    }

    try {
      const res = await fetch(`/api/builds/${requestId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm" />
      <div
        className="relative bg-surface rounded-forge border border-border shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-ink">Submit Your Build</h2>
            <p className="text-xs text-ink4 mt-0.5 truncate max-w-xs">{requestTitle}</p>
          </div>
          <button onClick={onClose} className="text-ink4 hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-ink2 mb-1.5">Demo URL *</label>
            <input
              name="demo_url"
              type="url"
              placeholder="https://your-demo.vercel.app"
              className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink2 mb-1.5">Source Code URL (optional)</label>
            <input
              name="source_url"
              type="url"
              placeholder="https://github.com/you/repo"
              className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink2 mb-1.5">Description *</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Describe your implementation, tech stack, and approach..."
              className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none"
              required
            />
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-bg border border-red-border rounded-forge text-xs text-red">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm border border-border rounded-forge text-ink3 hover:text-ink hover:border-border2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 text-sm bg-ink text-white rounded-forge font-medium hover:bg-ink2 transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Build'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
