import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'

const apiMock = vi.hoisted(() => vi.fn())
vi.mock('../lib/api', () => ({ api: apiMock }))

const emptySummary = {
  total_runs: 0, algorithm_count: 0, saved_datasets: 0, failed_runs: 0,
  recent_runs: [], recent_activity: [],
}
const populatedSummary = {
  ...emptySummary, total_runs: 4, algorithm_count: 10, saved_datasets: 2, failed_runs: 1,
  recent_activity: [{ id: 1, action: 'simulation.completed', category: 'cpu', status: 'completed', message: 'Run completed', timestamp: '2026-01-01T00:00:00Z' }],
}

describe('dashboard data states', () => {
  beforeEach(() => apiMock.mockReset())

  it('keeps loading, measured zeros, and a successful empty history distinct', async () => {
    let resolveSummary!: (value: typeof emptySummary) => void
    apiMock.mockReturnValueOnce(new Promise(resolve => { resolveSummary = resolve }))
    const { container } = render(<MemoryRouter><Dashboard /></MemoryRouter>)

    expect(screen.getByRole('status')).toHaveTextContent('Loading data')
    expect(container.querySelector('[aria-label="Workspace statistics"]')).not.toBeInTheDocument()
    resolveSummary(emptySummary)

    expect(await screen.findByText('No activity recorded')).toBeInTheDocument()
    const statistics = container.querySelector('[aria-label="Workspace statistics"]')
    expect(statistics).toHaveTextContent('Saved simulation runs0')
    expect(statistics).toHaveTextContent('Available algorithms0')
    expect(screen.getByText(/No CPU results yet/i)).toBeInTheDocument()
  })

  it('renders measured nonzero counts and persisted activity', async () => {
    apiMock.mockResolvedValueOnce(populatedSummary)
    const { container } = render(<MemoryRouter><Dashboard /></MemoryRouter>)
    expect(await screen.findByText('Failed simulations')).toBeInTheDocument()
    const statistics = container.querySelector('[aria-label="Workspace statistics"]')

    expect(statistics).toHaveTextContent('Saved simulation runs4')
    expect(statistics).toHaveTextContent('Available algorithms10')
    expect(statistics).toHaveTextContent('Saved datasets2')
    expect(statistics).toHaveTextContent('Failed simulations1')
    expect(await screen.findByText('Run completed')).toBeInTheDocument()
    expect(container.querySelector('.quick-start')).not.toBeInTheDocument()
  })

  it('shows an error and retry action instead of false zero counts or empty activity', async () => {
    apiMock.mockRejectedValueOnce(new Error('Database unavailable')).mockResolvedValueOnce(emptySummary)
    const { container } = render(<MemoryRouter><Dashboard /></MemoryRouter>)

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable')
    expect(screen.getByRole('button', { name: 'Retry loading dashboard' })).toBeInTheDocument()
    expect(container.querySelector('[aria-label="Workspace statistics"]')).not.toBeInTheDocument()
    expect(screen.queryByText('No activity recorded')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry loading dashboard' }))
    expect(await screen.findByText('No activity recorded')).toBeInTheDocument()
    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(2))
  })
})
