import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useChats } from '../lib/chats'
import { ThemeToggle } from './ThemeToggle'
import {
  HistoryIcon,
  KeyIcon,
  LogoMark,
  LogoutIcon,
  PlusIcon,
  SettingsIcon,
  UserIcon,
} from './Icons'
import type { ReactNode } from 'react'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
      : 'text-(--muted) hover:bg-black/5 hover:text-(--text) dark:hover:bg-white/10 dark:hover:text-(--text)'
  }`

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth()
  const { chats } = useChats()
  const navigate = useNavigate()

  const handleNew = () => {
    navigate('/')
    onNavigate?.()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 pb-4 pt-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-blue-600 text-white">
          <LogoMark className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold">YT Summarizer</div>
          <div className="text-[11px] text-(--muted)">AI Agent · Edge</div>
        </div>
      </div>

      {/* New button */}
      <div className="px-3">
        <button
          onClick={handleNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 active:scale-[0.98]"
        >
          <PlusIcon className="h-4 w-4" /> New Summary / Chat
        </button>
      </div>

      {/* History */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2 px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-(--muted)">
          <HistoryIcon className="h-3.5 w-3.5" /> History
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
          {chats.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-(--muted)">
              No summaries yet. Paste a YouTube link to get started.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {chats.map((chat) => (
                <li key={chat.id}>
                  <NavLink
                    to={`/chat/${chat.id}`}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-2 transition ${
                        isActive
                          ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
                          : 'hover:bg-black/5 dark:hover:bg-white/10'
                    }`
                    }
                  >
                    <div className="line-clamp-1 text-[13px] font-medium text-(--text)">
                      {chat.videoTitle || 'Untitled video'}
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-[11px] text-(--muted)">
                      {chat.channelName ?? 'YouTube'} · {relativeTime(chat.updatedAt)}
                    </div>
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-(--border) p-3">
        <nav className="space-y-0.5">
          <ThemeToggle />
          <NavLink to="/settings" className={linkClass} onClick={onNavigate}>
            <SettingsIcon className="h-5 w-5" /> Settings
          </NavLink>
          <NavLink to="/developer" className={linkClass} onClick={onNavigate}>
            <KeyIcon className="h-5 w-5" /> Developer APIs
          </NavLink>
          <NavLink to="/profile" className={linkClass} onClick={onNavigate}>
            <UserIcon className="h-5 w-5" /> Profile
          </NavLink>
        </nav>
        <div className="mt-3 flex items-center gap-2.5 border-t border-(--border) pt-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600/15 text-xs font-bold text-blue-600 dark:text-blue-400">
            {(user?.name ?? user?.email ?? '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="line-clamp-1 text-[13px] font-medium">{user?.name ?? 'User'}</div>
            <div className="line-clamp-1 text-[11px] text-(--muted)">{user?.email}</div>
          </div>
          <button
            onClick={() => {
              signOut()
              navigate('/auth')
            }}
            className="rounded-lg p-2 text-(--muted) transition hover:bg-black/5 hover:text-red-500 dark:hover:bg-white/10"
            aria-label="Log out"
          >
            <LogoutIcon className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={onClose} />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-(--border) bg-(--panel) transition-transform duration-300 md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onNavigate={onClose} />
      </div>
    </>
  )
}

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const items: { to: string; label: string; icon: ReactNode; end?: boolean }[] = [
    { to: '/', label: 'Home', icon: <PlusIcon className="h-5 w-5" />, end: true },
    { to: '/settings', label: 'Settings', icon: <SettingsIcon className="h-5 w-5" /> },
    { to: '/developer', label: 'Developer', icon: <KeyIcon className="h-5 w-5" /> },
    { to: '/profile', label: 'Profile', icon: <UserIcon className="h-5 w-5" /> },
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-(--border) bg-(--panel) pb-[env(safe-area-inset-bottom)] md:hidden">
      {items.map((item) => {
        const active =
          item.end !== false
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to)
        return (
          <button
            key={item.to}
            onClick={() => navigate(item.to)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
              active ? 'text-blue-600 dark:text-blue-400' : 'text-(--muted)'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
