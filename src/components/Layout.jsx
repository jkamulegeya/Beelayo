import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/authContext.jsx'

export default function Layout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen">
      <header className="print:hidden border-b border-[#A01111] bg-[#BD1E1E] text-white sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/app" className="flex items-center gap-2">
            <img
              src={location.pathname.startsWith('/app') ? `${import.meta.env.BASE_URL}logo-nav-word.png` : `${import.meta.env.BASE_URL}logo-nav.png`}
              alt="Belayo"
              className="h-9 max-w-[10rem] object-contain"
            />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/app"
              className="flex items-center gap-1.5 rounded-sm px-2.5 py-2 text-xs font-medium text-white/85 hover:bg-white/10 hover:text-white sm:px-3 sm:text-sm"
            >
              <svg className="sm:hidden" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              <span className="hidden sm:inline">My Events</span>
            </Link>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-1.5 rounded-md border border-white/20 px-2.5 py-2 text-xs font-medium text-white/85 transition hover:bg-white hover:text-[#850C0C] disabled:opacity-60 sm:px-3 sm:text-sm"
            >
              <svg className="sm:hidden" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="hidden sm:inline">{signingOut ? 'Signing out…' : 'Sign out'}</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}