# Changelog

All notable changes to KernelScope are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Repository governance, proprietary copyright protection, and CI workflows: `LICENSE` (Proprietary / All Rights Reserved), `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `CITATION.cff`, `.editorconfig`, GitHub issue/PR templates, and `.github/workflows/ci.yml`.
- Redesigned `README.md` with KernelScope logo header, CI and stack badges, live UI screenshot gallery, Mermaid system diagram, policy specification tables, and contributor links.

## [1.0.0] - 2026-11-24

### Added
- **Core Python simulation package (`os_sim/`)**: arrival-aware `FCFS`, non-preemptive `SJF`, and `RR` CPU scheduling; `FIFO`, `LRU`, and offline `OPT` page replacement; multi-resource Banker safety verification; and `FCFS`, `SSTF`, and full-sweep `SCAN` disk arm scheduling.
- **Bash and CLI workflow (`run.sh`, `os_sim/cli.py`, `os_sim/reporting.py`)**: batch `--mode demo` and interactive `0`-`6` `--mode menu` execution, JSON/CSV exports, dependency-free `720x310` SVG bar charts, and `activity.log` / `launcher.log` audit trails.
- **FastAPI and SQLite backend (`backend/`)**: `/api/simulations/*`, `/api/datasets/*`, `/api/analytics/*`, and `/api/reports/*` routes backed by SQLAlchemy 2.0, Pydantic v2 validation, `activity_logs` audit rows, and Alembic migration `0001_initial.py`.
- **KernelScope React + TypeScript workbench (`frontend/`, `start_web.sh`)**: ten responsive routes (`Overview`, `Analytics`, `Datasets`, `Run history`, `Reports`, `CPU`, `Memory`, `Deadlock`, `Disk`, and `About & docs`), dark and light themes, SVG/PNG brand assets, printable `KS` execution reports, and JSON/CSV downloads.
- **Automated verification (74 passing tests)**: 30 CLI `unittest` cases, 9 backend `pytest` tests, 26 frontend `Vitest` tests, and 9 Playwright Chromium e2e tests across 375, 768, 1024, and 1440 px viewports with 13 captured screenshots in `evidence/browser/`.

### Fixed
- Updated `os_sim/storage.py` so every non-empty `SCAN` queue completes its sweep to physical boundary cylinder `0` or `cylinders - 1` (preventing `LOOK`-style early reversal on one-sided queues) and classified combined boundary requests in `frontend/src/lib/diskRoute.ts`.
