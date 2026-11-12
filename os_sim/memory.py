"""Page replacement: FIFO, LRU, and clairvoyant OPT baseline."""
from .validation import integer, integer_list


def simulate(references, frames, algorithm="FIFO"):
    integer_list(references, "references", 0)
    integer(frames, "frames", 1)
    if algorithm not in ("FIFO", "LRU", "OPT"):
        raise ValueError("algorithm must be FIFO, LRU or OPT")
    resident, loaded_at, last_used, trace = [], {}, {}, []
    faults = hits = 0
    for step, page in enumerate(references):
        hit = page in resident
        if hit:
            hits += 1
        else:
            faults += 1
            if len(resident) == frames:
                if algorithm == "FIFO":
                    victim = min(resident, key=lambda p: loaded_at[p])
                elif algorithm == "LRU":
                    victim = min(resident, key=lambda p: last_used[p])
                else:
