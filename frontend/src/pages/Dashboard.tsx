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
      description="Launch OS simulators, inspect SQLite-persisted runs, and compare algorithms on shared input snapshots."
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
      <div><h3>{item.name}</h3><p>{item.detail}</p></div>
      <ArrowUpRight className="module-arrow" size={17} aria-hidden="true" />
    </Link>)}</div>

    {summary && <div className="dashboard-columns">
      <Card className="dashboard-chart-card">
        <div className="panel-heading">
          <div><div className="eyebrow">PERSISTED RESULT</div><h2>Latest algorithm comparison</h2></div>
          <Link to="/analytics" className="icon-link" aria-label="Open analytics"><ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
        <div className="dashboard-chart-controls">
          <SelectField label="Resource domain" value={domain} onChange={event => setDomain(event.target.value as ReportDomain)}>
            <option value="cpu">CPU scheduling</option>
            <option value="memory">Memory management</option>
            <option value="storage">Disk scheduling</option>
          </SelectField>
          {chartRun && <span className="run-context-compact">Run #{chartRun.id} · same input snapshot</span>}
        </div>
        {chartData.length && chartRun ? <>
          <div className="dashboard-metric-label">{metric.label} <span>({metric.unit})</span></div>
          <div className="chart-area" role="group" aria-label={metric.label + ' by algorithm'}>
            <p className="sr-only">Values are from completed run #{chartRun.id}, using its saved input snapshot.</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 10, right: 18, left: 4, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)" />
                <XAxis dataKey="algorithm" tick={{ fontSize: 12, fill: 'var(--muted)', fontFamily: 'var(--font-data)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted)', fontFamily: 'var(--font-data)' }} axisLine={false} tickLine={false} label={{ value: metric.unit, angle: -90, position: 'insideLeft', fill: 'var(--muted)', fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [value + ' ' + metric.unit, metric.label]} contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }} />
                <Bar dataKey="value" name={metric.label} fill="var(--series-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <TableFrame minWidth={340}>
            <caption>Measured {metric.label.toLowerCase()} from run #{chartRun.id} ({metric.unit})</caption>
            <thead><tr><th>Algorithm</th><th>{metric.label} ({metric.unit})</th></tr></thead>
            <tbody>{chartData.map(row => <tr key={row.algorithm}><td className="strong-cell">{row.algorithm}</td><td>{row.value}</td></tr>)}</tbody>
          </TableFrame>
          <p className="table-note">Algorithms in this view share run #{chartRun.id} and its saved input.</p>
        </> : <EmptyState title={'No ' + domain + ' results yet'} detail="Run a simulation in this domain to see its persisted algorithm comparison." />}
      </Card>

      <Card className="activity-panel">
        <div className="panel-heading">
          <div><div className="eyebrow">RECENT ACTIVITY</div><h2>Run log</h2></div>
          <Link to="/history" className="icon-link" aria-label="Open history"><ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
        <div className="activity-list">
          {summary.recent_activity.length ? summary.recent_activity.slice(0, 6).map(item => <div className="activity-item" key={item.id}>
            <div className={'activity-dot activity-' + item.status} aria-hidden="true">{item.status === 'completed' ? <CheckCircle2 size={14} /> : <Activity size={14} />}</div>
            <div className="activity-copy"><strong>{item.message}</strong><small>{item.category} · {shortDate(item.timestamp)}</small></div>
            <StatusPill status={item.status} />
          </div>) : <EmptyState title="No activity recorded" detail="Database actions appear here as you work." />}
        </div>
      </Card>
    </div>}
  </div>
}

