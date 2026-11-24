# Technical report: Phases 3 and 5 (20 + 20 marks)

## Overview

KernelScope combines a standard-library Python and Bash simulator (`os_sim/` + `run.sh`) with a local React, TypeScript, FastAPI, SQLAlchemy, Alembic, and SQLite web workbench (`start_web.sh`). Both interfaces call the same Python implementations for CPU process scheduling, virtual-memory page replacement, multi-resource Banker safety analysis, and disk arm scheduling. Shared JSON workloads, strict integer/matrix guards, activity logs, persisted input snapshots, and CSV/JSON/SVG exports keep measurements reproducible across CLI and browser runs.

## Experimental method

Within each resource domain, every competing algorithm received the exact same workload snapshot:

- CPU scheduling: four processes (`P1` arrival 0 / burst 7, `P2` 2 / 4, `P3` 4 / 1, `P4` 5 / 4) with `RR` quantum `2`.
- Memory management: 13 page references (`7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2`) across `3` frames.
- Deadlock handling: 5 processes (`P0..P4`) across 3 resource types with `Available = [3, 3, 2]`.
- Disk scheduling: 8 cylinder requests (`98, 183, 37, 122, 14, 124, 65, 67`), initial head `53`, `200` cylinders (`0..199`), and `SCAN` direction `up`.

Because discrete clock ticks, page faults, resource vectors, and disk cylinders use incompatible units, comparisons are restricted to algorithms within the same domain. Baseline tables below come directly from `./run.sh --mode demo --dataset samples/baseline.json` (`outputs/*.csv`).

## CPU scheduling results (time units)

| Algorithm | Average waiting | Average turnaround | CPU utilization (%) | Throughput (jobs/time unit) |
|---|---:|---:|---:|---:|
| FCFS | 4.75 | 8.75 | 100 | 0.25 |
| Non-preemptive SJF | 4.00 | 8.00 | 100 | 0.25 |
| RR, quantum 2 | 5.00 | 9.00 | 100 | 0.25 |

Non-preemptive `SJF` records the lowest mean waiting (`4.00`) and turnaround (`8.00`) on this queue: once `P1` completes at tick `7`, `P2`, `P3`, and `P4` have all arrived, and dispatching `P3` (burst `1`) ahead of the two `4`-tick jobs shortens total waiting across the remaining queue. `FCFS` dispatches strictly by arrival (`4.75` mean wait). `RR` interleaves `2`-tick slices across ready processes, raising mean completion and waiting (`5.00`) in exchange for bounded response intervals. Utilization (`100%`) and throughput (`4 / 16 = 0.25`) match across all three policies because cumulative burst time is `16` ticks with no idle gap and zero modeled context-switch cost. Real OS schedulers must predict CPU bursts for `SJF` and pay register/cache switch costs under small `RR` quanta.

## Memory page replacement results (13 references, 3 frames)

| Policy | Page faults | Hits | Fault rate (%) |
|---|---:|---:|---:|
| FIFO | 10 | 3 | 76.923 |
| LRU | 9 | 4 | 69.231 |
| OPT | 7 | 6 | 53.846 |

`OPT` reaches the minimum `7` faults (`53.846%`) by evicting whichever resident page has its next reference farthest ahead in the stream. Because a live kernel cannot know future memory accesses, `OPT` serves strictly as an offline lower bound. Between the two online policies, `LRU` records fewer faults than `FIFO` (`9` vs. `10`) on this workload by retaining recently accessed pages (`0`, `2`, `3`), though cyclic scans larger than frame capacity can erase `LRU`'s advantage.

## Banker deadlock safety analysis

On `samples/baseline.json`, Banker's safety check marks the snapshot `SAFE` with completion order `P1 -> P3 -> P0 -> P2 -> P4` and final released `Work = [10, 5, 7]`. Each process in that sequence satisfies `Need[i] <= Work` when chosen and returns its `Allocation[i]` upon completion. On `samples/unsafe.json` (`Available = [0]`, `Maximum = [[2], [2]]`, `Allocation = [[1], [1]]`), Banker reports `UNSAFE` with unfinished set `["P0", "P1"]`. An `UNSAFE` verdict indicates that deadlock cannot be ruled out if processes request their full remaining `Need` simultaneously; it does not prove that a deadlock cycle already exists.

## Disk scheduling results (cylinder movements)

| Algorithm | Total movement | Average movement/request |
|---|---:|---:|
| FCFS | 640 | 80.000 |
| SSTF | 236 | 29.500 |
| SCAN up | 331 | 41.375 |

`SSTF` cuts total arm travel to `236` cylinders (`29.500` per request) by serving nearby cylinders (`65, 67, 37, 14`) before crossing to higher tracks (`98..183`), at the cost of potential starvation under steady local arrivals. Full-sweep `SCAN` (`up`) serves upward requests `65..183`, sweeps to physical boundary cylinder `199`, and reverses to `37` and `14` for `331` cylinders total (`41.375` per request). Counting the leg to `199` adds travel relative to `SSTF` while bounding wait times across the platter. `FCFS` follows arrival order (`640` cylinders). Note that cylinder distance models mechanical seek travel on rotational disks rather than NVMe/SSD flash addressing.

## Verification coverage and model boundaries

KernelScope passes 74 automated tests: 30 CLI `unittest` cases, 9 backend `pytest` tests, 26 frontend `Vitest` tests, and 9 Playwright Chromium browser tests, plus `tsc -b` and `vite build`. Playwright exercises all ten routes, KernelScope titles/favicons/logos, CPU Gantt idle spans, memory resident-page evictions, safe/unsafe Banker states, `SCAN` boundary stops at `0` and `199`, persisted analytics/reports, dark/light themes, 375/768/1024/1440 px viewports, and zero console/page errors against a disposable SQLite database (`evidence/browser/*.png`).

Malformed CLI inputs return exit status `2` and log tracebacks without writing partial outputs; invalid HTTP payloads return `422` field details and record `invalid` activity entries. Preemptive priorities, I/O blocking queues, page-table hardware bits, live resource-granting transitions, and physical storage timing remain outside model scope (`docs/CORRECTNESS_REVIEW.md`, `docs/WEB_ARCHITECTURE.md`).

## Summary

Evaluating competing OS policies on shared workloads exposes concrete tradeoffs in waiting time, fault rate, safety guarantees, and seek distance. Pairing summary metrics with complete execution traces lets every result in KernelScope be checked step by step against the documented model assumptions.
