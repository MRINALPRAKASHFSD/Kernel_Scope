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
    # SVG avoids optional plotting libraries and stays viewable offline.
    width, height, margin_left, plot_width = 720, 310, 90, 520
    maxval = max((value for _, value in values), default=0)
    scale = plot_width / maxval if maxval else 0
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
             '<rect width="100%" height="100%" fill="white"/>',
             f'<text x="20" y="30" font-family="sans-serif" font-size="19" font-weight="bold">{escape(title)}</text>']
    for i, (name, value) in enumerate(values):
        y = 60 + i * 65
        parts += [f'<text x="80" y="{y + 22}" text-anchor="end" font-family="sans-serif" font-size="15">{escape(name)}</text>',
                  f'<rect x="{margin_left}" y="{y}" width="{value * scale:.2f}" height="30" fill="#3264a8"/>',
                  f'<text x="{margin_left + value * scale + 8:.2f}" y="{y + 22}" font-family="sans-serif" font-size="14">{value:g}</text>']
    parts.append(f'<text x="{margin_left}" y="{height-20}" font-family="sans-serif" font-size="14">{escape(axis_label)} (lower is better)</text>')
    parts.append('</svg>')
    Path(path).write_text('\n'.join(parts), encoding="utf-8")


def write_report(dataset, folder):
    folder = Path(folder)
    results = analyze(dataset)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "results.json").write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    cpu = [{"algorithm": x["algorithm"], "average_waiting": x["average_waiting"],
            "average_turnaround": x["average_turnaround"], "cpu_utilization_percent": x["cpu_utilization_percent"],
            "throughput": x["throughput"]} for x in results["scheduling"]]
    mem = [{"algorithm": x["algorithm"], "faults": x["faults"], "hits": x["hits"], "fault_rate_percent": x["fault_rate_percent"]} for x in results["memory"]]
    disk = [{"algorithm": x["algorithm"], "total_head_movement": x["total_head_movement"],
             "average_movement_per_request": x["average_movement_per_request"]} for x in results["storage"]]
    csv_file(folder / "scheduling.csv", cpu, list(cpu[0]))
    csv_file(folder / "memory.csv", mem, list(mem[0]))
    csv_file(folder / "storage.csv", disk, list(disk[0]))
    bar_svg(folder / "scheduling.svg", "CPU scheduling: average waiting time", [(x["algorithm"], x["average_waiting"]) for x in cpu], "Time units")
    bar_svg(folder / "memory.svg", "Page replacement: page faults", [(x["algorithm"], x["faults"]) for x in mem], "Faults")
    bar_svg(folder / "storage.svg", "Disk scheduling: total movement", [(x["algorithm"], x["total_head_movement"]) for x in disk], "Cylinders")
    return results
