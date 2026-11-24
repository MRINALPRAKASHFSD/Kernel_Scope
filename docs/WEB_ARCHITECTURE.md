# KernelScope: Web architecture

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

KernelScope's React frontend sends typed JSON payloads to FastAPI over `/api`. Pydantic validates types, array dimensions, unique PIDs, and numerical bounds before any simulation runs. `backend/app/services.py` then invokes `os_sim` directly, persists both the submitted input snapshot and computed trace in SQLite, and returns that stored record to the browser. Charts and step-through views render saved backend traces rather than duplicating OS algorithms in TypeScript. Meanwhile, `run.sh` and `os_sim.cli` remain usable standalone from the terminal.

## Repository layers

- `frontend/public/`: KernelScope brand assets and icons (`kernelscope-mark.svg`, `kernelscope-logo.svg`, PNG counterparts, `favicon.svg`, and `favicon.ico`).
- `frontend/src/App.tsx`: responsive workspace shell, sidebar/drawer focus trap, dark/light theme toggle, `/api/health` connection indicator, and lazy route definitions.
- `frontend/src/pages/`: ten route views (`Dashboard`, `CpuPage`, `MemoryPage`, `DeadlockPage`, `DiskPage`, `AnalyticsPage`, `DatasetPage`, `HistoryPage`, `ReportsPage`, and `AboutPage`). See [`MILESTONE_NOTES_NOV14_NOV21.md`](MILESTONE_NOTES_NOV14_NOV21.md) for how the core simulator pages were built.
- `frontend/src/lib/`: typed fetch client (`api.ts`), integer/process validators (`validation.ts`), `SCAN` boundary route classifier (`diskRoute.ts`), and domain report helpers (`presentation.ts`).
- `backend/app/api.py`: `/api` route handlers mapping validated payloads to service calls and HTTP status codes.
- `backend/app/schemas.py`: strict Pydantic v2 models enforcing non-empty unique PIDs, Banker matrix dimensions, optional `declared_totals` equality, and cylinder bounds.
- `backend/app/services.py`: `execute_run` transaction lifecycle, dataset validation, dashboard counters, SHA-256 input snapshot grouping, and CSV report serialization.
- `backend/app/repositories.py` and `backend/app/models.py`: SQLAlchemy 2.0 ORM models and query helpers.
- `backend/alembic/`: schema migration configuration and `0001_initial.py`.
- `os_sim/`: standard-library Python algorithms shared with the CLI.

## Database schema and compatibility identifiers

By default, SQLite writes to `backend/data/os_resource_lab.db` unless overridden via `DATABASE_URL` in `.env` (`backend/app/config.py`). That default filename and the `/api/health` payload (`{"status": "ok", "service": "os-resource-lab-api"}`) intentionally keep their original internal identifiers so existing Alembic configs (`backend/alembic.ini`) and API health contracts remain unchanged. `PRAGMA foreign_keys=ON` runs on every SQLite connection, and `seed.py` inserts `Bundled Baseline` and `Bundled Unsafe` idempotently on startup.

| Table | Purpose | Key columns |
|---|---|---|
| `datasets` | Seeded and user-saved workloads | `id`, `name`, `category`, `config_json`, `description`, `created_at`, `updated_at` |
| `simulation_runs` | Reproducible run records | `id`, `dataset_id` (nullable FK), `category`, `selected_algorithm`, `input_snapshot`, `result_json`, `status`, `error_message`, timestamps |
| `activity_logs` | Lifecycle and validation audit log | `id`, `action`, `category`, `simulation_id` (nullable FK), `status`, `message`, `timestamp` |

Deleting a dataset sets `SimulationRun.dataset_id = NULL` on historical runs while keeping each run's `input_snapshot` JSON intact, so older reports and replays keep working even if their source dataset is edited or deleted. Deleting a simulation run sets `ActivityLog.simulation_id = NULL` so audit history stays intact.

## REST API contracts

Interactive OpenAPI documentation (`KernelScope API`) is served at `http://localhost:8000/docs` while FastAPI is running.

| Method and path | Contract |
|---|---|
| `GET /api/health`, `GET /api/algorithms` | Service health check and 10-policy catalog |
| `GET /api/dashboard/summary` | Total runs, algorithm count, saved datasets, failed runs, 5 recent runs, 8 recent activity entries |
| `POST /api/simulations/cpu` | Execute selected `FCFS`, `SJF`, and/or `RR` policies and persist trace |
| `POST /api/simulations/memory` | Execute selected `FIFO`, `LRU`, and/or `OPT` policies and persist trace |
| `POST /api/simulations/deadlock` | Evaluate Banker's safety snapshot (with optional `declared_totals`) |
| `POST /api/simulations/disk` | Execute selected `FCFS`, `SSTF`, and/or full-sweep `SCAN` policies |
| `POST /api/simulations/integrated` | Run `os_sim.reporting.analyze` across all four domains |
| `GET /api/simulations`, `GET /api/simulations/{id}`, `DELETE /api/simulations/{id}` | List (`limit` 1..500), inspect, or delete saved runs |
| `GET/POST /api/datasets`, `GET/PUT/DELETE /api/datasets/{id}` | List, validate/create (`201`), update, or delete datasets |
| `POST /api/datasets/{id}/duplicate`, `GET /api/datasets/{id}/export` | Clone a dataset (`201`) or download `dataset-{id}.json` |
| `GET /api/analytics/overview`, `GET /api/analytics/comparisons` | Workspace totals and completed runs grouped by `(category, sha256(input_snapshot)[:12])` |
| `GET /api/reports/{id}`, `GET /api/reports/{id}/export?format=json\|csv` | Fetch completed report JSON or download `simulation-{id}.{json,csv}` |

Invalid request payloads return HTTP `422` with field-level Pydantic error details and record `request.invalid` (or `request.rejected`) in `activity_logs` without creating a completed `simulation_runs` record. Unknown IDs return `404`, and exporting an incomplete run returns `409`.

## Route workflows

- `/` (`Dashboard`): SQLite counters, four simulator launch cards, domain comparison bar chart from the latest compatible run, and recent activity feed.
- `/cpu` (`CpuPage`): editable PID/arrival/burst table, `RR` quantum, Gantt chart with synthesized `IDLE` intervals, waiting/turnaround/utilization/throughput readouts, and multi-policy bar chart.
- `/memory` (`MemoryPage`): reference sequence textarea, frame capacity, `FIFO`/`LRU`/`OPT` tabs, step/autoplay controls, resident-page order cards, eviction note, and offline `OPT` notice.
- `/deadlock` (`DeadlockPage`): dynamic process/resource matrix editor, optional `declared_totals` verification, `SAFE`/`UNSAFE` badge, ordered completion sequence, `Need` matrix, and post-release `Work` table.
- `/disk` (`DiskPage`): cylinder count, initial head, request queue, `SCAN` `up`/`down` picker, Recharts `ComposedChart` distinguishing request stops from `SCAN` physical endpoints (`0` and `cylinders - 1`), and movement totals.
- `/datasets`, `/history`, `/analytics`, `/reports`, `/about`: dataset CRUD and JSON import/export, historical run inspection and one-click replay, same-snapshot comparison tables, printable `KS` execution reports with JSON/CSV export, and live service/catalog reference.

## Local startup and migrations

Copy `.env.example` to `.env` only when overriding `DATABASE_URL` or `CORS_ORIGINS`. Never commit `.env`, SQLite `.db` files, `backend/.venv/`, or `frontend/node_modules/`. Manual setup from the repository root:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
PYTHONPATH=. backend/.venv/bin/alembic -c backend/alembic.ini upgrade head
```

`start_web.sh` automates environment creation, dependency installation, `alembic upgrade head`, Uvicorn (`127.0.0.1:8000`), and Vite (`127.0.0.1:5173`). On startup, `create_app()` also ensures metadata tables exist and seeds the two sample datasets if absent.

## Five-phase coverage and operational scope

| Capstone phase | KernelScope evidence |
|---|---|
| 1: System design and planning (20) | `docs/DESIGN_AND_PLAN.md`, this document, Pydantic schemas, SQLAlchemy/Alembic schema, and `design-system/os-resource-lab/MASTER.md` |
| 2: Core resource-management modules (20) | `os_sim/` CPU, memory, Banker, and disk modules shared by CLI and FastAPI routes |
| 3: Analysis and comparison (20) | CLI CSV/JSON/SVG outputs plus persisted web charts, step traces, analytics, and downloadable reports |
| 4: Testing and reliability (20) | 74 automated tests (30 CLI `unittest`, 9 backend `pytest`, 26 frontend `Vitest`, 9 Playwright), `tsc -b`, and `vite build` |
| 5: Documentation and demonstration (20) | `README.md`, `docs/REPORT.md`, CLI and web demo guides, milestone review, `evidence/INDEX.md`, and `docs/SUBMISSION_CHECKLIST.md` |

KernelScope targets single-user local coursework and classroom demonstrations. Authentication, multi-user roles, and public internet deployment hardening are out of scope.
