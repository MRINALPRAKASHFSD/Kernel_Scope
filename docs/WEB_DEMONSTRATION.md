# OS Resource Lab: Live demonstration guide

This guide lays out reproducible setup checks and a 6-minute live walkthrough for `Kernel_Scope`. All 13 Chromium screenshots in `evidence/browser/` come from automated Playwright runs against the real backend and are listed by route in `evidence/INDEX.md`.

## Pre-demo check

Open the `Kernel_Scope` root in VS Code, confirm Python 3.11+, Node.js/npm, and Bash are installed, and run the verification suite once before going live:

```bash
./run.sh --mode demo --dataset samples/baseline.json --output outputs
python3 -m unittest discover -s tests -v
PYTHONPATH=. backend/.venv/bin/pytest backend/tests -q
npm --prefix frontend test
npm --prefix frontend run test:e2e
(cd frontend && npx tsc -b --pretty false)
npm --prefix frontend run build
```

All 74 automated tests should pass (30 CLI, 9 backend, 26 frontend, and 9 Playwright), followed by clean TypeScript and production Vite builds. Playwright starts isolated local servers over a temporary SQLite file so your saved workspace data stays untouched. Re-run these checks anytime you edit code or sample files before presenting.

## Step-by-step walkthrough in VS Code

1. Open a terminal at the project root and launch both servers:

   ```bash
   ./start_web.sh
   ```

   Once the script prints the local URLs, open `http://localhost:5173` (with OpenAPI docs at `http://localhost:8000/docs`). Leave this terminal running so you can point out the backend and frontend logs, and press Ctrl+C at the end to free ports 5173 and 8000.

2. Start on the Overview dashboard (`/`). Point out the live API status pill, saved dataset and run counters, recent activity feed, and comparison chart (`evidence/browser/dashboard-dark.png`).

3. Go to CPU scheduling (`/cpu`), click `Load baseline`, and run the comparison. Switch across the `FCFS`, `SJF`, and `RR` tabs to show how the Gantt timeline, idle blocks, per-process table, and bar chart all come from the same four-process input (`evidence/browser/cpu-scheduling.png`).

4. Open Memory management (`/memory`) and run `FIFO`, `LRU`, and `OPT` on the baseline stream. Step forward and back through the reference buttons to show a hit, a fault, and which resident page got evicted (`evidence/browser/memory-resident-order.png`).

5. Open Deadlock handling (`/deadlock`). Load and run the safe sample first to show the `Need` matrix, completion order, and available-resource trace (`evidence/browser/banker-safe.png` and `evidence/browser/banker-safe-matrices.png`). Then load and run the unsafe sample (`evidence/browser/banker-unsafe.png`), pointing out the unfinished processes and explaining why an unsafe snapshot indicates risk rather than an active deadlock.

6. Open Storage scheduling (`/disk`), run a comparison, and switch to the `SCAN` tab. Point out the starting head, direction toggle, physical boundary stop (`199` when sweeping up, `0` when sweeping down), and counted movement (`evidence/browser/disk-scan-upper-boundary.png`).

7. Visit Datasets (`/datasets`) to show the seeded baseline/unsafe records and validation on edit. Then open Run history (`/history`), jump into Reports (`/reports`) to download JSON or CSV (`evidence/browser/reports-persisted-results.png`), and show Analytics (`/analytics`) comparing policies from a saved run (`evidence/browser/analytics-persisted-results.png`).

8. In a second terminal, run the CLI batch commands to show that the Bash and Python path produces the exact same numbers:

   ```bash
   ./run.sh --mode demo --dataset samples/baseline.json --output outputs
   ./run.sh --mode demo --dataset samples/unsafe.json --output outputs/unsafe_case
   ```

   Next, run the corrupted sample to demonstrate exit code `2` and stderr reporting:

   ```bash
   ./run.sh --mode demo --dataset samples/invalid.json --output outputs/invalid_case
   ```

   If time permits, run `./run.sh --mode menu` and enter `0` to show interactive mode exiting cleanly.

9. Open `outputs/scheduling.svg`, `outputs/memory.svg`, and `outputs/storage.svg` to show the standalone CLI charts alongside the web app.

## Notes on captured browser screenshots

Playwright writes 13 PNG files into `evidence/browser/` while testing the live app, covering the dark/light dashboard, CPU Gantt view, memory replacement trace, safe and unsafe Banker runs, disk SCAN upper-boundary request, persisted analytics and reports, and 375 px plus 1440 px viewports. The e2e suite also checks 768 px and 1024 px across all ten routes to catch clipped controls or horizontal scrollbars. Running `npm --prefix frontend run test:e2e` regenerates all 13 captures cleanly.

## Spoken walkthrough script (around 6 minutes)

### 0:00 to 0:40: Project goal and shared engine

"This is OS Resource Lab inside the `Kernel_Scope` repository. It combines our Python-and-Bash operating-system simulator with a local React, TypeScript, FastAPI, and SQLite web application. Both interfaces call the exact same functions inside `os_sim/`, so none of the scheduling, paging, deadlock, or disk math is reimplemented in the browser."

### 0:40 to 1:10: Validation and SQLite storage

"When I submit a workload in the UI, Pydantic validates types, bounds, and matrix dimensions at the API boundary. The backend service calls `os_sim`, stores both the raw input snapshot and computed trace in SQLite, and sends that saved record back to React. Alembic manages the schema, and startup seeding loads baseline and unsafe examples automatically."

### 1:10 to 2:00: CPU scheduling

"On the CPU page, I'm running FCFS, non-preemptive SJF, and Round Robin with quantum 2 against the same four processes. The Gantt bar comes straight from the Python trace, including any idle intervals. Below it, we get per-process completion, turnaround, and waiting times, where SJF reaches the lowest mean wait of 4 time units on this workload."

### 2:00 to 2:45: Memory page replacement

"In Memory management, FIFO, LRU, and Optimal process the same 13-page reference stream across 3 frames. Stepping through individual references shows the resident page order, whether the access was a hit or fault, and which page was evicted. Optimal hits 7 faults by looking ahead at future references, so the UI marks it as an offline benchmark rather than a live kernel policy."

### 2:45 to 3:35: Banker's safety check

"On the Deadlock screen, Banker's algorithm subtracts Allocation from Maximum to get Need and checks whether processes can finish using currently available units. The safe sample finishes in order `P1, P3, P0, P2, P4`, releasing allocations at each step. Switching to the unsafe sample leaves `P0` and `P1` unfinished. That unsafe status means we cannot guarantee deadlock avoidance under worst-case requests, not that the processes are deadlocked right now."

### 3:35 to 4:20: Disk arm scheduling

"On the Disk page, FCFS, SSTF, and SCAN run over the same cylinder queue. SSTF cuts total movement to 236 cylinders here, while full-sweep SCAN travels to cylinder 199 before reversing downward for 331 cylinders. Notice how the route chart distinguishes requested stops from SCAN's physical boundary turn and counts the boundary sweep in total movement."

### 4:20 to 5:10: Datasets, history, analytics, and exports

"Every run saves its own input snapshot, so editing or deleting a dataset later never breaks historical reports. From History, Analytics, and Reports, I can reopen past runs, compare policies that shared an identical input fingerprint, or export results as JSON and CSV, matching the CLI's JSON, CSV, and SVG files."

### 5:10 to 6:00: Testing and wrap-up

"Reliability is backed by 74 automated tests: 30 CLI `unittest` cases, 9 backend `pytest` tests, 26 `Vitest` tests, and 9 Playwright browser tests across ten routes and four screen widths, plus clean TypeScript and production builds. Invalid inputs fail with status 2 in the CLI or 422 in the API without creating bad run records. That covers all five project phases from initial design through verification."
