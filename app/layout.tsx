import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'Forge — Build & Launch',
  description: 'AI-powered product development platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  if (!publishableKey) {
    return (
      <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <body className="font-sans">{children}</body>
      </html>
    )
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <body className="font-sans">{children}</body>
      </html>
    </ClerkProvider>
  )
}
