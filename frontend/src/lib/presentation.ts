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
