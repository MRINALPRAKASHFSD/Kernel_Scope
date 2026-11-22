import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import AboutPage from './AboutPage'

const apiMock = vi.hoisted(() => vi.fn())
vi.mock('../lib/api', () => ({ api: apiMock }))

const algorithms = [{ category: 'cpu', name: 'FCFS', label: 'First come, first served' }]

describe('documentation catalog states', () => {
  beforeEach(() => {
    apiMock.mockReset()
    apiMock.mockImplementation(async (path: string) => {
      if (path === '/health') return { status: 'ok' }
      if (path === '/algorithms') return { algorithms }
      throw new Error(`Unexpected API path ${path}`)
    })
  })

  it('offers retry when the catalog request fails, then shows its successful result', async () => {
    apiMock.mockImplementation(async (path: string) => {
      if (path === '/health') return { status: 'ok' }
      if (path === '/algorithms' && apiMock.mock.calls.filter(([requested]) => requested === '/algorithms').length === 1) {
        throw new Error('Catalog unavailable')
      }
      if (path === '/algorithms') return { algorithms }
      throw new Error(`Unexpected API path ${path}`)
    })
    render(<AboutPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Catalog unavailable')
    expect(screen.queryByText('0 registered')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading algorithm catalog' }))

    expect(await screen.findByText('First come, first served')).toBeInTheDocument()
    expect(screen.getByText('1 registered')).toBeInTheDocument()
  })

  it('shows an explicit empty catalog only after a successful empty response', async () => {
    apiMock.mockImplementation(async (path: string) => path === '/health' ? { status: 'ok' } : { algorithms: [] })
    render(<AboutPage />)

    expect(await screen.findByText('No algorithms registered')).toBeInTheDocument()
    expect(screen.getByText('0 registered')).toBeInTheDocument()
  })
})
