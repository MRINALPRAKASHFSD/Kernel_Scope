import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import DiskPage from './DiskPage'

const apiMock = vi.hoisted(() => vi.fn())
vi.mock('../lib/api', () => ({ api: apiMock }))

const run = {
  id: 8, dataset_id: null, category: 'storage', selected_algorithm: 'SCAN',
  input_snapshot: { requests: [0, 99], head: 50, cylinders: 100, direction: 'up' },
  result: { algorithms: [{ algorithm: 'SCAN', direction: 'up', route: [50, 99, 0], total_head_movement: 148, average_movement_per_request: 74, requests_served: 2 }] },
  status: 'completed', error_message: null, created_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-01T00:00:00Z',
}

describe('disk route presentation', () => {
  beforeEach(() => {
    apiMock.mockReset()
    apiMock.mockImplementation(async (path: string) => {
      if (path === '/datasets') return { items: [] }
      if (path === '/simulations/disk') return run
      throw new Error(`Unexpected API path ${path}`)
    })
  })

  it('shows a boundary request as both a request stop and the SCAN endpoint', async () => {
    const { container } = render(<DiskPage />)
    fireEvent.change(screen.getByLabelText('Cylinder count'), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText('Initial head'), { target: { value: '50' } })
    fireEvent.change(screen.getByPlaceholderText('98, 183, 37, 122'), { target: { value: '0, 99' } })
    fireEvent.click(screen.getByRole('button', { name: /Run comparison/i }))

    expect(await screen.findByRole('group', { name: 'Disk head service route' })).toBeInTheDocument()
    const endpoint = container.querySelector('.route-step b[title*="request stop"]')
    expect(endpoint).toHaveTextContent('99')
    expect(endpoint).toHaveAttribute('title', expect.stringContaining('physical SCAN endpoint'))
    expect(await screen.findByText('Request + SCAN endpoint')).toBeInTheDocument()
  })
})
