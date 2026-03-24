'use client'

interface AddKeyModalProps {
  service: string
  onClose: () => void
  onSubmit: (key: string) => void
}

export function AddKeyModal({ service, onClose, onSubmit }: AddKeyModalProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSubmit(fd.get('key') as string)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm" />
      <div
        className="relative bg-surface rounded-forge border border-border shadow-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-ink">Test {service} Connection</h2>
          <button onClick={onClose} className="text-ink4 hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-ink2 mb-1.5">API Key</label>
            <input
              name="key"
              type="password"
              placeholder={`Enter your ${service} API key...`}
              className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 font-mono"
              required
            />
            <p className="mt-1.5 text-xs text-ink4">
              Key is only used for this test request and not stored.
            </p>
          </div>

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
              className="flex-1 py-2 text-sm bg-ink text-white rounded-forge font-medium hover:bg-ink2 transition-colors"
            >
              Test Connection
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
