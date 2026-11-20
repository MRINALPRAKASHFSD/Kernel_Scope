import type { SimulationRun } from './types'

export type ReportDomain = 'cpu' | 'memory' | 'storage'
export type MetricRow = {
  algorithm: string
  primary: number
  secondary?: number
  tertiary?: number
}

const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function resultsForDomain(result: unknown, runCategory: string, domain: ReportDomain): Record<string, any>[] {
  if (!isRecord(result)) return []
  const resultKey = domain === 'cpu' ? 'scheduling' : domain
  const category = domain === 'storage' ? 'storage' : domain
  const values = runCategory === 'integrated'
    ? result[resultKey]
    : runCategory === category ? result.algorithms : undefined
  return Array.isArray(values) ? values.filter(isRecord) : []
}

export function metricRows(run: SimulationRun, domain: ReportDomain): MetricRow[] {
  const results = resultsForDomain(run.result, run.category, domain)
  return results.flatMap((item) => {
    const primary = domain === 'cpu' ? item.average_waiting
      : domain === 'memory' ? item.faults : item.total_head_movement
    if (typeof primary !== 'number' || !Number.isFinite(primary)) return []
    return [{
      algorithm: typeof item.algorithm === 'string' ? item.algorithm : 'Unknown algorithm',
      primary,
      ...(domain === 'cpu' && typeof item.average_turnaround === 'number' ? { secondary: item.average_turnaround } : {}),
      ...(domain === 'memory' && typeof item.hits === 'number' ? { secondary: item.hits } : {}),
      ...(domain === 'storage' && typeof item.average_movement_per_request === 'number' ? { secondary: item.average_movement_per_request } : {}),
    }]
  })
}

export function metricDefinition(domain: ReportDomain) {
  if (domain === 'cpu') return { label: 'Average waiting time', unit: 'time units', secondaryLabel: 'Average turnaround' }
  if (domain === 'memory') return { label: 'Page faults', unit: 'faults', secondaryLabel: 'Page hits' }
  return { label: 'Total head movement', unit: 'cylinders', secondaryLabel: 'Average movement per request' }
}

export function metricUnit(domain: ReportDomain, value: number) {
  if (domain === 'memory') return value === 1 ? 'page fault' : 'page faults'
  if (domain === 'storage') return value === 1 ? 'cylinder' : 'cylinders'
  return 'time units'
}

export function reportTitle(category: string) {
  const names: Record<string, string> = {
    cpu: 'CPU scheduling', memory: 'Memory management', deadlock: 'Deadlock safety analysis',
    storage: 'Disk scheduling', integrated: 'Integrated resource simulation',
  }
  return names[category] ?? `${category} simulation`
}

export function algorithmNames(run: SimulationRun): string[] {
  const result = isRecord(run.result) ? run.result : {}
  if (run.category === 'integrated') {
    const groups: [string,unknown][] = [
      ['CPU',result.scheduling],['Memory',result.memory],['Banker',result.deadlock?[{algorithm:"Banker's algorithm"}]:[]],['Disk',result.storage],
    ]
    return groups.flatMap(([label,values])=>{
      const names=Array.isArray(values)?values.flatMap((item)=>isRecord(item)&&typeof item.algorithm==='string'?[item.algorithm]:[]):[]
      return names.length?[`${label}: ${names.join(', ')}`]:[]
    })
  }
  const arrays = [result.algorithms, result.scheduling, result.memory, result.storage]
  const names = arrays.flatMap((values) => Array.isArray(values)
    ? values.flatMap((item) => isRecord(item) && typeof item.algorithm === 'string' ? [item.algorithm] : [])
    : [])
  if (names.length) return [...new Set(names)]
  if (run.category === 'deadlock') return ["Banker's algorithm"]
  return run.selected_algorithm ? run.selected_algorithm.split(',').map((name) => name.trim()).filter(Boolean) : []
}

export function inputSnapshot(run: SimulationRun): unknown {
  const input = isRecord(run.input_snapshot) ? run.input_snapshot : {}
  return run.category === 'integrated' && isRecord(input.dataset) ? input.dataset : input
}

export function inputSummary(run: SimulationRun): string[] {
  const input = inputSnapshot(run)
  if (!isRecord(input)) return []
  const lines: string[] = []
  const processes = Array.isArray(input.processes) ? input.processes : []
  const memory = isRecord(input.memory) ? input.memory : input
  const deadlock = isRecord(input.deadlock) ? input.deadlock : input
  const storage = isRecord(input.storage) ? input.storage : input
  if (run.category === 'cpu' || run.category === 'integrated') {
    if (processes.length) lines.push(`${processes.length} ${processes.length===1?'process':'processes'}; Round Robin quantum ${input.quantum ?? 'not specified'}`)
  }
  if (run.category === 'memory' || run.category === 'integrated') {
    const references = Array.isArray(memory.references) ? memory.references : []
    if (references.length) lines.push(`${references.length} page references; ${memory.frames ?? 'unspecified'} physical frames`)
  }
  if (run.category === 'deadlock' || run.category === 'integrated') {
    const resources = Array.isArray(deadlock.available) ? deadlock.available : []
    const count = Array.isArray(deadlock.maximum) ? deadlock.maximum.length : 0
    if (resources.length) lines.push(`${count} ${count===1?'process':'processes'}; ${resources.length} ${resources.length===1?'resource type':'resource types'}`)
  }
  if (run.category === 'storage' || run.category === 'integrated') {
    const requests = Array.isArray(storage.requests) ? storage.requests : []
    if (requests.length || typeof storage.head === 'number') {
      lines.push(`${requests.length} disk requests; initial head ${storage.head ?? 'unspecified'}; ${storage.cylinders ?? 'unspecified'} cylinders`)
    }
  }
  if (!lines.length) lines.push(`${Object.keys(input).length} top-level input fields recorded`)
  return lines
}

export function technicalInterpretation(run: SimulationRun, domain: ReportDomain): string {
  const rows = metricRows(run, domain)
  const definition = metricDefinition(domain)
  if (!rows.length) return `No ${definition.label.toLowerCase()} values were present in this persisted result.`
  if (rows.length === 1) {
    return `${rows[0].algorithm} recorded ${rows[0].primary} ${metricUnit(domain,rows[0].primary)} for this input. This run contains one measured algorithm, so it does not support a within-run ranking.`
  }
  const minimum = Math.min(...rows.map((row) => row.primary))
  const best = rows.filter((row) => row.primary === minimum).map((row) => row.algorithm)
  return `${best.join(', ')} recorded the lowest ${definition.label.toLowerCase()} (${minimum} ${metricUnit(domain,minimum)}) among ${rows.length} algorithms run against this input snapshot.`
}
