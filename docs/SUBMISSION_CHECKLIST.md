# Submission checklist

This checklist maps the five-phase project brief to concrete files in `Kernel_Scope`. Final grading always follows your instructor's course rubric.

## Phase-by-phase file map

| Phase | Included files and verification | Status |
|---|---|---|
| 1: System design and planning | `docs/DESIGN_AND_PLAN.md`, `docs/WEB_ARCHITECTURE.md`, Pydantic schemas, SQLAlchemy/Alembic migration, and `design-system/os-resource-lab/MASTER.md` | Included |
| 2: Core resource-management modules | `os_sim/` CPU, memory, Banker, and disk modules; `run.sh` CLI; FastAPI backend and React simulator pages | Included |
| 3: Analysis and comparison | `samples/*.json`, `outputs/` baseline and unsafe JSON/CSV/SVG exports, web charts/traces, `docs/REPORT.md`, and `docs/CORRECTNESS_REVIEW.md` | Included |
| 4: Testing and reliability | 30 CLI + 9 backend + 26 frontend + 9 Playwright = 74 passing tests, plus TypeScript and Vite production builds | Included |
| 5: Documentation and demonstration | `README.md`, architecture and demo guides, `evidence/INDEX.md`, 13 Playwright screenshots, and this checklist | Included (live talk delivered by student) |

## Tracked deliverables

- React and TypeScript frontend (`frontend/src/`), Vitest suites, Playwright config (`frontend/playwright.config.ts`), e2e suite (`frontend/e2e/acceptance.pw.ts`), and `package.json` / `package-lock.json`
- UI design system specification at `design-system/os-resource-lab/MASTER.md`
- FastAPI application (`backend/app/`), Alembic migration (`backend/alembic/`), `backend/requirements.txt`, and `pytest` API tests (`backend/tests/`)
- Shared Python engine (`os_sim/`), `run.sh`, `start_web.sh`, and 30 `unittest` cases (`tests/test_simulator.py`)
- Sample datasets (`samples/`) and verified CLI outputs (`outputs/`)
- Thirteen live Chromium screenshots (`evidence/browser/`) indexed in `evidence/INDEX.md`, plus verification transcripts in `docs/` and `evidence/`

## Passing check commands

- CLI unit tests: 30 passed (`python3 -m unittest discover -s tests -v`)
- Backend API/DB tests: 9 passed (`PYTHONPATH=. backend/.venv/bin/python -m pytest backend/tests -q`)
- Frontend unit/component tests: 26 passed (`npm --prefix frontend test`)
- Playwright browser tests: 9 passed (`npm --prefix frontend run test:e2e`)
- TypeScript check: passed (`cd frontend && npx tsc -b --pretty false`)
- Production bundle: passed (`npm --prefix frontend run build`)

Playwright verified all ten routes, CPU Gantt segments, memory frame traces, safe and unsafe Banker states, disk SCAN boundary stops, saved analytics and reports, dark and light themes, 375/768/1024/1440 px viewports, and zero console errors against a disposable SQLite database. Baseline figures remain `4.75 / 4 / 5` for CPU mean wait, `10 / 9 / 7` for memory faults, `P1 -> P3 -> P0 -> P2 -> P4` for Banker safety, and `640 / 236 / 331` for disk movement.

## Repository hygiene

`.gitignore` excludes `backend/.venv/`, `frontend/node_modules/`, `frontend/dist/`, `backend/data/*.db*`, `.env`, caches, runtime `.log` files, Playwright scratch output, local `.zip` bundles, and external agent skill folders so only clean source, docs, samples, and verified evidence are committed.

## Final checks before course submission

- Fill in your name, student ID, course code, institution, semester, and instructor details if required by a cover-page template.
- Include any academic-integrity, citation, or tooling declaration required by your department.
- Check portal rules on repository links, archive naming, file size limits, or PDF report formatting.
- Walk through `docs/WEB_DEMONSTRATION.md` once locally so you are comfortable explaining every policy's tie-breakers, edge cases, and assumptions live.
