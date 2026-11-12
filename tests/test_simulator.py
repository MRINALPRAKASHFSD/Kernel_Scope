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
