# Phase 1: System design and planning (20 marks)

## Problem and objective

KernelScope simulates four operating-system resource-management subsystems inside one reproducible Python and Bash codebase and compares policies on identical per-domain workloads. It models discrete scheduling, paging, deadlock-avoidance, and disk-seek algorithms on explicit JSON inputs; it does not schedule host OS threads, inspect live kernel page tables, probe running processes, or issue hardware disk commands.

## Layered architecture and data flow

```text
User -> Bash run.sh -> Python cli.py (menu, arguments, errors, activity log)
                                │
                          JSON input loader
                                │
                          common validation
                                │
     ┌──────────────────────────┼──────────────────────────────┐
     │                          │                              │
 CPU scheduling            Memory pages                 Banker safety
 FCFS / SJF / RR           FIFO / LRU / OPT             Need, Work, Finish
     │                          │                              │
     └──────────────────────────┼──────────────────────────────┘
                                │
                         Disk FCFS / SSTF / SCAN
                                │
                        reporting.analyze()
                                │
            JSON trace + CSV comparison + labelled SVG + logs
                                │
                    CLI presentation and evidence
```

Both the CLI (`run.sh` -> `os_sim.cli`) and the FastAPI backend import `os_sim` directly. Validated Python dictionaries pass into `reporting.analyze` (or individual domain functions) without spawning external scripts. The CLI uses only the Python standard library and needs no external plotting library. Details on the FastAPI, SQLAlchemy/Alembic, and React layers sit in [`WEB_ARCHITECTURE.md`](WEB_ARCHITECTURE.md), and historical milestone details for the CLI and UI layers are documented in [`MILESTONE_NOTES_NOV14_NOV21.md`](MILESTONE_NOTES_NOV14_NOV21.md).

## Data structures and schema

| Domain | Input schema | Internal structures | Computed output |
|---|---|---|---|
| CPU process | `{pid: str, arrival: int, burst: int}` | sorted `(index, dict)` pairs, `remaining` map, `collections.deque` for `RR`, Gantt segment list | completion, turnaround, waiting, utilization, throughput, Gantt intervals |
| Memory | `references: [int]`, `frames: int` | `resident` list, `loaded_at` and `last_used` step dicts, per-step trace list | faults, hits, hit/fault percentages, resident-page snapshots |
| Deadlock | `available: [int]`, `maximum: [[int]]`, `allocation: [[int]]` | 2D integer matrices, derived `need`, mutable `work` vector, `done` flags | `safe` boolean, `safe_sequence`, `unfinished` list, release trace |
| Storage | `requests: [int]`, `head: int`, `cylinders: int`, `direction: str` | indexed request tuples (`SSTF`), sorted `lower`/`higher` slices (`SCAN`), `route` list | visited route, total head movement, mean movement per request |
| Reporting | four domain sections in one JSON object | dictionary of per-domain result lists/dicts | `results.json`, three CSV tables, three `720x310` SVG bar charts |
| Reliability | CLI flags and interactive menu inputs | `type(v) is int` guards, `ValueError` checks, `logging` file handler | exit code `0` or `2`, `stderr` error line, `outputs/activity.log` |

### Metric definitions

- CPU scheduling: `turnaround = completion - arrival` and `waiting = turnaround - burst`. Utilization is `100 * sum(bursts) / (max(completion) - min(arrival))`, and throughput is `len(processes) / elapsed`. Because `elapsed` spans from the earliest arrival to the final completion, any mid-workload idle gap reduces utilization below `100%`.
- Memory replacement: `fault_rate_percent = round(100 * faults / len(references), 3)`, and `hits + faults == len(references)` holds on every run.
- Banker's safety check: `need[i][j] = maximum[i][j] - allocation[i][j]`. Each pass selects the lowest-index unfinished process `i` satisfying `all(need[i][j] <= work[j])`, adds `allocation[i]` back into `work`, and records `P{i}`. Completing all `n` processes proves the snapshot is `SAFE`.
- Disk scheduling: `total_head_movement = sum(abs(route[k + 1] - route[k]))`, and `average_movement_per_request = movement / len(requests)` (`0` when `requests` is empty). On every non-empty queue, `SCAN` sweeps all the way to `cylinders - 1` (`up`) or `0` (`down`), counts that boundary leg in total movement, and then reverses if requests remain on the opposite side. Requests sitting at the initial head add no duplicate route stop, and an empty queue stays at `[head]` with `0` movement.

## Six-stage build plan

1. Define the JSON input contract, deterministic tie-breakers, and rejection rules (`samples/baseline.json`, `os_sim/validation.py`).
2. Implement pure standard-library modules for CPU scheduling, page replacement, Banker safety, and disk scheduling, orchestrated by `os_sim/cli.py`.
3. Add `run.sh` to resolve the project root, check `python3`, append UTC launch records to `outputs/launcher.log`, and forward Python exit codes.
4. Build `os_sim/reporting.py` to run every policy in a domain on the same workload and export `results.json`, CSV summaries, and standalone SVG bar charts.
5. Write unit and integration tests (`tests/test_simulator.py`) covering hand-worked baselines, tie-breakers, boolean/negative/ragged rejections, multi-resource Banker states, one-sided and boundary `SCAN` queues, and CLI log files.
6. Extend the simulator with the KernelScope FastAPI/SQLite/React workbench, verify 74 automated tests across CLI, API, component, and Chromium layers, and document live walkthroughs.

## Engineering tradeoffs

Implementing four OS domains exceeds the three-domain floor while keeping integrated runs inside one JSON schema. Restricting `os_sim/` to the Python standard library keeps CLI execution independent of virtual environments or network installs, while pure functions let `unittest` and FastAPI services call the exact same code paths without global state. Exporting full step traces alongside summary averages makes every chart and table verifiable by hand.
