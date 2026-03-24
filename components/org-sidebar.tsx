'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'

const nav: { label: string; href: string; icon: string; soon?: boolean }[] = [
  { label: 'Discover', href: '/org', icon: '◎' },
  { label: 'Saved', href: '/org/saved', icon: '♡' },
  { label: 'Messages', href: '/org/messages', icon: '✉' },
  { label: 'Escrow', href: '/org/escrow', icon: '🔒' },
  { label: 'Billing', href: '/org/billing', icon: '💳' },
]

export function OrgSidebar() {
  const pathname = usePathname()

  return (
    <div className="fixed left-0 top-0 h-screen w-[200px] bg-surface border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-ink tracking-tight">forge</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-ink text-white rounded font-medium">ORG</span>
        </div>
        <p className="text-[10px] text-ink4 mt-0.5">Organization portal</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(item => {
          const active = item.href === '/org' ? pathname === '/org' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.soon ? '#' : item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-forge text-sm transition-colors',
                active
                  ? 'bg-ink text-white font-medium'
                  : item.soon
                  ? 'text-ink4 cursor-not-allowed'
                  : 'text-ink3 hover:text-ink hover:bg-surface2'
              )}
            >
              <span className="text-base w-4 text-center">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.soon && <span className="text-[9px] text-ink4 border border-border px-1 rounded">soon</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 mb-2">
          <UserButton afterSignOutUrl="/sign-in" />
          <span className="text-xs text-ink3">Account</span>
        </div>
        <Link href="/dashboard" className="text-[11px] text-ink4 hover:text-ink3 transition-colors">
          Switch to Builder →
        </Link>
      </div>
    </div>
  )
}
