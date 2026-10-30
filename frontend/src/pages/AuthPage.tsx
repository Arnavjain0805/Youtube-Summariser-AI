import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api, ApiError, API_URL } from '../lib/api'
import { LogoMark, SpinnerIcon } from '../components/Icons'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register(name, email, password)
      signIn(res.token, res.user)
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please retry.')
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-(--border) bg-(--bg) px-3.5 py-2.5 text-sm outline-none transition placeholder:text-(--muted) focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30'

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-blue-600 text-white shadow-xl shadow-blue-600/25">
            <LogoMark className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">YouTube Summarizer AI</h1>
          <p className="mt-1 text-sm text-(--muted)">
            Turn any video into a structured summary and chat with it.
          </p>
        </div>

        <div className="rounded-2xl border border-(--border) bg-(--panel) p-6 shadow-xl shadow-black/5">
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-(--bg) p-1">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  setError('')
                }}
                className={`rounded-lg py-2 text-sm font-semibold transition ${
                  mode === m
                    ? 'bg-(--panel) text-(--text) shadow'
                    : 'text-(--muted) hover:text-(--text)'
                }`}
              >
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <input
                className={inputClass}
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            )}
            <input
              className={inputClass}
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              className={inputClass}
              type="password"
              placeholder="Password (min 8 characters)"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60"
            >
              {busy && <SpinnerIcon className="h-4 w-4" />}
              {mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-(--muted)">
            <div className="h-px flex-1 bg-(--border)" /> or continue with
            <div className="h-px flex-1 bg-(--border)" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <a
              href={`${API_URL}/api/auth/google`}
              className="flex items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--bg) px-3 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
                />
              </svg>
              Google
            </a>
            <a
              href={`${API_URL}/api/auth/github`}
              className="flex items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--bg) px-3 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M12 .5A11.5 11.5 0 0 0 .5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-1.94c-3.2.7-3.87-1.54-3.87-1.54-.53-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12v3.15c0 .3.21.67.8.55A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-(--muted)">
          Powered by Cloudflare Workers · Turso · LLM at the edge
        </p>
      </div>
    </div>
  )
}
