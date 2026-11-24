# Submission checklist

This checklist maps the five-phase capstone brief to tracked deliverables in `KernelScope` (`MRINALPRAKASHFSD/Kernel_Scope`). Course grading always follows your instructor's rubric.

## Five-phase deliverable map

| Phase | Repository deliverables | Status |
|---|---|---|
| 1: System design and planning | `docs/DESIGN_AND_PLAN.md`, `docs/WEB_ARCHITECTURE.md`, Pydantic contracts, SQLAlchemy/Alembic migration, and `design-system/os-resource-lab/MASTER.md` | Included |
| 2: Core resource-management modules | `os_sim/` CPU, memory, Banker, and disk modules; `run.sh` CLI; FastAPI backend and KernelScope React simulator pages | Included |
| 3: Analysis and comparison | `samples/*.json`, `outputs/` baseline and unsafe JSON/CSV/SVG files, browser trace charts, `docs/REPORT.md`, and `docs/CORRECTNESS_REVIEW.md` | Included |
| 4: Testing and reliability | 30 CLI + 9 backend + 26 frontend + 9 Playwright = 74 passing tests, plus `tsc -b` and `vite build` | Included |
| 5: Documentation and demonstration | `README.md`, demo guides, `docs/MILESTONE_NOTES_NOV14_NOV21.md`, `evidence/INDEX.md`, 13 Playwright PNGs, and this checklist | Included (live presentation delivered by student) |

## Tracked components

- KernelScope React + TypeScript frontend (`frontend/src/`), SVG/PNG brand marks and favicons (`frontend/public/`), 26 `Vitest` tests, Playwright config, 9 Chromium e2e tests, and npm manifests
- UI design system specification at `design-system/os-resource-lab/MASTER.md`
- FastAPI routes/schemas/services (`backend/app/`), Alembic schema migration (`backend/alembic/`), `backend/requirements.txt`, and 9 `pytest` API tests (`backend/tests/`)
- Standard-library Python engine (`os_sim/`), `run.sh`, `start_web.sh`, and 30 `unittest` cases (`tests/test_simulator.py`)
- Sample JSON workloads (`samples/`) and deterministic CLI outputs (`outputs/`)
- Thirteen live Chromium screenshots (`evidence/browser/`) mapped in `evidence/INDEX.md`, plus verification logs in `docs/` and `evidence/`

## Verification commands and expected counts

- CLI unit tests: 30 passed (`python3 -m unittest discover -s tests -v`)
- Backend API/DB tests: 9 passed (`PYTHONPATH=. backend/.venv/bin/python -m pytest backend/tests -q`)
- Frontend unit/component tests: 26 passed (`npm --prefix frontend test`)
- Playwright Chromium e2e tests: 9 passed (`npm --prefix frontend run test:e2e`)
- TypeScript check: passed (`cd frontend && npx tsc -b --pretty false`)
- Production build: passed (`npm --prefix frontend run build`)

Baseline figures: CPU `FCFS`/`SJF`/`RR` mean wait `4.75 / 4 / 5`; memory `FIFO`/`LRU`/`OPT` faults `10 / 9 / 7`; Banker `SAFE` order `P1 -> P3 -> P0 -> P2 -> P4`; disk `FCFS`/`SSTF`/`SCAN` movement `640 / 236 / 331`.

## Archive and git hygiene

`.gitignore` keeps virtual environments, `node_modules`, build output, SQLite runtime `.db` files, `.env`, caches, runtime `.log` files, local `.zip` archives (`os_resource_capstone.zip`, `os_resource_capstone_final.zip`), and external skill folders untracked. Neither existing `.zip` file on disk has been overwritten.

## Student responsibilities before submission

- Add your full name, student ID, course/section, institution, semester, and instructor details where required.
- Include accurate citations, originality statements, and any required AI-assistance disclosures using your institution's exact policy and wording; never conceal required disclosures or misrepresent authorship.
- Verify submission-portal rules on repository URLs, archive filenames, size limits, or report templates.
- Practice the live walkthrough in `docs/WEB_DEMONSTRATION.md` and be ready to explain algorithm tie-breakers, trace steps, and modeling limits.
