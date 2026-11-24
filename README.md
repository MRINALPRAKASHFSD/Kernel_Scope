# KernelScope

KernelScope (`MRINALPRAKASHFSD/Kernel_Scope`) is an operating-system resource simulation and algorithm analytics workbench built around a shared Python engine (`os_sim/`). You can run simulations from a terminal through the Bash-and-Python CLI (`run.sh`) or through a local React, TypeScript, FastAPI, and SQLite web interface (`start_web.sh`). Both entry points execute the exact same Python functions in `os_sim/`, so CPU scheduling, page replacement, Banker safety checks, and disk seek routes are never reimplemented in JavaScript.

## System requirements and CLI setup

The command-line simulator requires Python 3.9+, Bash, and a terminal. It uses only the Python standard library.

The web workbench requires Python 3.11+ and Node.js with npm. Everything runs locally on `127.0.0.1` without external services or API keys. Check your installed versions with `python3 --version` and `bash --version`.

macOS, Linux, and WSL run `run.sh` and `start_web.sh` directly. On Windows PowerShell without Bash, invoke `python -m os_sim.cli --mode demo` directly; Bash launcher verification requires Bash, WSL, or Git Bash.

From the repository root:

```bash
chmod +x run.sh
./run.sh --mode demo --dataset samples/baseline.json --output outputs
./run.sh --mode menu
python3 -m unittest discover -s tests -v
```

Interactive menu mode loads `samples/baseline.json` by default. Option `6` switches to a different JSON path, and option `5` exports all JSON, CSV, and SVG files at once. In batch mode, pass `--dataset path/to/file.json` to evaluate another workload without editing source files.

## Running the web workbench

The web interface adds SQLite dataset storage, saved simulation runs, request/execution activity logs, within-run policy comparisons, and JSON or CSV downloads. Running `start_web.sh` creates `backend/.venv` if missing, installs backend and frontend packages locally, applies the Alembic schema migration, and starts Uvicorn and Vite without touching your system Python packages.

```bash
./start_web.sh
# Web UI: http://localhost:5173
# OpenAPI docs: http://localhost:8000/docs
# Stop both servers with Ctrl+C
```

Manual two-terminal startup:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
npm --prefix frontend install
cp .env.example .env   # optional; defaults work without .env
PYTHONPATH=. backend/.venv/bin/alembic -c backend/alembic.ini upgrade head
PYTHONPATH=. backend/.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
# Second terminal:
npm --prefix frontend run dev -- --host 127.0.0.1
```

By default, SQLite stores data at `backend/data/os_resource_lab.db` (keeping the original internal filename for Alembic compatibility) and seeds `Bundled Baseline` plus `Bundled Unsafe` once on an empty database. Override `DATABASE_URL` or `CORS_ORIGINS` in `.env` when needed. FastAPI binds to `127.0.0.1:8000` and Vite binds to `127.0.0.1:5173`, proxying `/api` calls to FastAPI.

Inspect or apply Alembic migrations directly:

```bash
PYTHONPATH=. backend/.venv/bin/alembic -c backend/alembic.ini upgrade head
PYTHONPATH=. backend/.venv/bin/alembic -c backend/alembic.ini current
```

The schema migration lives at `backend/alembic/versions/0001_initial.py`. Local `.db`, `-wal`, and `-shm` files stay untracked in Git.

Run the backend, frontend, TypeScript, production build, and browser suites with:

```bash
PYTHONPATH=. backend/.venv/bin/python -m pytest backend/tests -q
npm --prefix frontend test
(cd frontend && npx tsc -b --pretty false)
npm --prefix frontend run build
npm --prefix frontend run test:e2e
```

Further documentation: [docs/WEB_ARCHITECTURE.md](docs/WEB_ARCHITECTURE.md), [docs/WEB_DEMONSTRATION.md](docs/WEB_DEMONSTRATION.md), [docs/DEMONSTRATION.md](docs/DEMONSTRATION.md), and the retrospective milestone review in [docs/MILESTONE_NOTES_NOV14_NOV21.md](docs/MILESTONE_NOTES_NOV14_NOV21.md).

## Simulation modules and CLI menu

| Menu | Domain | Implemented policies and computed outputs |
|---|---|---|
| 1 | Process scheduling | Arrival-aware `FCFS`, non-preemptive `SJF`, `RR`; Gantt segments, per-process completion/turnaround/waiting, means, CPU utilization, throughput |
| 2 | Memory management | `FIFO`, `LRU`, offline `OPT`; step-by-step resident-page trace, page hits, page faults, hit/fault percentages |
| 3 | Deadlock handling | Multi-resource Banker safety check; `Need` matrix, safe completion sequence (or unfinished list), post-release `Work` trace |
| 4 | Storage scheduling | `FCFS`, `SSTF`, full-sweep `SCAN`; visited cylinder route, total head movement, mean movement per request |
| 5 | Integrated reporting | Execute all 10 policies across one dataset; write CSV tables, standalone SVG bar charts, and `results.json` |
| 6 | Dataset selection | Point the session at another JSON file (validated on run) |
| 0 | Exit | Quit cleanly |

`run.sh` resolves the repository root, verifies `python3`, appends a UTC line to `outputs/launcher.log`, and invokes `python3 -m os_sim.cli`. Picking menu options `1` through `5` runs the shared `write_report` pass before printing the chosen domain slice so exported files in `outputs/` always match the latest terminal run. Runtime events and exception tracebacks go to `outputs/activity.log`.

## Input contract and algorithm rules

[`samples/baseline.json`](samples/baseline.json) defines the integrated JSON contract. Every integrated file requires four keys: `processes`, `memory`, `deadlock`, and `storage`, plus optional top-level `quantum` and storage `direction` (`up` or `down`). All times, page numbers, resource counts, and cylinder numbers must be strict Python `int` values (`bool` values are rejected even though `bool` subclasses `int` in Python). CPU bursts, RR quantum, frame capacity, and cylinder count must each be `>= 1`; arrival times, page numbers, and resource entries must be `>= 0`; disk head and requests must fall in `[0, cylinders - 1]`. Process IDs must be unique non-empty strings, and Banker matrices (`available`, `maximum`, `allocation`) must match dimensions with `allocation[i][j] <= maximum[i][j]`.

Algorithmic rules are fixed so policy differences come strictly from scheduling or replacement decisions:

- CPU scheduling models one core with integer clock ticks, no priorities, and zero context-switch cost. `FCFS` sorts stably by `(arrival, input_index)`. Non-preemptive `SJF` picks the minimum `(burst, arrival, input_index)` among arrived jobs, advancing the clock to the next arrival when the ready set is empty. `RR` runs up to `quantum` ticks per turn and enqueues newly arrived jobs (`arrival <= clock`) before re-appending the preempted job.
- Memory page replacement tracks `FIFO` by load step and `LRU` by most recent access step. `OPT` inspects `references[step + 1:]` and evicts the resident page needed farthest ahead (or `inf` if never referenced again), acting strictly as an offline lower-bound benchmark.
- Deadlock handling evaluates a static resource snapshot using `need = maximum - allocation` and iterative work release. An `UNSAFE` result means Banker's test cannot guarantee deadlock-free completion under worst-case remaining requests; it does not prove processes are currently deadlocked.
- Disk scheduling counts `abs(route[k + 1] - route[k])` in cylinders without rotational latency or SSD translation layers. `SSTF` breaks equal-distance ties by original input index. On any non-empty request queue, `SCAN` sweeps all the way to `cylinders - 1` (`up`) or `0` (`down`), counts that boundary leg in total movement, and then reverses for remaining requests. Requests matching the starting head are served in place without a duplicate stop, and an empty queue stays at `[head]` with `0` movement.

## Generated outputs and verification artifacts

CLI batch runs write deterministic files under `outputs/`:

- `outputs/results.json` holds Gantt segments, per-step memory traces, the Banker `Need` matrix and release steps, and disk cylinder routes.
- `outputs/scheduling.csv`, `outputs/memory.csv`, and `outputs/storage.csv` store flat per-policy comparison tables.
- `outputs/scheduling.svg`, `outputs/memory.svg`, and `outputs/storage.svg` render standalone `720x310` bar charts viewable offline in any browser.
- `outputs/activity.log` and `outputs/launcher.log` record local execution history and remain gitignored.

Repository verification records live under `docs/` and `evidence/`:

- `docs/sample_output_trace.txt`, `docs/unsafe_output_trace.txt`, `docs/invalid_output_trace.txt`, and `docs/menu_output_trace.txt` capture CLI stdout/stderr runs.
- `docs/test_results.txt` and `docs/web_test_results.txt` record CLI `unittest` and full-stack test outputs.
- `evidence/test_transcript.txt`, `evidence/baseline_verification.txt`, `evidence/api_verification.txt`, `evidence/migration_status.txt`, and `evidence/build_status.txt` store verification logs.
- `evidence/memory_chart.png`, `evidence/scheduling_chart.png`, `evidence/storage_chart.png`, and `evidence/terminal_trace.png` are rasterized previews of CLI outputs (not browser screenshots).
- `evidence/browser/*.png` holds 13 Chromium screenshots captured live by Playwright from KernelScope, indexed in [`evidence/INDEX.md`](evidence/INDEX.md).

## Automated tests and reproduction

Quick CLI checks:

```bash
python3 -m unittest discover -s tests -v
./run.sh --mode demo --dataset samples/unsafe.json --output outputs/unsafe_case
./run.sh --mode demo --dataset samples/invalid.json --output outputs/invalid_case
# Expected: invalid.json exits with status 2, prints ERROR on stderr, and writes no results.json.
printf '7\n0\n' | ./run.sh --mode menu
# Expected: warns on choice 7 and prints Goodbye on 0.
```

Across the repository, 74 automated tests pass: 30 CLI `unittest` tests, 9 backend `pytest` tests, 26 frontend `Vitest` tests, and 9 Playwright Chromium e2e tests, alongside `tsc -b` and `vite build`. Playwright launches isolated local FastAPI (`127.0.0.1:18100`) and Vite (`127.0.0.1:15174`) processes backed by a temporary SQLite file, exercises all ten routes, verifies KernelScope branding/favicons/themes, checks 375, 768, 1024, and 1440 px viewports for horizontal overflow, and fails on any page or console error.

Clean checkout setup and verification:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
npm --prefix frontend ci
(cd frontend && npx playwright install chromium)

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

Baseline figures verified across CLI and web runs (see [`docs/CORRECTNESS_REVIEW.md`](docs/CORRECTNESS_REVIEW.md)):

- CPU mean waiting time: `FCFS` 4.75, `SJF` 4.00, `RR` (quantum 2) 5.00 time units.
- Memory page faults (13 references, 3 frames): `FIFO` 10, `LRU` 9, `OPT` 7.
- Banker baseline state: `SAFE` with sequence `P1 -> P3 -> P0 -> P2 -> P4`.
- Disk total head movement: `FCFS` 640, `SSTF` 236, `SCAN` (`up`) 331 cylinders.

## Troubleshooting

If port `5173` or `8000` is already bound, inspect listeners with `lsof -nP -iTCP:5173 -iTCP:8000 -sTCP:LISTEN` and stop any earlier `start_web.sh` terminal with Ctrl+C.

If backend imports or migrations fail, confirm `python3` is 3.11+, reinstall `backend/requirements.txt` inside `backend/.venv`, and run `PYTHONPATH=. backend/.venv/bin/alembic -c backend/alembic.ini upgrade head`.

If Vite fails to launch, run `npm --prefix frontend ci` and inspect `outputs/web-backend.log` and `outputs/web-frontend.log` alongside `http://localhost:8000/api/health`.

If a custom JSON file exits with code `2`, compare its top-level keys, matrix dimensions, and integer bounds against `samples/baseline.json`. Re-run `./run.sh --mode demo` whenever you switch datasets so `outputs/*.csv` and `outputs/*.svg` stay current.

## Repository map

```text
Kernel_Scope/
├── run.sh                         # Bash CLI launcher
├── start_web.sh                   # Local FastAPI + Vite launcher
├── frontend/                      # React / TypeScript KernelScope web app
│   ├── public/                    # KernelScope SVG/PNG brand marks and favicons
│   ├── src/                       # Components, API/route helpers, 10 pages, Vitest tests
│   └── e2e/acceptance.pw.ts       # 9 Playwright Chromium browser acceptance tests
├── backend/                       # FastAPI routes, Pydantic schemas, SQLAlchemy, Alembic
├── os_sim/                        # Standard-library Python simulation package
│   ├── cli.py                     # Batch runner, interactive 0-6 menu, activity logging
│   ├── validation.py              # Strict int, list, and 2D matrix guards
│   ├── scheduling.py              # Arrival-aware FCFS, SJF, RR
│   ├── memory.py                  # FIFO, LRU, offline OPT
│   ├── deadlock.py                # Multi-resource Banker safety check
│   ├── storage.py                 # FCFS, SSTF, full-sweep SCAN
│   └── reporting.py               # Shared analyze(), CSV tables, standalone SVG charts
├── samples/                       # Baseline, unsafe, and invalid JSON workloads
├── outputs/                       # Verified baseline and unsafe JSON/CSV/SVG outputs
├── tests/test_simulator.py        # 30 Python unittest cases
├── docs/                          # Design, architecture, report, test plan, demo, history notes
├── design-system/os-resource-lab/ # UI design system reference (MASTER.md)
└── evidence/                      # Verification transcripts, CLI previews, 13 Playwright PNGs
```

## Academic submission and authorship notes

[`docs/FINAL_AUDIT.md`](docs/FINAL_AUDIT.md) and [`docs/SUBMISSION_CHECKLIST.md`](docs/SUBMISSION_CHECKLIST.md) map repository artifacts to all five capstone phases. Existing local submission archives (`os_resource_capstone_final.zip` and `os_resource_capstone.zip`) are gitignored and preserved untouched on disk. Before submitting for course credit, include your name, student ID, course metadata, citations, and any required AI-assistance or authorship disclosures specified by your institution, and verify you can explain every algorithm trace and modeling assumption live.
