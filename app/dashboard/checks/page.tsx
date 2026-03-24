'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Topbar } from '@/components/topbar'
import { useProject } from '@/components/project-context'
import { useIntegrations } from '@/components/integrations-context'
import { useProjectAnalysis } from '@/hooks/useProjectAnalysis'
import { cn } from '@/lib/utils'
import { loadDetectedServices } from '@/lib/detectServices'
import type { BuildGuide } from '@/types'

// ─── Service bank (software) ─────────────────────────────────────────────────

interface ServiceDef {
  id: string
  name: string
  icon: string
  description: string
  envKey: string
  extraEnvKeys?: string[]
  keyHint: string
  getKeyUrl: string
  getKeySteps: string[]
  oauthPath?: string
  matchKeywords: string[]
  alwaysShow?: boolean
  checkType?: 'live' | 'format'  // 'live' = real API call, 'format' = string validation only
}

const ALL_SERVICES: ServiceDef[] = [
  {
    id: 'github',
    name: 'GitHub',
    icon: '🐙',
    description: 'Source code & CI/CD',
    envKey: 'GITHUB_TOKEN',
    keyHint: 'ghp_...',
    getKeyUrl: 'https://github.com/settings/tokens/new?scopes=repo,user:email&description=Forge',
    getKeySteps: [
      'Click "Open GitHub →" below',
      'Give the token a name (e.g. "Forge")',
      'Set expiration (90 days recommended)',
      'Check repo and user:email scopes',
      'Click "Generate token" and copy it',
    ],
    oauthPath: '/api/auth/github',
    matchKeywords: ['github'],
    alwaysShow: true,
  },
  {
    id: 'vercel',
    name: 'Vercel',
    icon: '▲',
    description: 'Deployment platform',
    envKey: 'VERCEL_TOKEN',
    keyHint: 'Bearer token from account settings',
    getKeyUrl: 'https://vercel.com/account/tokens',
    getKeySteps: [
      'Go to vercel.com/account/tokens',
      'Click "Create Token"',
      'Name it "Forge", set scope to your team',
      'Copy the generated token and paste it in the sidebar',
    ],
    matchKeywords: ['vercel'],
    alwaysShow: true,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    icon: '⚡',
    description: 'Database & auth',
    envKey: 'NEXT_PUBLIC_SUPABASE_URL',
    extraEnvKeys: ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
    keyHint: 'https://xyz.supabase.co',
    getKeyUrl: 'https://supabase.com/dashboard/project/_/settings/api',
    getKeySteps: [
      'Click "Open Supabase →" and select your project',
      'Go to Project Settings → API',
      'Copy the Project URL',
      'Copy the anon/public key',
      'Copy the service_role key (keep this secret)',
      'Paste as: URL|ANON_KEY|SERVICE_KEY',
    ],
    matchKeywords: ['supabase'],
  },
  {
    id: 'clerk',
    name: 'Clerk',
    icon: '🔐',
    description: 'Authentication',
    envKey: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    extraEnvKeys: ['CLERK_SECRET_KEY'],
    keyHint: 'pk_test_... (publishable key)',
    getKeyUrl: 'https://dashboard.clerk.com',
    getKeySteps: [
      'Click "Open Clerk →" and select your app',
      'Go to API Keys in the sidebar',
      'Copy the Publishable Key (pk_test_...)',
      'Copy the Secret Key (sk_test_...)',
      'Paste as: PUBLISHABLE|SECRET',
    ],
    matchKeywords: ['clerk', 'auth', 'authentication'],
    checkType: 'format',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    icon: '💳',
    description: 'Payments & billing',
    envKey: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    extraEnvKeys: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    keyHint: 'pk_test_...',
    getKeyUrl: 'https://dashboard.stripe.com/test/apikeys',
    getKeySteps: [
      'Click "Open Stripe →" below',
      'Make sure you\'re in Test mode (toggle top-right)',
      'Copy the Publishable key (pk_test_...)',
      'Reveal and copy the Secret key (sk_test_...)',
      'Paste as: PUBLISHABLE|SECRET',
    ],
    matchKeywords: ['stripe', 'payment', 'billing', 'subscription'],
  },
  {
    id: 'posthog',
    name: 'PostHog',
    icon: '🦔',
    description: 'Product analytics',
    envKey: 'NEXT_PUBLIC_POSTHOG_KEY',
    extraEnvKeys: ['NEXT_PUBLIC_POSTHOG_HOST'],
    keyHint: 'phx_...',
    getKeyUrl: 'https://app.posthog.com/settings/project#variables',
    getKeySteps: [
      'Click "Open PostHog →" below',
      'Select your project (or create one)',
      'Go to Project Settings → Project API key',
      'Copy the key (phx_...)',
      'Paste as: KEY|https://app.posthog.com',
    ],
    matchKeywords: ['posthog', 'analytics', 'tracking'],
  },
  {
    id: 'resend',
    name: 'Resend',
    icon: '✉️',
    description: 'Transactional email',
    envKey: 'RESEND_API_KEY',
    keyHint: 're_...',
    getKeyUrl: 'https://resend.com/api-keys',
    getKeySteps: [
      'Click "Open Resend →" below',
      'Click "Create API Key"',
      'Give it full access, name it "Forge"',
      'Copy the key (re_...)',
    ],
    matchKeywords: ['resend', 'email', 'sendgrid', 'nodemailer'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '✦',
    description: 'Claude AI API',
    envKey: 'ANTHROPIC_API_KEY',
    keyHint: 'sk-ant-...',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
    getKeySteps: [
      'Click "Open Anthropic →" below',
      'Click "Create Key"',
      'Name it and set permissions',
      'Copy immediately (shown once)',
    ],
    matchKeywords: ['anthropic', 'claude', 'ai', 'llm'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    description: 'GPT & AI APIs',
    envKey: 'OPENAI_API_KEY',
    keyHint: 'sk-...',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    getKeySteps: [
      'Click "Open OpenAI →" below',
      'Click "Create new secret key"',
      'Name it "Forge" and copy immediately',
    ],
    matchKeywords: ['openai', 'gpt', 'chatgpt', 'ai', 'llm'],
  },
  {
    id: 'upstash',
    name: 'Upstash',
    icon: '🔴',
    description: 'Serverless Redis',
    envKey: 'UPSTASH_REDIS_REST_URL',
    extraEnvKeys: ['UPSTASH_REDIS_REST_TOKEN'],
    keyHint: 'https://....upstash.io',
    getKeyUrl: 'https://console.upstash.com',
    getKeySteps: [
      'Click "Open Upstash →" and create a Redis database',
      'Go to the database → REST API tab',
      'Copy the REST URL',
      'Copy the REST token',
      'Paste as: URL|TOKEN',
    ],
    matchKeywords: ['upstash', 'redis', 'cache', 'rate limit'],
  },
  {
    id: 'neon',
    name: 'Neon',
    icon: '🌿',
    description: 'Serverless Postgres',
    envKey: 'DATABASE_URL',
    keyHint: 'postgresql://...',
    getKeyUrl: 'https://console.neon.tech',
    getKeySteps: [
      'Click "Open Neon →" and create a project',
      'Go to Connection Details',
      'Copy the connection string (postgresql://...)',
    ],
    matchKeywords: ['neon', 'postgres', 'postgresql', 'database', 'prisma', 'drizzle'],
    checkType: 'format',
  },
  {
    id: 'planetscale',
    name: 'PlanetScale',
    icon: '🪐',
    description: 'Serverless MySQL',
    envKey: 'DATABASE_URL',
    keyHint: 'mysql://...',
    getKeyUrl: 'https://app.planetscale.com',
    getKeySteps: [
      'Click "Open PlanetScale →" and create a database',
      'Go to Connect → Create password',
      'Copy the connection string',
    ],
    matchKeywords: ['planetscale', 'mysql', 'database'],
    checkType: 'format',
  },
  {
    id: 'cloudinary',
    name: 'Cloudinary',
    icon: '☁️',
    description: 'Image & video hosting',
    envKey: 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
    extraEnvKeys: ['CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
    keyHint: 'your-cloud-name',
    getKeyUrl: 'https://cloudinary.com/console',
    getKeySteps: [
      'Click "Open Cloudinary →" below',
      'Find your Cloud Name, API Key, and API Secret on the dashboard',
      'Paste as: CLOUD_NAME|API_KEY|API_SECRET',
    ],
    matchKeywords: ['cloudinary', 'image', 'upload', 'media', 's3'],
  },
  {
    id: 'twilio',
    name: 'Twilio',
    icon: '📱',
    description: 'SMS & voice',
    envKey: 'TWILIO_ACCOUNT_SID',
    extraEnvKeys: ['TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
    keyHint: 'ACxxxxxxxxx',
    getKeyUrl: 'https://console.twilio.com',
    getKeySteps: [
      'Click "Open Twilio →" below',
      'Find Account SID and Auth Token on the dashboard',
      'Copy your Twilio phone number from Active Numbers',
      'Paste as: SID|TOKEN|PHONE',
    ],
    matchKeywords: ['twilio', 'sms', 'text', 'phone', 'voice'],
  },
  {
    id: 'sentry',
    name: 'Sentry',
    icon: '🚨',
    description: 'Error tracking',
    envKey: 'NEXT_PUBLIC_SENTRY_DSN',
    keyHint: 'https://xxx@sentry.io/xxx',
    getKeyUrl: 'https://sentry.io/settings/',
    getKeySteps: [
      'Click "Open Sentry →" and create a Next.js project',
      'Go to Settings → Projects → your project → Client Keys',
      'Copy the DSN',
    ],
    matchKeywords: ['sentry', 'error', 'monitoring', 'logging'],
    checkType: 'format',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    icon: '✉️',
    description: 'Email delivery at scale',
    envKey: 'SENDGRID_API_KEY',
    keyHint: 'SG.xxx...',
    getKeyUrl: 'https://app.sendgrid.com/settings/api_keys',
    getKeySteps: [
      'Go to app.sendgrid.com → Settings → API Keys',
      'Click "Create API Key"',
      'Choose "Full Access" or restricted',
      'Copy the key',
    ],
    matchKeywords: ['sendgrid', 'email', 'smtp'],
  },
  {
    id: 'mongodb',
    name: 'MongoDB Atlas',
    icon: '🍃',
    description: 'NoSQL document database',
    envKey: 'MONGODB_URI',
    keyHint: 'mongodb+srv://...',
    getKeyUrl: 'https://cloud.mongodb.com',
    getKeySteps: [
      'Go to cloud.mongodb.com → your cluster',
      'Click "Connect" → "Connect your application"',
      'Copy the connection string',
      'Replace <password> with your DB user password',
    ],
    matchKeywords: ['mongodb', 'mongo', 'nosql', 'database'],
    checkType: 'format',
  },
  {
    id: 'firebase',
    name: 'Firebase',
    icon: '🔥',
    description: 'Google backend-as-a-service',
    envKey: 'NEXT_PUBLIC_FIREBASE_API_KEY',
    extraEnvKeys: ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'FIREBASE_ADMIN_SDK'],
    keyHint: 'AIzaSy...',
    getKeyUrl: 'https://console.firebase.google.com',
    getKeySteps: [
      'Open your Firebase project → Project Settings',
      'Under "Your apps", click the web app',
      'Copy the firebaseConfig values',
      'For Admin SDK: Service accounts → Generate new private key',
    ],
    matchKeywords: ['firebase', 'firestore', 'google', 'realtime database'],
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    icon: '🌤️',
    description: 'CDN, DNS, and R2 storage',
    envKey: 'CLOUDFLARE_API_TOKEN',
    extraEnvKeys: ['CLOUDFLARE_ACCOUNT_ID'],
    keyHint: 'your-api-token',
    getKeyUrl: 'https://dash.cloudflare.com/profile/api-tokens',
    getKeySteps: [
      'Go to Cloudflare dashboard → Profile → API Tokens',
      'Click "Create Token"',
      'Use the "Edit zone DNS" template or create custom',
      'Copy the token and your Account ID',
    ],
    matchKeywords: ['cloudflare', 'cdn', 'dns', 'r2', 'storage', 'workers'],
  },
  {
    id: 'aws',
    name: 'AWS',
    icon: '☁️',
    description: 'Amazon Web Services (S3, Lambda, etc.)',
    envKey: 'AWS_ACCESS_KEY_ID',
    extraEnvKeys: ['AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
    keyHint: 'AKIA...',
    getKeyUrl: 'https://us-east-1.console.aws.amazon.com/iam/home#/security_credentials',
    getKeySteps: [
      'Go to AWS IAM Console → Security Credentials',
      'Under "Access keys", click "Create access key"',
      'Download or copy the Access Key ID and Secret',
      'Set your preferred AWS region (e.g. us-east-1)',
    ],
    matchKeywords: ['aws', 's3', 'lambda', 'amazon', 'ec2', 'cloudwatch'],
    checkType: 'format',
  },
  {
    id: 'algolia',
    name: 'Algolia',
    icon: '🔍',
    description: 'Search and discovery',
    envKey: 'NEXT_PUBLIC_ALGOLIA_APP_ID',
    extraEnvKeys: ['NEXT_PUBLIC_ALGOLIA_SEARCH_KEY', 'ALGOLIA_ADMIN_KEY'],
    keyHint: 'Your Application ID',
    getKeyUrl: 'https://www.algolia.com/account/api-keys',
    getKeySteps: [
      'Go to algolia.com → API Keys',
      'Copy your Application ID',
      'Copy the Search-Only API Key (public)',
      'Copy the Admin API Key (keep secret)',
    ],
    matchKeywords: ['algolia', 'search', 'typesense'],
  },
  {
    id: 'mapbox',
    name: 'Mapbox',
    icon: '🗺️',
    description: 'Maps and location services',
    envKey: 'NEXT_PUBLIC_MAPBOX_TOKEN',
    keyHint: 'pk.eyJ1...',
    getKeyUrl: 'https://account.mapbox.com/access-tokens/',
    getKeySteps: [
      'Go to account.mapbox.com → Access Tokens',
      'Click "Create a token"',
      'Give it a name and set scopes',
      'Copy the token (starts with pk.)',
    ],
    matchKeywords: ['mapbox', 'maps', 'location', 'geolocation'],
  },
  {
    id: 'google_maps',
    name: 'Google Maps',
    icon: '📍',
    description: 'Maps, geocoding, places API',
    envKey: 'NEXT_PUBLIC_GOOGLE_MAPS_KEY',
    keyHint: 'AIzaSy...',
    getKeyUrl: 'https://console.cloud.google.com/apis/credentials',
    getKeySteps: [
      'Go to Google Cloud Console → APIs & Services → Credentials',
      'Click "Create Credentials" → "API key"',
      'Enable Maps JavaScript API in the library',
      'Copy the API key',
    ],
    matchKeywords: ['google maps', 'maps', 'geocoding', 'places'],
  },
  {
    id: 'pusher',
    name: 'Pusher',
    icon: '📡',
    description: 'Real-time WebSockets',
    envKey: 'NEXT_PUBLIC_PUSHER_KEY',
    extraEnvKeys: ['PUSHER_APP_ID', 'PUSHER_SECRET', 'NEXT_PUBLIC_PUSHER_CLUSTER'],
    keyHint: 'your-app-key',
    getKeyUrl: 'https://dashboard.pusher.com',
    getKeySteps: [
      'Go to dashboard.pusher.com → your app',
      'Click "App Keys"',
      'Copy app_id, key, secret, and cluster',
    ],
    matchKeywords: ['pusher', 'websocket', 'realtime', 'socket'],
  },
  {
    id: 'lemon_squeezy',
    name: 'Lemon Squeezy',
    icon: '🍋',
    description: 'Payments for digital products',
    envKey: 'LEMONSQUEEZY_API_KEY',
    extraEnvKeys: ['LEMONSQUEEZY_STORE_ID', 'LEMONSQUEEZY_WEBHOOK_SECRET'],
    keyHint: 'your-api-key',
    getKeyUrl: 'https://app.lemonsqueezy.com/settings/api',
    getKeySteps: [
      'Go to app.lemonsqueezy.com → Settings → API',
      'Click "Create API key"',
      'Copy the key',
    ],
    matchKeywords: ['lemon squeezy', 'lemonsqueezy', 'payments', 'billing'],
  },
]

// ─── Supplier bank (invention) ────────────────────────────────────────────────

interface SupplierDef {
  name: string
  icon: string
  description: string
  url: string
  focus: string
  matchKeywords: string[]
  alwaysShow?: boolean
}

const SUPPLIERS: SupplierDef[] = [
  { name: 'Amazon Business', icon: '📦', description: 'General components & materials', url: 'https://business.amazon.com', focus: 'Fast shipping, wide selection', matchKeywords: [], alwaysShow: true },
  { name: 'Digikey', icon: '🔌', description: 'Electronic components', url: 'https://digikey.com', focus: 'Largest electronics catalog, in-stock', matchKeywords: ['arduino', 'raspberry', 'sensor', 'microcontroller', 'pcb', 'electronic', 'circuit', 'motor', 'led', 'battery'] },
  { name: 'Mouser', icon: '🖱️', description: 'Electronic components', url: 'https://mouser.com', focus: 'Same-day shipping, broad inventory', matchKeywords: ['arduino', 'raspberry', 'sensor', 'microcontroller', 'pcb', 'electronic', 'circuit'] },
  { name: 'McMaster-Carr', icon: '⚙️', description: 'Hardware & mechanical parts', url: 'https://mcmaster.com', focus: 'Industrial hardware, fasteners, plastics', matchKeywords: ['mechanical', 'hardware', 'fastener', 'bearing', 'shaft', 'metal', 'plastic', 'cnc'] },
  { name: 'Protolabs', icon: '🏭', description: 'Rapid prototyping & manufacturing', url: 'https://protolabs.com', focus: 'CNC, 3D printing, injection molding', matchKeywords: ['prototype', '3d print', 'cnc', 'injection', 'mold', 'machining'] },
  { name: 'PCBWay', icon: '🟩', description: 'PCB manufacturing', url: 'https://pcbway.com', focus: 'Low-cost PCB fabrication and assembly', matchKeywords: ['pcb', 'circuit board', 'schematic', 'eagle', 'kicad'] },
  { name: 'Adafruit', icon: '💡', description: 'Open-source electronics', url: 'https://adafruit.com', focus: 'Arduino, Raspberry Pi, sensors, tutorials', matchKeywords: ['arduino', 'raspberry', 'sensor', 'iot', 'led', 'microcontroller'] },
  { name: 'SparkFun', icon: '⚡', description: 'Electronics & dev boards', url: 'https://sparkfun.com', focus: 'Dev boards, breakouts, tutorials', matchKeywords: ['arduino', 'raspberry', 'sensor', 'iot', 'bluetooth', 'wifi'] },
  { name: 'Alibaba', icon: '🌏', description: 'Bulk manufacturing & OEM', url: 'https://alibaba.com', focus: 'Production runs, OEM parts, low per-unit cost', matchKeywords: [], alwaysShow: true },
  { name: 'Xometry', icon: '🔧', description: 'On-demand manufacturing', url: 'https://xometry.com', focus: 'CNC, sheet metal, 3D printing quotes', matchKeywords: ['machining', 'cnc', 'metal', 'sheet', 'manufacturing'] },
]

// ─── Business tool bank ───────────────────────────────────────────────────────

interface BizToolDef {
  name: string
  icon: string
  description: string
  signupUrl: string
  docsUrl: string
  cost: string
  category: string
  matchKeywords: string[]
  alwaysShow?: boolean
}

const BIZ_TOOLS: BizToolDef[] = [
  { name: 'Stripe', icon: '💳', description: 'Accept payments & subscriptions', signupUrl: 'https://dashboard.stripe.com/register', docsUrl: 'https://stripe.com/docs', cost: '2.9% + 30¢', category: 'Payments', matchKeywords: ['stripe', 'payment', 'billing', 'subscription', 'checkout'] },
  { name: 'Square', icon: '⬛', description: 'POS & in-person payments', signupUrl: 'https://squareup.com/signup', docsUrl: 'https://developer.squareup.com', cost: '2.6% + 10¢', category: 'Payments', matchKeywords: ['square', 'pos', 'in-person', 'retail', 'restaurant'] },
  { name: 'Shopify', icon: '🛒', description: 'E-commerce store platform', signupUrl: 'https://shopify.com/signup', docsUrl: 'https://shopify.dev/docs', cost: 'From $29/mo', category: 'E-commerce', matchKeywords: ['shopify', 'store', 'ecommerce', 'e-commerce', 'product', 'inventory'] },
  { name: 'QuickBooks', icon: '📊', description: 'Accounting & bookkeeping', signupUrl: 'https://quickbooks.intuit.com', docsUrl: 'https://quickbooks.intuit.com/learn-support/', cost: 'From $30/mo', category: 'Finance', matchKeywords: ['quickbooks', 'accounting', 'bookkeeping', 'finance', 'tax', 'invoice'] },
  { name: 'Wave', icon: '🌊', description: 'Free accounting software', signupUrl: 'https://waveapps.com', docsUrl: 'https://support.waveapps.com', cost: 'Free', category: 'Finance', matchKeywords: ['wave', 'accounting', 'bookkeeping', 'invoice', 'free'] },
  { name: 'HubSpot', icon: '🧲', description: 'CRM & sales pipeline', signupUrl: 'https://hubspot.com/products/crm', docsUrl: 'https://developers.hubspot.com', cost: 'Free / From $45/mo', category: 'CRM', matchKeywords: ['hubspot', 'crm', 'sales', 'pipeline', 'leads', 'customers'] },
  { name: 'Mailchimp', icon: '🐒', description: 'Email marketing', signupUrl: 'https://mailchimp.com/signup/', docsUrl: 'https://mailchimp.com/help/', cost: 'Free up to 500 contacts', category: 'Marketing', matchKeywords: ['mailchimp', 'email', 'newsletter', 'marketing', 'campaign'] },
  { name: 'Notion', icon: '📝', description: 'Docs, wiki & project management', signupUrl: 'https://notion.so/signup', docsUrl: 'https://developers.notion.com', cost: 'Free / $8/user/mo', category: 'Operations', matchKeywords: ['notion', 'docs', 'wiki', 'project', 'planning', 'operations'] },
  { name: 'Gusto', icon: '👥', description: 'Payroll & HR', signupUrl: 'https://gusto.com', docsUrl: 'https://support.gusto.com', cost: 'From $46/mo', category: 'HR', matchKeywords: ['gusto', 'payroll', 'hr', 'employees', 'benefits', 'hiring'] },
  { name: 'DocuSign', icon: '✍️', description: 'Electronic signatures & contracts', signupUrl: 'https://docusign.com/register', docsUrl: 'https://developers.docusign.com', cost: 'From $15/mo', category: 'Legal', matchKeywords: ['docusign', 'contract', 'signature', 'agreement', 'legal'] },
  { name: 'Calendly', icon: '📅', description: 'Scheduling & appointments', signupUrl: 'https://calendly.com/signup', docsUrl: 'https://developer.calendly.com', cost: 'Free / $10/mo', category: 'Scheduling', matchKeywords: ['calendly', 'scheduling', 'booking', 'appointment', 'calendar'] },
  { name: 'Zendesk', icon: '🎫', description: 'Customer support', signupUrl: 'https://zendesk.com/register', docsUrl: 'https://developer.zendesk.com', cost: 'From $55/mo', category: 'Support', matchKeywords: ['zendesk', 'support', 'helpdesk', 'tickets', 'customer service'] },
  { name: 'Lemon Squeezy', icon: '🍋', description: 'Digital products & subscriptions', signupUrl: 'https://lemonsqueezy.com', docsUrl: 'https://docs.lemonsqueezy.com', cost: '5% + 50¢', category: 'Payments', matchKeywords: ['lemon squeezy', 'digital', 'download', 'course', 'saas'] },
]

// ─── Shared helpers ───────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="px-2 py-1 text-[10px] border border-border rounded text-ink4 hover:text-ink hover:border-border2 transition-colors shrink-0">
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

type CheckStatus = 'idle' | 'loading' | 'success' | 'error'

interface ServiceState {
  key: string
  status: CheckStatus
  message: string
  detail?: string
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === 'loading') return (
    <svg className="w-4 h-4 animate-spin text-ink4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
    </svg>
  )
  if (status === 'success') return (
    <svg className="w-4 h-4 text-green" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  if (status === 'error') return (
    <svg className="w-4 h-4 text-red" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6L6 10M6 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
  return <div className="w-2 h-2 rounded-full bg-border" />
}

// ─── Software: API key card ───────────────────────────────────────────────────

function ServiceCard({ service, state, onTest, onKeyChange, highlight, detectedInCode, onOAuthSuccess, projectId }: {
  service: ServiceDef
  state: ServiceState | undefined
  onTest: (service: ServiceDef, key: string) => void
  onKeyChange: (id: string, key: string) => void
  highlight?: string
  detectedInCode?: boolean
  onOAuthSuccess?: () => void
  projectId?: string
}) {
  const isHighlighted = highlight === service.id
  const [open, setOpen] = useState(isHighlighted)
  const [input, setInput] = useState(state?.key ?? '')
  const cardRef = useRef<HTMLDivElement>(null)
  const currentStatus = state?.status ?? 'idle'

  // Sync input when key is set externally (e.g. from .env.local auto-fill)
  useEffect(() => {
    if (state?.key !== undefined && state.key !== input) {
      setInput(state.key)
      if (state.key) setOpen(true) // expand card so user can see it's filled
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.key])

  useEffect(() => {
    if (isHighlighted) {
      setOpen(true)
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [isHighlighted])

  return (
    <div ref={cardRef} className={cn('bg-surface border rounded-forge overflow-hidden transition-colors',
      currentStatus === 'success' ? 'border-green-border' : 'border-border',
      isHighlighted && 'ring-2 ring-ink'
    )}>
      <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-surface2 transition-colors" onClick={() => setOpen(!open)}>
        <span className="text-2xl w-8 text-center shrink-0">{service.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-ink">{service.name}</p>
            {detectedInCode && (
              <span className="text-[10px] font-medium px-1.5 py-px rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                in your code
              </span>
            )}
            {state && (
              <span className={cn('tag text-[10px]',
                currentStatus === 'success' ? (service.checkType === 'format' ? 'tag-amber' : 'tag-green') :
                currentStatus === 'error' ? 'tag-red' :
                currentStatus === 'loading' ? 'tag-gray' : '')}>
                {currentStatus === 'loading' ? 'testing' :
                 currentStatus === 'success' && service.checkType === 'format' ? 'format valid' :
                 state.message}
              </span>
            )}
            {service.checkType === 'format' && (
              <span className="text-[10px] text-ink4" title="Format validation only — cannot verify this key type via API">~ format only</span>
            )}
          </div>
          <p className="text-xs text-ink4">{service.description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusIcon status={currentStatus} />
          <svg className={cn('w-4 h-4 text-ink4 transition-transform', open && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          {service.oauthPath && (
            <div className="flex items-center justify-between p-3 bg-surface2 border border-border rounded-forge">
              <div>
                <p className="text-xs font-medium text-ink mb-0.5">One-click connect</p>
                <p className="text-xs text-ink4">Authorize via OAuth — no key to paste</p>
              </div>
              <button
                onClick={() => {
                  window.open(`${service.oauthPath}?popup=true${projectId ? `&project=${projectId}` : ''}`, 'forge-oauth', 'width=600,height=700,scrollbars=yes,resizable=yes')
                  try {
                    const ch = new BroadcastChannel('forge-oauth')
                    ch.onmessage = (e) => {
                      if (e.data?.type === 'oauth-success') { onOAuthSuccess?.(); ch.close() }
                    }
                  } catch {}
                }}
                className="px-3 py-1.5 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors shrink-0">
                Connect {service.name} →
              </button>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-ink2">How to get your key</p>
              <a href={service.getKeyUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue underline underline-offset-2 hover:opacity-70">
                Open {service.name} →
              </a>
            </div>
            <ol className="space-y-1">
              {service.getKeySteps.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs text-ink3">
                  <span className="w-4 h-4 rounded-full bg-surface2 border border-border flex items-center justify-center text-[10px] font-bold text-ink4 shrink-0 mt-0.5">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-xs font-medium text-ink2 mb-1.5">Paste key</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={input}
                onChange={e => { setInput(e.target.value); onKeyChange(service.id, e.target.value) }}
                placeholder={service.keyHint}
                className="flex-1 text-xs bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 font-mono"
              />
              <button
                onClick={() => onTest(service, input)}
                disabled={!input.trim() || currentStatus === 'loading'}
                className="px-3 py-1.5 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-40 shrink-0"
              >Test</button>
            </div>
            {state?.detail && <p className="text-xs text-ink3 mt-1.5">{state.detail}</p>}
            {service.extraEnvKeys && (
              <p className="text-[10px] text-ink4 mt-1.5">Multi-part: paste as <code className="font-mono bg-surface px-1 rounded">PART1|PART2</code></p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Software keys view ───────────────────────────────────────────────────────

interface RepoContext {
  envVars: string[]
  dependencies: string[]
  hasEnvExample: boolean
  hasPackageJson: boolean
}

function SoftwareKeys({ guide }: { guide: BuildGuide | null }) {
  const { activeProject, refreshProjects } = useProject()
  const { github, refresh: refreshIntegrations } = useIntegrations()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const [states, setStates] = useState<Record<string, ServiceState>>({})
  const [envCopied, setEnvCopied] = useState(false)
  const [repoCtx, setRepoCtx] = useState<RepoContext | null>(null)
  const [detectedIds, setDetectedIds] = useState<string[]>([])
  const [envParseStatus, setEnvParseStatus] = useState<string | null>(null)
  const envFileRef = useRef<HTMLInputElement>(null)

  // Persist states to localStorage whenever they change
  useEffect(() => {
    if (!activeProject?.id || Object.keys(states).length === 0) return
    try {
      localStorage.setItem(`forge:key-states:${activeProject.id}`, JSON.stringify(states))
    } catch {}
  }, [states, activeProject?.id])

  // Restore states from localStorage on mount
  useEffect(() => {
    if (!activeProject?.id) return
    try {
      const raw = localStorage.getItem(`forge:key-states:${activeProject.id}`)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, ServiceState>
        // Reset stale loading states so they don't show spinner permanently
        const cleaned: Record<string, ServiceState> = {}
        for (const [k, v] of Object.entries(parsed)) {
          cleaned[k] = v.status === 'loading' ? { ...v, status: 'idle', message: '' } : v
        }
        setStates(cleaned)
      }
    } catch {}
  }, [activeProject?.id])

  const handleOAuthSuccess = useCallback(async () => {
    await refreshIntegrations()
    // Mark the GitHub card as visually connected
    setStates(prev => ({ ...prev, github: { key: '', status: 'success', message: 'Connected via OAuth' } }))
    if (activeProject?.id) {
      await fetch(`/api/projects/${activeProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'keys_generated' }),
      })
      refreshProjects()
    }
  }, [refreshIntegrations, activeProject, refreshProjects])

  const onKeyChange = useCallback((id: string, key: string) => {
    setStates(prev => ({ ...prev, [id]: { ...(prev[id] ?? { status: 'idle', message: '' }), key } }))
  }, [])

  const handleEnvFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then(content => {
      const pairs: Record<string, string> = {}
      content.split('\n').forEach(line => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) return
        const eq = trimmed.indexOf('=')
        if (eq === -1) return
        const key = trimmed.slice(0, eq).trim()
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
        if (key && val) pairs[key] = val
      })
      // Match parsed env vars to services and auto-fill
      let filled = 0
      ALL_SERVICES.forEach(svc => {
        const allKeys = [svc.envKey, ...(svc.extraEnvKeys ?? [])]
        const values = allKeys.map(k => pairs[k]).filter(Boolean)
        if (values.length > 0) {
          const combined = values.join('|')
          onKeyChange(svc.id, combined)
          filled++
        }
      })
      setEnvParseStatus(filled > 0 ? `✓ Auto-filled ${filled} service${filled === 1 ? '' : 's'} — click Test to verify` : 'No matching keys found in file')
      if (envFileRef.current) envFileRef.current.value = ''
    })
  }, [onKeyChange])

  // Load detected services from localStorage
  useEffect(() => {
    if (activeProject?.id) {
      setDetectedIds(loadDetectedServices(activeProject.id))
    }
  }, [activeProject?.id])

  // Load repo context from linked GitHub repo
  useEffect(() => {
    const repo = activeProject?.github_repo
    if (!repo || !github) return
    fetch(`/api/github/repo-context?repo=${encodeURIComponent(repo)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setRepoCtx(data) })
      .catch(() => {})
  }, [activeProject?.github_repo, github])

  // Build match signal: repo env vars + package deps + build guide stack
  const stackNames = (guide?.stack ?? []).map(s => s.name.toLowerCase())
  const repoSignals = [
    ...(repoCtx?.envVars ?? []).map(v => v.toLowerCase()),
    ...(repoCtx?.dependencies ?? []).map(d => d.toLowerCase()),
  ]
  const allSignals = [...stackNames, ...repoSignals]

  const visibleServices = ALL_SERVICES
    .filter(s =>
      s.alwaysShow ||
      !!states[s.id]?.key ||
      s.matchKeywords.some(kw =>
        allSignals.some(sig => sig.includes(kw) || kw.includes(sig))
      ) || detectedIds.includes(s.id)
    )
    .sort((a, b) => {
      const aDetected = detectedIds.includes(a.id) ? -1 : 0
      const bDetected = detectedIds.includes(b.id) ? -1 : 0
      return aDetected - bDetected
    })

  // Count detected services that are non-integration (API key) services
  const detectedApiKeyCount = detectedIds.filter(id => {
    const svc = ALL_SERVICES.find(s => s.id === id)
    return svc && !svc.alwaysShow
  }).length

  const handleTest = async (service: ServiceDef, key: string) => {
    setStates(prev => ({ ...prev, [service.id]: { ...(prev[service.id] ?? {}), key, status: 'loading', message: 'Testing...' } }))
    try {
      const res = await fetch(`/api/checks/${service.id}?key=${encodeURIComponent(key)}`)
      const data = await res.json()
      setStates(prev => ({
        ...prev,
        [service.id]: { key, status: data.ok ? 'success' : 'error', message: data.message || (data.ok ? 'Connected' : 'Failed'), detail: data.detail },
      }))
    } catch {
      setStates(prev => ({ ...prev, [service.id]: { key, status: 'error', message: 'Connection error' } }))
    }
  }

  const stackEnvMap: Record<string, string[]> = {
    supabase: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
    clerk: ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'],
    stripe: ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    posthog: ['NEXT_PUBLIC_POSTHOG_KEY', 'NEXT_PUBLIC_POSTHOG_HOST'],
    resend: ['RESEND_API_KEY'],
    anthropic: ['ANTHROPIC_API_KEY'],
    openai: ['OPENAI_API_KEY'],
    upstash: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    neon: ['DATABASE_URL'],
    planetscale: ['DATABASE_URL'],
    cloudinary: ['NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
    twilio: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
    sentry: ['NEXT_PUBLIC_SENTRY_DSN'],
  }

  const envLines = visibleServices.flatMap(s => {
    const rawKey = states[s.id]?.key?.trim()
    if (!rawKey) return []
    const parts = rawKey.split('|')
    const allKeys = [s.envKey, ...(s.extraEnvKeys ?? [])]
    return allKeys.map((envVar, i) => `${envVar}=${parts[i] ?? parts[0]}`)
  })

  const allEnvVarNames = Array.from(new Set(
    stackNames.flatMap(name => Object.entries(stackEnvMap).find(([k]) => name.includes(k))?.[1] ?? [])
  ))
  const envExample = allEnvVarNames.map(v => `${v}=`).join('\n')

  const connectedCount = visibleServices.filter(s => states[s.id]?.status === 'success').length

  return (
    <div className="space-y-4">
      {detectedApiKeyCount > 0 && (
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-forge">
          <p className="text-xs text-blue-700">
            <span className="font-medium">{detectedApiKeyCount} {detectedApiKeyCount === 1 ? 'service' : 'services'} detected in your code</span> — check your keys below
          </p>
        </div>
      )}
      <div className="px-4 py-3 bg-surface2 border border-border rounded-forge">
        <p className="text-xs text-ink3">
          Showing <span className="font-medium text-ink">{visibleServices.length} services</span>
          {repoCtx?.hasEnvExample
            ? <> detected from your <span className="font-mono text-ink">.env.example</span> and <span className="font-mono text-ink">package.json</span></>
            : guide
              ? <> for your stack: {(guide.stack ?? []).map(s => s.name).join(', ')}</>
              : <> (connect a repo or complete Build Guide to filter by project)</>
          }.
        </p>
      </div>

      {/* .env.local auto-fill */}
      <div className="px-4 py-3 bg-surface border border-border rounded-forge space-y-2">
        <div className="flex items-center gap-3">
          <input ref={envFileRef} type="file" className="hidden" onChange={handleEnvFile} />
          <button
            onClick={() => envFileRef.current?.click()}
            className="px-3 py-1.5 bg-surface2 border border-border text-xs font-medium text-ink rounded-forge hover:bg-surface hover:border-border2 transition-colors shrink-0"
          >
            Upload .env.local
          </button>
          <p className="text-xs text-ink4 flex-1">
            {envParseStatus ?? 'Auto-fill all keys from your local environment file'}
          </p>
          {envParseStatus?.startsWith('✓') && (
            <button
              onClick={() => {
                visibleServices.forEach(svc => {
                  const key = states[svc.id]?.key
                  if (key?.trim()) handleTest(svc, key)
                })
              }}
              className="px-3 py-1.5 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors shrink-0"
            >
              Test all →
            </button>
          )}
        </div>
        <p className="text-[11px] text-ink4">
          Can&apos;t see the file? On Mac, press <kbd className="font-mono bg-surface2 border border-border px-1 rounded text-[10px]">⌘ Shift .</kbd> in the file picker to show hidden files.
        </p>
      </div>

      {/* Progress */}
      <div className="bg-surface border border-border rounded-forge p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-ink2">Connected</p>
          <p className="text-xs text-ink4">{connectedCount} / {visibleServices.length}</p>
        </div>
        <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
          <div className="h-full bg-green rounded-full transition-all duration-500"
            style={{ width: `${visibleServices.length ? (connectedCount / visibleServices.length) * 100 : 0}%` }} />
        </div>
        <p className="text-xs text-ink4 mt-2">Only connect services your project uses. Keys are only used for the test and not stored.</p>
      </div>

      {/* Service cards */}
      <div className="space-y-2">
        {(() => {
          const integrations = visibleServices.filter(s => s.alwaysShow)
          const apiKeys = visibleServices.filter(s => !s.alwaysShow)
          return (
            <>
              {integrations.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-ink4 uppercase tracking-wider px-1 pt-2">Integrations</p>
                  {integrations.map(service => (
                    <ServiceCard key={service.id} service={service} state={states[service.id]}
                      onTest={handleTest} onKeyChange={onKeyChange} highlight={highlightId ?? undefined}
                      detectedInCode={detectedIds.includes(service.id)} onOAuthSuccess={handleOAuthSuccess}
                      projectId={activeProject?.id} />
                  ))}
                </>
              )}
              {apiKeys.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-ink4 uppercase tracking-wider px-1 pt-4">API Keys</p>
                  {apiKeys.map(service => (
                    <ServiceCard key={service.id} service={service} state={states[service.id]}
                      onTest={handleTest} onKeyChange={onKeyChange} highlight={highlightId ?? undefined}
                      detectedInCode={detectedIds.includes(service.id)} onOAuthSuccess={handleOAuthSuccess}
                      projectId={activeProject?.id} />
                  ))}
                </>
              )}
            </>
          )
        })()}
      </div>

      {/* .env.local generator */}
      {envLines.length > 0 && (
        <div className="bg-surface border border-border rounded-forge p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-ink">.env.local</p>
              <p className="text-xs text-ink4 mt-0.5">Copy into your project root</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(envLines.join('\n')); setEnvCopied(true); setTimeout(() => setEnvCopied(false), 1500) }}
              className="px-3 py-1.5 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors"
            >
              {envCopied ? 'Copied!' : 'Copy .env.local'}
            </button>
          </div>
          <div className="bg-ink rounded-forge px-3 py-3 overflow-x-auto">
            <pre className="text-xs text-white font-mono leading-relaxed">{envLines.join('\n')}</pre>
          </div>
          <p className="text-[10px] text-ink4 mt-2">⚠ Never commit this file. Make sure <code className="font-mono">.env.local</code> is in your <code className="font-mono">.gitignore</code>.</p>
        </div>
      )}

      {/* .env.example hint */}
      {envLines.length === 0 && allEnvVarNames.length > 0 && (
        <div className="bg-surface border border-border rounded-forge p-4">
          <p className="text-xs font-medium text-ink mb-2">Expected env vars for your stack</p>
          <div className="bg-ink rounded-forge px-3 py-3">
            <pre className="text-xs text-white/60 font-mono leading-relaxed">{envExample}</pre>
          </div>
          <p className="text-xs text-ink4 mt-2">Connect each service above to fill these in.</p>
        </div>
      )}
    </div>
  )
}

// ─── Supplier accounts view (invention) ──────────────────────────────────────

function InventionSuppliers({ guide }: { guide: BuildGuide | null }) {
  const stackNames = (guide?.stack ?? []).map(s => s.name.toLowerCase())
  const keywords = stackNames.flatMap(n => n.split(/[\s,&]/)).filter(Boolean)

  const visible = SUPPLIERS.filter(s =>
    s.alwaysShow || s.matchKeywords.some(kw => keywords.some(k => k.includes(kw) || kw.includes(k)))
  )

  return (
    <div className="space-y-4">
      {guide && (
        <div className="px-4 py-3 bg-surface2 border border-border rounded-forge">
          <p className="text-xs text-ink3">
            Recommended suppliers for your materials:{' '}
            {(guide.stack ?? []).map(s => s.name).join(', ')}.
          </p>
        </div>
      )}
      <div className="space-y-2">
        {visible.map((s, i) => (
          <div key={i} className="bg-surface border border-border rounded-forge p-4 flex items-start gap-4">
            <span className="text-2xl w-8 text-center shrink-0">{s.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink mb-0.5">{s.name}</p>
              <p className="text-xs text-ink3 mb-1">{s.description}</p>
              <p className="text-[10px] text-ink4 mb-2">Best for: {s.focus}</p>
              <a href={s.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue underline underline-offset-2 hover:opacity-70">
                Open {s.name} →
              </a>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 bg-amber-bg border border-amber-border rounded-forge">
        <p className="text-xs font-medium text-amber mb-1">Prototyping tip</p>
        <p className="text-xs text-ink3">
          Order 2-3x the components you need for your first prototype — parts break and get lost. Once the design is locked, get quotes from <a href="https://alibaba.com" target="_blank" rel="noopener noreferrer" className="text-blue underline underline-offset-2">Alibaba</a> for production pricing.
        </p>
      </div>
    </div>
  )
}

// ─── Business tools view ──────────────────────────────────────────────────────

function BusinessTools({ guide }: { guide: BuildGuide | null }) {
  const [done, setDone] = useState<Record<number, boolean>>({})
  const toggle = (i: number) => setDone(p => ({ ...p, [i]: !p[i] }))

  const stackNames = (guide?.stack ?? []).map(s => s.name.toLowerCase())
  const keywords = stackNames.flatMap(n => n.split(/[\s,&]/)).filter(Boolean)

  const visible = BIZ_TOOLS.filter(t =>
    t.alwaysShow || t.matchKeywords.some(kw => stackNames.some(name => name.includes(kw)) || keywords.some(k => kw.includes(k)))
  )

  const categories = Array.from(new Set(visible.map(t => t.category)))
  const doneCount = visible.filter((_, i) => done[i]).length

  return (
    <div className="space-y-4">
      {guide && (
        <div className="px-4 py-3 bg-surface2 border border-border rounded-forge">
          <p className="text-xs text-ink3">
            Tools matched to your business stack:{' '}
            {(guide.stack ?? []).map(s => s.name).join(', ')}.
          </p>
        </div>
      )}

      {/* Progress */}
      <div className="bg-surface border border-border rounded-forge p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-ink2">Tools set up</p>
          <p className="text-xs text-ink4">{doneCount} / {visible.length}</p>
        </div>
        <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
          <div className="h-full bg-green rounded-full transition-all duration-500"
            style={{ width: `${visible.length ? (doneCount / visible.length) * 100 : 0}%` }} />
        </div>
      </div>

      {/* By category */}
      {categories.map(cat => (
        <div key={cat} className="space-y-2">
          <p className="text-[10px] font-semibold text-ink4 uppercase tracking-wider px-1">{cat}</p>
          {visible.filter(t => t.category === cat).map((tool, i) => {
            const idx = visible.indexOf(tool)
            return (
              <div key={i} className={cn(
                'bg-surface border rounded-forge p-4 flex items-start gap-4 cursor-pointer transition-colors',
                done[idx] ? 'border-green-border' : 'border-border hover:border-border2'
              )} onClick={() => toggle(idx)}>
                <div className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                  done[idx] ? 'bg-green border-green' : 'border-border2 bg-surface2'
                )}>
                  {done[idx] && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 16 16">
                      <path d="M3.5 8l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-xl shrink-0">{tool.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className={cn('text-sm font-medium', done[idx] ? 'line-through text-ink3' : 'text-ink')}>{tool.name}</p>
                    <span className="text-xs text-ink4">{tool.cost}</span>
                  </div>
                  <p className="text-xs text-ink3 mb-2">{tool.description}</p>
                  <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                    <a href={tool.signupUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue underline underline-offset-2 hover:opacity-70">Sign up →</a>
                    <a href={tool.docsUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-ink4 hover:text-ink transition-colors">Docs</a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Page shell ───────────────────────────────────────────────────────────────

function ChecksPageInner() {
  const { activeProject } = useProject()
  const { result: guide } = useProjectAnalysis<BuildGuide>('buildguide')

  const track = activeProject?.track ?? 'software'

  const meta = {
    software: { title: 'Keys & Services', subtitle: 'Connect your services' },
    invention: { title: 'Suppliers', subtitle: 'Source your materials' },
    business: { title: 'Tools', subtitle: 'Set up your business stack' },
  }
  const { title, subtitle } = meta[track] ?? meta.software

  return (
    <>
      <Topbar title={title} subtitle={subtitle} />
      <div className="p-5 max-w-2xl mx-auto">
        {track === 'software' && <SoftwareKeys guide={guide} />}
        {track === 'invention' && <InventionSuppliers guide={guide} />}
        {track === 'business' && <BusinessTools guide={guide} />}
      </div>
    </>
  )
}

export default function ChecksPage() {
  return (
    <Suspense>
      <ChecksPageInner />
    </Suspense>
  )
}
