# Final repository and package audit

Repository: `MRINALPRAKASHFSD/Kernel_Scope` (`KernelScope`)
Preserved local submission archive: `os_resource_capstone_final.zip` (untouched on disk; gitignored)
Live browser screenshots: 13 PNG files under `evidence/browser/`

The `Kernel_Scope` repository tracks the KernelScope React/TypeScript frontend (`frontend/`), brand and favicon assets (`frontend/public/`), Vitest suites, Playwright config and Chromium e2e suite (`frontend/e2e/acceptance.pw.ts`), FastAPI application and SQLAlchemy/Alembic persistence (`backend/`), shared standard-library Python algorithms (`os_sim/`), Bash launchers (`run.sh`, `start_web.sh`), JSON workloads (`samples/`), verified CLI exports (`outputs/`), design specification (`design-system/os-resource-lab/MASTER.md`), technical and historical documentation (`docs/`), and verification records (`evidence/`).

## Automated verification summary

- Python CLI `unittest`: 30 passed (`python3 -m unittest discover -s tests -v`)
- Backend `pytest`: 9 passed (`PYTHONPATH=. backend/.venv/bin/python -m pytest backend/tests -q`)
- Frontend `Vitest`: 26 passed (`npm --prefix frontend test`)
- Playwright Chromium e2e: 9 passed (`npm --prefix frontend run test:e2e`)
- Total automated tests: 74 passed, 0 failed
- TypeScript project check (`cd frontend && npx tsc -b --pretty false`) and production bundle (`npm --prefix frontend run build`): passed

Playwright verified all ten navigation routes, KernelScope `<title>`, `/favicon.svg`, `/favicon.ico`, and `/kernelscope-mark.svg` rendering across dark and light themes, CPU Gantt ordering and `IDLE` intervals, memory resident-page order and eviction notes, Banker `SAFE` and `UNSAFE` matrices, disk `SCAN` boundary stops at cylinders `0` and `199`, persisted analytics/reports, responsive bounds at `375, 768, 1024, 1440 px`, and zero uncaught page or console errors against an isolated temporary SQLite database.

Verified baseline metrics match across `docs/REPORT.md`, `docs/CORRECTNESS_REVIEW.md`, and `evidence/baseline_verification.txt`: CPU `FCFS`/`SJF`/`RR` mean waiting times `4.75 / 4 / 5`, memory `FIFO`/`LRU`/`OPT` page faults `10 / 9 / 7`, Banker `SAFE` sequence `P1 -> P3 -> P0 -> P2 -> P4`, and disk `FCFS`/`SSTF`/`SCAN` movements `640 / 236 / 331`.

## Exclusions and archive preservation

`.gitignore` excludes `backend/.venv/`, `frontend/node_modules/`, `frontend/dist/`, `backend/data/*.db*`, `.env`, caches, runtime `.log` files, temporary Playwright output, external skill catalogs, and local `.zip` files. Both `os_resource_capstone.zip` and `os_resource_capstone_final.zip` remain untouched in the local directory.

## Student authorship and disclosure reminders

Before submitting for academic assessment, supply your name, student ID, course code, institution, and term wherever required, include truthful citations and any required AI-assistance or authorship disclosures per institutional policy, confirm portal packaging rules, and review `docs/WEB_DEMONSTRATION.md` for the live defense.
