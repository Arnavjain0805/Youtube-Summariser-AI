export class YtError extends Error {
  constructor(message: string, public code = 'YT_ERROR') {
    super(message)
  }
}

export interface TranscriptEnv {
  APIFY_API_TOKEN: string
}

export interface VideoInfo {
  videoId: string
  title: string
  channel: string
  thumbnail: string
  durationSeconds: number | null
  publishDate: string | null
  transcript: string
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

export function extractVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed
  const patterns = [
    /youtube\.com\/watch\?[^#]*v=([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
  ]
  for (const p of patterns) {
    const m = trimmed.match(p)
    if (m) return m[1]
  }
  return null
}

/** Extract the balanced JSON object that starts after `marker`. */
function extractJsonAfter(html: string, marker: string): string | null {
  const idx = html.indexOf(marker)
  if (idx === -1) return null
  const start = html.indexOf('{', idx)
  if (start === -1) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < html.length; i++) {
    const ch = html[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
    } else if (ch === '"') inStr = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return html.slice(start, i + 1)
    }
  }
  return null
}

/** Extract the transcript from an Apify youtube-transcript-api dataset item. */
function transcriptFromDatasetItem(item: Record<string, any>): string {
  const raw = item.fullText ?? item.text ?? item.transcript
  if (typeof raw !== 'string' || !raw.trim()) return ''
  return raw.replace(/\s+/g, ' ').trim()
}

async function fetchTranscriptViaApify(env: TranscriptEnv, videoUrl: string): Promise<string> {
  // Switched to residential proxy actor to bypass YouTube blocks
  const endpoint = `https://api.apify.com/v2/acts/akash9078~youtube-transcript-extractor/run-sync-get-dataset-items?token=${env.APIFY_API_TOKEN}`
  
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      videoUrl: videoUrl // Uses specific videoUrl key instead of array
    }),
  })
  
  if (!res.ok) {
    throw new YtError(`Apify transcript API returned HTTP ${res.status}.`, 'YT_APIFY_FAILED')
  }
  
  const data = (await res.json()) as unknown
  const items = Array.isArray(data) ? data : []
  
  if (!items.length) {
    throw new YtError(
      'No transcript available for this video. It may be disabled by the uploader.',
      'YT_NO_TRANSCRIPT',
    )
  }
  
  const transcript = transcriptFromDatasetItem(items[0] as Record<string, any>)
  if (!transcript) {
    throw new YtError('Apify returned no transcript text for this video.', 'YT_NO_TRANSCRIPT')
  }
  
  return transcript
}

export async function fetchYoutubeVideo(
  env: TranscriptEnv,
  urlOrId: string,
): Promise<VideoInfo> {
  const videoId = extractVideoId(urlOrId)
  if (!videoId) {
    throw new YtError('Could not parse a YouTube video ID from that input.', 'YT_INVALID_URL')
  }

  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
  })
  if (!pageRes.ok) {
    throw new YtError(`YouTube returned HTTP ${pageRes.status} for this video.`, 'YT_FETCH_FAILED')
  }
  const html = await pageRes.text()

  const raw = extractJsonAfter(html, 'ytInitialPlayerResponse')
  if (!raw) throw new YtError('Could not find player data. The video may be unavailable.', 'YT_NO_DATA')

  let player: any
  try {
    player = JSON.parse(raw)
  } catch {
    throw new YtError('Failed to parse YouTube player data.', 'YT_PARSE_FAILED')
  }

  const playability = player.playabilityStatus?.status
  const vd = player.videoDetails

  // --- metadata (videoDetails, then microformat, then oEmbed) ---
  let title = ''
  let channel = ''
  let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  let duration: number | null = null
  let publish: string | null = null

  if (vd) {
    title = vd.title ?? 'Untitled'
    channel = vd.author ?? ''
    duration = vd.lengthSeconds ? Number(vd.lengthSeconds) : null
    publish = vd.publishDate ?? null
    thumbnail =
      vd.thumbnail?.thumbnails?.at(-1)?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  } else if (player.microformat?.playerMicroformatRenderer) {
    const mf = player.microformat.playerMicroformatRenderer
    title = mf.title?.simpleText ?? mf.title?.runs?.map((r: any) => r.text).join('') ?? ''
    channel = mf.ownerChannelName ?? ''
    publish = mf.publishDate ?? null
  }

  if (!title) {
    try {
      const oembed = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(
          `https://www.youtube.com/watch?v=${videoId}`,
        )}&format=json`,
      )
      if (oembed.ok) {
        const d = (await oembed.json()) as Record<string, any>
        title = d.title ?? ''
        channel = d.author_name ?? ''
        thumbnail = d.thumbnail_url ?? thumbnail
      }
    } catch {
      // metadata fallback failed; keep empty title
    }
  }

  // --- transcript via Apify youtube-transcript-api actor ---
  if (playability && playability !== 'OK') {
    const reason = player.playabilityStatus?.reason || playability
    console.warn(`YouTube metadata blocked (${reason}), relying on Apify for transcript...`)
  }

  const transcript = await fetchTranscriptViaApify(
    env,
    `https://www.youtube.com/watch?v=${videoId}`,
  )

  return {
    videoId,
    title,
    channel,
    thumbnail,
    durationSeconds: duration,
    publishDate: publish,
    transcript,
  }
}

export function truncateTranscript(text: string, max = 60_000): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '… [truncated]'
}
