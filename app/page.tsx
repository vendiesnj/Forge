export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--font)', minHeight: '100vh' }}>

      {/* Nav */}
      <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }} className="sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: 'var(--ink)' }}>
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Forge</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm px-3 py-1.5 rounded transition-colors" style={{ color: 'var(--ink3)' }}>
              Sign in
            </Link>
            <Link href="/sign-up" className="text-sm px-4 py-1.5 rounded font-medium transition-colors" style={{ background: 'var(--ink)', color: '#fff', borderRadius: '6px' }}>
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="max-w-2xl mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', color: 'var(--amber)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--amber)' }} />
            Now in beta — free for builders
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-5" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            From idea to shipped.<br />
            <span style={{ color: 'var(--ink3)' }}>Without the guesswork.</span>
          </h1>
          <p className="text-lg leading-relaxed mb-8" style={{ color: 'var(--ink3)' }}>
            Forge is the platform for indie builders — validate your idea, generate your tech stack, analyze your code, and connect with companies looking to acquire, invest, or partner.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/sign-up" className="inline-flex items-center gap-2 px-6 py-3 rounded font-medium text-sm" style={{ background: 'var(--ink)', color: '#fff', borderRadius: '6px' }}>
              Start building
              <svg width="14" height="14" fill="none" viewBox="0 0 14 14"><path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <Link href="/org" className="inline-flex items-center gap-2 px-6 py-3 rounded font-medium text-sm" style={{ border: '1px solid var(--border)', color: 'var(--ink2)', borderRadius: '6px' }}>
              Browse marketplace
            </Link>
          </div>
        </div>

        {/* Product mockup */}
        <div className="mt-14 rounded-xl overflow-hidden shadow-2xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          {/* Window chrome */}
          <div className="flex items-center gap-1.5 px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
            <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
            <div className="mx-auto text-xs" style={{ color: 'var(--ink4)' }}>forge — Idea Lab</div>
          </div>
          {/* App UI mockup */}
          <div className="flex" style={{ height: 420 }}>
            {/* Sidebar */}
            <div className="shrink-0 w-44" style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div className="p-3">
                <div className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ink4)' }}>Projects</div>
                {['AI Recipe App', 'DevOps Toolkit'].map((name, i) => (
                  <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] mb-0.5`} style={{ background: i === 0 ? 'var(--ink)' : 'transparent', color: i === 0 ? '#fff' : 'var(--ink3)' }}>
                    <span>{i === 0 ? '💻' : '⚙️'}</span>
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--border)' }} className="p-3">
                <div className="text-[9px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink4)' }}>Project</div>
                {['Overview', 'Idea Analysis', 'Market Research', 'Keys & Services'].map((item, i) => (
                  <div key={i} className="px-2 py-1 text-[11px]" style={{ color: i === 1 ? 'var(--ink)' : 'var(--ink4)', fontWeight: i === 1 ? 600 : 400 }}>{item}</div>
                ))}
                <div className="text-[9px] font-semibold uppercase tracking-wider mb-1.5 mt-3" style={{ color: 'var(--ink4)' }}>Build</div>
                {['Build Guide', 'Feature Suggestions', 'UI Customize'].map((item, i) => (
                  <div key={i} className="px-2 py-1 text-[11px]" style={{ color: 'var(--ink4)' }}>{item}</div>
                ))}
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-hidden">
              {/* Topbar */}
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Idea Lab</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--ink4)' }}>· Validate your concept</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded text-[10px] font-medium" style={{ background: 'var(--ink)', color: '#fff', borderRadius: '6px' }}>+ New project</div>
              </div>

              <div className="p-5 grid grid-cols-2 gap-3">
                {/* Score card */}
                <div className="col-span-2 p-4 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>RecipeAI Pro</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink3)' }}>AI-powered meal planning with pantry tracking</div>
                    </div>
                    <div className="w-12 h-12 rounded flex items-center justify-center text-xl font-bold shrink-0" style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', color: 'var(--green)' }}>82</div>
                  </div>
                  <div className="text-[11px] leading-relaxed" style={{ color: 'var(--ink3)' }}>Strong consumer demand in a growing market. Clear monetization path via subscription. Main risk is differentiation from existing recipe apps — lean into the pantry AI angle hard.</div>
                </div>

                {/* Market card */}
                <div className="p-3 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ink4)' }}>Market</div>
                  <div className="text-lg font-bold" style={{ color: 'var(--ink)' }}>$4.2B</div>
                  <div className="text-[10px]" style={{ color: 'var(--ink4)' }}>TAM · 12% CAGR</div>
                  <div className="mt-2 flex gap-1">
                    {['Yummly', 'Mealime', 'Paprika'].map(c => (
                      <span key={c} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--ink3)' }}>{c}</span>
                    ))}
                  </div>
                </div>

                {/* Stack card */}
                <div className="p-3 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ink4)' }}>Suggested Stack</div>
                  <div className="space-y-1">
                    {['Next.js', 'Supabase', 'Stripe', 'Claude API'].map(t => (
                      <div key={t} className="text-[11px] font-medium" style={{ color: 'var(--ink)' }}>{t}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-3 gap-8">
          {[
            { num: '7', label: 'AI-powered analysis tools', sub: 'from idea scoring to build guides' },
            { num: '2-sided', label: 'marketplace', sub: 'builders meet orgs, investors & acquirers' },
            { num: '1', label: 'place for your whole stack', sub: 'keys, repos, escrow, billing' },
          ].map(({ num, label, sub }) => (
            <div key={label}>
              <div className="text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>{num}</div>
              <div className="text-sm font-medium capitalize" style={{ color: 'var(--ink)' }}>{label}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--ink4)' }}>{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}>Everything a builder needs.</h2>
          <p className="text-base" style={{ color: 'var(--ink3)' }}>Not a generic AI tool. Built specifically for indie builders who ship real products.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            {
              icon: '💡',
              title: 'Idea Lab',
              desc: 'Score your idea 0–100. Get honest market sizing, competition analysis, MVP features, and a tech stack — all from one prompt.',
              tag: 'Validate',
            },
            {
              icon: '📊',
              title: 'Market Research',
              desc: 'Auto-generated market analysis: TAM, key players, market gaps, and exactly where your target customer hangs out.',
              tag: 'Research',
            },
            {
              icon: '🛠️',
              title: 'Build Guide',
              desc: 'Step-by-step setup with exact terminal commands, file structure, and Claude Code prompts pre-loaded with your project context.',
              tag: 'Build',
            },
            {
              icon: '🔍',
              title: 'Feature Suggestions',
              desc: 'Link your GitHub repo and get AI-generated feature suggestions based on your actual code — with ready-to-paste Claude Code prompts.',
              tag: 'Build',
            },
            {
              icon: '🔑',
              title: 'Keys & Services',
              desc: 'Track every API key and service your project needs. Validate keys live. Auto-detects what\'s missing from your codebase.',
              tag: 'Build',
            },
            {
              icon: '📣',
              title: 'Distribution Strategy',
              desc: 'Six specific launch channels tailored to your product — communities, media, outreach contacts, and concrete first actions.',
              tag: 'Launch',
            },
            {
              icon: '◎',
              title: 'Forge Marketplace',
              desc: 'List your app for sale, investment, or partnership. Orgs and acquirers browse and message you directly on the platform.',
              tag: 'Monetize',
            },
            {
              icon: '🔒',
              title: 'Escrow',
              desc: 'Secure payments between builders and orgs. Funds held until work is delivered. Release or refund with one click.',
              tag: 'Monetize',
            },
            {
              icon: '🎨',
              title: 'UI Customize',
              desc: 'Personalize your workspace with theme presets — Parchment, Slate, Dark, Forest, Violet — applied instantly across every page.',
              tag: 'Yours',
            },
          ].map(({ icon, title, desc, tag }) => (
            <div key={title} className="p-5 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{icon}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--ink4)' }}>{tag}</span>
              </div>
              <h3 className="text-sm font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>{title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--ink3)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Two-sided marketplace */}
      <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--amber)' }}>Marketplace</div>
            <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}>
              Built something great?<br />Find your exit.
            </h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: 'var(--ink3)' }}>
              List your product on the Forge Marketplace to attract acquirers, investors, and strategic partners. Orgs browse by tech stack, ARR, and team size — and message you directly.
            </p>
            <div className="space-y-3">
              {[
                { icon: '💼', label: 'Acquisition listings', desc: 'Sell your app to the right buyer' },
                { icon: '📈', label: 'Seeking investment', desc: 'Connect with angels and micro-VCs' },
                { icon: '🤝', label: 'Partnership', desc: 'White-label, integrate, or co-build' },
                { icon: '🌟', label: 'Showcase', desc: 'Build reputation and social proof' },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-lg shrink-0">{icon}</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{label}</div>
                    <div className="text-xs" style={{ color: 'var(--ink4)' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Marketplace card mockup */}
          <div className="rounded-xl overflow-hidden shadow-lg" style={{ border: '1px solid var(--border)' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
              <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Forge Marketplace</span>
              <div className="flex items-center gap-1.5">
                {['All', '💼 For Sale', '📈 Investment'].map((f, i) => (
                  <span key={f} className="text-[10px] px-2 py-0.5 rounded" style={{ background: i === 0 ? 'var(--ink)' : 'transparent', color: i === 0 ? '#fff' : 'var(--ink4)', border: `1px solid ${i === 0 ? 'var(--ink)' : 'var(--border)'}`, borderRadius: '4px' }}>{f}</span>
                ))}
              </div>
            </div>
            <div className="p-4 space-y-3" style={{ background: 'var(--surface)' }}>
              {[
                { name: 'FormGenius', type: 'Acquisition', arr: '$28k ARR', stack: ['Next.js', 'Stripe'], price: '$85k', tag: '💼' },
                { name: 'ShipMonitor', type: 'Investment', arr: '$12k ARR', stack: ['React', 'Node'], price: '$150k', tag: '📈' },
                { name: 'DocuAI', type: 'Partnership', arr: '340 users', stack: ['Python', 'OpenAI'], price: null, tag: '🤝' },
              ].map(({ name, arr, stack, price, tag }) => (
                <div key={name} className="p-3 rounded" style={{ border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--surface)' }}>
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>{name}</span>
                    <span className="text-[10px]">{tag}</span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--ink)' }}>{arr}</span>
                    {price && <span className="text-[10px] font-bold ml-auto" style={{ color: 'var(--ink)' }}>{price}</span>}
                  </div>
                  <div className="flex gap-1">
                    {stack.map(t => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--ink3)' }}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* For orgs */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-2 gap-16 items-center">
          <div className="rounded-xl overflow-hidden shadow-lg order-2" style={{ border: '1px solid var(--border)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
              <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Org Dashboard</span>
            </div>
            <div className="p-4" style={{ background: 'var(--surface)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--ink4)' }}>Saved builders</div>
              {[
                { name: 'Maya Chen', project: 'RecipeAI Pro', tag: 'Acquisition' },
                { name: 'James Park', project: 'DevOps Toolkit', tag: 'Partnership' },
              ].map(({ name, project, tag }) => (
                <div key={name} className="flex items-center justify-between p-3 rounded mb-2" style={{ border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <div>
                    <div className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{name}</div>
                    <div className="text-[10px]" style={{ color: 'var(--ink4)' }}>{project}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', color: 'var(--amber)', borderRadius: '4px' }}>{tag}</span>
                    <span className="text-[10px] px-2 py-1 rounded font-medium" style={{ background: 'var(--ink)', color: '#fff', borderRadius: '4px' }}>Message</span>
                  </div>
                </div>
              ))}
              <div className="mt-3 p-3 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--ink3)' }}>Escrow · DevOps Toolkit deal</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: 'var(--ink)' }}>$12,000</span>
                  <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', color: 'var(--green)', borderRadius: '4px' }}>Funded · awaiting delivery</span>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1">
            <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--blue)' }}>For Organizations</div>
            <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}>
              Discover & acquire<br />indie-built software.
            </h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: 'var(--ink3)' }}>
              Browse vetted products built by indie developers. Filter by tech stack, ARR, team size, and listing type. Message builders directly, and close deals through Forge's built-in escrow.
            </p>
            <Link href="/org" className="inline-flex items-center gap-2 px-5 py-2.5 rounded text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--ink)', borderRadius: '6px' }}>
              Browse as an org →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--ink)', color: '#fff' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>Ready to build something?</h2>
          <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Free during beta. No credit card required. Start with an idea and Forge handles the rest.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/sign-up" className="inline-flex items-center gap-2 px-8 py-3 rounded font-semibold text-sm" style={{ background: '#fff', color: 'var(--ink)', borderRadius: '6px' }}>
              Create free account
              <svg width="14" height="14" fill="none" viewBox="0 0 14 14"><path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <Link href="/sign-in" className="px-8 py-3 rounded text-sm font-medium" style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: '6px' }}>
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'var(--ink)' }}>
              <span className="text-white text-[10px] font-bold">F</span>
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Forge</span>
            <span className="text-xs ml-2" style={{ color: 'var(--ink4)' }}>— Build & Launch</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/sign-in" className="text-xs" style={{ color: 'var(--ink4)' }}>Sign in</Link>
            <Link href="/sign-up" className="text-xs" style={{ color: 'var(--ink4)' }}>Get started</Link>
            <Link href="/org" className="text-xs" style={{ color: 'var(--ink4)' }}>For orgs</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
