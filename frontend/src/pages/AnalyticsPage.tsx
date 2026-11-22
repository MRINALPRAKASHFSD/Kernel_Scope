import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, BarChart3 } from 'lucide-react'
import { api } from '../lib/api'
import type { SimulationRun } from '../lib/types'
import { Card, EmptyState, LoadError, Loading, PageHeader, SelectField, StatusPill, TableFrame } from '../components/ui'

const domains = [
  { key: 'cpu', label: 'CPU scheduling' },
  { key: 'memory', label: 'Memory replacement' },
  { key: 'storage', label: 'Disk scheduling' },
]
type AlgorithmMetric = {
  algorithm: string
  average_waiting?: number
  average_turnaround?: number
  faults?: number
  hits?: number
  total_head_movement?: number
}
function listFor(run: SimulationRun, category: string): AlgorithmMetric[] {
  const values = run.category === 'integrated'
    ? run.result?.[category === 'storage' ? 'storage' : category === 'cpu' ? 'scheduling' : 'memory']
    : run.category === category ? run.result?.algorithms : []
  return Array.isArray(values) ? values as AlgorithmMetric[] : []
}
function metricFor(item: AlgorithmMetric, category: string) {
  return category === 'cpu' ? item.average_waiting : category === 'memory' ? item.faults : item.total_head_movement
}
function metricName(category: string) {
  return category === 'cpu' ? 'Average waiting time' : category === 'memory' ? 'Page faults' : 'Total head movement'
}
function metricUnit(category: string) {
  return category === 'storage' ? 'cylinders' : category === 'memory' ? 'faults' : 'time units'
}

export default function AnalyticsPage() {
  const [runs, setRuns] = useState<SimulationRun[]>([])
  const [category, setCategory] = useState('cpu')
  const [runId, setRunId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loadRuns=useCallback(() => {
    setLoading(true)
    setError('')
    setRuns([])
    setRunId('')
    api<{ items: SimulationRun[] }>('/simulations?limit=200')
      .then(data => setRuns(data.items.filter(item => item.status === 'completed')))
      .catch(error => setError(error instanceof Error ? error.message : 'Could not load completed simulations.'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { loadRuns() }, [loadRuns])
  const compatibleRuns = useMemo(() => runs.filter(run => listFor(run, category).length > 0), [runs, category])
  useEffect(() => {
    if (!compatibleRuns.some(run => String(run.id) === runId)) setRunId(compatibleRuns[0] ? String(compatibleRuns[0].id) : '')
  }, [compatibleRuns, runId])
  const chosen = compatibleRuns.find(run => String(run.id) === runId)
  const algorithmRows = chosen ? listFor(chosen, category).map(item => ({
    algorithm: item.algorithm,
    value: metricFor(item, category),
    turnaround: item.average_turnaround,
    hits: item.hits,
    faults: item.faults,
    movement: item.total_head_movement,
  })) : []

  if (loading) return <><PageHeader title="Algorithm analytics" description="Compare actual persisted results from compatible inputs." /><Loading /></>
  if (error) return <><PageHeader title="Algorithm analytics" description="Compare actual persisted results from compatible inputs." /><LoadError message={error} onRetry={loadRuns} retryLabel="Retry loading analytics" /></>
  return <>
    <PageHeader eyebrow="ANALYTICS / COMPARISONS" title="Algorithm analytics" description="Inspect measured outcomes from saved runs. Each comparison uses one recorded input snapshot." />
    <div className="analytics-filters">
      <SelectField label="Resource domain" value={category} onChange={event => { setCategory(event.target.value); setRunId('') }}>
        {domains.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
      </SelectField>
      <SelectField label="Persisted input and run" value={runId} onChange={event => setRunId(event.target.value)}>
        <option value="">Choose a run</option>
        {compatibleRuns.map(run => <option key={run.id} value={run.id}>Run #{run.id} · {run.selected_algorithm} · {new Date(run.created_at).toLocaleString()}</option>)}
      </SelectField>
    </div>

    {chosen ? <>
      <div className="run-context"><Activity size={16} aria-hidden="true" /><span>Run <b>#{chosen.id}</b> · dataset {chosen.dataset_id ?? 'unsaved input snapshot'} · {new Date(chosen.created_at).toLocaleString()}</span><StatusPill status={chosen.status} /></div>
      <div className="analytics-grid">
        <Card>
          <div className="panel-heading"><div><div className="eyebrow">OBSERVED METRIC</div><h2>{metricName(category)}</h2></div><BarChart3 size={18} className="muted-icon" aria-hidden="true" /></div>
          <div className="chart-area" role="group" aria-label={metricName(category) + ' by algorithm'}>
            <p className="sr-only">Data is from run #{chosen.id}. Values share one saved input snapshot and are measured in {metricUnit(category)}.</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={algorithmRows} margin={{ top: 12, right: 18, left: -10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)" />
                <XAxis dataKey="algorithm" tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'var(--font-data)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'var(--font-data)' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => [value + ' ' + metricUnit(category), metricName(category)]} contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }} />
                <Bar dataKey="value" name={metricName(category)} fill="var(--series-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <div className="panel-heading"><div><div className="eyebrow">SAME INPUT SNAPSHOT</div><h2>Measured values</h2></div></div>
          <TableFrame minWidth={460}>
            <caption>{metricName(category)} by algorithm, run #{chosen.id}</caption>
            <thead><tr><th>Algorithm</th><th>{metricName(category)} ({metricUnit(category)})</th>{category === 'cpu' && <th>Avg. turnaround</th>}{category === 'memory' && <th>Hits</th>}</tr></thead>
            <tbody>{algorithmRows.map(item => <tr key={item.algorithm}>
              <td className="strong-cell">{item.algorithm}</td><td>{item.value}</td>
              {category === 'cpu' && <td>{item.turnaround}</td>}
              {category === 'memory' && <td>{item.hits}</td>}
            </tr>)}</tbody>
          </TableFrame>
          <p className="table-note">This view compares algorithms run against the same persisted input. It does not rank results across different datasets.</p>
        </Card>
      </div>
    </> : <Card><EmptyState title="No compatible stored runs" detail="Run a simulator and return here to compare its measured algorithms." /></Card>}

    <Card className="gap-top">
      <div className="panel-heading"><div><div className="eyebrow">COMPLETED RUNS</div><h2>Persisted experiment log</h2></div><span className="count-chip">{runs.length} runs</span></div>
      {runs.length ? <TableFrame minWidth={760}>
        <caption>Completed simulation runs available for analysis</caption>
        <thead><tr><th>Run</th><th>Domain</th><th>Algorithm</th><th>Dataset ID</th><th>Executed</th></tr></thead>
        <tbody>{runs.slice(0, 20).map(run => <tr key={run.id}>
          <td className="strong-cell">#{run.id}</td><td>{run.category}</td><td>{run.selected_algorithm}</td><td>{run.dataset_id ?? '-'}</td><td>{new Date(run.created_at).toLocaleString()}</td>
        </tr>)}</tbody>
      </TableFrame> : <EmptyState title="No runs to analyze" detail="Simulation history is populated by actual API runs." />}
    </Card>
  </>
}

