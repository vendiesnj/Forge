// Patterns to detect: map service ID → array of regex patterns to search in code
export const SERVICE_PATTERNS: Record<string, RegExp[]> = {
  stripe: [/STRIPE/i, /stripe\./i, /from ['"]stripe['"]/i],
  openai: [/OPENAI/i, /openai\./i, /from ['"]openai['"]/i],
  anthropic: [/ANTHROPIC/i, /anthropic\./i, /from ['"]@anthropic-ai/i],
  resend: [/RESEND/i, /resend\./i, /from ['"]resend['"]/i],
  sendgrid: [/SENDGRID/i, /sendgrid\./i, /from ['"]@sendgrid/i],
  twilio: [/TWILIO/i, /twilio\./i, /from ['"]twilio['"]/i],
  posthog: [/POSTHOG/i, /posthog\./i, /from ['"]posthog/i],
  sentry: [/SENTRY/i, /Sentry\./i, /from ['"]@sentry/i],
  mongodb: [/MONGODB/i, /mongoose\./i, /from ['"]mongoose['"]/i, /from ['"]mongodb['"]/i],
  firebase: [/FIREBASE/i, /firebase\./i, /from ['"]firebase/i],
  neon: [/NEON/i, /from ['"]@neondatabase/i],
  planetscale: [/PLANETSCALE/i, /from ['"]@planetscale/i],
  upstash: [/UPSTASH/i, /from ['"]@upstash/i],
  cloudflare: [/CLOUDFLARE/i, /from ['"]cloudflare/i],
  algolia: [/ALGOLIA/i, /algoliasearch/i],
  pusher: [/PUSHER/i, /pusher\./i, /from ['"]pusher/i],
  lemon_squeezy: [/LEMON_SQUEEZY/i, /lemonsqueezy/i],
  aws: [/AWS_/i, /from ['"]@aws-sdk/i],
  mapbox: [/MAPBOX/i, /mapboxgl/i],
  google_maps: [/GOOGLE_MAPS/i, /maps\.googleapis/i],
}

export function detectServicesFromCode(files: Array<{ content: string }>): Set<string> {
  const detected = new Set<string>()
  const allCode = files.map(f => f.content).join('\n')
  for (const [serviceId, patterns] of Object.entries(SERVICE_PATTERNS)) {
    if (patterns.some(p => p.test(allCode))) {
      detected.add(serviceId)
    }
  }
  return detected
}

export function storeDetectedServices(projectId: string, detected: Set<string>): void {
  try {
    localStorage.setItem(`forge:detected-services:${projectId}`, JSON.stringify([...detected]))
  } catch {}
}

export function loadDetectedServices(projectId: string): string[] {
  try {
    const raw = localStorage.getItem(`forge:detected-services:${projectId}`)
    if (!raw) return []
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}
