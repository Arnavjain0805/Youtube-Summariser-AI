import { Hono } from 'hono'
import type { Context } from 'hono'
import type { AppEnv } from '../types'
import { createDb } from '../db'
import { jwtAuth } from '../middleware/auth'
import { fetchYoutubeVideo, truncateTranscript } from '../lib/youtube'
import {
  chatCompletion,
  parseStructured,
  TONES,
  toneSystemPrompt,
  type Tone,
} from '../lib/llm'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRow {
  id: string
  user_id: string
  video_id: string
  video_title: string
  video_url: string
  thumbnail_url: string | null
  channel_name: string | null
  transcript: string
  summary: string
  summary_tone: string
  structured: string | null
  messages: string
  created_at: string
  updated_at: string
}

function toChatMeta(row: ChatRow) {
  return {
    id: row.id,
    videoId: row.video_id,
    videoTitle: row.video_title,
    videoUrl: row.video_url,
    thumbnailUrl: row.thumbnail_url,
    channelName: row.channel_name,
    summaryTone: row.summary_tone ?? 'Bullet points',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toChat(row: ChatRow) {
  let messages: ChatMessage[] = []
  try {
    messages = JSON.parse(row.messages ?? '[]')
  } catch {
    messages = []
  }
  let structured: unknown = undefined
  try {
    structured = row.structured ? JSON.parse(row.structured) : undefined
  } catch {
    structured = undefined
  }
  return { ...toChatMeta(row), transcript: row.transcript, summary: row.summary, structured, messages }
}

export const chatsRoutes = new Hono<AppEnv>()

async function resolveTone(
  c: Context<AppEnv>,
  userId: string,
  requested?: string,
): Promise<Tone> {
  const db = createDb(c.env)
  try {
    let tone = (requested ?? '').trim() as Tone
    if (!TONES.includes(tone)) {
      const rows = await db.execute({
        sql: 'SELECT tone FROM user_preferences WHERE user_id = ?',
        args: [userId],
      })
      tone = (rows.rows[0]?.tone as Tone) || 'Bullet points'
      if (!TONES.includes(tone)) tone = 'Bullet points'
    }
    return tone
  } finally {
    db.close()
  }
}

chatsRoutes.post('/', jwtAuth, async (c) => {
  const user = c.get('user')
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  const url = typeof body?.url === 'string' ? body.url : ''
  if (!url) return c.json({ error: 'A YouTube URL is required.' }, 400)

  const tone = await resolveTone(c, user.sub, typeof body?.tone === 'string' ? body.tone : undefined)

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

  const chatId = crypto.randomUUID()
  const now = new Date().toISOString()
  const messages: ChatMessage[] = [
    { role: 'user', content: `Summarize this video: ${video.title}` },
    { role: 'assistant', content: structured.summary },
  ]

  const db = createDb(c.env)
  try {
    await db.execute({
      sql: `INSERT INTO chats (id, user_id, video_id, video_title, video_url, thumbnail_url, channel_name, transcript, summary, summary_tone, structured, messages, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        chatId,
        user.sub,
        video.videoId,
        video.title,
        `https://www.youtube.com/watch?v=${video.videoId}`,
        video.thumbnail,
        video.channel,
        video.transcript,
        structured.summary,
        tone,
        JSON.stringify(structured),
        JSON.stringify(messages),
        now,
        now,
      ],
    })
    const rows = await db.execute({
      sql: 'SELECT * FROM chats WHERE id = ?',
      args: [chatId],
    })
    return c.json({ chat: toChat(rows.rows[0] as unknown as ChatRow) }, 201)
  } finally {
    db.close()
  }
})

chatsRoutes.get('/', jwtAuth, async (c) => {
  const db = createDb(c.env)
  try {
    const rows = await db.execute({
      sql: `SELECT id, user_id, video_id, video_title, video_url, thumbnail_url, channel_name,
                   summary_tone, structured, messages, transcript, summary,
                   created_at, updated_at
            FROM chats WHERE user_id = ? ORDER BY updated_at DESC`,
      args: [c.get('user').sub],
    })
    return c.json({ chats: rows.rows.map((r) => toChatMeta(r as unknown as ChatRow)) })
  } finally {
    db.close()
  }
})

chatsRoutes.get('/:id', jwtAuth, async (c) => {
  const db = createDb(c.env)
  try {
    const rows = await db.execute({
      sql: 'SELECT * FROM chats WHERE id = ? AND user_id = ?',
      args: [c.req.param('id')!, c.get('user').sub],
    })
    if (rows.rows.length === 0) return c.json({ error: 'Chat not found.' }, 404)
    return c.json({ chat: toChat(rows.rows[0] as unknown as ChatRow) })
  } finally {
    db.close()
  }
})

chatsRoutes.post('/:id/messages', jwtAuth, async (c) => {
  const user = c.get('user')
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  if (!content) return c.json({ error: 'Message content is required.' }, 400)

  const db = createDb(c.env)
  let chat: Record<string, any>
  try {
    const rows = await db.execute({
      sql: 'SELECT * FROM chats WHERE id = ? AND user_id = ?',
      args: [c.req.param('id')!, user.sub],
    })
    if (rows.rows.length === 0) return c.json({ error: 'Chat not found.' }, 404)
    chat = rows.rows[0] as Record<string, any>
  } finally {
    db.close()
  }

  let messages: ChatMessage[] = []
  try {
    messages = JSON.parse(chat.messages ?? '[]')
  } catch {
    messages = []
  }
  messages.push({ role: 'user', content })

  const system = [
    `You are a helpful assistant answering questions about the YouTube video "${chat.video_title}" by ${chat.channel_name ?? 'an unknown channel'}.`,
    'Answer using the transcript and the initial summary below. Be concise and accurate.',
    'If the answer is not covered by the transcript, say so clearly instead of guessing.',
    `Transcript:\n${truncateTranscript(chat.transcript ?? '')}`,
    `Initial summary (tone: ${chat.summary_tone ?? 'Bullet points'}):\n${chat.summary ?? ''}`,
  ].join('\n\n')

  const history = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }))
  const reply = await chatCompletion(c.env, [
    { role: 'system', content: system },
    ...history,
  ])
  messages.push({ role: 'assistant', content: reply })

  const db2 = createDb(c.env)
  try {
    await db2.execute({
      sql: 'UPDATE chats SET messages = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      args: [JSON.stringify(messages), new Date().toISOString(), c.req.param('id')!, user.sub],
    })
  } finally {
    db2.close()
  }

  return c.json({ messages })
})

chatsRoutes.delete('/:id', jwtAuth, async (c) => {
  const db = createDb(c.env)
  try {
    const res = await db.execute({
      sql: 'DELETE FROM chats WHERE id = ? AND user_id = ?',
      args: [c.req.param('id')!, c.get('user').sub],
    })
    if (res.rowsAffected === 0) return c.json({ error: 'Chat not found.' }, 404)
    return c.json({ ok: true })
  } finally {
    db.close()
  }
})

