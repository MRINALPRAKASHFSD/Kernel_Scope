# Phase 5: CLI demonstration script (20 marks)

This guide covers a 5 to 7 minute demonstration of the Bash-and-Python CLI (`run.sh` + `os_sim.cli`, integrated in `PR #4` on November 14, 2026; see [`MILESTONE_NOTES_NOV14_NOV21.md`](MILESTONE_NOTES_NOV14_NOV21.md)). For the full-stack KernelScope browser walkthrough and 6-minute talk track, see [`WEB_DEMONSTRATION.md`](WEB_DEMONSTRATION.md).

## Suggested 5 to 7 minute terminal sequence

1. Spend 45 seconds on architecture. Open `docs/DESIGN_AND_PLAN.md` and `docs/WEB_ARCHITECTURE.md`, showing how both `run.sh` and the KernelScope FastAPI/React stack call the same `os_sim/` modules.
2. Spend 30 seconds on environment setup. Run `python3 --version` and `chmod +x run.sh`, noting that `os_sim` uses only the Python standard library while the web app isolates dependencies in `backend/.venv` and `frontend/node_modules`.
3. Spend 60 seconds in interactive menu mode. Run `./run.sh --mode menu`, enter `1` (CPU scheduling) and `2` (page replacement), and walk through Gantt segments, waiting/turnaround numbers, and per-reference resident frame lists.
4. Spend 60 seconds on Banker safety and disk seeks. Enter `3` to show the safe completion order (`P1 -> P3 -> P0 -> P2 -> P4`), then `4` to compare `FCFS`, `SSTF`, and full-sweep `SCAN` routes. Note that `UNSAFE` warns of potential deadlock risk rather than an active deadlock.
5. Spend 60 seconds on exported tables and SVG charts. Enter `5`, then open `outputs/scheduling.csv`, `outputs/memory.csv`, `outputs/storage.csv`, and `outputs/*.svg` to highlight `SJF` (`4.00` mean wait), `OPT` (`7` faults), and `SSTF` (`236` cylinders) on `samples/baseline.json`.
6. Spend 45 seconds on tests and invalid-input handling. Show the 74 passing automated tests (30 CLI `unittest`, 9 backend `pytest`, 26 frontend `Vitest`, and 9 Playwright), then run `samples/unsafe.json` and `samples/invalid.json` to demonstrate exit status `2` and `outputs/activity.log` traceback logging.
7. Finish in 30 seconds by showing `README.md`, `docs/REPORT.md`, `evidence/INDEX.md`, and `docs/SUBMISSION_CHECKLIST.md`, stating model assumptions and one extension idea (such as preemptive `SRTF` or `C-SCAN`).

## Evidence organization

Thirteen live Chromium screenshots from KernelScope sit under `evidence/browser/` and are mapped in [`../evidence/INDEX.md`](../evidence/INDEX.md). The four PNG files directly in `evidence/` (`scheduling_chart.png`, `memory_chart.png`, `storage_chart.png`, and `terminal_trace.png`) are raster previews of CLI outputs rather than browser captures.

## Questions to prepare for

- Why run every policy in a domain on the exact same workload? Holding the input fixed isolates scheduling or replacement logic as the sole independent variable.
- Why did `RR` record `5.00` mean wait vs. `4.00` for `SJF`? `RR` time-slices ready processes for fairness rather than minimizing completion time, and context-switch overhead is set to zero in this discrete model.
- Can `OPT` run online in an OS kernel? No. Evicting the page referenced farthest in the future requires future knowledge, making `OPT` an offline lower-bound benchmark.
- Does `UNSAFE` mean processes are deadlocked right now? No. It means Banker's algorithm cannot guarantee completion if every process immediately requests its remaining `Need`.
- When can `SSTF` misbehave despite low cylinder travel? Continuous arrivals near the current head position can starve distant cylinder requests.
- What does `run.sh` add around Python? It resolves the repository root from any caller directory, verifies `python3`, logs UTC launch arguments to `outputs/launcher.log`, and `exec`s `os_sim.cli` so exit codes propagate unchanged.
