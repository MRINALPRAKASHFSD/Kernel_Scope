# Technical report: Phases 3 and 5 (20 + 20 marks)

## Abstract

This project pairs a Python-and-Bash operating-system simulator with a local full-stack web interface in the `Kernel_Scope` repository. The React and TypeScript frontend talks to FastAPI, Pydantic, SQLAlchemy, Alembic, and SQLite on the backend, while both the web API and the CLI call the same `os_sim` package for CPU scheduling, page replacement, Banker's safety checks, and disk arm scheduling. Shared datasets, strict input checks, execution logs, saved run snapshots, and CSV/JSON/SVG exports keep results reproducible across both interfaces.

## Method

Within each subsystem, every algorithm ran against the exact same workload so policy logic was the only changing variable. The baseline CPU workload has four arrival/burst processes with a Round Robin quantum of 2. The memory workload feeds 13 page references into 3 frames. The deadlock workload checks a 5-process, 3-resource allocation state. The disk workload schedules 8 cylinder requests starting at head 53 across 200 cylinders (`0` through `199`) with initial SCAN direction `up`. Because time units, page counts, resource vectors, and cylinders measure different things, numbers are only compared within the same domain. Running `./run.sh --mode demo` on `samples/baseline.json` produced the `outputs/*.csv` figures summarized below.

## CPU scheduling comparison (time units)

| Algorithm | Average waiting | Average turnaround | CPU utilization (%) | Throughput (jobs/time unit) |
|---|---:|---:|---:|---:|
| FCFS | 4.75 | 8.75 | 100 | 0.25 |
| Non-preemptive SJF | 4.00 | 8.00 | 100 | 0.25 |
| RR, quantum 2 | 5.00 | 9.00 | 100 | 0.25 |

On this four-job queue, non-preemptive SJF finishes with the lowest average wait (4.00) and turnaround (8.00) because short jobs (`P3` with burst 1, then `P2` and `P4` with burst 4) run ahead of longer work once `P1` finishes at time 7. FCFS keeps strict arrival order at 4.75 mean wait. Round Robin trades higher mean wait (5.00) for time-sliced turns across ready processes. All three policies hit 100% utilization and 0.25 throughput because total burst work is 16 units with no idle gaps and zero modeled context-switch cost. In a real kernel, SJF has to estimate future CPU bursts rather than know them up front, and small RR quanta pay context-switch and cache-flush overhead that this discrete clock omits.

## Memory comparison (13 references, 3 frames)

| Algorithm | Page faults | Hits | Fault rate (%) |
|---|---:|---:|---:|
| FIFO | 10 | 3 | 76.923 |
| LRU | 9 | 4 | 69.231 |
| OPT | 7 | 6 | 53.846 |

OPT drops faults down to 7 by evicting whichever resident page is needed farthest in the future. Because real operating systems cannot see future memory accesses, OPT serves strictly as an offline benchmark. Between the two online policies, LRU edges out FIFO (9 faults vs. 10) on this 13-reference stream by keeping recently touched pages in memory, though different access loops and frame counts can narrow or flip that gap.

## Deadlock safety snapshot

Banker's safety check marks the baseline state `SAFE` and finds the completion order `P1 -> P3 -> P0 -> P2 -> P4`. Following that order, each process can claim its remaining `Need`, finish work, and return its held resources to the available pool. By contrast, `samples/unsafe.json` leaves `P0` and `P1` unfinished because zero free units remain while both still need one more unit. Note that an `UNSAFE` verdict flags deadlock risk under worst-case future requests rather than proving that processes are deadlocked right now.

## Disk scheduling comparison (cylinder movements)

| Algorithm | Total movement | Average movement/request |
|---|---:|---:|
| FCFS | 640 | 80.000 |
| SSTF | 236 | 29.500 |
| SCAN up | 331 | 41.375 |

SSTF cuts head travel to 236 cylinders by picking the closest pending request each step, at the risk of starving far-away tracks if nearby requests keep arriving. Full-sweep SCAN moves upward from 53 through 183, touches the upper boundary at cylinder 199, and reverses down to 37 and 14 for 331 total cylinders of movement. Travelling to 199 costs extra distance compared with SSTF, but bounds how long opposite-end requests wait. FCFS honors arrival order and zigzags across the platter for 640 cylinders. Note that cylinder distance approximates seek mechanics on spinning platters rather than flash translation layers on SSDs.

## Validation, logging, and model scope

Automated checks cover 74 tests across four layers: 30 CLI `unittest` cases, 9 backend `pytest` tests, 26 frontend `Vitest` tests, and 9 Playwright browser tests, plus TypeScript compilation and the Vite production build. Playwright launches both local servers against a disposable SQLite file, walks all ten routes, runs each simulator, checks persisted analytics and reports, switches themes, verifies 375, 768, 1024, and 1440 px viewports, asserts zero console errors, and saves 13 screenshots in `evidence/browser/`. Malformed CLI inputs exit with status `2` and log tracebacks without writing partial exports; invalid HTTP payloads return 422 field errors and log `invalid` activity entries. Priorities, I/O wait states, dynamic process creation, page tables, live Banker request granting, and physical device latency remain outside this simulator's scope; see `docs/CORRECTNESS_REVIEW.md` and `docs/WEB_ARCHITECTURE.md`.

## Summary

Running competing OS policies against identical workloads makes their tradeoffs concrete in numbers and step-by-step traces: SJF trims mean wait when burst lengths are known, LRU beats FIFO on locality-heavy streams while trailing offline OPT, Banker separates safe states from risky ones, and SSTF/SCAN trade seek distance against fairness. Every chart and metric in the repo ties back to a saved input snapshot and explicit model rules.
