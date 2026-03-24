export type Track = 'software' | 'invention' | 'business'
export type AnalysisType = 'idea' | 'market' | 'distribution' | 'gaps' | 'patent' | 'acquire' | 'buildguide'
export type Competition = 'low' | 'medium' | 'high'
export type Difficulty = 'low' | 'medium' | 'hard'
export type Maturity = 'emerging' | 'growing' | 'mature'
export type BuyerType = 'B2B' | 'B2C' | 'Both'
export type Patentability = 'high' | 'medium' | 'low'
export type BuildComplexity = 'low' | 'medium' | 'high'
export type RequestStatus = 'open' | 'closed' | 'filled'
export type SubmissionStatus = 'pending' | 'viewed' | 'accepted' | 'rejected'
export type SkillLevel = 'beginner' | 'intermediate' | 'developer'
export type Stage = 'idea' | 'building' | 'built'
export type ListingType = 'acquisition' | 'investment' | 'partnership' | 'showcase'
export type ListingStatus = 'draft' | 'active' | 'closed'
export type UserRole = 'builder' | 'org'

export interface UserProfile {
  id: string
  user_id: string
  skill_level: SkillLevel
  role: UserRole
  created_at: string
}

export interface IdeaAnalysis {
  productName: string
  tagline: string
  score: number
  verdict: string
  redFlags: string[]
  market: {
    size: string
    growth: string
    timing: string
    barrierToEntry: Competition
    barrierExplanation: string
  }
  audience: {
    primary: string
    painPoints: string[]
    willingToPay: string
    whereTheyHangOut: string[]
    earlyAdopters: string
  }
  competition: {
    level: Competition
    players: Array<{ name: string; weakness: string; marketShare: string }>
    yourEdge: string
  }
  features: {
    mvp: Array<{ feature: string; why: string }>
    niceToHave: string[]
  }
  techStack: Array<{
    name: string
    purpose: string
    link: string
    beginnerFriendly: boolean
  }>
  monetization: {
    recommended: string
    models: Array<{ model: string; pros: string; cons: string; examplePrice: string }>
  }
  actionPlan: Array<{
    step: number
    title: string
    description: string
    link?: string
    platformPage?: string
    timeEstimate: string
    beginnerNote?: string
  }>
}

export interface MarketAnalysis {
  marketSize: string
  growthRate: string
  maturity: Maturity
  buyerType: BuyerType
  players: Array<{ name: string; share: string; note: string }>
  gaps: Array<{ icon: string; title: string; desc: string }>
  audience: {
    primary: string
    painPoints: string[]
    willingToPay: string
    whereTheyHangOut: string[]
  }
}

export interface DistributionAnalysis {
  channels: Array<{
    name: string
    type: string
    icon: string
    why: string
    action: string
    contacts: string[]
  }>
}

export interface GapsAnalysis {
  opportunities: Array<{
    score: number
    title: string
    summary: string
    targetUser: string
    whyNow: string
    buildComplexity: BuildComplexity
    revenueModel: string
    tags: string[]
  }>
}

export interface PatentAnalysis {
  patentType: string
  reasoning: string
  steps: Array<{ num: number; title: string; desc: string; link: string | null }>
  priorArtKeywords: string[]
  estimatedCost: string
  timeToProtection: string
  patentability: Patentability
  patentabilityReason: string
}

export interface AcquireAnalysis {
  listings: Array<{
    name: string
    price: string
    revenue: string
    type: string
    description: string
    greenFlags: string[]
    yellowFlags: string[]
    redFlags: string[]
  }>
  ddChecklist: string[]
  valuationNote: string
  searchUrl: string
}

export interface BuildRequest {
  id: string
  user_id: string
  title: string
  description: string
  budget: string
  category: string
  deadline_days: number
  anonymous: boolean
  demo_required: boolean
  notify_on_submission: boolean
  company_name: string | null
  status: RequestStatus
  featured: boolean
  tags: string[]
  created_at: string
  expires_at: string
}

export interface Submission {
  id: string
  request_id: string
  user_id: string
  demo_url: string
  source_url: string | null
  description: string
  status: SubmissionStatus
  created_at: string
}

export interface BuildGuide {
  title: string
  overview: string
  estimatedTime: string
  firstMilestone: string
  estimatedMonthlyCost: string
  stack: Array<{ name: string; role: string; why: string; link: string; docsLink: string; cost: string; beginnerNote: string }>
  prerequisites: Array<{ title: string; description: string; link: string; timeEstimate: string; beginnerNote: string }>
  setupSteps: Array<{ step: number; title: string; description: string; link: string; command: string | null; timeEstimate: string; beginnerNote: string }>
  keyFiles: Array<{ path: string; description: string; hint: string }>
  deploySteps: Array<{ title: string; description: string; link: string; command: string | null; timeEstimate: string }>
  vsCodeExtensions: Array<{ name: string; id: string; why: string; link: string }>
}

export interface Project {
  id: string
  user_id: string
  name: string
  idea: string
  track: Track
  stage: Stage
  app_url: string | null
  steps_completed: string[]
  github_repo: string | null
  vercel_url: string | null
  feature_suggestions: Record<string, unknown> | null
  created_at: string
}

export interface Analysis {
  id: string
  user_id: string
  type: AnalysisType
  input: Record<string, string>
  result: Record<string, unknown>
  created_at: string
}

export interface MarketplaceListing {
  id: string
  user_id: string
  name: string
  tagline: string | null
  description: string | null
  url: string | null
  logo_url: string | null
  arr: string | null
  mrr: string | null
  customers: string | null
  team_size: string | null
  founded_year: string | null
  tech_stack: string[]
  key_features: string[]
  pricing_model: string | null
  target_market: string | null
  traction: string | null
  asking_price: string | null
  listing_type: ListingType
  status: ListingStatus
  contact_email: string | null
  ai_summary: Record<string, unknown> | null
  created_at: string
}
