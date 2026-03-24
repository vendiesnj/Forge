'use client'

import Link from 'next/link'

interface NextStepBarProps {
  label: string
  href: string
  description?: string
}

export function NextStepBar({ label, href, description }: NextStepBarProps) {
  return (
    <div className="mt-8 mb-4">
      <Link
        href={href}
        className="flex items-center justify-between w-full px-5 py-4 bg-ink text-white rounded-forge hover:bg-ink2 transition-colors group"
      >
        <div>
          <p className="text-sm font-semibold">Next: {label}</p>
          {description && (
            <p className="text-xs text-white/60 mt-0.5">{description}</p>
          )}
        </div>
        <svg
          className="w-5 h-5 text-white/70 group-hover:translate-x-0.5 transition-transform shrink-0"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  )
}
