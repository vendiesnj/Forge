export const dynamic = 'force-dynamic'

import { OrgSidebar } from '@/components/org-sidebar'
import { ForgeChat } from '@/components/forge-chat'

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-bg">
      <OrgSidebar />
      <div className="ml-[200px] flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
      <ForgeChat />
    </div>
  )
}
