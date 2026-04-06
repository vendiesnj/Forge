import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { callClaudeJSON } from '@/lib/claude'
import { createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import type { AnalysisType } from '@/types'

function buildPrompt(type: AnalysisType, input: Record<string, string>): string {
  switch (type) {
    case 'idea': {
      const trackLabel = input.track === 'invention' ? 'invention' : input.track === 'business' ? 'business' : 'software'
      const skillLevel = input.skillLevel || 'beginner'
      return `Analyze this ${trackLabel} idea: "${input.idea}". Builder skill level: ${skillLevel}.

Return ONLY valid JSON with this exact structure:
{
  "productName": "short memorable name",
  "tagline": "one sentence value prop under 12 words",
  "score": 85,
  "verdict": "2-3 honest sentences on viability — do not sugarcoat",
  "redFlags": ["specific risk 1", "specific risk 2", "specific risk 3"],
  "market": {
    "size": "$XB TAM",
    "growth": "X% CAGR",
    "timing": "one sentence on why now is right or wrong for this market",
    "barrierToEntry": "low|medium|high",
    "barrierExplanation": "2 sentences on what makes it hard or easy to enter this market"
  },
  "audience": {
    "primary": "specific person e.g. solo founders running SaaS tools under $1M ARR",
    "painPoints": ["specific pain 1", "specific pain 2", "specific pain 3"],
    "willingToPay": "$X-Y/mo",
    "whereTheyHangOut": ["Reddit: r/specific", "specific Slack community", "specific newsletter or forum"],
    "earlyAdopters": "who would sign up on day 1 and exactly why"
  },
  "competition": {
    "level": "low|medium|high",
    "players": [{"name": "Real Company", "weakness": "specific exploitable weakness", "marketShare": "~X%"}],
    "yourEdge": "specific differentiation opportunity in 2 sentences"
  },
  "features": {
    "mvp": [{"feature": "Feature Name", "why": "why this is essential for MVP not a nice-to-have"}],
    "niceToHave": ["feature for v2", "feature for v2"]
  },
  "techStack": [{"name": "Tool Name", "purpose": "what it does in this project", "link": "https://exact-url.com", "beginnerFriendly": true}],
  "monetization": {
    "recommended": "best model name for this specific idea",
    "models": [{"model": "Model Name", "pros": "specific advantage", "cons": "specific disadvantage", "examplePrice": "$X/mo for Y tier"}]
  },
  "actionPlan": [
    {"step": 1, "title": "Step title", "description": "specific action", "link": "https://exact-url.com", "timeEstimate": "X hours", "beginnerNote": "plain english for someone who has never coded"}
  ]
}

Rules:
- techStack: 5-6 tools appropriate for a ${skillLevel} building a ${trackLabel}. Include direct links.
- competition.players: 3-4 real named competitors with real weaknesses.
- features.mvp: exactly 5 features. Be ruthless — only what is needed to get first paying customer.
- features.niceToHave: 4-5 items.
- monetization.models: 2-3 realistic models.
- actionPlan: 7-8 steps. For beginners start with account creation (GitHub, Vercel etc) with direct signup links. For developers start with technical setup. Every step must have a direct link. Include platformPage field with value "market" | "distribution" | "gaps" | "patents" where relevant.`
    }
    case 'market': {
      return `Market analysis for: "${input.query}". Return ONLY JSON: {"marketSize":"$XB","growthRate":"X% CAGR","maturity":"emerging|growing|mature","buyerType":"B2B|B2C|Both","players":[{"name":"Co","share":"X%","note":"one sentence"}],"gaps":[{"icon":"emoji","title":"Gap","desc":"2 sentences"}],"audience":{"primary":"who they are","painPoints":["pain1","pain2","pain3"],"willingToPay":"$X-Y/mo","whereTheyHangOut":["place1","place2","place3"]}}`
    }
    case 'distribution': {
      return `Distribution strategy for: "${input.desc}". Be specific. Return ONLY JSON: {"channels":[{"name":"specific channel","type":"Community|Media|Outreach|Partnership|Content","icon":"emoji","why":"2 sentences why this fits THIS product","action":"specific concrete action","contacts":["real contact or community name"]}]}` + ' (6 channels)'
    }
    case 'gaps': {
      return `Market gap analysis for "${input.sector}". Return ONLY JSON: {"opportunities":[{"score":87,"title":"specific title","summary":"2-3 sentences on the gap","targetUser":"specific user","whyNow":"why this gap exists today","buildComplexity":"low|medium|high","revenueModel":"how you'd charge","tags":["tag1","tag2","tag3"]}]}` + ' (6 opportunities)'
    }
    case 'patent': {
      return `Patent analysis for: "${input.invention}". Return ONLY JSON: {"patentType":"utility|design|plant","reasoning":"2 sentences","steps":[{"num":1,"title":"step title","desc":"2 sentence action","link":"https://... or null"}],"priorArtKeywords":["keyword1","keyword2","keyword3","keyword4"],"estimatedCost":"$X-Y","timeToProtection":"X months","patentability":"high|medium|low","patentabilityReason":"2 sentences"}`
    }
    case 'acquire': {
      return `Business acquisition analysis for: "${input.query}". Return ONLY JSON: {"listings":[{"name":"realistic business name","price":"$XXX,XXX","revenue":"$XX,XXX/yr","type":"SaaS|E-commerce|Service|Retail|Content","description":"2 sentences","greenFlags":["positive1","positive2"],"yellowFlags":["caution1"],"redFlags":["risk1"]}],"ddChecklist":["item1"],"valuationNote":"2 sentences","searchUrl":"https://www.bizbuysell.com/..."}` + ' (4 listings)'
    }
    case 'buildguide': {
      const track = input.track || 'software'
      const skillLevel = input.skillLevel || 'beginner'

      const trackInstructions: Record<string, string> = {
        software:
          'stack: 4-6 coding tools/frameworks with docs links. setupSteps: include exact terminal commands. keyFiles: code files to create. deploySteps: steps to deploy to Vercel or similar. resources: VS Code extensions with marketplace links.',
        invention:
          'stack: 4-6 materials, components, or suppliers needed (e.g. Arduino, 3D printing filament, specific sensors) with purchase/supplier links. setupSteps: prototyping steps — no terminal commands, use null for command field. keyFiles: key design files or documents to create (CAD files, schematics, BOM). deploySteps: manufacturing and production steps (finding a manufacturer, ordering parts, assembly). resources: useful tools and resources (patent search, supplier directories, prototyping services) with direct links.',
        business:
          'stack: 4-6 tools and software the business needs (e.g. Stripe, Shopify, QuickBooks, Mailchimp) with links. setupSteps: business setup steps (register LLC, open bank account, set up payment processing) — use null for command field unless a CLI is genuinely needed. keyFiles: key documents to create (business plan, service agreement, pricing sheet). deploySteps: launch steps (go live, announce, first customer acquisition). resources: useful business resources (legal templates, accounting tools, marketing platforms) with direct links.',
      }

      const stackLabel: Record<string, string> = {
        software: 'tech stack',
        invention: 'materials and components',
        business: 'tools and software',
      }

      const deployLabel: Record<string, string> = {
        software: 'deploy to production',
        invention: 'manufacturing and production steps',
        business: 'launch steps',
      }

      const resourceLabel: Record<string, string> = {
        software: 'recommended VS Code extensions with marketplace install links',
        invention: 'recommended tools, services, and resources with direct links',
        business: 'recommended resources, templates, and services with direct links',
      }

      return `Create a complete build guide for this ${track} idea: "${input.idea}". Builder skill level: ${skillLevel}.

Return ONLY valid JSON:
{
  "title": "Building [product name]",
  "overview": "2-3 sentences on what we are building and the approach",
  "estimatedTime": "X weeks to working MVP or first prototype",
  "stack": [
    {"name": "Name", "role": "what it does in this project", "why": "why this specifically", "link": "https://exact.com", "docsLink": "https://exact.com/docs", "cost": "Free / $X/mo or $X one-time", "beginnerNote": "plain english explanation"}
  ],
  "prerequisites": [
    {"title": "Action title", "description": "what this is and why needed", "link": "https://exact-url.com", "timeEstimate": "X min", "beginnerNote": "plain english"}
  ],
  "setupSteps": [
    {"step": 1, "title": "Step title", "description": "what to do", "link": "https://exact.com", "command": "exact command or null", "timeEstimate": "X min", "beginnerNote": "plain english explanation"}
  ],
  "keyFiles": [
    {"path": "filename or document name", "description": "what this is and what goes in it", "hint": "the most important thing to get right"}
  ],
  "deploySteps": [
    {"title": "Step title", "description": "exactly what to do", "link": "https://exact.com", "command": "command or null", "timeEstimate": "X min"}
  ],
  "vsCodeExtensions": [
    {"name": "Name", "id": "identifier", "why": "why useful", "link": "https://exact-direct-link.com"}
  ],
  "firstMilestone": "what you will have at the end of this guide",
  "estimatedMonthlyCost": "honest cost breakdown at launch"
}

Track-specific rules for ${track}: ${trackInstructions[track]}
For stack use ${stackLabel[track]}. For deploySteps use ${deployLabel[track]}. For vsCodeExtensions use ${resourceLabel[track]}.
prerequisites 3-5 items. setupSteps 6-8 steps. keyFiles 3-5 items — no code in JSON strings. All links must be real direct URLs.`
    }
    default:
      throw new Error(`Unknown analysis type: ${type}`)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { type, input, projectId } = body as { type: AnalysisType; input: Record<string, string>; projectId?: string }

    if (!type || !input) {
      return NextResponse.json({ error: 'Missing type or input' }, { status: 400 })
    }

    const allowed = await checkRateLimit(userId, 'analyze', 20)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Daily limit reached (20 analyses/day). Try again tomorrow.' },
        { status: 429 }
      )
    }

    const prompt = buildPrompt(type, input)
    const result = await callClaudeJSON<Record<string, unknown>>(prompt)

    // Save to Supabase
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        type,
        input,
        result,
        ...(projectId ? { project_id: projectId } : {}),
      })
      .select('id')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      // Continue even if save fails
    }

    return NextResponse.json({ result, id: data?.id })
  } catch (err) {
    console.error('Analyze error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
