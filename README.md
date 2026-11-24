# OS Resource Lab (Kernel_Scope)

`Kernel_Scope` hosts OS Resource Lab, an operating-system resource management and algorithm analytics project built around a shared Python simulation engine (`os_sim/`). You can run it from the terminal through a Bash-and-Python CLI or open it in the browser through a React, TypeScript, FastAPI, and SQLite web app. Both paths call the same Python implementations, so the browser never duplicates scheduling, memory, deadlock, or disk math in JavaScript.

## Requirements and setup

The original command-line simulator needs Python 3.9+, Bash, and a terminal. It relies only on the Python standard library.

The web interface needs Python 3.11+ and Node.js with npm. Everything runs locally without external paid services or API keys. You can check your local versions with `python3 --version` and `bash --version`.

macOS, Linux, and WSL run all scripts directly. On Windows PowerShell without Bash, you can still run `python -m os_sim.cli --mode demo`, though the Bash launcher checks require Bash, WSL, or Git Bash.

From the repository root (`Kernel_Scope`):

```bash
chmod +x run.sh
./run.sh --mode demo --dataset samples/baseline.json --output outputs
./run.sh --mode menu
python3 -m unittest discover -s tests -v
```

In menu mode, the simulator loads `samples/baseline.json` by default. Option 6 switches to another JSON file, and option 5 writes all comparison files at once. You can also pass `--dataset path/to/file.json` directly on the command line without touching code.

## Running the web application

The web app adds saved datasets, run history, activity logs, side-by-side comparisons, and JSON or CSV downloads. Running `start_web.sh` sets up `backend/.venv` if it does not exist yet, installs Python and npm dependencies, runs the Alembic schema migration, and starts both local servers without modifying your system Python setup.

```bash
./start_web.sh
# Web UI: http://localhost:5173
# OpenAPI docs: http://localhost:8000/docs
# Stop both servers with Ctrl+C
```

If you prefer running the backend and frontend in two separate terminals:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
npm --prefix frontend install
cp .env.example .env   # optional; defaults work out of the box
PYTHONPATH=. backend/.venv/bin/alembic -c backend/alembic.ini upgrade head
PYTHONPATH=. backend/.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
# In a second terminal:
npm --prefix frontend run dev -- --host 127.0.0.1
```

By default, SQLite writes to `backend/data/os_resource_lab.db`. When the API starts on an empty database, it seeds the bundled baseline and unsafe datasets once. You can override `DATABASE_URL` and `CORS_ORIGINS` in `.env`. FastAPI listens on `127.0.0.1:8000` and Vite listens on `127.0.0.1:5173`, proxying `/api` requests to FastAPI.

To run or check database migrations manually:

```bash
PYTHONPATH=. backend/.venv/bin/alembic -c backend/alembic.ini upgrade head
PYTHONPATH=. backend/.venv/bin/alembic -c backend/alembic.ini current
```

The initial migration lives at `backend/alembic/versions/0001_initial.py`. Local `.db` files stay untracked in Git.

To run the backend, frontend, build, and browser checks:

```bash
PYTHONPATH=. backend/.venv/bin/python -m pytest backend/tests -q
npm --prefix frontend test
(cd frontend && npx tsc -b --pretty false)
npm --prefix frontend run build
npm --prefix frontend run test:e2e
```

For architecture notes and walkthrough scripts, see [docs/WEB_ARCHITECTURE.md](docs/WEB_ARCHITECTURE.md), [docs/WEB_DEMONSTRATION.md](docs/WEB_DEMONSTRATION.md), and [docs/DEMONSTRATION.md](docs/DEMONSTRATION.md).

## Simulator modules and menu layout

| Menu | Module | Algorithms and outputs |
|---|---|---|
| 1 | Process scheduling | Arrival-aware FCFS, non-preemptive SJF, round robin (RR); Gantt segments, per-process completion/wait/turnaround, averages, utilization, throughput |
| 2 | Memory management | FIFO, LRU, OPT replacement; per-reference frame trace, hits, faults, rates |
| 3 | Deadlock handling | Banker's safety test; need matrix, safe sequence (or unfinished processes), work trace |
| 4 | Storage | FCFS, SSTF, SCAN disk scheduling; head route and seek-distance totals |
| 5 | Reporting | Run all algorithms against one dataset; export CSV comparisons, labelled SVG charts, full JSON results |
| 6 | Input control | Select a different JSON dataset (validated on execution) |
| 0 | Exit | Quit cleanly |

`run.sh` is the Bash wrapper around `os_sim.cli`. Choosing any module in the menu runs the shared analysis pass first and then prints that module's section, so the exported files in `outputs/` always match the latest run. Runtime events and tracebacks go to `outputs/activity.log`, while `outputs/launcher.log` records Bash invocations. Later runs overwrite previous files in the same output directory.

## Input rules and model assumptions

[`samples/baseline.json`](samples/baseline.json) shows the expected JSON shape. Every dataset must include four top-level keys: `processes`, `memory`, `deadlock`, and `storage`, with optional `quantum` and disk `direction` (`up` or `down`). Times, page numbers, and cylinders are non-negative integers without unit conversion. Each CPU burst must be at least 1, RR quantum at least 1, frame count at least 1, cylinder count at least 1, and disk requests within `[0, cylinders - 1]`. Process IDs must be unique non-empty strings. Banker's inputs (`available`, `maximum`, `allocation`) must use matching matrix dimensions, and no allocation entry can exceed its declared maximum.

Several simplifying rules keep comparisons deterministic across policies. The CPU model assumes a single core, integer arrival and burst times, no priorities, and zero context-switch overhead. Round Robin queues newly arrived processes ahead of the process whose time slice just expired, breaking arrival ties by input order. SJF is non-preemptive and breaks ties by arrival time and input order. In memory management, FIFO and LRU run online, while OPT looks ahead in the reference stream as an offline lower bound on faults. Banker's check evaluates a static multi-resource snapshot; an unsafe result means no guaranteed completion sequence exists for the worst case, not that processes are already deadlocked. Disk scheduling measures cylinder distance rather than rotational latency or SSD electronics. On any non-empty queue, SCAN travels all the way to `cylinders - 1` (moving up) or `0` (moving down) before reversing for remaining requests, counting the boundary trip in total movement. Requests sitting at the starting head position add no duplicate stop, empty queues do not move the head, and SSTF breaks equal-distance ties by input order.

## Output files and verification artifacts

Generated CLI outputs land in `outputs/`:

- `outputs/results.json` stores Gantt intervals, frame-by-frame memory traces, the Banker need matrix, and disk routes.
- `outputs/scheduling.csv`, `outputs/memory.csv`, and `outputs/storage.csv` hold summary tables for each domain.
- `outputs/scheduling.svg`, `outputs/memory.svg`, and `outputs/storage.svg` render standalone bar charts you can open directly in any browser.
- `outputs/activity.log` and `outputs/launcher.log` capture local runtime logs and stay ignored by Git.

Additional records live under `backend/`, `docs/`, and `evidence/`:

- `backend/data/os_resource_lab.db` holds local SQLite state when running the web app (ignored by Git).
- `docs/sample_output_trace.txt`, `docs/unsafe_output_trace.txt`, `docs/invalid_output_trace.txt`, and `docs/menu_output_trace.txt` record CLI terminal sessions.
- `docs/test_results.txt` and `docs/web_test_results.txt` store CLI and full-stack test runs.
- `evidence/test_transcript.txt`, `evidence/baseline_verification.txt`, `evidence/api_verification.txt`, `evidence/migration_status.txt`, and `evidence/build_status.txt` capture final verification checks.
- `evidence/memory_chart.png`, `evidence/scheduling_chart.png`, `evidence/storage_chart.png`, and `evidence/terminal_trace.png` are raster renders of the CLI charts and stdout trace.
- `evidence/browser/*.png` contains 13 Chromium screenshots taken from the live web app by Playwright, mapped in [`evidence/INDEX.md`](evidence/INDEX.md).

## Validation and test suite

Quick CLI sanity checks:

```bash
python3 -m unittest discover -s tests -v
./run.sh --mode demo --dataset samples/unsafe.json --output outputs/unsafe_case
./run.sh --mode demo --dataset samples/invalid.json --output outputs/invalid_case
# Expected: invalid.json exits with status 2, prints an ERROR message, and writes no results.json.
printf '7\n0\n' | ./run.sh --mode menu
# Expected: prints 'Invalid choice' and then 'Goodbye'.
```

The automated test suite has 74 passing tests: 30 Python `unittest` cases for the CLI and core algorithms, 9 `pytest` API and persistence tests, 26 `Vitest` component and helper tests, and 9 Playwright end-to-end browser tests. Playwright spins up the real Vite and FastAPI servers against a temporary SQLite database, visits all ten routes, exercises each simulator, checks saved analytics and reports, toggles light and dark themes, tests 375, 768, 1024, and 1440 px viewports, and fails on any console or page error. See [`docs/web_test_results.txt`](docs/web_test_results.txt), [`evidence/test_transcript.txt`](evidence/test_transcript.txt), and [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md).

## Clean checkout verification

From a fresh clone of `Kernel_Scope`, set up dependencies once:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
npm --prefix frontend ci
(cd frontend && npx playwright install chromium)
```

Then run the full check sequence:

```bash
chmod +x run.sh
./run.sh --mode demo
./run.sh --mode demo --dataset samples/unsafe.json --output outputs/unsafe_case
./run.sh --mode demo --dataset samples/invalid.json --output outputs/invalid_case
python3 -m unittest discover -s tests -v
PYTHONPATH=. backend/.venv/bin/python -m pytest backend/tests -q
npm --prefix frontend test
(cd frontend && npx tsc -b --pretty false)
npm --prefix frontend run build
npm --prefix frontend run test:e2e
printf '7\n0\n' | ./run.sh --mode menu
```

Expected results: baseline exports appear in `outputs/`, `unsafe.json` reports `UNSAFE`, `invalid.json` exits with code `2` without writing completed results, invalid API payloads log an `invalid` activity entry without creating a completed run, menu input `7` warns before `0` exits with `Goodbye`, and all 74 tests pass alongside TypeScript and Vite production builds.

## Notes on evidence files

The four PNGs directly inside `evidence/` come from CLI outputs rather than browser captures:

- `memory_chart.png` shows baseline page faults (FIFO 10, LRU 9, OPT 7).
- `scheduling_chart.png` shows average waiting time (FCFS 4.75, SJF 4, RR 5).
- `storage_chart.png` shows total head movement (FCFS 640, SSTF 236, SCAN 331).
- `terminal_trace.png` renders the captured baseline CLI text showing a SAFE Banker run.

All 13 live browser screenshots sit in `evidence/browser/` and cover the dashboard, CPU Gantt chart, memory resident order, Banker safe and unsafe runs, disk SCAN boundary handling, analytics, reports, theme switching, and mobile/desktop widths. [`docs/CORRECTNESS_REVIEW.md`](docs/CORRECTNESS_REVIEW.md) compares those numbers against hand-worked traces.

## Troubleshooting

If `start_web.sh` reports a busy port, run `lsof -nP -iTCP:5173 -iTCP:8000 -sTCP:LISTEN` to see what is holding port 5173 or 8000, and stop any previous launcher session with Ctrl+C.

If Python imports or Alembic commands fail, check that `python3` is 3.11 or newer, reinstall packages with `backend/.venv/bin/python -m pip install -r backend/requirements.txt`, and run `PYTHONPATH=. backend/.venv/bin/alembic -c backend/alembic.ini upgrade head` from the repository root. Also check `DATABASE_URL` if you customized `.env`.

If Vite fails to start, confirm Node.js and npm are installed and run `npm --prefix frontend ci`. When the browser cannot reach the API, check `http://localhost:8000/api/health` and inspect `outputs/web-backend.log` plus `outputs/web-frontend.log`.

If a custom dataset fails validation with exit code 2, compare its keys and value ranges against `samples/baseline.json`. And if `outputs/` still reflects an older dataset, re-run `./run.sh --mode demo` with your chosen file to refresh the JSON, CSV, and SVG exports.

## Repository layout

```text
Kernel_Scope/
├── run.sh                         # Bash CLI entrypoint
├── start_web.sh                   # Local full-stack launcher
├── frontend/                      # React and TypeScript web app
├── backend/                       # FastAPI, SQLAlchemy, Alembic, API tests
├── os_sim/                        # Shared Python simulation package
│   ├── cli.py                     # Menu, argument parsing, logging
│   ├── validation.py              # Input type and bounds checks
│   ├── scheduling.py              # FCFS, SJF, RR
│   ├── memory.py                  # FIFO, LRU, OPT
│   ├── deadlock.py                # Banker's safety check
│   ├── storage.py                 # FCFS, SSTF, SCAN
│   └── reporting.py               # JSON, CSV, and SVG writers
├── samples/                       # Baseline, unsafe, and invalid datasets
├── outputs/                       # Generated baseline/unsafe CSV, SVG, JSON
├── tests/test_simulator.py        # 30 CLI and algorithm unit tests
├── docs/                          # Design, architecture, report, test plan, demo guides
├── design-system/os-resource-lab/ # UI design specification (MASTER.md)
└── evidence/                      # Verification logs, chart previews, 13 Playwright PNGs
```

## Project phases and submission notes

[`docs/FINAL_AUDIT.md`](docs/FINAL_AUDIT.md) and [`docs/SUBMISSION_CHECKLIST.md`](docs/SUBMISSION_CHECKLIST.md) map the repository to the five capstone phases: system design, core OS modules, algorithm comparison, testing, and documentation. UI design decisions are recorded in [`design-system/os-resource-lab/MASTER.md`](design-system/os-resource-lab/MASTER.md). Before turning in an academic archive, review the checklist to add any required student metadata or course declarations and make sure you can walk through every trace and assumption live.
