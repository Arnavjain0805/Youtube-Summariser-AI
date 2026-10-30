import { useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { ThemeProvider, useTheme } from './lib/theme'
import { AuthProvider, useAuth } from './lib/auth'
import { ChatsProvider } from './lib/chats'
import { PreferencesProvider } from './lib/preferences'
import { BottomNav, MobileDrawer, Sidebar } from './components/Sidebar'
import { LogoMark, MenuIcon, MoonIcon, SpinnerIcon, SunIcon } from './components/Icons'
import AuthPage from './pages/AuthPage'
import OAuthCallback from './pages/OAuthCallback'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Developer from './pages/Developer'
import Profile from './pages/Profile'

function FullPageSpinner() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-(--muted)">
      <SpinnerIcon className="h-6 w-6" /> Loading…
    </div>
  )
}

function ThemeIconButton() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      className="rounded-lg p-2 text-(--muted) transition hover:bg-black/5 hover:text-(--text) dark:hover:bg-white/10"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  )
}

function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />

  return (
    <div className="flex h-dvh">
      <aside className="hidden w-72 shrink-0 border-r border-(--border) bg-(--panel) md:block">
        <Sidebar />
      </aside>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-(--border) bg-(--panel) px-3 py-2.5 md:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-(--muted) transition hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Open history"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-blue-600 text-white">
              <LogoMark className="h-4 w-4" />
            </span>
            YT Summarizer
          </div>
          <div className="flex-1" />
          <ThemeIconButton />
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/chat/:chatId" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/developer" element={<Developer />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatsProvider>
          <PreferencesProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </PreferencesProvider>
        </ChatsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
