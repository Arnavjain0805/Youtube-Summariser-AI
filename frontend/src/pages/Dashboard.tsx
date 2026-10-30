import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useChats } from '../lib/chats'
import { usePreferences } from '../lib/preferences'
import type { Chat, ChatMessage } from '../types'
import { Markdown } from '../components/Markdown'
import {
  CheckIcon,
  CopyIcon,
  PlayIcon,
  SendIcon,
  SpinnerIcon,
  TrashIcon,
} from '../components/Icons'

const TONES = ['Bullet points', 'Detailed', 'Gen-Z', 'Formal'] as const

export default function Dashboard() {
  const { chatId } = useParams()
  const [chat, setChat] = useState<Chat | null>(null)
  const [loadingChat, setLoadingChat] = useState(false)
  const [url, setUrl] = useState('')
  const [summarizing, setSummarizing] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const { upsert, remove, refresh } = useChats()
  const { prefs } = usePreferences()
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chatId) {
      setChat(null)
      setError('')
      return
    }
    setLoadingChat(true)
    setError('')
    api
      .getChat(chatId)
      .then((res) => setChat(res.chat))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load this conversation.'),
      )
      .finally(() => setLoadingChat(false))
  }, [chatId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [chat?.messages, sending, loadingChat])

  const summarize = async (e: FormEvent) => {
    e.preventDefault()
    const target = url.trim()
    if (!target || summarizing) return
    setSummarizing(true)
    setError('')
    try {
      const res = await api.summarize(target, prefs.tone)
      setChat(res.chat)
      upsert(res.chat)
      setUrl('')
      navigate(`/chat/${res.chat.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to summarize. Please retry.')
    } finally {
      setSummarizing(false)
    }
  }

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault()
    if (!chat || !input.trim() || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)
    setError('')
    const optimistic: ChatMessage[] = [...chat.messages, { role: 'user', content }]
    setChat({ ...chat, messages: optimistic })
    try {
      const res = await api.sendMessage(chat.id, content)
      setChat((prev) => (prev ? { ...prev, messages: res.messages } : prev))
      void refresh()
    } catch (err) {
      setChat((prev) => (prev ? { ...prev, messages: optimistic } : prev))
      setError(err instanceof ApiError ? err.message : 'Failed to send message.')
      setInput(content)
    } finally {
      setSending(false)
    }
  }

  const deleteChat = useCallback(async () => {
    if (!chat) return
    if (!window.confirm('Delete this summary and its entire chat history?')) return
    try {
      await api.deleteChat(chat.id)
    } catch {
      // ignore
    }
    remove(chat.id)
    navigate('/')
  }, [chat, navigate, remove])

  if (loadingChat) {
    return (
      <div className="flex h-full items-center justify-center text-(--muted)">
        <SpinnerIcon className="h-6 w-6" /> &nbsp;Loading conversation…
      </div>
    )
  }

  if (!chat) {
    return (
      <EmptyState
        url={url}
        setUrl={setUrl}
        summarizing={summarizing}
        onSummarize={summarize}
        error={error}
      />
    )
  }

  const structured = chat.structured

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
          {/* Video card */}
          <VideoCard chat={chat} onDelete={deleteChat} />

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Summary */}
          <section className="rounded-2xl border border-(--border) bg-(--panel) p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-(--muted)">
                Summary · {chat.summaryTone}
              </h2>
              <CopyButton text={chat.summary} />
            </div>
            <Markdown content={chat.summary} />
          </section>

          {/* Structured insights */}
          {structured && (
            <section className="grid gap-4 sm:grid-cols-2">
              <InsightCard
                title="Overview"
                items={structured.overview ? [structured.overview] : []}
                variant="accent"
              />
              <InsightCard title="Key Insights" items={structured.keyInsights} />
              <InsightCard title="Key Takeaways" items={structured.keyTakeaways} />
              <InsightCard title="Action Items" items={structured.actionItems} />
              {structured.quotes.length > 0 && (
                <InsightCard title="Notable Quotes" items={structured.quotes} variant="quote" wide />
              )}
            </section>
          )}

          {/* Chat messages */}
          <section className="space-y-4 pt-2">
            {chat.messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            {sending && (
              <div className="flex items-center gap-2 pl-4 text-sm text-(--muted)">
                <SpinnerIcon className="h-4 w-4" /> Thinking…
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="border-t border-(--border) bg-(--panel) px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto flex max-w-3xl gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask a follow-up about "${chat.videoTitle.slice(0, 40)}…"`}
            className="flex-1 rounded-xl border border-(--border) bg-(--bg) px-4 py-2.5 text-sm outline-none transition placeholder:text-(--muted) focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-50"
            aria-label="Send message"
          >
            {sending ? <SpinnerIcon className="h-5 w-5" /> : <SendIcon className="h-5 w-5" />}
          </button>
        </div>
      </form>
    </div>
  )
}

function EmptyState({
  url,
  setUrl,
  summarizing,
  onSummarize,
  error,
}: {
  url: string
  setUrl: (v: string) => void
  summarizing: boolean
  onSummarize: (e: FormEvent) => void
  error: string
}) {
  const { prefs, save } = usePreferences()
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-4">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-blue-600 text-white shadow-xl shadow-blue-600/25">
          <PlayIcon className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">Summarize any YouTube video</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-(--muted)">
          Paste a link, and the agent fetches the transcript, generates a structured summary,
          and lets you ask follow-up questions about the video.
        </p>

        <form onSubmit={onSummarize} className="mt-6 space-y-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            className="w-full rounded-2xl border border-(--border) bg-(--panel) px-5 py-3.5 text-sm shadow-sm outline-none transition placeholder:text-(--muted) focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
          />

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-medium text-(--muted)">Summary tone:</span>
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => void save({ tone: t })}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  prefs.tone === t
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-(--border) bg-(--panel) text-(--muted) hover:text-(--text)'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={summarizing || !url.trim()}
            className="mx-auto flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-50"
          >
            {summarizing ? (
              <>
                <SpinnerIcon className="h-4 w-4" /> Fetching transcript & summarizing…
              </>
            ) : (
              'Generate Summary'
            )}
          </button>
        </form>

        {error && (
          <div className="mx-auto mt-4 max-w-md rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

function VideoCard({ chat, onDelete }: { chat: Chat; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-(--border) bg-(--panel) p-4 shadow-sm">
      {chat.thumbnailUrl ? (
        <img
          src={chat.thumbnailUrl}
          alt=""
          className="h-16 w-28 shrink-0 rounded-lg object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg bg-black/10 text-(--muted) dark:bg-white/10">
          <PlayIcon className="h-6 w-6" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug">{chat.videoTitle}</h2>
        <p className="mt-0.5 text-xs text-(--muted)">{chat.channelName ?? 'YouTube'}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <a
          href={chat.videoUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-(--border) px-3 py-2 text-xs font-medium transition hover:bg-black/5 dark:hover:bg-white/10"
        >
          Watch
        </a>
        <button
          onClick={onDelete}
          className="rounded-lg p-2 text-(--muted) transition hover:text-red-500"
          aria-label="Delete chat"
        >
          <TrashIcon className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  )
}

function InsightCard({
  title,
  items,
  variant = 'default',
  wide,
}: {
  title: string
  items: string[]
  variant?: 'default' | 'accent' | 'quote'
  wide?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border border-(--border) bg-(--panel) p-4 shadow-sm ${
        wide ? 'sm:col-span-2' : ''
      }`}
    >
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-(--muted)">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-(--muted)">—</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li
              key={i}
              className={`flex gap-2 text-sm leading-relaxed ${
                variant === 'accent'
                  ? 'text-blue-700 dark:text-blue-300'
                  : variant === 'quote'
                    ? 'italic text-(--muted)'
                    : 'text-(--text)'
              }`}
            >
              {variant === 'quote' ? (
                <span className="select-none text-(--muted)">“</span>
              ) : (
                <span className="mt-0.5 select-none text-blue-600 dark:text-blue-400">•</span>
              )}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
          isUser
            ? 'rounded-br-md bg-blue-600 text-white'
            : 'rounded-bl-md border border-(--border) bg-(--panel)'
        }`}
      >
        {isUser ? <p className="whitespace-pre-wrap">{message.content}</p> : <Markdown content={message.content} />}
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // clipboard unavailable
    }
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 rounded-lg border border-(--border) px-2.5 py-1.5 text-[11px] font-medium text-(--muted) transition hover:text-(--text)"
    >
      {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
