export type DiskRoutePoint = {
  step: number
  cylinder: number
  physicalEndpoint: boolean
  requestStop: boolean
  directionChange: boolean
  initialHead: boolean
  kind: string
}

export type DiskRouteLegendItem = { key: string; label: string; marker: string }

export function buildDiskRoute(
  route: number[],
  algorithm: string,
  direction: string | null,
  cylinders: number,
  requests: number[],
): DiskRoutePoint[] {
  const endpoint = direction === 'down' ? 0 : cylinders - 1
  const requestSet = new Set(requests)

  return route.map((cylinder, step) => {
    const physicalEndpoint = algorithm === 'SCAN' && cylinder === endpoint
    const requestStop = requestSet.has(cylinder)
    const previousDelta = step > 0 ? cylinder - route[step - 1] : 0
    const nextDelta = step < route.length - 1 ? route[step + 1] - cylinder : 0
    const directionChange = previousDelta !== 0 && nextDelta !== 0 && Math.sign(previousDelta) !== Math.sign(nextDelta)
    const initialHead = step === 0
    const roles = [
      ...(initialHead ? ['Initial head'] : []),
      ...(requestStop ? ['request stop'] : []),
      ...(physicalEndpoint ? ['physical SCAN endpoint'] : []),
      ...(directionChange ? ['direction change'] : []),
    ]

    return {
      step,
      cylinder,
      physicalEndpoint,
      requestStop,
      directionChange,
      initialHead,
      kind: roles.length ? roles.join(' and ') : step === route.length - 1 ? 'Route end' : 'Head movement',
    }
  })
}

export function buildDiskRouteLegend(points: DiskRoutePoint[]): DiskRouteLegendItem[] {
  const categories: Array<DiskRouteLegendItem & { visible: (point: DiskRoutePoint) => boolean }> = [
    { key: 'initial-head', label: 'Initial head', marker: 'square', visible: point => point.initialHead },
    { key: 'request-stop', label: 'Request stop', marker: 'circle', visible: point => point.requestStop && !point.physicalEndpoint && !point.initialHead },
    { key: 'direction-change', label: 'Direction change', marker: 'triangle', visible: point => point.directionChange && !point.physicalEndpoint },
    { key: 'scan-endpoint', label: 'Physical SCAN endpoint', marker: 'diamond', visible: point => point.physicalEndpoint && !point.requestStop },
    { key: 'request-endpoint', label: 'Request + SCAN endpoint', marker: 'combined', visible: point => point.physicalEndpoint && point.requestStop },
  ]
  return categories.filter(category => points.some(category.visible)).map(({ key, label, marker }) => ({ key, label, marker }))
}
