import type { Env } from '../env'

export class LlmError extends Error {
  constructor(message: string, public status = 502) {
    super(message)
  }
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StructuredSummary {
  summary: string
  overview: string
  keyInsights: string[]
  keyTakeaways: string[]
  actionItems: string[]
  quotes: string[]
}

export const TONES = ['Bullet points', 'Detailed', 'Gen-Z', 'Formal'] as const
export type Tone = (typeof TONES)[number]

export function toneSystemPrompt(tone: Tone): string {
  switch (tone) {
    case 'Detailed':
      return 'Write the summary in a thorough, detailed style. Use clear section headings, expand on important concepts, and explain context so someone who has not watched the video fully understands it.'
    case 'Gen-Z':
      return 'Write the summary in a casual, energetic Gen-Z tone: short punchy sentences, relatable phrasing, mild enthusiasm, and sparingly used emoji. Stay accurate to the source content.'
    case 'Formal':
      return 'Write the summary in a professional, formal register. Use precise language, neutral tone, and well-structured paragraphs suitable for a business or academic report.'
    default:
      return 'Write the summary as concise bullet points. Capture the most important ideas efficiently. Use short, skimmable bullets with a brief intro line.'
  }
}

export async function chatCompletion(
  env: Env,
  messages: LlmMessage[],
  opts: { maxTokens?: number; json?: boolean } = {},
): Promise<string> {
  if (!env.LLM_API_KEY) {
    throw new LlmError('LLM_API_KEY is not configured.', 500)
  }
  const base = (env.LLM_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = env.LLM_MODEL ?? 'gpt-4o-mini'

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: opts.maxTokens ?? 4096,
      response_format: opts.json ? { type: 'json_object' } : undefined,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new LlmError(`LLM API error ${res.status}: ${body.slice(0, 300)}`, 502)
  }

  const data: any = await res.json()
  const content: string | undefined = data.choices?.[0]?.message?.content
  if (!content) throw new LlmError('LLM returned an empty response.', 502)
  return content
}

function stripCodeFences(s: string): string {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  return m ? m[1] : s
}

export function parseStructured(raw: string): StructuredSummary {
  const fallback: StructuredSummary = {
    summary: raw,
    overview: '',
    keyInsights: [],
    keyTakeaways: [],
    actionItems: [],
    quotes: [],
  }
  try {
    const parsed = JSON.parse(stripCodeFences(raw.trim()))
    if (typeof parsed !== 'object' || parsed === null) return fallback
    const asArray = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : [])
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : fallback.summary,
      overview: typeof parsed.overview === 'string' ? parsed.overview : '',
      keyInsights: asArray(parsed.keyInsights),
      keyTakeaways: asArray(parsed.keyTakeaways),
      actionItems: asArray(parsed.actionItems),
      quotes: asArray(parsed.quotes),
    }
  } catch {
    return fallback
  }
}
