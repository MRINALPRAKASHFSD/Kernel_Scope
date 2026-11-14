"""Unified command-line menu and batch interface."""
import argparse
import json
import logging
import sys
from pathlib import Path
from .reporting import write_report

LOG = logging.getLogger("os_capstone")
DEFAULT_DATA = Path(__file__).resolve().parent.parent / "samples" / "baseline.json"


def setup_logging(path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(filename=path, level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", force=True)


def load(path):
    with open(path, encoding="utf-8") as file:
        return json.load(file)


def run(data_path, output):
    try:
        dataset = load(data_path)
        result = write_report(dataset, output)
    except (OSError, UnicodeError, ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        LOG.exception("Analysis failed for dataset %s", data_path)
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    LOG.info("Analysis completed for %s; output=%s", data_path, output)
    print(f"Analysis completed. Output folder: {output}")
    for entry in result["scheduling"]:
        print(f"CPU {entry['algorithm']}: avg wait={entry['average_waiting']}, avg turnaround={entry['average_turnaround']}")
    for entry in result["memory"]:
        print(f"MEM {entry['algorithm']}: faults={entry['faults']}, hits={entry['hits']}")
    print(f"BANKER: {'SAFE' if result['deadlock']['safe'] else 'UNSAFE'}; sequence={result['deadlock']['safe_sequence']}")
    for entry in result["storage"]:
        print(f"DISK {entry['algorithm']}: head movement={entry['total_head_movement']}")
    return 0


