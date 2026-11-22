import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import AnalyticsPage from './AnalyticsPage'

const apiMock = vi.hoisted(() => vi.fn())
vi.mock('../lib/api', () => ({ api: apiMock }))

describe('analytics loading states', () => {
  beforeEach(() => apiMock.mockReset())

  it('separates a failed run-history request from a successful empty result and retries', async () => {
    let calls = 0
    apiMock.mockImplementation(async (path: string) => {
      if (path === undefined) return { items: [] }
      if (path === '/simulations?limit=200') {
        calls += 1
        if (calls === 1) throw new Error('Analytics history unavailable')
        return { items: [] }
      }
      throw new Error(`Unexpected API path ${path}`)
    })
    render(<AnalyticsPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Analytics history unavailable')
    expect(screen.queryByText('No compatible stored runs')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading analytics' }))
    expect(await screen.findByText('No compatible stored runs')).toBeInTheDocument()
    expect(screen.getByText('No runs to analyze')).toBeInTheDocument()
    expect(calls).toBe(2)
  })
})
