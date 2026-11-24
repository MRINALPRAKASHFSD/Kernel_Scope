# KernelScope: Live demonstration guide

This guide provides pre-demo verification commands and a 6-minute live walkthrough of KernelScope (`MRINALPRAKASHFSD/Kernel_Scope`). All 13 Chromium screenshots in `evidence/browser/` come from Playwright running against the live FastAPI and Vite servers and are indexed in `evidence/INDEX.md`.

## Pre-demo verification

From the repository root in VS Code, verify Python 3.11+, Node.js/npm, and Bash are available, then run the full check sequence once:

```bash
./run.sh --mode demo --dataset samples/baseline.json --output outputs
python3 -m unittest discover -s tests -v
PYTHONPATH=. backend/.venv/bin/python -m pytest backend/tests -q
npm --prefix frontend test
npm --prefix frontend run test:e2e
(cd frontend && npx tsc -b --pretty false)
npm --prefix frontend run build
```

Expected outcome: all 74 automated tests pass (30 CLI `unittest`, 9 backend `pytest`, 26 frontend `Vitest`, and 9 Playwright Chromium tests), `tsc -b` succeeds, and `vite build` completes cleanly. Playwright spins up dedicated test ports (`18100` and `15174`) over a temporary SQLite file so your saved workspace database stays untouched.

## Live walkthrough sequence in VS Code

1. Open a terminal at the repository root and launch KernelScope:

   ```bash
   ./start_web.sh
   ```

   Once `KernelScope is running.` prints, open `http://localhost:5173` (with FastAPI OpenAPI docs at `http://localhost:8000/docs`). Leave this terminal open to show `outputs/web-backend.log` and `outputs/web-frontend.log`; press Ctrl+C afterward to stop both processes.

2. On **Overview** (`/`), point out the KernelScope sidebar header, live Python API connection dot, SQLite counters (`Saved simulation runs`, `Available algorithms`, `Saved datasets`, `Failed simulations`), recent activity log, and domain comparison chart (`evidence/browser/dashboard-dark.png`). Toggle light and dark themes once (`evidence/browser/theme-light.png`).

3. Open **CPU scheduling** (`/cpu`), click `Load baseline`, and click `Run comparison`. Step across the `FCFS`, `SJF`, and `RR` tabs to show the Gantt timeline (including synthesized `IDLE` spans), per-process completion/turnaround/waiting table, and comparison bar chart (`evidence/browser/cpu-scheduling.png`).

4. Open **Memory management** (`/memory`), click `Load baseline`, and run `FIFO`, `LRU`, and `OPT`. Step through reference chips to show a `HIT`, a `FAULT`, the `Resident-page order` cards, and the evicted-page banner (`evidence/browser/memory-resident-order.png`).

5. Open **Deadlock handling** (`/deadlock`). Click `Load safe sample` and `Run safety check` to show `SAFE`, `P1 -> P3 -> P0 -> P2 -> P4`, the `Need` matrix, and post-release `Available` counts (`evidence/browser/banker-safe.png`, `evidence/browser/banker-safe-matrices.png`). Then click `Load unsafe sample` and `Run safety check` to show `UNSAFE` and unfinished `P0, P1` (`evidence/browser/banker-unsafe.png`), noting why `UNSAFE` indicates deadlock risk rather than an active deadlock.

6. Open **Storage scheduling** (`/disk`), run `FCFS`, `SSTF`, and `SCAN`, and select `SCAN`. Point out the initial head, `Up`/`Down` toggle, cylinder `199` or `0` physical endpoint marker, and total cylinder movement (`evidence/browser/disk-scan-upper-boundary.png`).

7. Visit **Datasets** (`/datasets`) to show `Bundled Baseline`, `Bundled Unsafe`, and JSON import/export. Open **Run history** (`/history`) to show stored input snapshots and replay, **Analytics** (`/analytics`) to compare policies within a stored run (`evidence/browser/analytics-persisted-results.png`), and **Reports** (`/reports`) to show the `KERNELSCOPE · EXECUTION REPORT` view plus JSON/CSV downloads (`evidence/browser/reports-persisted-results.png`).

8. In a second terminal, run the CLI commands to show identical results from the Bash/Python path:

   ```bash
   ./run.sh --mode demo --dataset samples/baseline.json --output outputs
   ./run.sh --mode demo --dataset samples/unsafe.json --output outputs/unsafe_case
   ./run.sh --mode demo --dataset samples/invalid.json --output outputs/invalid_case
   ```

   Point out exit status `2` and `ERROR: arrival must be an integer >= 0` on `invalid.json`, then open `outputs/scheduling.svg`, `outputs/memory.svg`, and `outputs/storage.svg`.

## Browser screenshot notes

Playwright captures 13 PNGs in `evidence/browser/` from live API responses, including dark/light themes and `375 px` / `1440 px` viewports, while also checking `768 px` and `1024 px` across all ten routes. Run `npm --prefix frontend run test:e2e` anytime UI styles or labels change to keep those screenshots synchronized.

## 6-minute spoken script

### 0:00 to 0:40: Architecture and shared engine

"This is KernelScope, an operating-system resource simulation and algorithm analytics workbench. It pairs our standard-library Python and Bash simulator with a local React, TypeScript, FastAPI, and SQLite web interface. Both the CLI and the web API call the exact same functions inside `os_sim/`, so none of the scheduling, paging, deadlock, or disk calculations are duplicated in JavaScript."

### 0:40 to 1:10: API validation and SQLite snapshots

"When the browser submits a workload, Pydantic checks types, unique IDs, matrix shapes, and cylinder bounds before execution. FastAPI calls `os_sim`, writes both the raw input snapshot and computed trace into SQLite, and returns that stored record to React. Alembic manages the schema migration, and startup seeding loads our baseline and unsafe fixtures automatically."

### 1:10 to 2:00: CPU scheduling

"On the CPU workbench, FCFS, non-preemptive SJF, and Round Robin with quantum 2 run against the same four processes. The Gantt bar renders backend dispatch intervals and inserts explicit `IDLE` blocks whenever the CPU waits for the next arrival. On this baseline, SJF reaches the lowest mean waiting time of 4 time units by running `P3` ahead of the two 4-unit jobs once `P1` completes."

### 2:00 to 2:45: Memory page replacement

"In Memory management, FIFO, LRU, and Optimal step through 13 page references across 3 frames. Clicking any reference shows the resident page order, whether the access hit or faulted, and which page was evicted. Optimal drops faults to 7 using future lookahead, so the UI explicitly labels it as an offline benchmark rather than a live kernel policy."

### 2:45 to 3:35: Banker's safety analysis

"On Deadlock handling, Banker's algorithm computes `Need = Maximum - Allocation` and checks whether processes can finish within `Available` resources. The baseline snapshot completes safely in order `P1, P3, P0, P2, P4`. Loading the unsafe sample leaves `P0` and `P1` unfinished. That `UNSAFE` badge means deadlock avoidance cannot be guaranteed under worst-case requests, not that processes are deadlocked right now."

### 3:35 to 4:20: Disk arm scheduling

"On Disk scheduling, FCFS, SSTF, and full-sweep SCAN run on the same 8-request queue starting at head 53. SSTF lowers travel to 236 cylinders, while upward SCAN sweeps through cylinder 199 before reversing to 37 and 14 for 331 cylinders. The route chart uses distinct markers so requested cylinders and physical SCAN endpoints remain clear even when a request lands directly on cylinder 0 or 199."

### 4:20 to 5:10: Datasets, history, analytics, and reports

"Every simulation run stores its own input snapshot, so editing or deleting a dataset later never invalidates older reports. From History, Analytics, and Reports, I can replay a stored snapshot, compare policies sharing an input fingerprint, print a KernelScope execution summary, or export JSON and CSV alongside the CLI's SVG charts."

### 5:10 to 6:00: Verification and wrap-up

"Reliability is verified by 74 passing automated tests across four layers: 30 CLI `unittest` cases, 9 backend `pytest` tests, 26 `Vitest` tests, and 9 Playwright Chromium tests across ten routes and four viewport widths, plus clean TypeScript and production builds. Malformed CLI inputs exit with code 2, and invalid API requests log rejected activity with HTTP 422 without creating completed runs."
