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
  { label: 'About & docs', path: '/about', heading: 'About OS Resource Lab' },
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

