# Phase 1: System design and planning (20 marks)

## Problem and objective

The goal is to simulate four core operating-system resource management problems inside one reproducible Python and Bash program, comparing algorithms on identical per-domain inputs. This program models scheduling and allocation policies on discrete workloads; it does not schedule real kernel threads, inspect live RAM, hook into OS process tables, or drive physical storage hardware.

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

Both the original CLI and the web interface import `os_sim` directly. Modules pass validated Python structures into `reporting.analyze` rather than shelling out to separate scripts. The CLI needs no GUI toolkit or third-party plotting package. Details on the FastAPI and React layers live in [`WEB_ARCHITECTURE.md`](WEB_ARCHITECTURE.md).

## Data structures and schema

| Domain | Input schema | Internal structures | Computed output |
|---|---|---|---|
| CPU process | `{pid: str, arrival: int, burst: int}` | list of dicts, `remaining` map, FIFO `deque` for RR, Gantt segment list | completion, turnaround, waiting, Gantt intervals |
| Memory | `references: [int]`, `frames: int` | resident page list, load/use step maps, per-step trace list | faults, hits, hit/fault rates, frame snapshots |
| Deadlock | `available: [int]`, `maximum: [[int]]`, `allocation: [[int]]` | 2D integer lists, `need`, `work`, boolean `done` list | `safe` boolean, safe sequence, unfinished list, release trace |
| Storage | `requests: [int]`, `head: int`, `cylinders: int`, `direction: str` | sorted directional slices, route list with SCAN boundary stop | total head movement and mean movement per request |
| Reporting | four domain sections in one JSON file | dictionary of per-domain result lists | `results.json`, three CSV tables, three SVG charts |
| Reliability | CLI flags and menu prompts | `ValueError` guards and `logging` handlers | exit code `0` or `2`, stderr message, activity log trace |

### Metric definitions

For CPU scheduling, `turnaround = completion - arrival` and `waiting = turnaround - burst`. Utilization is `100 * sum(bursts) / (last_finish - earliest_arrival)`, and throughput is `process_count / elapsed_time`. Elapsed time starts at the earliest arrival and runs until the final completion, so any mid-schedule idle gap reduces utilization below 100%.

For page replacement, `fault_rate = 100 * faults / len(references)`, and `hits + faults` always equals the number of page references.

For Banker's algorithm, `need = maximum - allocation`. Each pass finds the first unfinished process whose `need` fits within `work`, adds its `allocation` back to `work`, and marks it done. Finishing every process proves the snapshot is safe.

For disk scheduling, total head movement sums `abs(route[k + 1] - route[k])` along the visited cylinder path, and average movement divides by the number of requests (or returns `0` when the request list is empty). On any non-empty queue, SCAN travels all the way to `cylinders - 1` when moving `up` or `0` when moving `down` before reversing to serve requests on the opposite side. That trip to the end of the disk counts toward total movement. Requests already at the initial head add no extra stop, and an empty queue stays at `head` with zero movement.

## Implementation sequence

Work moved through six concrete stages:

1. Fix the JSON input format, tie-breaking rules, and rejection conditions in `samples/baseline.json` and `os_sim/validation.py`.
2. Write standalone pure functions for CPU scheduling, page replacement, Banker's check, and disk arm movement, wired together through `os_sim/cli.py`.
3. Add `run.sh` to resolve the repository root, check for `python3`, log each invocation, and forward exit codes cleanly.
4. Build `os_sim/reporting.py` so every algorithm in a domain runs against the same workload and writes JSON traces, CSV summaries, and offline SVG bar charts.
5. Cover normal runs, tie-breakers, malformed JSON, negative or boolean values, multi-resource Banker matrices, SCAN boundary sweeps, and log files in `tests/test_simulator.py`.
6. Capture batch and menu runs, review measured numbers against hand traces, and assemble the final report and demo scripts.

## Design tradeoffs

Covering four OS subsystems goes one beyond the three-module minimum while keeping configuration in a single JSON file. Sticking to the Python standard library for `os_sim` makes CLI grading independent of `pip` or internet access, while pure functions make unit tests straightforward without mocking globals. Writing full execution traces alongside summary averages lets anyone check how a metric was produced step by step.

## Web platform layer

In `Kernel_Scope`, a React and TypeScript frontend talks to FastAPI over `/api`. Pydantic schemas reject bad payloads before simulation functions run, and SQLAlchemy stores datasets, input snapshots, results, and activity logs in SQLite via Alembic migrations. That web layer sits on top of `os_sim` without altering the command-line workflow; see [`WEB_ARCHITECTURE.md`](WEB_ARCHITECTURE.md) for the route and table layout.
