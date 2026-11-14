# Phase 5: CLI demonstration script (20 marks)

This outline covers a 5 to 7 minute walkthrough of the original command-line simulator. For the full-stack browser walkthrough, screenshot map, and spoken script, see [`WEB_DEMONSTRATION.md`](WEB_DEMONSTRATION.md).

## Suggested 5 to 7 minute terminal flow

1. Spend about 45 seconds on architecture. Open `docs/DESIGN_AND_PLAN.md` and `docs/WEB_ARCHITECTURE.md`, then trace how both `run.sh` and the React/FastAPI/SQLite stack call the same `os_sim` Python functions.
2. Take 30 seconds on CLI setup. Run `python3 --version` and `chmod +x run.sh`, noting that the CLI needs only the Python standard library while the web app uses its own isolated `backend/.venv` and `frontend/node_modules`.
3. Spend 60 seconds in interactive menu mode. Run `./run.sh --mode menu`, pick `1` for CPU scheduling and `2` for memory replacement, and point out the Gantt segments, waiting/turnaround figures, and step-by-step page frame snapshots.
4. Spend 60 seconds on deadlock and disk scheduling. Choose `3` to inspect the safe Banker sequence (`P1 -> P3 -> P0 -> P2 -> P4`), then `4` to compare FCFS, SSTF, and full-sweep SCAN head routes. Remind listeners that an unsafe Banker result flags potential deadlock risk rather than an active deadlock.
5. Take 60 seconds on exported comparisons. Pick `5` and open `outputs/*.csv` alongside `outputs/*.svg` to compare SJF (mean wait 4), OPT (7 faults), and SSTF (236 cylinders) on the shared baseline.
6. Spend 45 seconds on tests and failure handling. Show the 74 passing automated tests (30 CLI `unittest`, 9 backend `pytest`, 26 frontend `Vitest`, and 9 Playwright), then run `samples/unsafe.json` and `samples/invalid.json` to show exit status `2` and the logged validation error.
7. Wrap up in 30 seconds by showing `README.md`, `docs/REPORT.md`, `evidence/INDEX.md`, and `docs/SUBMISSION_CHECKLIST.md`, briefly noting model assumptions and one future extension idea.

## Screenshot and evidence notes

Thirteen live Chromium captures sit in `evidence/browser/` and are indexed in [`../evidence/INDEX.md`](../evidence/INDEX.md). The four PNG files directly inside `evidence/` are rasterized CLI charts and terminal output rather than browser screenshots.

## Likely instructor questions

Why run every algorithm in a module on the exact same input? Holding the workload fixed isolates the scheduling or replacement policy as the only variable changing the metric.

