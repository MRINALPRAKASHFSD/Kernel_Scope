import type { Process } from './types'

export function parseIntegerList(value: string): number[] | null {
  const tokens = value.split(/[\s,]+/).filter(Boolean)
  if (!tokens.length || tokens.some(token => !/^-?\d+$/.test(token))) return null
  return tokens.map(Number)
}

export function validateProcessRows(rows: Process[], quantum: number) {
  if (!rows.length) return 'Add at least one process.'
  const ids = rows.map(row => row.pid.trim())
  if (ids.some(id => !id)) return 'Every process needs an ID.'
  if (new Set(ids).size !== ids.length) return 'Process IDs must be unique.'
  if (rows.some(row => !Number.isInteger(row.arrival) || row.arrival < 0)) return 'Arrival times must be nonnegative integers.'
  if (rows.some(row => !Number.isInteger(row.burst) || row.burst < 1)) return 'Burst times must be positive integers.'
  if (!Number.isInteger(quantum) || quantum < 1) return 'Round Robin quantum must be a positive integer.'
  return ''
}
