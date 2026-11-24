# Algorithm correctness review

## Scope

This document checks `os_sim`'s measured outputs on `samples/baseline.json` against independent hand calculations. Within each OS domain, every algorithm receives the exact same input snapshot. Notes on theoretical behavior explain why policies differ without replacing measured numbers.

## CPU scheduling

Shared workload: `P1` (arrival 0, burst 7), `P2` (arrival 2, burst 4), `P3` (arrival 4, burst 1), `P4` (arrival 5, burst 4), with Round Robin quantum `2`.

| Algorithm | Measured average waiting | Measured average turnaround | Measured utilization | Measured throughput |
|---|---:|---:|---:|---:|
| FCFS | 4.75 | 8.75 | 100% | 0.25 |
| SJF | 4.00 | 8.00 | 100% | 0.25 |
| RR | 5.00 | 9.00 | 100% | 0.25 |

All three policies compute `turnaround = completion - arrival` and `waiting = turnaround - burst`. FCFS sorts stably by arrival time. Non-preemptive SJF picks the shortest burst among ready processes, breaking ties by arrival time and original list position. Round Robin enqueues newly arrived jobs ahead of a job whose time slice just finished. Utilization spans from the earliest arrival (`0`) to the last completion (`16`), so any idle gap after the first arrival lowers utilization as expected.

Why the numbers line up with theory: once `P1` finishes at `t = 7`, `P2`, `P3`, and `P4` are all waiting; running `P3` (burst 1) before the two 4-unit jobs lowers mean wait to `4.00`. Round Robin cycles slices across ready processes and finishes jobs later on average (`5.00` wait), with zero context-switch penalty modeled. Unit tests also cover late single-job arrivals, idle gaps before ready work, and SJF tie-breaking.

## Page replacement

Shared workload: reference sequence `[7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2]` across `3` frames.

| Algorithm | Measured faults | Measured hits | Fault ratio | Hit ratio |
|---|---:|---:|---:|---:|
| FIFO | 10 | 3 | 76.923% | 23.077% |
| LRU | 9 | 4 | 69.231% | 30.769% |
| OPT | 7 | 6 | 53.846% | 46.154% |

FIFO evicts the page that entered memory earliest, LRU evicts the resident page whose most recent access is oldest, and OPT evicts the resident page whose next reference lies farthest ahead (or never occurs again). Across every run, `hits + faults` equals `len(references)`. A separate test sequence (`[1, 2, 3, 1, 4, 1, 2]` with 3 frames) also matches hand-worked counts of FIFO `6`, LRU `5`, and OPT `4` faults. OPT sets the offline lower bound, while LRU and FIFO are online policies whose relative order depends on locality in the workload.

## Deadlock handling

On `samples/baseline.json`, Banker's check returns `SAFE` with completion order `P1 -> P3 -> P0 -> P2 -> P4`.

On `samples/unsafe.json` (`available = [0]`, `maximum = [[2], [2]]`, `allocation = [[1], [1]]`), it returns `UNSAFE` with no safe sequence and unfinished list `["P0", "P1"]`.

Internally, `need` equals `maximum - allocation`, `work` starts as a copy of `available`, and a process only runs when every element of `need[i]` is less than or equal to `work`. When process `i` completes, its `allocation[i]` is added to `work`. Because Banker evaluates worst-case remaining demand on a static snapshot, an unsafe result warns of potential deadlock rather than proving an active cycle of blocked processes.

## Disk scheduling

Shared workload: requests `[98, 183, 37, 122, 14, 124, 65, 67]`, initial head `53`, `200` cylinders (`0..199`), and SCAN direction `up`.

| Algorithm | Measured route | Measured movement | Average/request |
|---|---:|---:|---:|
| FCFS | 53 -> 98 -> 183 -> 37 -> 122 -> 14 -> 124 -> 65 -> 67 | 640 | 80.000 |
| SSTF | 53 -> 65 -> 67 -> 37 -> 14 -> 98 -> 122 -> 124 -> 183 | 236 | 29.500 |
| SCAN up | 53 -> 65 -> 67 -> 98 -> 122 -> 124 -> 183 -> 199 -> 37 -> 14 | 331 | 41.375 |

FCFS follows queue order. SSTF greedily picks the minimum `abs(req - current_head)` and breaks ties by input index. Full-sweep SCAN serves all requests in the chosen direction, reaches the physical end of the disk (`199` going up, `0` going down) on every non-empty queue, counts that boundary leg in total movement, and reverses to clear remaining requests. Requests matching the starting head position do not add a duplicate cylinder entry, duplicate requests elsewhere stay counted individually with `0` extra movement between identical stops, and empty queues return `[head]` with `0` movement.

## Full-sweep SCAN boundary fix

An earlier draft skipped the physical boundary when requests existed on only one side of the head, effectively behaving like LOOK while calling itself SCAN. `os_sim/storage.py` now completes the sweep to `0` or `cylinders - 1` on every non-empty queue, backed by regression tests for one-sided queues, two-sided queues, requests sitting directly on `0` or `199`, heads starting on `0` or `199`, duplicate requests, and empty queues.

## Test and artifact status

All 74 automated tests pass across the repository (30 CLI `unittest`, 9 backend `pytest`, 26 frontend `Vitest`, and 9 Playwright e2e tests), along with `tsc -b` and `vite build`. Baseline and unsafe CLI exports sit under `outputs/`, invalid CLI trace output is recorded in `docs/invalid_output_trace.txt`, CLI unit test output is in `docs/test_results.txt`, and full-stack verification logs live in `docs/web_test_results.txt` and `evidence/`.
