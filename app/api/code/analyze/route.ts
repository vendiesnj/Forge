import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { callClaudeJSON } from '@/lib/claude'
import { checkRateLimit } from '@/lib/rate-limit'

interface AnalyzeBody {
  files: { path: string; content: string }[]
  projectName?: string
  projectIdea?: string
}

interface Feature {
  name: string
  description: string
  files: string[]
}

interface SuggestedFeature {
  name: string
  description: string
  why: string
  complexity: 'low' | 'medium' | 'high'
  prompt: string
}

interface AnalyzeResult {
  currentFeatures: Feature[]
  suggestedFeatures: SuggestedFeature[]
  techStack: string[]
  summary: string
  maturity: 'early' | 'solid' | 'mature'
  maturityMessage: string
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = await checkRateLimit(userId, 'code_analyze', 5)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Daily limit reached (5 code analyses/day). Try again tomorrow.' },
      { status: 429 }
    )
  }

  const body = await req.json() as AnalyzeBody
  const { files, projectName = 'this project', projectIdea = '' } = body

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  const fileContext = files
    .slice(0, 40)
    .map(f => `### ${f.path}\n\`\`\`\n${f.content.slice(0, 2000)}\n\`\`\``)
    .join('\n\n')

  const prompt = `You are a senior engineer doing an honest code review of a project called "${projectName}"${projectIdea ? ` — described as: "${projectIdea}"` : ''}.

Here are the project files:

${fileContext}

Your job is to:
1. Map every meaningful feature that ALREADY EXISTS in this codebase
2. Honestly assess how complete and well-built the project is
3. Only suggest features that are GENUINELY missing — not things that exist but you missed, not generic "nice to haves"

Return JSON with this exact structure:
{
  "currentFeatures": [
    {
      "name": "Feature name",
      "description": "What it does in 1-2 sentences",
      "files": ["src/components/Foo.tsx", "app/api/foo/route.ts"]
    }
  ],
  "suggestedFeatures": [
    {
      "name": "Feature name",
      "description": "What it would do in 1-2 sentences",
      "why": "Specific reason this is missing and would add real value — not a generic reason",
      "complexity": "low",
      "prompt": "Exact Claude Code prompt referencing actual file names and tech stack in this repo"
    }
  ],
  "techStack": ["Next.js", "Supabase", "TypeScript"],
  "summary": "One honest sentence describing what this app does and where it is in development",
  "maturity": "solid",
  "maturityMessage": "Honest 1-2 sentence assessment of the project's current state"
}

CRITICAL RULES for currentFeatures:
- Be thorough. Read every file carefully. A feature that exists in the code must appear here.
- Include auth flows, API routes, UI components, integrations, data models — everything user-facing.
- Aim for 6-15 features. More is better than fewer.

CRITICAL RULES for suggestedFeatures:
- Before suggesting anything, verify it is NOT already in the codebase. If it exists anywhere, do NOT suggest it.
- Only suggest things that are clearly absent AND would make a meaningful difference to users.
- If the project is well-built with few obvious gaps, return 0-3 suggestions. Do not pad with weak ideas.
- If the project is early-stage with many missing pieces, return up to 6 suggestions.
- Never suggest: generic "add tests", "add logging", "improve performance", "add more error handling" unless there is a specific, egregious gap.
- Every suggestion must reference specific files or patterns from THIS codebase in the prompt.

maturity values:
- "early": basic scaffold, many core features missing
- "solid": core features built, some polish/extensions missing
- "mature": well-built, feature-complete for its scope, few meaningful gaps

maturityMessage: Be direct and honest. If it's mature, say so proudly. If it's early, be encouraging but honest.`

  const result = await callClaudeJSON<AnalyzeResult>(prompt)

  return NextResponse.json(result)
}
