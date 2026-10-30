export interface User {
  id: string
  email: string
  name: string | null
  provider: string
  avatar_url?: string | null
  created_at?: string
}

export interface ChatMeta {
  id: string
  videoId: string
  videoTitle: string
  videoUrl: string
  thumbnailUrl: string | null
  channelName: string | null
  summaryTone: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
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

export interface Chat extends ChatMeta {
  transcript: string
  summary: string
  structured?: StructuredSummary
  messages: ChatMessage[]
}

export interface Preferences {
  tone: string
  theme: 'dark' | 'light'
}

export interface ApiKey {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsedAt: string | null
  usageCount: number
  revoked: boolean
}

export interface AuthResponse {
  token: string
  user: User
}
