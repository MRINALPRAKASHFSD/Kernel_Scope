"""CPU scheduling: arrival-aware FCFS, non-preemptive SJF, and RR."""
from .validation import integer


def validate(processes):
    if not isinstance(processes, list) or not processes:
        raise ValueError("processes must be a nonempty list")
    ids = set()
    for p in processes:
        if not isinstance(p, dict) or not isinstance(p.get("pid"), str) or not p["pid"].strip():
            raise ValueError("each process requires a nonempty string pid")
        if p["pid"] in ids:
            raise ValueError("duplicate pid")
        ids.add(p["pid"])
        integer(p.get("arrival"), "arrival", 0)
        integer(p.get("burst"), "burst", 1)


def schedule(processes, algorithm="FCFS", quantum=2):
    validate(processes)
    if algorithm not in ("FCFS", "SJF", "RR"):
        raise ValueError("algorithm must be FCFS, SJF or RR")
    if algorithm == "RR":
        integer(quantum, "quantum", 1)
    ordered = sorted(enumerate(processes), key=lambda x: (x[1]["arrival"], x[0]))
    remaining = {p["pid"]: p["burst"] for _, p in ordered}
    finish = {}
    segments = []
    clock = 0

    def run(pid, length):
        nonlocal clock
        if segments and segments[-1]["pid"] == pid and segments[-1]["end"] == clock:
            segments[-1]["end"] += length
        else:
            segments.append({"pid": pid, "start": clock, "end": clock + length})
        clock += length
        remaining[pid] -= length
        if remaining[pid] == 0:
            finish[pid] = clock

    if algorithm in ("FCFS", "SJF"):
        pending = [p for _, p in ordered]
        while pending:
            arrived = [p for p in pending if p["arrival"] <= clock]
            if not arrived:
                clock = min(p["arrival"] for p in pending)
                arrived = [p for p in pending if p["arrival"] <= clock]
            if algorithm == "FCFS":
                chosen = arrived[0]
            else:
                chosen = min(arrived, key=lambda p: (p["burst"], p["arrival"], next(i for i, pp in ordered if pp is p)))
            pending.remove(chosen)
