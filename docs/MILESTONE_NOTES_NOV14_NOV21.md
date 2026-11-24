# KernelScope: Retrospective review of November 14 and November 21 milestones

> Documentation date: Written on **2026-11-24** as a retrospective engineering record of existing Git commits on `main`. Commit timestamps and hashes below come directly from `git log` without altering repository history.

## Scope and historical context

KernelScope was built incrementally across fourteen pull requests between November 11 and November 24, 2026. Two dates in that sequence closed out major integration layers:

- **November 14, 2026 (`PR #4`, `feat/cli-reporting-and-menu`, merge `003cb95`)** connected the four standalone `os_sim` algorithm modules into a single reporting pipeline, added the batch/interactive CLI controller, and brought the Python `unittest` suite to 30 passing tests.
- **November 21, 2026 (`PR #11`, `feat/core-simulator-pages`, merge `80772b7`)** implemented the Overview dashboard and the four interactive React simulator workbenches (`Dashboard.tsx`, `CpuPage.tsx`, `MemoryPage.tsx`, `DeadlockPage.tsx`, and `DiskPage.tsx`) on top of the FastAPI persistence API.

Inspecting the full commit graph clarifies which pieces existed prior to each date so neither milestone is overstated.

---

## Milestone 1: November 14, 2026 (`PR #4`, CLI reporting, menu, and 30-test suite)

### Prerequisite commits already on `main` before November 14

Before November 14 began, three earlier branches had already landed:

- **Nov 11 (`PR #1`)**: `run.sh`, `os_sim/validation.py` (`integer`, `integer_list`, `matrix` with `type(value) is int` boolean rejection), and `samples/{baseline,unsafe,invalid}.json`.
- **Nov 12 (`PR #2`)**: `os_sim/scheduling.py` (`FCFS`, `SJF`, `RR`), `os_sim/memory.py` (`FIFO`, `LRU`, `OPT`), and initial unit tests (`SchedulingTests`, `MemoryTests`).
- **Nov 13 (`PR #3`)**: `os_sim/deadlock.py` (Banker's safety algorithm), `os_sim/storage.py` (`FCFS`, `SSTF`, and the full-sweep `SCAN` boundary fix), plus `DeadlockTests` and `StorageTests`.

### Exact commits recorded on November 14, 2026

| Commit | Timestamp (`+05:30`) | File(s) | Summary |
|---|---|---|---|
| `6d0e01c` | `2026-11-14 09:42:53` | `os_sim/reporting.py` | Added `analyze(dataset)` schema checks and `csv_file()` writer |
| `164febe` | `2026-11-14 10:51:10` | `os_sim/reporting.py` | Added dependency-free `bar_svg()` chart renderer and `write_report()` |
| `75d93f1` | `2026-11-14 12:00:27` | `os_sim/cli.py` | Added `setup_logging()`, JSON `load()`, and batch `run()` handler |
| `1ccb9e4` | `2026-11-14 13:09:44` | `os_sim/cli.py` | Added interactive `0`-`6` `menu()` loop and `argparse` `main()` |
| `846c4b5` | `2026-11-14 14:18:01` | `tests/test_simulator.py` | Added `test_all_modules_and_evidence` in `IntegrationTests` |
| `fad12bc` | `2026-11-14 15:27:18` | `tests/test_simulator.py` | Added subprocess CLI log, malformed JSON, and missing-key tests (reaching 30 tests) |
| `ccc20fd` | `2026-11-14 16:36:35` | `docs/test_results.txt` | Recorded the 30-test `unittest` run transcript |
| `a96abe6` | `2026-11-14 17:45:52` | `docs/DEMONSTRATION.md` | Drafted the 7-step CLI classroom demonstration sequence |
| `6411bb9` | `2026-11-14 18:54:09` | `docs/DEMONSTRATION.md` | Added instructor Q&A notes on tie-breaking, `OPT`, `UNSAFE`, and `SSTF` |
| `3c86cac` | `2026-11-14 20:03:26` | `README.md` | Expanded CLI quick-start commands |
| `003cb95` | `2026-11-14 21:12:43` | merge commit | Merged `PR #4` (`feat/cli-reporting-and-menu`) into `main` |

### Technical design of the November 14 CLI and reporting layer

1. **Single-pass integrated validation (`os_sim/reporting.py`)**: `analyze(dataset)` verifies that `processes`, `memory`, `deadlock`, and `storage` all exist and carry required subkeys (`frames`/`references`, `available`/`maximum`/`allocation`, and `requests`/`head`/`cylinders`) before running all ten policies (`FCFS`/`SJF`/`RR`, `FIFO`/`LRU`/`OPT`, `Banker`, and disk `FCFS`/`SSTF`/`SCAN`). Because validation runs ahead of `folder.mkdir()` in `write_report()`, bad inputs fail without creating partial CSV, SVG, or `results.json` files.
2. **Standard-library SVG charts (`bar_svg`)**: Instead of pulling in `matplotlib`, `reporting.py` computes proportional bar widths (`plot_width = 520` inside a `720x310` canvas) and escapes labels with `xml.sax.saxutils.escape`, producing `scheduling.svg`, `memory.svg`, and `storage.svg` with zero external packages.
3. **Failure handling and logging (`os_sim/cli.py`)**: `run()` wraps dataset loading and report generation in a single `try/except` catching `(OSError, UnicodeError, ValueError, KeyError, TypeError, json.JSONDecodeError)`. On failure it calls `LOG.exception(...)` to record the stack trace in `outputs/activity.log`, prints `ERROR: <message>` to `sys.stderr`, and returns exit status `2` (propagated by `exec python3 -m os_sim.cli "$@"` in `run.sh`).
4. **Menu synchronization (`menu`)**: Options `1` through `5` all call `run(current, output)` first and then print `result[selected]` from the freshly written `results.json`. That design prevents stale files in `outputs/` when a user switches datasets via option `6` and inspects a single module. Also, `EOFError` and `KeyboardInterrupt` print `Goodbye` and return `0` so piped input (`printf '7\n0\n' | ./run.sh --mode menu`) exits cleanly.

---

## Milestone 2: November 21, 2026 (`PR #11`, Overview dashboard and core simulator UIs)

### Prerequisite commits already on `main` before November 21

Between November 16 and November 20, five branches laid the backend and frontend groundwork:

- **Nov 16 to 18 (`PR #6` to `PR #8`)**: SQLAlchemy models (`datasets`, `simulation_runs`, `activity_logs`), Alembic migration `0001_initial.py`, Pydantic request validators, `/api/*` FastAPI routes, 9 `pytest` API tests, and `start_web.sh`.
- **Nov 19 to 20 (`PR #9` and `PR #10`)**: Vite/TypeScript/Tailwind setup, `styles.css` dark/light tokens, `lib/{types,api,validation,diskRoute,presentation}.ts`, shared primitives in `components/{ui,Toast}.tsx`, and the 10-route `App.tsx` shell.

### Exact commits recorded on November 21, 2026

| Commit | Timestamp (`+05:30`) | File | Summary |
|---|---|---|---|
| `cc824d9` | `2026-11-21 09:21:14` | `frontend/src/pages/Dashboard.tsx` | Scaffolded workspace counters and module launch cards |
| `fae7b79` | `2026-11-21 10:33:31` | `frontend/src/pages/Dashboard.tsx` | Added persisted run comparison chart and recent activity log |
| `cf1e68a` | `2026-11-21 11:44:48` | `frontend/src/pages/CpuPage.tsx` | Added editable process queue, quantum field, and policy checkboxes |
| `4581aee` | `2026-11-21 12:56:05` | `frontend/src/pages/CpuPage.tsx` | Added Gantt timeline with `IDLE` spans, metric cards, and bar chart |
| `268f7a2` | `2026-11-21 14:07:22` | `frontend/src/pages/MemoryPage.tsx` | Added reference sequence input, frame count, and step/autoplay controls |
| `c27b4f8` | `2026-11-21 15:19:39` | `frontend/src/pages/MemoryPage.tsx` | Added resident-page order display, eviction banner, and fault/hit chart |
| `b35c86b` | `2026-11-21 16:31:56` | `frontend/src/pages/DeadlockPage.tsx` | Added editable `Available`, `Maximum`, and `Allocation` matrix tables |
| `611e059` | `2026-11-21 17:42:13` | `frontend/src/pages/DeadlockPage.tsx` | Added `SAFE`/`UNSAFE` banner, safe sequence nodes, and `Need`/release tables |
| `196c0ff` | `2026-11-21 18:54:30` | `frontend/src/pages/DiskPage.tsx` | Added cylinder range, head position, request queue, and `SCAN` direction toggle |
| `1e853a1` | `2026-11-21 20:05:47` | `frontend/src/pages/DiskPage.tsx` | Added Recharts `ComposedChart` head route, boundary markers, and arrow trace |
| `80772b7` | `2026-11-21 21:17:04` | merge commit | Merged `PR #11` (`feat/core-simulator-pages`) into `main` |

### Technical design of the November 21 simulator pages

1. **Overview dashboard (`Dashboard.tsx`)**: Fetches `GET /api/dashboard/summary` and keeps loading skeletons, HTTP error retry banners (`LoadError`), and genuine zero-count empty databases visually distinct. Its comparison bar chart filters `recent_runs` for the newest `completed` run containing metrics in the selected domain (`cpu`, `memory`, or `storage`) so bars always share a single recorded input snapshot.
2. **CPU scheduling (`CpuPage.tsx`)**: Validates unique non-empty PIDs, non-negative arrivals, positive bursts, and positive `RR` quantum via `validateProcessRows` before posting to `POST /api/simulations/cpu`. When rendering `.gantt-track`, it walks `current.gantt` with a `cursor` starting at `0` and inserts explicit `{ pid: 'IDLE', start: cursor, end: item.start }` segments whenever `item.start > cursor`, making leading or mid-run CPU idle intervals visible alongside per-process completion, turnaround, and waiting times.
3. **Memory management (`MemoryPage.tsx`)**: Parses comma- or whitespace-separated page integers, posts to `POST /api/simulations/memory`, and supports manual step-through plus an `800 ms` `window.setInterval` autoplay. Evictions are derived by comparing `previous.frames` (when full) against `point.frames` on a `FAULT` step, and `.resident-order` carries an explicit ARIA label noting that cells show algorithm residency order rather than physical RAM slot assignments.
4. **Deadlock handling (`DeadlockPage.tsx`)**: Supports dynamic row/column resizing for processes and resource types, plus an optional `declared_totals` check verifying `available[j] + sum_i(allocation[i][j]) == totals[j]` before calling `POST /api/simulations/deadlock`. Results render the `Need` matrix, ordered `P_i` completion chain, post-release `available_after` table, and a clear note that `UNSAFE` does not imply an active deadlock.
5. **Disk scheduling (`DiskPage.tsx`)**: Calls `POST /api/simulations/disk` and transforms the returned cylinder array through `buildDiskRoute()` (`lib/diskRoute.ts`). A Recharts `ComposedChart` overlays a linear head path with distinct `Scatter` shapes for the initial head (`square`), direction reversals (`triangle`), pure `SCAN` physical endpoints at `0` or `cylinders - 1` (`diamond`), and boundary cylinders that were also explicitly requested (`star`, labeled `Request + SCAN endpoint`).

### Work completed after November 21

The remaining five workspace routes (`DatasetPage.tsx`, `HistoryPage.tsx`, `AnalyticsPage.tsx`, `ReportsPage.tsx`, and `AboutPage.tsx`) and the 26 `Vitest` unit/component tests landed on **November 22 (`PR #12`)**, followed by the 9 Playwright Chromium e2e tests and 13 browser screenshots on **November 23 (`PR #13`)**, and documentation refinements on **November 24 (`PR #14`)**.
