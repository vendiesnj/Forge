export const dynamic = 'force-dynamic'

import { Sidebar } from '@/components/sidebar'
import { ProjectProvider } from '@/components/project-context'
import { ProfileProvider } from '@/components/profile-context'
import { IntegrationsProvider } from '@/components/integrations-context'
import { ProjectBar } from '@/components/project-bar'
import { ConnectionHandler } from '@/components/connection-handler'
import { GlobalProgressBanner } from '@/components/analysis-progress'
import { Suspense } from 'react'
import { ForgeChat } from '@/components/forge-chat'
import { ThemeInit } from '@/components/theme-init'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProfileProvider>
      <ProjectProvider>
        <IntegrationsProvider>
          <ThemeInit />
          <Suspense><ConnectionHandler /></Suspense>
          <div className="flex h-screen bg-bg">
            <Sidebar />
            <div className="ml-[200px] flex-1 flex flex-col overflow-hidden">
              <ProjectBar />
              <GlobalProgressBanner />
              <main className="flex-1 overflow-y-auto scrollbar-thin">
                {children}
              </main>
            </div>
            <ForgeChat />
          </div>
        </IntegrationsProvider>
      </ProjectProvider>
    </ProfileProvider>
  )
}
