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

