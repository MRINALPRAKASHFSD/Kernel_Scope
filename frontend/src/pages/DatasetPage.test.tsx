import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import DatasetPage from './DatasetPage'

const apiMock = vi.hoisted(() => vi.fn())
vi.mock('../lib/api', () => ({ api: apiMock, downloadUrl: (path: string) => `/api${path}` }))

describe('dataset loading states', () => {
  beforeEach(() => apiMock.mockReset())

  it('does not show zero dataset counts after a failed request and provides retry', async () => {
    let calls = 0
    apiMock.mockImplementation(async (path: string) => {
      if (path === undefined) return { items: [] }
      if (path === '/datasets') {
        calls += 1
        if (calls === 1) throw new Error('Dataset store unavailable')
        return { items: [] }
      }
      throw new Error(`Unexpected API path ${path}`)
    })
    const { container } = render(<DatasetPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Dataset store unavailable')
    expect(container.querySelector('.dataset-filter-row')).not.toBeInTheDocument()
    expect(screen.queryByText('No saved datasets')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading datasets' }))
    expect(await screen.findByText('No saved datasets')).toBeInTheDocument()
    expect(container.querySelector('.dataset-filter-row')).toBeInTheDocument()
    expect(calls).toBe(2)
  })
})
