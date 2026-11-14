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


def menu(initial_dataset, output):
    current = str(initial_dataset)
    actions = {"1": "CPU scheduling comparisons", "2": "Page replacement comparisons",
               "3": "Banker's safety check", "4": "Disk scheduling comparisons", "5": "Run all + export evidence",
               "6": "Change dataset JSON path", "0": "Exit"}
    while True:
        print("\nOS Resource Management Simulator")
        for key, label in actions.items():
            print(f" {key}. {label}")
        try:
            choice = input("Choose: ").strip()
            if choice == "0":
                LOG.info("Menu exited")
                print("Goodbye")
                return 0
            if choice == "6":
                current = input("Dataset JSON path: ").strip()
                LOG.info("Dataset changed to %s", current)
            elif choice in ("1", "2", "3", "4", "5"):
                code = run(current, output)
                if code:
                    continue
                result = json.loads((Path(output) / "results.json").read_text(encoding="utf-8"))
                selected = {"1": "scheduling", "2": "memory", "3": "deadlock", "4": "storage"}.get(choice)
                if selected:
                    print(json.dumps(result[selected], indent=2))
            else:
                print("Invalid choice; enter 0 through 6.")
                LOG.warning("Invalid menu choice %r", choice)
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye")
            return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Integrated OS resource-management simulator")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATA, help="Input JSON dataset")
    parser.add_argument("--output", type=Path, default=Path("outputs"), help="Folder for results")
    parser.add_argument("--log", type=Path, default=Path("outputs/activity.log"), help="Activity log")
    parser.add_argument("--mode", choices=("demo", "menu"), default="menu")
    args = parser.parse_args(argv)
    setup_logging(args.log)
    return run(args.dataset, args.output) if args.mode == "demo" else menu(args.dataset, args.output)


if __name__ == "__main__":
    raise SystemExit(main())
