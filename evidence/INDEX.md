# KernelScope: Browser evidence index

The 13 PNG files inside `evidence/browser/` are Chromium screenshots captured automatically by Playwright (`frontend/e2e/acceptance.pw.ts`) from the running KernelScope web workbench. Every capture rendered live FastAPI responses backed by an isolated temporary SQLite database seeded with `Bundled Baseline` and `Bundled Unsafe`. In addition to these captures, Playwright verified all ten routes across `375, 768, 1024, and 1440` CSS pixel widths for control visibility and zero page-level horizontal overflow.

| Screenshot | Route / view | Verified UI state |
|---|---|---|
| `browser/dashboard-dark.png` | Overview (`/`) | KernelScope shell, SQLite workspace counters, and CPU waiting-time chart in dark theme |
| `browser/cpu-scheduling.png` | CPU scheduling (`/cpu`) | Backend Gantt timeline with `IDLE`/process spans and mean waiting/turnaround cards |
| `browser/memory-resident-order.png` | Memory management (`/memory`) | `Resident-page order` cells, selected `FAULT` step, and evicted-page banner |
| `browser/banker-safe.png` | Deadlock handling (`/deadlock`) | `SAFE` verdict, `P1 -> P3 -> P0 -> P2 -> P4` sequence, and post-release resource trace |
| `browser/banker-safe-matrices.png` | Deadlock handling (`/deadlock`) | `Maximum demand`, `Current allocation`, and derived `Need` matrices |
| `browser/banker-unsafe.png` | Deadlock handling (`/deadlock`) | `UNSAFE` verdict and unfinished process list (`P0, P1`) |
| `browser/disk-scan-upper-boundary.png` | Disk scheduling (`/disk`) | `SCAN` upward route where cylinder `199` is marked `Request + SCAN endpoint` |
| `browser/analytics-persisted-results.png` | Analytics (`/analytics`) | Within-run policy chart and table loaded from a persisted integrated simulation |
| `browser/reports-persisted-results.png` | Reports (`/reports`) | `KERNELSCOPE · EXECUTION REPORT` (`KS`) view with JSON and CSV export actions |
| `browser/theme-dark.png` | Theme toggle (`/`) | KernelScope brand mark and storage movement chart in dark theme |
| `browser/theme-light.png` | Theme toggle (`/`) | Same view after switching to light theme (`data-theme="light"`) |
| `browser/responsive-375.png` | Mobile width (`/`) | Dashboard at `375 px` viewport width with storage analytics selected |
| `browser/responsive-1440.png` | Desktop width (`/`) | Dashboard at `1440 px` viewport width with storage analytics selected |

The disk acceptance test also confirms that cylinder `0` is classified as both a request stop and the lower physical `SCAN` boundary when sweeping downward, and the theme test verifies `<title>KernelScope</title>`, `/favicon.svg`, `/favicon.ico`, and `/kernelscope-mark.svg` natural image dimensions in both themes. Full test details sit in `docs/web_test_results.txt`.
