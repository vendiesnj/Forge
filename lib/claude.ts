import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function callClaude(prompt: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
  return content.text
}

export async function callClaudeJSON<T>(prompt: string): Promise<T> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system:
      'You are a JSON API. Return only valid, complete JSON with no markdown, no code fences, no explanation. ' +
      'Start your response directly with { and end with }. ' +
      'All string values must be properly escaped: use \\n for newlines, \\" for quotes inside strings. ' +
      'Never include raw newlines or control characters inside string values.',
    messages: [
      { role: 'user', content: prompt },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  const raw = content.text.trim()

  try {
    return JSON.parse(raw) as T
  } catch {
    // Last resort: find the outermost { } block
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0]) as T
      } catch {
        // ignored
      }
    }
    console.error('Claude JSON parse failed. Raw response (first 500 chars):', raw.slice(0, 500))
    throw new Error('Failed to parse JSON from Claude response')
  }
}
