import { MoonIcon, SunIcon } from './Icons'
import { useTheme } from '../lib/theme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-(--muted) transition hover:bg-black/5 hover:text-(--text) dark:hover:bg-white/10"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
      <span className="hidden lg:inline">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
    </button>
  )
}
