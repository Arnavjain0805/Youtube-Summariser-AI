import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import type { ApiKey } from '../types'
import { Modal } from '../components/Modal'
import {
  CheckIcon,
  CopyIcon,
  KeyIcon,
  PlusIcon,
  SpinnerIcon,
  TrashIcon,
} from '../components/Icons'

export default function Developer() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [createdKey, setCreatedKey] = useState<{ key: string; name: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getKeys()
      setKeys(res.keys)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load API keys.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (creating) return
    setCreating(true)
    setError('')
    try {
      const res = await api.createKey(name || 'API Key')
      setCreatedKey({ key: res.key, name: name || 'API Key' })
      setName('')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create API key.')
    } finally {
      setCreating(false)
    }
  }

  const revoke = async (id: string) => {
    if (!window.confirm('Revoke this API key? Existing integrations will stop working.')) return
    try {
      await api.revokeKey(id)
      await load()
    } catch {
      setError('Failed to revoke API key.')
    }
  }

  const copyCreated = async () => {
    if (!createdKey) return
    try {
      await navigator.clipboard.writeText(createdKey.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <KeyIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Developer APIs
        </h1>
        <p className="mt-1 text-sm text-(--muted)">
          Generate B2B API keys to summarize videos programmatically. Keys are shown once and stored
          only as SHA-256 hashes.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Create */}
      <form
        onSubmit={create}
        className="flex flex-col gap-3 rounded-2xl border border-(--border) bg-(--panel) p-5 shadow-sm sm:flex-row sm:items-center"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name, e.g. Production / Staging"
          className="flex-1 rounded-xl border border-(--border) bg-(--bg) px-3.5 py-2.5 text-sm outline-none transition placeholder:text-(--muted) focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
        />
        <button
          type="submit"
          disabled={creating}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60"
        >
          {creating ? <SpinnerIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
          Create API key
        </button>
      </form>

      {/* List */}
      <section className="rounded-2xl border border-(--border) bg-(--panel) shadow-sm">
        <div className="border-b border-(--border) px-5 py-3 text-xs font-bold uppercase tracking-wider text-(--muted)">
          Your keys
        </div>
        {loading ? (
          <div className="flex items-center gap-2 px-5 py-8 text-sm text-(--muted)">
            <SpinnerIcon className="h-4 w-4" /> Loading…
          </div>
        ) : keys.length === 0 ? (
          <p className="px-5 py-8 text-sm text-(--muted)">
            No API keys yet. Create one to get started with the API.
          </p>
        ) : (
          <ul className="divide-y divide-(--border)">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{k.name}</span>
                    <code className="rounded bg-(--bg) px-1.5 py-0.5 text-[11px] text-(--muted)">
                      {k.prefix}
                    </code>
                    {k.revoked && (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500">
                        REVOKED
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-(--muted)">
                    {k.usageCount} calls
                    {k.lastUsedAt
                      ? ` · last used ${new Date(k.lastUsedAt).toLocaleString()}`
                      : ' · never used'}
                    {' · '}created {new Date(k.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => void revoke(k.id)}
                  disabled={k.revoked}
                  className="rounded-lg p-2 text-(--muted) transition hover:text-red-500 disabled:opacity-40"
                  aria-label="Revoke key"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Docs */}
      <section className="rounded-2xl border border-(--border) bg-(--panel) p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-(--muted)">
          How to call the API
        </h2>
        <p className="mb-3 text-sm text-(--muted)">
          Send the key via <code className="rounded bg-(--bg) px-1 py-0.5 text-xs">Authorization: Bearer</code> or{' '}
          <code className="rounded bg-(--bg) px-1 py-0.5 text-xs">x-api-key</code>. The endpoint
          updates usage stats and returns a structured summary.
        </p>
        <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-200 dark:bg-black/40">
          <code>{`curl -X POST https://<worker>/api/v1/summarize \\
  -H "Authorization: Bearer yt_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "tone": "Bullet points"}'`}</code>
        </pre>
      </section>

      {/* One-time key modal */}
      <Modal open={createdKey !== null} onClose={() => setCreatedKey(null)} title="API key created">
        <p className="mb-3 text-sm text-(--muted)">
          Copy your key now — for security only a hash is stored, so this is the{' '}
          <span className="font-semibold text-red-500">only time</span> it is shown.
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-(--border) bg-(--bg) p-3">
          <code className="flex-1 break-all text-sm">{createdKey?.key}</code>
          <button
            onClick={copyCreated}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <button
          onClick={() => setCreatedKey(null)}
          className="mt-4 w-full rounded-xl border border-(--border) px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:hover:bg-white/10"
        >
          Done
        </button>
      </Modal>
    </div>
  )
}
