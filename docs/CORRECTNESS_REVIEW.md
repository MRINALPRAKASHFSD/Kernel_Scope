# KernelScope: Algorithm correctness review

## Scope

This review compares `os_sim`'s measured outputs on `samples/baseline.json` against independent hand-worked traces. Every policy within a domain ran on the exact same input snapshot. Theoretical notes explain why policies diverge without substituting for measured figures.

## CPU scheduling

Shared input: `P1` (`arrival=0, burst=7`), `P2` (`2, 4`), `P3` (`4, 1`), `P4` (`5, 4`), `RR` quantum `2`.

| Algorithm | Measured average waiting | Measured average turnaround | Measured utilization | Measured throughput |
|---|---:|---:|---:|---:|
| FCFS | 4.75 | 8.75 | 100% | 0.25 |
| SJF | 4.00 | 8.00 | 100% | 0.25 |
| RR | 5.00 | 9.00 | 100% | 0.25 |

- `FCFS`, `SJF`, and `RR` compute `turnaround = completion - arrival` and `waiting = turnaround - burst`.
- `FCFS` sorts stably by `(arrival, input_index)` (`0..7 P1`, `7..11 P2`, `11..12 P3`, `12..16 P4`; waits `0, 5, 7, 7` -> mean `4.75`).
- Non-preemptive `SJF` picks minimum `(burst, arrival, input_index)` among arrived jobs (`0..7 P1`, `7..8 P3`, `8..12 P2`, `12..16 P4`; waits `0, 6, 3, 7` -> mean `4.00`).
- `RR` enqueues arrivals with `arrival <= clock` before re-appending the preempted job (`0..2 P1`, `2..4 P2`, `4..6 P1`, `6..7 P3`, `7..9 P2`, `9..11 P4`, `11..13 P1`, `13..15 P4`, `15..16 P1`; completions `P1=16, P2=9, P3=7, P4=15`; waits `9, 3, 2, 6` -> mean `5.00`).
- Utilization spans `max(completion) - min(arrival)` (`16 - 0 = 16`), so leading idle time before the earliest arrival does not inflate denominator ticks, while mid-schedule idle gaps lower utilization below `100%`.

## Memory page replacement

Shared input: `references = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2]`, `frames = 3`.

| Policy | Measured faults | Measured hits | Fault rate | Hit rate |
|---|---:|---:|---:|---:|
| FIFO | 10 | 3 | 76.923% | 23.077% |
| LRU | 9 | 4 | 69.231% | 30.769% |
| OPT | 7 | 6 | 53.846% | 46.154% |

- `FIFO` evicts `min(resident, key=lambda p: loaded_at[p])`.
- `LRU` evicts `min(resident, key=lambda p: last_used[p])`, updating `last_used[page] = step` on both hits and faults.
- `OPT` evicts `max(resident, key=lambda p: future.index(p) if p in future else float("inf"))` over `references[step + 1:]`.
- `hits + faults == len(references)` holds across every run, and the secondary fixture `[1, 2, 3, 1, 4, 1, 2]` (3 frames) produces `FIFO=6`, `LRU=5`, `OPT=4` faults.

## Deadlock handling

- Baseline (`Available = [3, 3, 2]`, 5 processes): `SAFE`, sequence `P1 -> P3 -> P0 -> P2 -> P4`, final `Work = [10, 5, 7]`.
- Unsafe fixture (`Available = [0]`, `Maximum = [[2], [2]]`, `Allocation = [[1], [1]]`): `UNSAFE`, `safe_sequence = None`, `unfinished = ["P0", "P1"]`.
- `Need` is computed as `Maximum - Allocation`, and each pass picks the first unfinished row satisfying `Need[i] <= Work` component-wise.
- Banker's check evaluates worst-case remaining demand on a static snapshot; an `UNSAFE` verdict signals deadlock risk rather than an existing deadlock cycle.

## Disk scheduling

Shared input: `requests = [98, 183, 37, 122, 14, 124, 65, 67]`, `head = 53`, `cylinders = 200`, `direction = "up"`.

| Algorithm | Measured route | Measured movement | Average/request |
|---|---:|---:|---:|
| FCFS | 53 -> 98 -> 183 -> 37 -> 122 -> 14 -> 124 -> 65 -> 67 | 640 | 80.000 |
| SSTF | 53 -> 65 -> 67 -> 37 -> 14 -> 98 -> 122 -> 124 -> 183 | 236 | 29.500 |
| SCAN up | 53 -> 65 -> 67 -> 98 -> 122 -> 124 -> 183 -> 199 -> 37 -> 14 | 331 | 41.375 |

- `FCFS` appends `requests` in arrival order.
- `SSTF` selects `min(pending, key=lambda item: (abs(item[1] - route[-1]), item[0]))`, resolving equal-distance ties by original queue index.
- Full-sweep `SCAN` visits pending requests in the initial direction, reaches `cylinders - 1` (`up`) or `0` (`down`) on every non-empty queue, counts that boundary travel in `total_head_movement`, and reverses if opposite-side requests exist.
- Requests equal to `head` are served at `route[0]` without a duplicate stop; duplicate requests elsewhere remain separate stops with `0` extra movement; empty queues return `[head]` with `0` movement.

## Full-sweep SCAN boundary correction

An early `storage.py` draft only appended `cylinders - 1` or `0` when requests existed on the opposite side of `head`, producing `LOOK` behavior on one-sided queues while labeling the policy `SCAN`. Commit `a17fc83` (Nov 13, 2026) updated `disk_schedule` so every non-empty `SCAN` queue sweeps to the selected physical endpoint, backed by unit and browser tests for one-sided queues, two-sided queues, boundary requests (`0` and `199`), boundary starting heads, duplicate requests, and empty queues.

## Automated verification summary

KernelScope passes 74 automated tests: 30 CLI `unittest` cases (`tests/test_simulator.py`), 9 FastAPI/SQLite `pytest` cases (`backend/tests/test_api.py`), 26 `Vitest` unit/component cases (`frontend/src/**/*.test.{ts,tsx}`), and 9 Playwright Chromium e2e cases (`frontend/e2e/acceptance.pw.ts`), plus `tsc -b` and `vite build`. Transcripts live in `docs/test_results.txt`, `docs/web_test_results.txt`, and `evidence/`.
