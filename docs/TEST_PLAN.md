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
| T11 | Valid | Disk FCFS `20 -> 10 -> 50` totals `50` cylinders | `test_fcfs` |
| T12 | Valid | SSTF `20 -> 21 -> 10 -> 50` totals `52` cylinders | `test_sstf` |
| T13 | Valid | SCAN up `20 -> 50 -> 99 -> 10` totals `168` cylinders | `test_scan_boundary` |
| T14 | Boundary / invalid | Empty queue stays at head with `0` movement; out-of-range cylinder, bool request, or 0 cylinders raises `ValueError` | `test_empty_and_invalid` |
| T15 | Integration | Baseline dataset runs all 4 modules; exported JSON and CSV match hand-checked numbers | `test_all_modules_and_evidence` |
| T16 | Failure | Invalid dataset returns exit code `2`, prints stderr error, and writes no `results.json` | `test_invalid_integrated_dataset` |
| T17 | CPU edge | RR jumps clock cleanly to a late first arrival (`start=5`, `end=8`, `waiting=0`) | `test_rr_idle_period_starts_at_next_arrival` |
| T18 | CPU tie | SJF breaks equal burst and arrival ties by original input order | `test_sjf_arrival_and_burst_ties_use_stable_input_order` |
| T19 | SCAN edge | One-sided queues still sweep to `99` or `0` before reversing or stopping | `test_scan_one_sided_queues_sweep_to_endpoint` |
| T20 | SCAN edge | Request at initial head is served once without a duplicate route entry | `test_scan_request_at_head_has_no_duplicate_stop` |
| T21 | SCAN edge | Downward SCAN touches cylinder `0` before reversing upward | `test_scan_down_boundary` |
| T22 | SSTF edge | Duplicate cylinder requests keep stable input order with zero extra travel | `test_sstf_duplicate_ties_use_original_input_order` |
| T23 | Malformed JSON | Truncated JSON returns exit status `2` and creates no output files | `test_malformed_json_returns_failure_status` |
| T24 | Missing keys | Incomplete top-level objects fail validation before any file export | `test_missing_dataset_keys_are_rejected_before_exports` |
| T25 | SCAN edge | Duplicate requests on both sides are all counted with zero extra travel at repeated cylinders | `test_scan_duplicate_requests_are_served_with_zero_extra_movement` |
| T26 | SCAN boundary | Requests and starting heads at `0` and `cylinders - 1` compute exact routes and distances | `test_scan_boundary_requests_and_heads` |
| T27 | Banker multi-resource | 5-process, 3-resource state produces `P1 -> P3 -> P0 -> P2 -> P4` and final work `[10, 5, 7]` | `test_multi_resource_safe_sequence_and_need` |
| T28 | Banker validation | Negative available counts and row-length mismatches raise `ValueError` | `test_multi_resource_validation` |
| T29 | Activity log | Successful CLI demo writes an `INFO` completion line to `activity.log` | `test_successful_cli_writes_activity_log` |
| T30 | Activity log | Failed CLI demo exits `2`, logs the `ValueError` traceback, and skips file export | `test_invalid_cli_writes_exception_to_activity_log` |

All disk SCAN cases enforce the full-sweep rule: any non-empty request queue reaches `cylinders - 1` (up) or `0` (down), counts that leg in total movement, and only then reverses if requests remain on the other side.

