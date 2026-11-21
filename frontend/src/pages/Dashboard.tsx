import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3, CheckCircle2, Cpu, Database,
  HardDrive, Layers3, RotateCw, TriangleAlert,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../lib/api'
import type { DashboardSummary } from '../lib/types'
import { Button, Card, EmptyState, LoadError, Loading, Metric, PageHeader, SelectField, StatusPill, TableFrame } from '../components/ui'
import { metricDefinition, metricRows, type ReportDomain } from '../lib/presentation'

const categories = [
  { name: 'CPU scheduling', detail: 'FCFS · SJF · Round Robin', path: '/cpu', icon: Cpu, tint: 'blue' },
  { name: 'Memory management', detail: 'FIFO · LRU · Optimal', path: '/memory', icon: Layers3, tint: 'violet' },
  { name: 'Deadlock handling', detail: 'Banker safety analysis', path: '/deadlock', icon: Activity, tint: 'amber' },
  { name: 'Storage scheduling', detail: 'FCFS · SSTF · SCAN', path: '/disk', icon: HardDrive, tint: 'cyan' },
]
const shortDate = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [domain, setDomain] = useState<ReportDomain>('cpu')
  const reload = useCallback(() => {
    setLoading(true)
    setError('')
    setSummary(null)
    api<DashboardSummary>('/dashboard/summary')
      .then(setSummary)
      .catch(error => setError(error instanceof Error ? error.message : 'Could not load workspace statistics.'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { void reload() }, [reload])
  const chartRun = useMemo(
    () => (summary?.recent_runs ?? []).find(run => run.status === 'completed' && metricRows(run, domain).length > 0),
    [summary, domain],
  )
  const chartData = chartRun ? metricRows(chartRun, domain).map(item => ({ algorithm: item.algorithm, value: item.primary })) : []
  const metric = metricDefinition(domain)

  if (loading) return <div className="dashboard-page"><>
    <PageHeader title="Simulation workspace" description="Your saved operating-system experiments and measured results." />
    <div className="metric-grid">{[1, 2, 3, 4].map(value => <div className="skeleton metric-skeleton" key={value} />)}</div>
    <Loading />
  </></div>

  return <div className="dashboard-page">
    <PageHeader
      eyebrow="ENGINEERING WORKSPACE"
      title="Simulation workspace"
      description="Explore resource domains, inspect saved runs, and compare algorithms on reproducible inputs."
      action={!error && <Button variant="secondary" onClick={reload}><RotateCw size={16} aria-hidden="true" /> Refresh data</Button>}
    />
    {error && <LoadError message={error} onRetry={reload} retryLabel="Retry loading dashboard" />}

    {summary && <div className="metric-grid" aria-label="Workspace statistics">
      <Metric label="Saved simulation runs" value={summary.total_runs} detail="Persisted in the local database" icon={<Activity size={17} />} />
      <Metric label="Available algorithms" value={summary.algorithm_count} detail="Across four resource domains" icon={<Layers3 size={17} />} />
      <Metric label="Saved datasets" value={summary.saved_datasets} detail="Bundled and custom configurations" icon={<Database size={17} />} />
      <Metric label="Failed simulations" value={summary.failed_runs} detail="Recorded validation or execution failures" icon={<TriangleAlert size={17} />} />
    </div>}

    <div className="section-heading">
      <div><div className="eyebrow">SIMULATION MODULES</div><h2>Choose a resource domain</h2></div>
      <Link className="text-link" to="/datasets">Manage datasets <ArrowRight size={15} aria-hidden="true" /></Link>
    </div>
    <div className="module-grid">{categories.map(item => <Link to={item.path} className="module-card" key={item.path}>
      <div className={'module-icon ' + item.tint} aria-hidden="true"><item.icon size={20} /></div>
