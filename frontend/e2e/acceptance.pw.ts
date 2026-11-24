import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const backendOrigin = 'http://127.0.0.1:18100'
const evidenceDirectory = resolve(process.cwd(), '..', 'evidence', 'browser')
const browserErrors = new WeakMap<Page, string[]>()
let baselineRunId = 0

const navigation = [
  { label: 'Overview', path: '/', heading: 'Simulation workspace' },
  { label: 'Analytics', path: '/analytics', heading: 'Algorithm analytics' },
  { label: 'Datasets', path: '/datasets', heading: 'Dataset manager' },
  { label: 'Run history', path: '/history', heading: 'Simulation history' },
  { label: 'Reports', path: '/reports', heading: 'Reports & exports' },
  { label: 'CPU scheduling', path: '/cpu', heading: 'CPU scheduling' },
  { label: 'Memory management', path: '/memory', heading: 'Memory management' },
  { label: 'Deadlock handling', path: '/deadlock', heading: 'Deadlock handling' },
  { label: 'Storage scheduling', path: '/disk', heading: 'Disk scheduling' },
  { label: 'About & docs', path: '/about', heading: 'About KernelScope' },
]

async function capture(page: Page, filename: string, fullPage = false) {
  mkdirSync(dirname(resolve(evidenceDirectory, filename)), { recursive: true })
  await page.screenshot({ path: resolve(evidenceDirectory, filename), fullPage, animations: 'disabled' })
}

async function dismissToasts(page: Page) {
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' })
  while (await dismiss.count()) await dismiss.first().click()
}

test.beforeAll(async ({ request }) => {
  mkdirSync(evidenceDirectory, { recursive: true })
  const datasetsResponse = await request.get(`${backendOrigin}/api/datasets`)
  expect(datasetsResponse.ok()).toBeTruthy()
  const datasets = (await datasetsResponse.json()).items as Array<{ id: number; name: string; config: unknown }>
  const baseline = datasets.find(dataset => dataset.name === 'Bundled Baseline')
  expect(baseline, 'the isolated database should be seeded with the bundled baseline').toBeTruthy()

  // Persist a genuine integrated result from the bundled dataset for analytics and reports.
  const runResponse = await request.post(`${backendOrigin}/api/simulations/integrated`, {
    data: { dataset_id: baseline!.id, dataset: baseline!.config },
  })
  expect(runResponse.ok()).toBeTruthy()
  baselineRunId = (await runResponse.json()).id as number
})

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  browserErrors.set(page, errors)
  page.on('pageerror', error => errors.push(`uncaught: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
})

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? [], 'uncaught browser or application console errors').toEqual([])
})

test('dashboard displays measured statistics from the isolated SQLite database', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Simulation workspace' })).toBeVisible()
  const stats = page.locator('[aria-label="Workspace statistics"]')
  await expect(stats).toContainText('Saved simulation runs1')
  await expect(stats).toContainText('Available algorithms10')
  await expect(stats).toContainText('Saved datasets2')
  await expect(stats).toContainText('Failed simulations0')
  await expect(page.getByRole('group', { name: 'Average waiting time by algorithm' })).toBeVisible()
  await capture(page, 'dashboard-dark.png', true)
})

test('all ten primary navigation routes load through the application shell', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Primary navigation' })
  for (const item of navigation) {
    await nav.getByRole('link', { name: item.label, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(item.path === '/' ? '/$' : `${item.path}$`))
    await expect(page.getByRole('heading', { name: item.heading, exact: true })).toBeVisible()
  }
})

test('CPU scheduling renders the backend Gantt order and timing, including idle spans', async ({ page }) => {
  await page.goto('/cpu')
  await page.getByRole('button', { name: 'Load baseline' }).click()
  const responsePromise = page.waitForResponse(response =>
    response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/simulations/cpu',
  )
  await page.getByRole('button', { name: /Run comparison/ }).click()
  const response = await responsePromise
  expect(response.ok()).toBeTruthy()
  const run = await response.json()
  const result = run.result.algorithms.find((item: { algorithm: string }) => item.algorithm === 'FCFS')
  expect(result, 'FCFS result should be present in the live API response').toBeTruthy()

  const expectedTimeline: Array<{ pid: string; start: number; end: number }> = []
  let cursor = 0
  for (const segment of result.gantt as Array<{ pid: string; start: number; end: number }>) {
    if (segment.start > cursor) expectedTimeline.push({ pid: 'IDLE', start: cursor, end: segment.start })
    expectedTimeline.push(segment)
    cursor = segment.end
  }
  const rendered = await page.locator('.gantt-segment').evaluateAll(elements => elements.map(element => ({
    pid: element.querySelector('b')?.textContent?.trim(),
    time: element.querySelector('small')?.textContent?.trim(),
  })))
  expect(rendered).toEqual(expectedTimeline.map(segment => ({ pid: segment.pid, time: `${segment.start}–${segment.end}` })))
  await expect(page.locator('.cpu-primary-metrics')).toContainText('Average waiting time')
  await expect(page.locator('.cpu-primary-metrics')).toContainText('Average turnaround time')
  await dismissToasts(page)
  await capture(page, 'cpu-scheduling.png')
})

test('memory trace labels resident order, hits, faults, and an actual replacement', async ({ page }) => {
  await page.goto('/memory')
  await page.getByRole('button', { name: 'Load baseline' }).click()
  const responsePromise = page.waitForResponse(response =>
    response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/simulations/memory',
  )
  await page.getByRole('button', { name: /Run comparison/ }).click()
  const response = await responsePromise
  expect(response.ok()).toBeTruthy()
  const run = await response.json()
  const fifo = run.result.algorithms.find((item: { algorithm: string }) => item.algorithm === 'FIFO')
  expect(fifo, 'FIFO result should come from the live API response').toBeTruthy()

  const trace = fifo.trace as Array<{ step: number; page: number; result: string; frames: number[] }>
  const replacementIndex = trace.findIndex((point, index) =>
    index > 0 && trace[index - 1].frames.length === fifo.frames && point.result === 'FAULT',
  )
  const hitIndex = trace.findIndex(point => point.result === 'HIT')
  expect(replacementIndex).toBeGreaterThan(0)
  expect(hitIndex).toBeGreaterThanOrEqual(0)

  const replacement = trace[replacementIndex]
  const evicted = trace[replacementIndex - 1].frames.find(pageNumber => !replacement.frames.includes(pageNumber))
  await page.getByRole('button', { name: `Reference ${replacement.step}, page ${replacement.page}, FAULT` }).click()
  await expect(page.getByText('Resident-page order', { exact: true })).toBeVisible()
  await expect(page.locator('.resident-order')).toHaveAttribute('aria-label', /not physical frame positions/)
  await expect(page.locator('.replacement-note')).toContainText(`Page ${evicted} was evicted to load page ${replacement.page}.`)
  await dismissToasts(page)
  await capture(page, 'memory-resident-order.png')

  const hit = trace[hitIndex]
  await page.getByRole('button', { name: `Reference ${hit.step}, page ${hit.page}, HIT` }).click()
  await expect(page.locator('.result-badge')).toHaveText('HIT')
  await expect(page.getByRole('button', { name: /FAULT/ }).first()).toBeVisible()
})

test('Banker safe and unsafe samples show their real API results', async ({ page }) => {
  await page.goto('/deadlock')

  let responsePromise = page.waitForResponse(response =>
    response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/simulations/deadlock',
  )
  await page.getByRole('button', { name: 'Load safe sample' }).click()
  await page.getByRole('button', { name: 'Run safety check' }).click()
  let response = await responsePromise
  expect(response.ok()).toBeTruthy()
  let result = (await response.json()).result
  expect(result.safe).toBe(true)
  await expect(page.locator('.result-badge')).toHaveText(/SAFE/)
  await expect(page.getByText('Need matrix', { exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Safe process completion sequence' })).toBeVisible()
  await expect(page.getByText('Available resources after each completion')).toBeVisible()
  await dismissToasts(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture(page, 'banker-safe.png')
  await page.getByText('Need matrix', { exact: true }).scrollIntoViewIfNeeded()
  await capture(page, 'banker-safe-matrices.png')

  responsePromise = page.waitForResponse(response =>
    response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/simulations/deadlock',
  )
  await page.getByRole('button', { name: 'Load unsafe sample' }).click()
  await page.getByRole('button', { name: 'Run safety check' }).click()
  response = await responsePromise
  expect(response.ok()).toBeTruthy()
  result = (await response.json()).result
  expect(result.safe).toBe(false)
  await expect(page.locator('.result-badge')).toHaveText(/UNSAFE/)
  await expect(page.getByText('Need matrix', { exact: true })).toBeVisible()
  await expect(page.getByText(/Unfinished processes:/)).toBeVisible()
  await dismissToasts(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture(page, 'banker-unsafe.png')
})

test('disk SCAN identifies requests that coincide with either physical endpoint', async ({ page }) => {
  await page.goto('/disk')
  await page.getByLabel('Cylinder count').fill('200')
  await page.getByLabel('Initial head').fill('50')
  await page.getByLabel('Request queue').fill('0, 199')
  await page.locator('.direction-picker').getByRole('button', { name: 'Up', exact: true }).click()

  const runAndSelectScan = async () => {
    const responsePromise = page.waitForResponse(response =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/simulations/disk',
    )
    await page.getByRole('button', { name: /Run comparison/ }).click()
    const response = await responsePromise
    expect(response.ok()).toBeTruthy()
    const run = await response.json()
    const scan = run.result.algorithms.find((item: { algorithm: string }) => item.algorithm === 'SCAN')
    expect(scan, 'SCAN route should come from the live API response').toBeTruthy()
    await page.getByRole('button', { name: 'SCAN', exact: true }).click()
    return scan
  }

  const up = await runAndSelectScan()
  expect(up.route).toContain(199)
  await expect(page.locator('.route-step b[title*="request stop"][title*="physical SCAN endpoint"]')).toHaveText('199')
  await expect(page.getByText('Request + SCAN endpoint', { exact: true })).toBeVisible()
  await dismissToasts(page)
  await capture(page, 'disk-scan-upper-boundary.png')

  await page.locator('.direction-picker').getByRole('button', { name: 'Down', exact: true }).click()
  const down = await runAndSelectScan()
  expect(down.route).toContain(0)
  await expect(page.locator('.route-step b[title*="request stop"][title*="physical SCAN endpoint"]')).toHaveText('0')
})

test('analytics and reports display the persisted integrated result', async ({ page }) => {
  await page.goto('/analytics')
  await page.getByLabel('Persisted input and run').selectOption(String(baselineRunId))
  await expect(page.getByRole('group', { name: 'Average waiting time by algorithm' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'FCFS', exact: true })).toBeVisible()
  await expect(page.locator('.run-context')).toContainText(`Run #${baselineRunId}`)
  await capture(page, 'analytics-persisted-results.png')

  await page.goto('/reports')
  await page.getByLabel('Completed simulation').selectOption(String(baselineRunId))
  await expect(page.getByRole('heading', { name: 'Integrated resource simulation' })).toBeVisible()
  await expect(page.getByText('Bundled Baseline', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: `Download JSON for run ${baselineRunId}` })).toBeVisible()
  await capture(page, 'reports-persisted-results.png')
})

test('theme toggle changes the rendered document theme', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('KernelScope')
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute('href', '/favicon.svg')
  await expect(page.locator('link[rel="icon"][type="image/x-icon"]')).toHaveAttribute('href', '/favicon.ico')
  await expect(page.locator('.brand b')).toHaveText('KernelScope')
  const brandMark = page.locator('.brand-mark')
  await expect(brandMark).toBeVisible()
  await expect(brandMark).toHaveAttribute('src', '/kernelscope-mark.svg')
  await expect.poll(() => brandMark.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await page.getByLabel('Resource domain').selectOption('storage')
  await expect(page.getByRole('group', { name: 'Total head movement by algorithm' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await capture(page, 'theme-dark.png')

  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light')
  await expect(brandMark).toBeVisible()
  await expect.poll(() => brandMark.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await capture(page, 'theme-light.png')

  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('responsive pages fit at target widths without clipping controls or page-level overflow', async ({ page }) => {
  test.setTimeout(180_000)
  const widths = [375, 768, 1024, 1440]
  const primaryControls: Record<string, { role: 'button' | 'link' | 'combobox'; name: string | RegExp }> = {
    '/': { role: 'link', name: /CPU scheduling/ },
    '/analytics': { role: 'combobox', name: 'Resource domain' },
    '/datasets': { role: 'button', name: 'New dataset' },
    '/history': { role: 'button', name: 'Refresh' },
    '/reports': { role: 'combobox', name: 'Completed simulation' },
    '/cpu': { role: 'button', name: /Run comparison/ },
    '/memory': { role: 'button', name: /Run comparison/ },
    '/deadlock': { role: 'button', name: 'Run safety check' },
    '/disk': { role: 'button', name: /Run comparison/ },
    '/about': { role: 'link', name: /Open \/docs/ },
  }

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    for (const item of navigation) {
      await page.goto(item.path)
      await expect(page.getByRole('heading', { name: item.heading, exact: true })).toBeVisible()
      const control = page.getByRole(primaryControls[item.path].role, { name: primaryControls[item.path].name }).first()
      await expect(control).toBeVisible()
      const box = await control.boundingBox()
      expect(box, `${item.path} primary control should have a visible layout box at ${width}px`).not.toBeNull()
      expect(box!.x, `${item.path} control left edge at ${width}px`).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width, `${item.path} control right edge at ${width}px`).toBeLessThanOrEqual(width + 1)

      const pageWidth = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))
      expect(pageWidth, `${item.path} should not create page-level horizontal overflow at ${width}px`).toBeLessThanOrEqual(width + 1)
      if (item.path === '/' && (width === 375 || width === 1440)) {
        await expect(page.locator('[aria-label="Workspace statistics"]')).toBeVisible()
        await page.getByLabel('Resource domain').selectOption('storage')
        await expect(page.getByRole('group', { name: 'Total head movement by algorithm' })).toBeVisible()
        await capture(page, `responsive-${width}.png`, true)
      }
    }
  }

  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'CPU scheduling' }).click()
  await expect(page.getByRole('heading', { name: 'CPU scheduling' })).toBeVisible()
})
