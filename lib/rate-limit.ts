import { createServiceClient } from '@/lib/supabase/server'

/**
 * Checks if a user is within their rate limit for a given action.
 * Logs the usage if allowed.
 * Returns true if the request should proceed, false if rate limited.
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  limit: number,
  windowHours = 24
): Promise<boolean> {
  const supabase = createServiceClient()
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString()

  const { count } = await supabase
    .from('api_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', since)

  if ((count ?? 0) >= limit) return false

  // Log usage fire-and-forget — don't block the request on this
  supabase
    .from('api_usage')
    .insert({ user_id: userId, action })
    .then(() => {})
    .catch(() => {})

  return true
}
