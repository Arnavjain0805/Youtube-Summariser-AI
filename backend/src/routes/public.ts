import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { createDb } from '../db'
import { apiKeyAuth } from '../middleware/apiKey'
import { fetchYoutubeVideo, truncateTranscript } from '../lib/youtube'
import {
  chatCompletion,
  parseStructured,
  TONES,
  toneSystemPrompt,
  type Tone,
} from '../lib/llm'

export const publicRoutes = new Hono<AppEnv>()

publicRoutes.get('/health', (c) => c.json({ status: 'ok' }))

publicRoutes.post('/summarize', apiKeyAuth, async (c) => {
  const key = c.get('key')
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  const url = typeof body?.url === 'string' ? body.url : ''
  if (!url) return c.json({ error: 'The "url" field is required.' }, 400)

  let tone = (typeof body?.tone === 'string' ? body.tone : '') as Tone
  if (!TONES.includes(tone)) {
    const db = createDb(c.env)
    try {
      const rows = await db.execute({
        sql: 'SELECT tone FROM user_preferences WHERE user_id = ?',
        args: [key.user_id],
      })
      tone = (rows.rows[0]?.tone as Tone) || 'Bullet points'
      if (!TONES.includes(tone)) tone = 'Bullet points'
    } finally {
      db.close()
    }
  }

  const video = await fetchYoutubeVideo(c.env, url)

  const system = [
    'You are an expert YouTube video analyst. Produce a structured summary of the transcript.',
    `Video title: ${video.title}`,
    `Channel: ${video.channel}`,
    toneSystemPrompt(tone),
    'Respond with ONLY valid JSON, no markdown fences, exactly matching this schema:',
    JSON.stringify({
      summary: 'full markdown summary in the requested tone',
      overview: '2-3 sentence high-level overview',
      keyInsights: ['4-6 insights'],
      keyTakeaways: ['4-6 takeaways'],
      actionItems: ['1-4 actionable items'],
      quotes: ['1-3 short direct quotes'],
    }),
  ].join('\n')

  const raw = await chatCompletion(
    c.env,
    [
      { role: 'system', content: system },
      { role: 'user', content: `Transcript:\n${truncateTranscript(video.transcript)}` },
    ],
    { json: true },
  )
  const structured = parseStructured(raw)

  return c.json({
    video: {
      id: video.videoId,
      title: video.title,
      url: `https://www.youtube.com/watch?v=${video.videoId}`,
      thumbnailUrl: video.thumbnail,
      channelName: video.channel,
      durationSeconds: video.durationSeconds,
      publishDate: video.publishDate,
    },
    summary: structured.summary,
    overview: structured.overview,
    keyInsights: structured.keyInsights,
    keyTakeaways: structured.keyTakeaways,
    actionItems: structured.actionItems,
    quotes: structured.quotes,
    meta: {
      apiKey: key.name,
      tone,
      model: c.env.LLM_MODEL ?? 'gpt-4o-mini',
      usageCount: key.usage_count + 1,
    },
  })
})
