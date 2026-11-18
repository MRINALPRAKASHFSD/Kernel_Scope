# OS Resource Lab: Web architecture

## System boundaries

```text
React + TypeScript (Vite, React Router, Tailwind, Recharts)
            │ same-origin /api requests through Vite proxy
            ▼
FastAPI routes + Pydantic validation + activity/error handling
            ▼
SQLAlchemy services and repositories ────► SQLite (Alembic schema)
            │
            └──► os_sim Python algorithms (single calculation source)

Original run.sh ──► os_sim.cli ──────────► the same os_sim algorithms
```

The browser sends typed JSON inputs to FastAPI. Pydantic checks field types, array shapes, and bounds before any simulation code runs. From there, `backend/app/services.py` calls `os_sim` directly, writes both the input snapshot and computed output to SQLite, and returns the saved record to the client. Charts and step-through views render those backend responses rather than recalculating algorithms in TypeScript. Meanwhile, `run.sh` and `os_sim.cli` still work standalone from the terminal.

## Codebase structure

On the frontend, `frontend/src/App.tsx` handles the shell layout, responsive sidebar/drawer navigation, theme state, API health badge, and route table. Individual screens live in `frontend/src/pages/` (`Dashboard`, `CpuPage`, `MemoryPage`, `DeadlockPage`, `DiskPage`, `AnalyticsPage`, `DatasetPage`, `HistoryPage`, `ReportsPage`, and `AboutPage`), backed by typed fetch helpers and download URL builders in `frontend/src/lib/api.ts`.

On the backend, `backend/app/api.py` maps HTTP routes to service calls, `backend/app/schemas.py` enforces request contracts (including matrix dimensions and cylinder bounds), and `backend/app/services.py` coordinates `os_sim` execution, database writes, dashboard counters, and CSV export formatting. SQLAlchemy queries sit in `backend/app/repositories.py` over the ORM tables in `backend/app/models.py`, with schema migrations managed under `backend/alembic/`. Core scheduling, paging, deadlock, and disk routines stay in `os_sim/`.

## Database schema

By default, SQLite stores data in `backend/data/os_resource_lab.db` unless `DATABASE_URL` overrides it in `.env` or `backend/app/config.py`. Foreign-key enforcement is turned on per connection. On startup, `seed.py` inserts `Bundled Baseline` and `Bundled Unsafe` if they are not already present.

| Table | Purpose | Main columns |
|---|---|---|
| `datasets` | User-created and seeded workloads | `name`, `category`, `config_json`, `description`, `created_at`, `updated_at` |
| `simulation_runs` | Saved execution records | `dataset_id` (nullable), `category`, `selected_algorithm`, `input_snapshot`, `result_json`, `status`, `error_message`, timestamps |
| `activity_logs` | Audit trail of runs and dataset edits | `action`, `category`, `simulation_id` (nullable), `status`, `message`, `timestamp` |

Deleting a dataset sets `dataset_id` to `NULL` on prior `simulation_runs` while keeping their `input_snapshot` JSON intact, so old reports still open even after a dataset is edited or removed. Deleting a simulation run nulls `simulation_id` on related `activity_logs` rows rather than wiping the audit log.

## HTTP endpoints

While FastAPI is running, interactive OpenAPI docs are served at `http://localhost:8000/docs`.

| Method and path | Behavior |
|---|---|
| `GET /api/health`, `GET /api/algorithms` | Health check and registered 10-policy catalog |
| `GET /api/dashboard/summary` | Run count, dataset count, failed count, recent runs, and recent activity |
| `POST /api/simulations/cpu` | Run selected `FCFS`, `SJF`, and/or `RR` policies |
| `POST /api/simulations/memory` | Run selected `FIFO`, `LRU`, and/or `OPT` policies |
| `POST /api/simulations/deadlock` | Run Banker's safety check and return `need` plus completion trace |
| `POST /api/simulations/disk` | Run selected `FCFS`, `SSTF`, and/or full-sweep `SCAN` policies |
| `POST /api/simulations/integrated` | Run all four modules on a combined dataset |
| `GET /api/simulations`, `GET /api/simulations/{id}`, `DELETE /api/simulations/{id}` | List, inspect, or delete saved runs |
| `GET/POST /api/datasets`, `GET/PUT/DELETE /api/datasets/{id}` | List, create, update, or remove validated datasets |
| `POST /api/datasets/{id}/duplicate`, `GET /api/datasets/{id}/export` | Clone a dataset or download it as JSON |
| `GET /api/analytics/overview`, `GET /api/analytics/comparisons` | Fetch summary counters and SHA-256-grouped compatible runs |
| `GET /api/reports/{id}`, `GET /api/reports/{id}/export?format=json\|csv` | Load a completed report or export it as JSON/CSV |

Malformed payloads return HTTP `422` with field-level details and append an `invalid` row to `activity_logs` without creating a completed simulation record. Missing IDs return `404`. If an unexpected runtime error occurs after a run row is created, the service marks that row `failed` with the error message.

## Screen responsibilities

The dashboard shows live SQLite counts, recent runs, activity entries, simulator links, and a domain comparison chart. The CPU screen provides an editable process table with unique PIDs, quantum input, dataset load/save controls, a Gantt timeline with explicit idle blocks, and waiting/turnaround metrics. The memory screen steps forward, backward, or on autoplay through resident-page snapshots, marking hits, faults, and evicted pages while labeling `OPT` as an offline benchmark.

The deadlock screen edits `Available`, `Maximum`, and `Allocation` matrices (plus optional total-resource checks), displays the derived `Need` matrix and step-by-step release order, and notes that an unsafe snapshot does not mean processes are already deadlocked. The disk screen plots cylinder stops in service order, separates real request stops from SCAN's physical boundary turn (`0` or `cylinders - 1`), and totals head travel.

Supporting workspace pages manage datasets (create, edit, duplicate, delete, JSON import/export, and integrated runs), browse run history with replay links back into each simulator, compare runs sharing an identical input snapshot on the analytics page, and print or export JSON/CSV reports.

## Local environment and migrations

You only need a `.env` file if you want to change `DATABASE_URL` or `CORS_ORIGINS` from the defaults in `.env.example`. Keep `.env`, SQLite `.db` files, `.venv`, and `node_modules` out of version control. Manual backend setup from the root of `Kernel_Scope`:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
PYTHONPATH=. backend/.venv/bin/alembic -c backend/alembic.ini upgrade head
```

`start_web.sh` automates those checks and launches Uvicorn on `127.0.0.1:8000` plus Vite on `127.0.0.1:5173`. On startup, `backend/app/main.py` also ensures tables exist and seeds the two sample datasets so local demos recover cleanly if the SQLite file is deleted. SQLAlchemy accepts other connection strings (such as PostgreSQL), though local automated testing targets SQLite.

## Mapping to the five project phases

| Phase | Repository coverage |
|---|---|
| 1: System design and planning (20) | `docs/DESIGN_AND_PLAN.md`, this architecture guide, Pydantic schemas, SQLAlchemy/Alembic tables, and documented model assumptions |
| 2: Core resource-management modules (20) | Python `FCFS`/`SJF`/`RR`, `FIFO`/`LRU`/`OPT`, Banker's safety, and `FCFS`/`SSTF`/`SCAN` modules shared by CLI and web routes |
| 3: Analysis and comparison (20) | CLI CSV/JSON/SVG exports alongside web comparison charts, step traces, analytics views, and downloadable reports |
| 4: Testing and reliability (20) | 74 automated tests (30 CLI `unittest`, 9 backend `pytest`, 26 frontend `Vitest`, 9 Playwright), TypeScript check, and Vite build |
| 5: Documentation and demonstration (20) | `README.md`, phase docs, technical report, CLI and web demo scripts, `evidence/INDEX.md`, and `docs/SUBMISSION_CHECKLIST.md` |

## Practical boundaries

OS Resource Lab is built for single-user local coursework and teaching demos. It intentionally omits authentication, multi-tenant access controls, and production TLS/reverse-proxy hardening, and all visual charts read precomputed Python outputs rather than running simulations in the client.
