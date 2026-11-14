import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from os_sim.scheduling import schedule
from os_sim.memory import simulate
from os_sim.deadlock import banker
from os_sim.storage import disk_schedule
from os_sim.reporting import analyze, write_report
from os_sim.cli import DEFAULT_DATA, run


class SchedulingTests(unittest.TestCase):
    def setUp(self):
        self.jobs = [{"pid": "A", "arrival": 0, "burst": 5}, {"pid": "B", "arrival": 1, "burst": 2}]

    def test_fcfs_metrics(self):
        r = schedule(self.jobs, "FCFS")
        self.assertEqual([x["waiting"] for x in r["metrics"]], [0, 4])
        self.assertEqual(r["average_waiting"], 2)

    def test_rr_arrivals(self):
        r = schedule(self.jobs, "RR", 2)
        self.assertEqual([x["completion"] for x in r["metrics"]], [7, 4])
        self.assertEqual([x["waiting"] for x in r["metrics"]], [2, 1])

    def test_idle_and_single_process(self):
        r = schedule([{"pid": "A", "arrival": 5, "burst": 1}], "SJF")
        self.assertEqual(r["metrics"][0]["waiting"], 0)
        self.assertEqual(r["gantt"][0]["start"], 5)

    def test_sjf_arrival_and_burst_ties_use_stable_input_order(self):
        jobs = [{"pid": "A", "arrival": 0, "burst": 2},
                {"pid": "B", "arrival": 0, "burst": 2},
                {"pid": "C", "arrival": 1, "burst": 1}]
        r = schedule(jobs, "SJF")
        self.assertEqual(r["gantt"], [{"pid": "A", "start": 0, "end": 2},
                                      {"pid": "C", "start": 2, "end": 3},
                                      {"pid": "B", "start": 3, "end": 5}])

    def test_rr_idle_period_starts_at_next_arrival(self):
        r = schedule([{"pid": "A", "arrival": 5, "burst": 3}], "RR", 2)
        self.assertEqual(r["gantt"], [{"pid": "A", "start": 5, "end": 8}])
        self.assertEqual(r["metrics"][0]["completion"], 8)
        self.assertEqual(r["metrics"][0]["waiting"], 0)

    def test_bad_input(self):
        for bad in ([], [{"pid": "A", "arrival": -1, "burst": 1}],
                    [{"pid": "A", "arrival": 0, "burst": 0}],
                    [{"pid": "A", "arrival": 0, "burst": 1}] * 2):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                schedule(bad)
        with self.assertRaises(ValueError): schedule(self.jobs, "RR", 0)
        with self.assertRaises(ValueError): schedule(self.jobs, "unknown")
        with self.assertRaises(ValueError):
            schedule([{"pid": "A", "arrival": True, "burst": 1}])
        with self.assertRaises(ValueError):
            schedule([{"pid": "", "arrival": 0, "burst": 1}])


class MemoryTests(unittest.TestCase):
    def test_known_sequence(self):
        refs = [1, 2, 3, 1, 4, 1, 2]
        self.assertEqual(simulate(refs, 3, "FIFO")["faults"], 6)
        self.assertEqual(simulate(refs, 3, "LRU")["faults"], 5)
        self.assertEqual(simulate(refs, 3, "OPT")["faults"], 4)

    def test_faults_plus_hits(self):
        for algo in ("FIFO", "LRU", "OPT"):
            r = simulate([0, 1, 0, 1], 2, algo)
            self.assertEqual(r["hits"] + r["faults"], 4)

    def test_rejections(self):
        for refs, frames in (([], 2), ([1], 0), ([-1], 2)):
            with self.assertRaises(ValueError): simulate(refs, frames)
        with self.assertRaises(ValueError): simulate([1], 1, "RANDOM")
        with self.assertRaises(ValueError): simulate([True], 1)


class DeadlockTests(unittest.TestCase):
    def test_safe(self):
        r = banker([1], [[1], [1]], [[0], [0]])
        self.assertTrue(r["safe"])
        self.assertEqual(len(r["safe_sequence"]), 2)

    def test_unsafe(self):
        r = banker([0], [[2], [2]], [[1], [1]])
        self.assertFalse(r["safe"])
        self.assertEqual(r["unfinished"], ["P0", "P1"])

    def test_invalid(self):
        with self.assertRaises(ValueError): banker([1], [[1]], [[2]])
        with self.assertRaises(ValueError): banker([1, 2], [[1]], [[0]])
        with self.assertRaises(ValueError): banker([1], [[1, 2]], [[0, 0]])
        with self.assertRaises(ValueError): banker([True], [[1]], [[0]])

    def test_multi_resource_safe_sequence_and_need(self):
        available = [3, 3, 2]
        maximum = [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]]
        allocation = [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]]
        result = banker(available, maximum, allocation)
        self.assertTrue(result["safe"])
        self.assertEqual(result["safe_sequence"], ["P1", "P3", "P0", "P2", "P4"])
        self.assertEqual(result["need"], [[7, 4, 3], [1, 2, 2], [6, 0, 0], [0, 1, 1], [4, 3, 1]])
        self.assertEqual(result["trace"][-1]["available_after"], [10, 5, 7])

    def test_multi_resource_validation(self):
        with self.assertRaises(ValueError): banker([3, -1], [[1, 1]], [[0, 0]])
        with self.assertRaises(ValueError): banker([1, 1], [[1, 1]], [[0]])
        with self.assertRaises(ValueError): banker([1, 1], [[1, 1]], [[0, 0, 0]])


class StorageTests(unittest.TestCase):
    def test_fcfs(self):
        r = disk_schedule([10, 50], 20, 100)
        self.assertEqual(r["total_head_movement"], 50)

    def test_sstf(self):
        r = disk_schedule([10, 50, 21], 20, 100, "SSTF")
        self.assertEqual(r["route"], [20, 21, 10, 50])
        self.assertEqual(r["total_head_movement"], 52)

    def test_scan_boundary(self):
        r = disk_schedule([10, 50], 20, 100, "SCAN", "up")
        self.assertEqual(r["route"], [20, 50, 99, 10])
        self.assertEqual(r["total_head_movement"], 168)

    def test_scan_one_sided_queues_sweep_to_endpoint(self):
        up_opposite = disk_schedule([10, 30], 50, 100, "SCAN", "up")
        up_ahead = disk_schedule([70, 90], 50, 100, "SCAN", "up")
        down_ahead = disk_schedule([10, 30], 50, 100, "SCAN", "down")
        down_opposite = disk_schedule([70, 90], 50, 100, "SCAN", "down")
        self.assertEqual(up_opposite["route"], [50, 99, 30, 10])
        self.assertEqual(up_opposite["total_head_movement"], 138)
        self.assertEqual(up_ahead["route"], [50, 70, 90, 99])
        self.assertEqual(up_ahead["total_head_movement"], 49)
        self.assertEqual(down_ahead["route"], [50, 30, 10, 0])
        self.assertEqual(down_ahead["total_head_movement"], 50)
        self.assertEqual(down_opposite["route"], [50, 0, 70, 90])
        self.assertEqual(down_opposite["total_head_movement"], 140)

    def test_scan_request_at_head_has_no_duplicate_stop(self):
        r = disk_schedule([50, 10], 50, 100, "SCAN", "up")
        self.assertEqual(r["route"], [50, 99, 10])
        self.assertEqual(r["total_head_movement"], 138)
        self.assertEqual(r["requests_served"], 2)

    def test_scan_duplicate_requests_are_served_with_zero_extra_movement(self):
        r = disk_schedule([70, 70, 20, 20], 50, 100, "SCAN", "up")
        self.assertEqual(r["route"], [50, 70, 70, 99, 20, 20])
        self.assertEqual(r["total_head_movement"], 128)
        self.assertEqual(r["requests_served"], 4)

    def test_scan_boundary_requests_and_heads(self):
        up = disk_schedule([0, 99], 50, 100, "SCAN", "up")
        down = disk_schedule([0, 99], 50, 100, "SCAN", "down")
        up_from_zero = disk_schedule([0, 20], 0, 100, "SCAN", "up")
        down_from_last = disk_schedule([99, 40], 99, 100, "SCAN", "down")
        self.assertEqual(up["route"], [50, 99, 0])
        self.assertEqual(up["total_head_movement"], 148)
        self.assertEqual(down["route"], [50, 0, 99])
        self.assertEqual(down["total_head_movement"], 149)
        self.assertEqual(up_from_zero["route"], [0, 20, 99])
        self.assertEqual(up_from_zero["total_head_movement"], 99)
        self.assertEqual(down_from_last["route"], [99, 40, 0])
        self.assertEqual(down_from_last["total_head_movement"], 99)

    def test_scan_down_boundary(self):
        r = disk_schedule([10, 50], 20, 100, "SCAN", "down")
        self.assertEqual(r["route"], [20, 10, 0, 50])
        self.assertEqual(r["total_head_movement"], 70)

    def test_sstf_duplicate_ties_use_original_input_order(self):
        r = disk_schedule([10, 10], 20, 100, "SSTF")
        self.assertEqual(r["route"], [20, 10, 10])
        self.assertEqual(r["total_head_movement"], 10)

    def test_empty_and_invalid(self):
        empty = disk_schedule([], 0, 1, "SCAN", "up")
        self.assertEqual(empty["route"], [0])
        self.assertEqual(empty["total_head_movement"], 0)
        with self.assertRaises(ValueError): disk_schedule([10], 0, 10)
        with self.assertRaises(ValueError): disk_schedule([0], 10, 10)
        with self.assertRaises(ValueError): disk_schedule([0], 0, 10, "BAD")
        with self.assertRaises(ValueError): disk_schedule([True], 0, 10)
        with self.assertRaises(ValueError): disk_schedule([], 0, 0)


class IntegrationTests(unittest.TestCase):
    def test_all_modules_and_evidence(self):
        data = json.loads(DEFAULT_DATA.read_text())
        result = analyze(data)
        self.assertEqual(set(result), {"scheduling", "memory", "deadlock", "storage"})
        self.assertTrue(result["deadlock"]["safe"])
        with tempfile.TemporaryDirectory() as tmp:
            write_report(data, tmp)
            for name in ("results.json", "scheduling.csv", "memory.csv", "storage.csv",
                         "scheduling.svg", "memory.svg", "storage.svg"):
                self.assertTrue((Path(tmp) / name).is_file(), name)
                self.assertGreater((Path(tmp) / name).stat().st_size, 0)
            exported = json.loads((Path(tmp) / "results.json").read_text(encoding="utf-8"))
            self.assertEqual([x["average_waiting"] for x in exported["scheduling"]], [4.75, 4.0, 5.0])
            self.assertEqual([x["average_turnaround"] for x in exported["scheduling"]], [8.75, 8.0, 9.0])
            self.assertEqual([x["cpu_utilization_percent"] for x in exported["scheduling"]], [100.0, 100.0, 100.0])
            self.assertEqual([x["throughput"] for x in exported["scheduling"]], [0.25, 0.25, 0.25])
            self.assertEqual([x["faults"] for x in exported["memory"]], [10, 9, 7])
            self.assertEqual([x["hits"] for x in exported["memory"]], [3, 4, 6])
            self.assertEqual([x["fault_rate_percent"] for x in exported["memory"]], [76.923, 69.231, 53.846])
            self.assertEqual(exported["deadlock"]["safe_sequence"], ["P1", "P3", "P0", "P2", "P4"])
            self.assertEqual([x["total_head_movement"] for x in exported["storage"]], [640, 236, 331])
            self.assertEqual([x["average_movement_per_request"] for x in exported["storage"]], [80.0, 29.5, 41.375])
            with (Path(tmp) / "scheduling.csv").open(newline="", encoding="utf-8") as file:
                cpu_rows = list(csv.DictReader(file))
            with (Path(tmp) / "memory.csv").open(newline="", encoding="utf-8") as file:
                memory_rows = list(csv.DictReader(file))
            with (Path(tmp) / "storage.csv").open(newline="", encoding="utf-8") as file:
                storage_rows = list(csv.DictReader(file))
            self.assertEqual([row["average_waiting"] for row in cpu_rows], ["4.75", "4.0", "5.0"])
            self.assertEqual([row["average_turnaround"] for row in cpu_rows], ["8.75", "8.0", "9.0"])
            self.assertEqual([row["faults"] for row in memory_rows], ["10", "9", "7"])
            self.assertEqual([row["hits"] for row in memory_rows], ["3", "4", "6"])
            self.assertEqual([row["total_head_movement"] for row in storage_rows], ["640", "236", "331"])
            self.assertEqual([row["average_movement_per_request"] for row in storage_rows], ["80.0", "29.5", "41.375"])
            self.assertEqual(run(DEFAULT_DATA, tmp), 0)


if __name__ == "__main__":
    unittest.main()
