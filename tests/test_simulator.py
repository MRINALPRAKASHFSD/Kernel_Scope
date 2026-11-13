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



if __name__ == "__main__":
    unittest.main()
