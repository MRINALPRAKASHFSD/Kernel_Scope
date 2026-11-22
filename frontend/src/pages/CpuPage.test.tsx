import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CpuPage from './CpuPage'

const apiMock = vi.hoisted(() => vi.fn())
vi.mock('../lib/api', () => ({ api: apiMock }))

const savedRun = {
  id: 7,
  dataset_id: null,
  category: 'cpu',
  selected_algorithm: 'FCFS',
  input_snapshot: { processes: [{ pid: 'A', arrival: 3, burst: 2 }], quantum: 2, algorithms: ['FCFS'] },
  result: { category: 'cpu', algorithms: [{
    algorithm: 'FCFS', quantum: null,
    metrics: [{ pid: 'A', completion: 5, turnaround: 2, waiting: 0 }],
    gantt: [{ pid: 'A', start: 3, end: 5 }],
    average_waiting: 0, average_turnaround: 2, cpu_utilization_percent: 40, throughput: 0.2,
  }] },
  status: 'completed', error_message: null, created_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-01T00:00:00Z',
}

describe('CPU simulator page', () => {
  beforeEach(() => {
    apiMock.mockReset()
    apiMock.mockImplementation(async (path: string) => {
      if (path === '/datasets') return { items: [] }
      if (path === '/simulations/cpu') return savedRun
      throw new Error(`Unexpected API path ${path}`)
    })
  })

  it('submits a real API request and renders the returned metrics and idle trace', async () => {
    render(<CpuPage />)
    fireEvent.click(screen.getByRole('button', { name: /Run comparison/i }))

    expect(await screen.findByText('IDLE')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(apiMock).toHaveBeenCalledWith('/simulations/cpu', expect.objectContaining({ method: 'POST' }))
    const request = JSON.parse(apiMock.mock.calls.find(([path]) => path === '/simulations/cpu')![1].body)
    expect(request.algorithms).toEqual(['FCFS', 'SJF', 'RR'])
    expect(request.processes[0]).toEqual({ pid: 'P1', arrival: 0, burst: 7 })
  })

  it('shows an API error instead of leaving stale success feedback', async () => {
    apiMock.mockImplementation(async (path: string) => {
      if (path === '/datasets') return { items: [] }
      throw new Error('Backend validation failed')
    })
    render(<CpuPage />)
    fireEvent.click(screen.getByRole('button', { name: /Run comparison/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Backend validation failed')
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith('/simulations/cpu', expect.any(Object)))
  })
})
