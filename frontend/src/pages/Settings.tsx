import { usePreferences } from '../lib/preferences'
import { useTheme } from '../lib/theme'
import { MoonIcon, SunIcon } from '../components/Icons'

const TONES = [
  {
    value: 'Bullet points',
    desc: 'Fast, skimmable bullet points with a short intro.',
  },
  {
    value: 'Detailed',
    desc: 'In-depth sections that fully explain the video.',
  },
  {
    value: 'Gen-Z',
    desc: 'Casual, energetic tone with punchy sentences.',
  },
  {
    value: 'Formal',
    desc: 'Professional, business-ready register.',
  },
]

export default function Settings() {
  const { prefs, save } = usePreferences()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-(--muted)">
          Preferences are stored in Turso and applied to every summary you generate.
        </p>
      </header>

      <section className="rounded-2xl border border-(--border) bg-(--panel) p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-(--muted)">
          Tone of Summary
        </h2>
        <p className="mb-4 text-sm text-(--muted)">
          Prepend to the LLM system prompt for every new summary.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {TONES.map((tone) => {
            const active = prefs.tone === tone.value
            return (
              <button
                key={tone.value}
                onClick={() => void save({ tone: tone.value })}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? 'border-blue-600 bg-blue-600/5 ring-2 ring-blue-600/20'
                    : 'border-(--border) hover:border-(--muted)'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{tone.value}</span>
                  <span
                    className={`h-3 w-3 rounded-full border-2 ${
                      active ? 'border-blue-600 bg-blue-600' : 'border-(--muted)'
                    }`}
                  />
                </div>
                <p className="mt-1 text-xs text-(--muted)">{tone.desc}</p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-(--border) bg-(--panel) p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-(--muted)">
          Appearance
        </h2>
        <p className="mb-4 text-sm text-(--muted)">Dark and light themes, synced to your account.</p>
        <div className="grid grid-cols-2 gap-3">
          {(['dark', 'light'] as const).map((t) => {
            const active = theme === t
            return (
              <button
                key={t}
                onClick={() => {
                  if (theme !== t) toggleTheme()
                  void save({ theme: t })
                }}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
                  active
                    ? 'border-blue-600 bg-blue-600/5 ring-2 ring-blue-600/20'
                    : 'border-(--border) hover:border-(--muted)'
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {t === 'dark' ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
                  {t === 'dark' ? 'Dark' : 'Light'}
                </span>
                <span
                  className={`h-3 w-3 rounded-full border-2 ${
                    active ? 'border-blue-600 bg-blue-600' : 'border-(--muted)'
                  }`}
                />
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
