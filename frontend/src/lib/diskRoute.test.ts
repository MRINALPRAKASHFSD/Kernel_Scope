import { describe, expect, it } from 'vitest'
import { buildDiskRoute, buildDiskRouteLegend } from './diskRoute'

describe('disk route markers', () => {
  it.each([
    { cylinder: 99, direction: 'up', route: [50, 99, 0] },
    { cylinder: 0, direction: 'down', route: [50, 0, 99] },
  ])('marks boundary request $cylinder as both request and SCAN endpoint', ({ cylinder, direction, route }) => {
    const points = buildDiskRoute(route, 'SCAN', direction, 100, [cylinder])
    const boundaryRequest = points.find(point => point.cylinder === cylinder)

    expect(boundaryRequest).toMatchObject({ requestStop: true, physicalEndpoint: true })
    expect(boundaryRequest?.kind).toContain('request stop')
    expect(boundaryRequest?.kind).toContain('physical SCAN endpoint')
    expect(buildDiskRouteLegend(points)).toContainEqual(expect.objectContaining({ label: 'Request + SCAN endpoint', marker: 'combined' }))
  })

  it('does not label a boundary request as a SCAN endpoint when the sweep reaches the opposite side', () => {
    const downSweep = buildDiskRoute([50, 0, 99], 'SCAN', 'down', 100, [99])
    const request = downSweep.find(point => point.cylinder === 99)

    expect(request).toMatchObject({ requestStop: true, physicalEndpoint: false })
  })
})
