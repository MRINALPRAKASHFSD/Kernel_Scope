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

