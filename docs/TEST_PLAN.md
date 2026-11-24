# Phase 4: Testing and reliability (20 marks)

Run the core Python unit test suite from the repository root:

```bash
python3 -m unittest discover -s tests -v
```

`tests/test_simulator.py` contains 30 `unittest` cases recorded in `docs/test_results.txt`. Across the full KernelScope codebase, 74 automated tests pass: 30 CLI `unittest` cases, 9 backend `pytest` cases, 26 frontend `Vitest` cases, and 9 Playwright Chromium browser tests. Full-stack test logs sit in `docs/web_test_results.txt` and `evidence/test_transcript.txt`.

| ID | Kind | Input and expected outcome | Test method |
|---|---|---|---|
| T01 | Valid | `FCFS` arrivals (`A`: 0/5, `B`: 1/2) -> waiting `[0, 4]`, mean `2` | `test_fcfs_metrics` |
| T02 | Valid | `RR` quantum 2 -> completions `[7, 4]`, waiting `[2, 1]` | `test_rr_arrivals` |
| T03 | Boundary | Single process arriving at `t=5` starts at `5` with `0` waiting | `test_idle_and_single_process` |
| T04 | Invalid | Empty list, burst `0`, arrival `-1`, duplicate PID, quantum `0`, `bool` arrival, empty PID, or unknown policy -> `ValueError` | `test_bad_input` |
| T05 | Valid | `[1, 2, 3, 1, 4, 1, 2]` across 3 frames -> `FIFO=6`, `LRU=5`, `OPT=4` faults | `test_known_sequence` |
| T06 | Invariant | 4 references across 2 frames -> `hits + faults == 4` for `FIFO`, `LRU`, `OPT` | `test_faults_plus_hits` |
| T07 | Invalid | Empty stream, page `-1`, `0` frames, `bool` page, or unknown policy -> `ValueError` | `test_rejections` |
| T08 | Valid | Single-resource Banker snapshot with sufficient `Available` returns 2-process safe order | `test_safe` |
| T09 | Unsafe | `Available=[0]`, unmet `Need` -> `safe=False`, `unfinished=['P0', 'P1']` | `test_unsafe` |
| T10 | Invalid | `Allocation > Maximum`, mismatched dimensions, or `bool` resource -> `ValueError` | `test_invalid` |
| T11 | Valid | Disk `FCFS` `20 -> 10 -> 50` -> `50` cylinders | `test_fcfs` |
| T12 | Valid | Disk `SSTF` `20 -> 21 -> 10 -> 50` -> `52` cylinders | `test_sstf` |
| T13 | Valid | Disk `SCAN` up `20 -> 50 -> 99 -> 10` -> `168` cylinders | `test_scan_boundary` |
| T14 | Boundary / invalid | Empty queue -> `[0]` with `0` movement; out-of-range cylinder, `bool`, `0` cylinders, or bad policy -> `ValueError` | `test_empty_and_invalid` |
| T15 | Integration | `samples/baseline.json` writes all 7 JSON/CSV/SVG files matching hand-worked CPU, memory, Banker, and disk metrics | `test_all_modules_and_evidence` |
| T16 | Failure | `samples/invalid.json` returns exit status `2` and writes no `results.json` | `test_invalid_integrated_dataset` |
| T17 | CPU edge | `RR` advances clock to a late single arrival (`start=5, end=8, waiting=0`) | `test_rr_idle_period_starts_at_next_arrival` |
| T18 | CPU tie | `SJF` resolves equal `(burst, arrival)` ties by input list order | `test_sjf_arrival_and_burst_ties_use_stable_input_order` |
| T19 | SCAN edge | One-sided queues sweep to `99` (`up`) or `0` (`down`) whether ahead or behind `head` | `test_scan_one_sided_queues_sweep_to_endpoint` |
| T20 | SCAN edge | Request equal to initial `head` adds no duplicate stop while preserving `requests_served` | `test_scan_request_at_head_has_no_duplicate_stop` |
| T21 | SCAN edge | Downward `SCAN` sweeps through `0` before reversing upward (`70` cylinders) | `test_scan_down_boundary` |
| T22 | SSTF edge | Duplicate cylinder requests preserve input order with `0` extra travel | `test_sstf_duplicate_ties_use_original_input_order` |
| T23 | Malformed JSON | Syntax-broken JSON returns status `2` without creating output files | `test_malformed_json_returns_failure_status` |
| T24 | Missing keys | Missing domain keys fail in `analyze()` before creating directories or files | `test_missing_dataset_keys_are_rejected_before_exports` |
| T25 | SCAN edge | Duplicate requests on both sides are all counted (`requests_served=4`) | `test_scan_duplicate_requests_are_served_with_zero_extra_movement` |
| T26 | SCAN boundary | Requests and starting heads at `0` and `99` compute exact routes and movements | `test_scan_boundary_requests_and_heads` |
| T27 | Banker multi-resource | 5-process, 3-resource baseline returns `P1 -> P3 -> P0 -> P2 -> P4` and final `Work=[10, 5, 7]` | `test_multi_resource_safe_sequence_and_need` |
| T28 | Banker validation | Negative `Available` entries and ragged `Allocation` rows raise `ValueError` | `test_multi_resource_validation` |
| T29 | Activity log | Valid CLI demo logs `INFO Analysis completed` to `activity.log` | `test_successful_cli_writes_activity_log` |
| T30 | Activity log | Invalid CLI demo exits `2`, logs `ValueError` traceback, and omits `results.json` | `test_invalid_cli_writes_exception_to_activity_log` |

## Interactive CLI checks

- `printf '7\n0\n' | ./run.sh --mode menu`: reports `Invalid choice; enter 0 through 6.` then exits cleanly on `0` (`Goodbye`).
- `./run.sh --mode demo --dataset samples/unsafe.json --output outputs/unsafe_case`: prints `BANKER: UNSAFE; sequence=None` with exit code `0`.
- `./run.sh --mode demo --dataset samples/invalid.json --output outputs/invalid_case`: prints `ERROR: arrival must be an integer >= 0` on `stderr` with exit code `2`.
- Selecting `1`, `2`, `3`, `4`, `5`, and `0` in `./run.sh --mode menu` prints each domain's JSON trace and logs actions in `outputs/activity.log`.
- Varying frame count (`1`), `RR` quantum (`1`), or `SCAN` direction (`down`) shifts fault counts, slice counts, and cylinder routes predictably.

## Reliability design and known limits

- `os_sim/validation.py` checks `type(value) is int` so Python `bool` values (`True`/`False`) cannot pass integer validation.
- `os_sim/cli.py` catches JSON, OS, Unicode, key, type, and value exceptions at the CLI boundary, logs full tracebacks, and exits `2`.
- Multi-file CLI output (`results.json`, three CSVs, three SVGs) is written sequentially rather than atomically; clear the target directory before generating clean archive artifacts if an earlier run was interrupted mid-write.
- Tests target educational workload sizes rather than multi-thousand-process stress benchmarks.

## Web, API, and browser test suites

Run from the repository root:

```bash
PYTHONPATH=. backend/.venv/bin/python -m pytest backend/tests -q
npm --prefix frontend test
(cd frontend && npx tsc -b --pretty false)
npm --prefix frontend run build
npm --prefix frontend run test:e2e
```

- `backend/tests/test_api.py` (9 `pytest` tests): checks `/api/health`, `/api/algorithms`, CPU and full-sweep `SCAN` persistence, HTTP `422` `request.invalid` logging in `activity_logs`, dataset CRUD across app restarts, Banker `declared_totals` rejection and `UNSAFE` handling, integrated exports, CSV/JSON report downloads, and foreign-key nulling on run deletion.
- `frontend/src/**/*.test.{ts,tsx}` (26 `Vitest` tests): checks `validation.ts`, `diskRoute.ts` (`Request + SCAN endpoint`), `presentation.ts`, simulator rendering, and explicit `LoadError` retry flows vs. empty states across `Dashboard`, `DatasetPage`, `HistoryPage`, `AnalyticsPage`, `ReportsPage`, and `AboutPage`.
- `frontend/e2e/acceptance.pw.ts` (9 Playwright Chromium tests): boots isolated FastAPI (`18100`) and Vite (`15174`) servers over a disposable SQLite file, verifies KernelScope `<title>`, `/favicon.svg`, `/favicon.ico`, and `/kernelscope-mark.svg` rendering in dark and light themes, walks all ten routes (`About KernelScope` on `/about`), checks CPU Gantt `IDLE` spans, memory resident-page evictions, safe/unsafe Banker matrices, `SCAN` boundary stops at `0` and `199`, persisted analytics/reports, 375/768/1024/1440 px layout bounds, and zero console/page errors while writing the 13 PNGs in `evidence/browser/`.
