# Evidence index

The 13 PNG files inside `evidence/browser/` are real Chromium screenshots captured automatically by Playwright while exercising the running OS Resource Lab web app. Every screen rendered live FastAPI responses backed by an isolated temporary SQLite database seeded with `Bundled Baseline` and `Bundled Unsafe`. Beyond these captures, the Playwright suite checked all ten routes at 375, 768, 1024, and 1440 CSS pixels for layout bounds and horizontal overflow; the two responsive files below show the narrowest and widest dashboard views.

| Screenshot | Route / module | What it verifies |
|---|---|---|
| `browser/dashboard-dark.png` | Dashboard (`/`) | SQLite workspace counters and waiting-time chart in dark theme |
| `browser/cpu-scheduling.png` | CPU scheduling (`/cpu`) | Gantt timeline with idle/process segments and mean waiting/turnaround metrics |
| `browser/memory-resident-order.png` | Memory management (`/memory`) | Resident-page order, selected fault step, and evicted-page note |
| `browser/banker-safe.png` | Deadlock handling (`/deadlock`) | `SAFE` badge, completion order, and available-resource trace |
| `browser/banker-safe-matrices.png` | Deadlock handling (`/deadlock`) | Allocation, Maximum, and computed Need matrices |
| `browser/banker-unsafe.png` | Deadlock handling (`/deadlock`) | `UNSAFE` badge and unfinished process list |
| `browser/disk-scan-upper-boundary.png` | Disk scheduling (`/disk`) | SCAN route where cylinder `199` is both a requested stop and the upper physical boundary |
| `browser/analytics-persisted-results.png` | Analytics (`/analytics`) | Comparison chart and table loaded from a persisted integrated run |
| `browser/reports-persisted-results.png` | Reports (`/reports`) | Reopened integrated report with JSON and CSV export links |
| `browser/theme-dark.png` | Theme check (`/`) | Storage movement chart rendered in dark theme |
| `browser/theme-light.png` | Theme check (`/`) | Same storage movement chart after switching to light theme |
| `browser/responsive-375.png` | Mobile width (`/`) | Dashboard at 375 px width with storage analytics selected |
| `browser/responsive-1440.png` | Desktop width (`/`) | Dashboard at 1440 px width with storage analytics selected |

The disk e2e test also confirms that cylinder `0` is labeled as both a request stop and the lower SCAN boundary when sweeping downward. Full e2e assertions live in `frontend/e2e/acceptance.pw.ts`, with test output recorded in `docs/web_test_results.txt`.
