# Phase 4: Testing and reliability (20 marks)

Run the core Python unit test suite with `python3 -m unittest discover -s tests -v`.

The CLI and algorithm package has 30 `unittest` cases recorded in `docs/test_results.txt`. Across the whole `Kernel_Scope` repository, 74 automated tests pass: 30 CLI `unittest` cases, 9 backend `pytest` cases, 26 frontend `Vitest` cases, and 9 Playwright browser tests. Full command transcripts sit in `docs/web_test_results.txt` and `evidence/test_transcript.txt`.

| ID | Category | Scenario and expected result | Test function |
|---|---|---|---|
| T01 | Valid | FCFS arrivals (`A`: 0/5, `B`: 1/2) produce waits `0` and `4` | `test_fcfs_metrics` |
| T02 | Valid | RR quantum 2 produces completions `A=7`, `B=4` | `test_rr_arrivals` |
| T03 | Boundary | Single process arriving at time 5 starts at 5 with `0` waiting | `test_idle_and_single_process` |
| T04 | Invalid | Empty job list, burst 0, arrival -1, duplicate PID, quantum 0, bool arrival, or unknown policy raises `ValueError` | `test_bad_input` |
| T05 | Valid | Known 7-page stream across 3 frames yields FIFO 6, LRU 5, OPT 4 faults | `test_known_sequence` |
| T06 | Invariant | Across 4 references, `hits + faults == 4` for FIFO, LRU, and OPT | `test_faults_plus_hits` |
| T07 | Invalid | Empty reference list, page -1, 0 frames, bool page, or bad policy raises `ValueError` | `test_rejections` |
| T08 | Valid | Banker snapshot with enough free units returns a full safe sequence | `test_safe` |
| T09 | Unsafe | Zero available resources with unmet needs returns `safe=False` and unfinished `P0`, `P1` | `test_unsafe` |
| T10 | Invalid | Allocation above maximum, mismatched dimensions, or bool entry raises `ValueError` | `test_invalid` |
