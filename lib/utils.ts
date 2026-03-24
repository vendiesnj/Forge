import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateStr)
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'text-green'
  if (score >= 60) return 'text-amber'
  return 'text-red'
}

export function scoreBg(score: number): string {
  if (score >= 80) return 'bg-green-bg border-green-border text-green'
  if (score >= 60) return 'bg-amber-bg border-amber-border text-amber'
  return 'bg-red-bg border-red-border text-red'
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '...' : str
}
