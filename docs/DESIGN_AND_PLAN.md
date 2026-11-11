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
