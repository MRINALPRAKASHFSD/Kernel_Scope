import { defineConfig } from '@playwright/test'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendRoot = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(frontendRoot, '..')
const backendPython = join(projectRoot, 'backend', '.venv', 'bin', 'python')
const backendPort = 18100
const frontendPort = 15174
const backendOrigin = `http://127.0.0.1:${backendPort}`
const frontendOrigin = `http://127.0.0.1:${frontendPort}`
const isolatedDatabase = join(tmpdir(), `os-resource-lab-playwright-${process.pid}-${Date.now()}.sqlite`)

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.pw.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: frontendOrigin,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `"${backendPython}" -m uvicorn backend.app.main:app --host 127.0.0.1 --port ${backendPort}`,
      cwd: projectRoot,
      env: {
        ...process.env,
        DATABASE_URL: `sqlite:///${isolatedDatabase}`,
        PYTHONPATH: projectRoot,
        CORS_ORIGINS: frontendOrigin,
      },
      url: `${backendOrigin}/api/health`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort} --strictPort`,
      cwd: frontendRoot,
      env: { ...process.env, VITE_API_BASE: `${backendOrigin}/api` },
      url: frontendOrigin,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
})
