"""Single-dataset analysis, CSV tables, and portable SVG comparison charts."""
import csv
import json
from pathlib import Path
from xml.sax.saxutils import escape
from .scheduling import schedule
from .memory import simulate
from .deadlock import banker
from .storage import disk_schedule


def analyze(dataset):
    if not isinstance(dataset, dict) or any(k not in dataset for k in ("processes", "memory", "deadlock", "storage")):
        raise ValueError("dataset requires processes, memory, deadlock and storage")
    mem, dead, disk = dataset["memory"], dataset["deadlock"], dataset["storage"]
    if not isinstance(mem, dict) or "references" not in mem or "frames" not in mem:
        raise ValueError("memory must be an object with frames and references")
    if not isinstance(dead, dict) or any(k not in dead for k in ("available", "maximum", "allocation")):
        raise ValueError("deadlock must be an object with available, maximum and allocation")
    if not isinstance(disk, dict) or any(k not in disk for k in ("requests", "head", "cylinders")):
        raise ValueError("storage must be an object with requests, head and cylinders")
    return {
        "scheduling": [schedule(dataset["processes"], a, dataset.get("quantum", 2)) for a in ("FCFS", "SJF", "RR")],
        "memory": [simulate(mem["references"], mem["frames"], a) for a in ("FIFO", "LRU", "OPT")],
        "deadlock": banker(dead["available"], dead["maximum"], dead["allocation"]),
        "storage": [disk_schedule(disk["requests"], disk["head"], disk["cylinders"], a, disk.get("direction", "up")) for a in ("FCFS", "SSTF", "SCAN")]
    }


def csv_file(path, rows, keys):
    with open(path, "w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=keys)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key) for key in keys})


def bar_svg(path, title, values, axis_label):
