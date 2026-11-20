import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import {
  Activity, BarChart3, BookOpen, Boxes, ChevronDown, CircleHelp, Cpu, Database,
  HardDrive, LayoutDashboard, Menu, Moon, Network, Sun, X,
} from 'lucide-react'
import { api } from './lib/api'
import { ToastProvider } from './components/Toast'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const CpuPage = lazy(() => import('./pages/CpuPage'))
const MemoryPage = lazy(() => import('./pages/MemoryPage'))
const DeadlockPage = lazy(() => import('./pages/DeadlockPage'))
const DiskPage = lazy(() => import('./pages/DiskPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const DatasetPage = lazy(() => import('./pages/DatasetPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))

const navigation = [
  { label: 'Overview', path: '/', icon: LayoutDashboard, group: 'Workspace' },
  { label: 'Analytics', path: '/analytics', icon: BarChart3, group: 'Workspace' },
  { label: 'Datasets', path: '/datasets', icon: Database, group: 'Workspace' },
  { label: 'Run history', path: '/history', icon: Activity, group: 'Workspace' },
  { label: 'Reports', path: '/reports', icon: BookOpen, group: 'Workspace' },
  { label: 'CPU scheduling', path: '/cpu', icon: Cpu, group: 'Simulators' },
  { label: 'Memory management', path: '/memory', icon: Boxes, group: 'Simulators' },
  { label: 'Deadlock handling', path: '/deadlock', icon: Network, group: 'Simulators' },
  { label: 'Storage scheduling', path: '/disk', icon: HardDrive, group: 'Simulators' },
  { label: 'About & docs', path: '/about', icon: CircleHelp, group: 'System' },
]
const titles: Record<string, string> = Object.fromEntries(navigation.map(item => [item.path, item.label]))

function Shell() {
  const location = useLocation()
  const [theme, setTheme] = useState(() => localStorage.getItem('osrl-theme') ?? 'dark')
  const [online, setOnline] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('osrl-theme', theme)
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#10161B' : '#F4F6F4')
  }, [theme])

  useEffect(() => {
    api('/health').then(() => setOnline(true)).catch(() => setOnline(false))
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) {
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
      return
    }

    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMobileOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const focusable = sidebarRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  const groups = ['Workspace', 'Simulators', 'System']
  const openNavigation = () => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setMobileOpen(true)
  }

  return <div className="app-shell">
    {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside
      id="workspace-navigation"
      ref={sidebarRef}
      className={'sidebar' + (mobileOpen ? ' sidebar-open' : '')}
      role={mobileOpen ? 'dialog' : undefined}
      aria-label="OS Resource Lab navigation"
      aria-modal={mobileOpen || undefined}
    >
      <div className="brand">
        <div className="brand-mark" aria-hidden="true"><Cpu size={19} /></div>
        <div><b>OS Resource Lab</b><small>Simulation workbench</small></div>
        <button ref={closeButtonRef} className="mobile-close icon-button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={18} /></button>
      </div>
      <div className="workspace-pill"><span className="workspace-dot" aria-hidden="true" /> Local workspace <ChevronDown size={14} aria-hidden="true" /></div>
      <nav aria-label="Primary navigation" className="main-nav">
        {groups.map(group => <div className="nav-group" key={group}>
          <div className="nav-label">{group}</div>
          {navigation.filter(item => item.group === group).map(item => <NavLink
            key={item.path}
            end={item.path === '/'}
            to={item.path}
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            <item.icon size={17} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>)}
        </div>)}
      </nav>
      <div className="sidebar-footer">
        <div className="engine-label"><span className={'connection-dot' + (online ? ' is-online' : '')} aria-hidden="true" /><span>{online ? 'Python engine connected' : 'API connection pending'}</span></div>
        <div className="engine-version">Local API · SQLite persistence</div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <button
          ref={menuButtonRef}
          className="icon-button mobile-menu"
          aria-label="Open navigation"
          aria-controls="workspace-navigation"
          aria-expanded={mobileOpen}
          onClick={openNavigation}
        ><Menu size={19} aria-hidden="true" /></button>
        <div className="breadcrumb"><span>OS Resource Lab</span><b aria-hidden="true">/</b><strong>{titles[location.pathname] ?? 'Overview'}</strong></div>
        <div className="top-actions">
          <span className="live-badge">Local</span>
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' theme'}
            aria-pressed={theme === 'light'}
            title={'Use ' + (theme === 'dark' ? 'light' : 'dark') + ' theme'}
          >{theme === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}</button>
          <div className="avatar" aria-label="User initials">MR</div>
        </div>
      </header>
      <div className="page-wrap">
        <Suspense fallback={<div className="loading-state" role="status">Loading page...</div>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cpu" element={<CpuPage />} />
            <Route path="/memory" element={<MemoryPage />} />
            <Route path="/deadlock" element={<DeadlockPage />} />
            <Route path="/disk" element={<DiskPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/datasets" element={<DatasetPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </Suspense>
      </div>
      <footer className="app-footer">
        <span>OS RESOURCE LAB <span className="muted-separator">/</span> LOCAL SIMULATION SUITE</span>
        <span>Python engine · Reproducible results</span>
      </footer>
    </main>
  </div>
}

export default function App() {
  return <ToastProvider><Shell /></ToastProvider>
}

