import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import MemoryPage from './MemoryPage'

const apiMock = vi.hoisted(() => vi.fn())
vi.mock('../lib/api', () => ({ api: apiMock }))

const run = {
  id: 3,
  dataset_id: null,
  category: 'memory',
  selected_algorithm: 'FIFO',
  input_snapshot: { references: [1, 2, 3, 4], frames: 3 },
  result: { algorithms: [{
    algorithm: 'FIFO', frames: 3, references: 4, hits: 0, faults: 4,
    hit_rate_percent: 0, fault_rate_percent: 100,
    trace: [
      { step: 1, page: 1, result: 'FAULT', frames: [1] },
      { step: 2, page: 2, result: 'FAULT', frames: [1, 2] },
      { step: 3, page: 3, result: 'FAULT', frames: [1, 2, 3] },
      { step: 4, page: 4, result: 'FAULT', frames: [2, 3, 4] },
    ],
  }] },
  status: 'completed', error_message: null, created_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-01T00:00:00Z',
}

describe('memory trace presentation', () => {
  beforeEach(() => {
    apiMock.mockReset()
    apiMock.mockImplementation(async (path: string) => {
      if (path === '/datasets') return { items: [] }
      if (path === '/simulations/memory') return run
      throw new Error(`Unexpected API path ${path}`)
    })
  })

  it('keeps resident page order clear through a replacement that changes the list', async () => {
    const { container } = render(<MemoryPage />)
    fireEvent.click(screen.getByRole('button', { name: /Run comparison/i }))
    expect(await screen.findByText('Resident-page order')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reference 4, page 4, FAULT' }))

    const residentOrder = container.querySelector('.resident-order')
    expect(residentOrder).toHaveAttribute('aria-label', expect.stringContaining('not physical frame positions'))
    expect(within(residentOrder as HTMLElement).getAllByText(/Resident order/)).toHaveLength(3)
    expect(Array.from(residentOrder!.querySelectorAll('.frame-cell strong'), cell => cell.textContent)).toEqual(['2', '3', '4'])
    expect(container.querySelector('.replacement-note')).toHaveTextContent('Page 1 was evicted to load page 4.')
    expect(residentOrder).not.toHaveTextContent('FRAME 1')
  })
})
