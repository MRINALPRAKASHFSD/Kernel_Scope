import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import HistoryPage from './HistoryPage'

const apiMock = vi.hoisted(() => vi.fn())
vi.mock('../lib/api', () => ({ api: apiMock, downloadUrl: (path: string) => `/api${path}` }))

describe('history loading states', () => {
  beforeEach(() => apiMock.mockReset())

  it('shows an actionable load error instead of claiming history is empty', async () => {
    let calls = 0
    apiMock.mockImplementation(async (path: string) => {
      if (path === undefined) return { items: [] }
      if (path === '/simulations?limit=200') {
        calls += 1
        if (calls === 1) throw new Error('History unavailable')
        return { items: [] }
      }
      throw new Error(`Unexpected API path ${path}`)
    })
    render(<HistoryPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('History unavailable')
    expect(screen.queryByText('No simulation records')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading history' }))
    expect(await screen.findByText('No simulation records')).toBeInTheDocument()
    expect(calls).toBe(2)
  })
})
