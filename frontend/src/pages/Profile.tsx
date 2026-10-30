import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { LogoutIcon, SpinnerIcon } from '../components/Icons'

const inputClass =
  'w-full rounded-xl border border-(--border) bg-(--bg) px-3.5 py-2.5 text-sm outline-none transition placeholder:text-(--muted) focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30'

export default function Profile() {
  const { user, refreshUser, signOut } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pwBusy, setPwBusy] = useState(false)

  useEffect(() => {
    if (user) setName(user.name ?? '')
  }, [user])

  const saveName = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setSavedMsg('')
    try {
      await api.updateProfile(name.trim())
      await refreshUser()
      setSavedMsg('Profile updated.')
    } catch (err) {
      setSavedMsg(err instanceof ApiError ? err.message : 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwBusy(true)
    setPwMsg(null)
    try {
      await api.changePassword(current, next)
      setPwMsg({ ok: true, text: 'Password updated.' })
      setCurrent('')
      setNext('')
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Failed to update.' })
    } finally {
      setPwBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold">Profile</h1>
      </header>

      <section className="flex items-center gap-4 rounded-2xl border border-(--border) bg-(--panel) p-5 shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600/15 text-xl font-bold text-blue-600 dark:text-blue-400">
          {(user?.name ?? user?.email ?? '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold">{user?.name ?? 'User'}</div>
          <div className="truncate text-sm text-(--muted)">{user?.email}</div>
          <span className="mt-1 inline-block rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide dark:bg-white/10">
            {user?.provider}
          </span>
        </div>
        <button
          onClick={() => {
            signOut()
            navigate('/auth')
          }}
          className="flex items-center gap-1.5 rounded-xl border border-(--border) px-3 py-2 text-sm font-medium text-(--muted) transition hover:text-red-500"
        >
          <LogoutIcon className="h-4 w-4" /> Sign out
        </button>
      </section>

      <form
        onSubmit={saveName}
        className="space-y-3 rounded-2xl border border-(--border) bg-(--panel) p-5 shadow-sm"
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--muted)">
          Display name
        </h2>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        {savedMsg && <p className="text-sm text-(--muted)">{savedMsg}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? <SpinnerIcon className="h-4 w-4" /> : 'Save'}
        </button>
      </form>

      {user?.provider === 'email' && (
        <form
          onSubmit={changePassword}
          className="space-y-3 rounded-2xl border border-(--border) bg-(--panel) p-5 shadow-sm"
        >
          <h2 className="text-sm font-bold uppercase tracking-wider text-(--muted)">
            Change password
          </h2>
          <input
            className={inputClass}
            type="password"
            placeholder="Current password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
          <input
            className={inputClass}
            type="password"
            placeholder="New password (min 8 characters)"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
          />
          {pwMsg && (
            <p className={`text-sm ${pwMsg.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {pwMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={pwBusy}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60"
          >
            {pwBusy ? <SpinnerIcon className="h-4 w-4" /> : 'Update password'}
          </button>
        </form>
      )}
    </div>
  )
}
