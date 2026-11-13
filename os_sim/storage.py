"""Disk scheduling with FCFS, SSTF, and directional SCAN."""
from .validation import integer, integer_list


def disk_schedule(requests, head, cylinders, algorithm="FCFS", direction="up"):
    integer(cylinders, "cylinders", 1)
    integer(head, "head", 0)
    if head >= cylinders:
        raise ValueError("head must be below cylinders")
    integer_list(requests, "requests", 0, allow_empty=True)
    if any(r >= cylinders for r in requests):
        raise ValueError("request must be below cylinders")
    if algorithm not in ("FCFS", "SSTF", "SCAN") or direction not in ("up", "down"):
        raise ValueError("algorithm must be FCFS, SSTF, SCAN; direction up/down")
    route = [head]
    if algorithm == "FCFS":
        route += requests
    elif algorithm == "SSTF":
        pending = list(enumerate(requests))
        while pending:
            selected = min(pending, key=lambda item: (abs(item[1] - route[-1]), item[0]))
            _, next_req = selected
            route.append(next_req)
            pending.remove(selected)
    else:
        lower = sorted((r for r in requests if r < head), reverse=True)
        higher = sorted((r for r in requests if r > head))
        if direction == "up":
            route += higher
            if lower and route[-1] != cylinders - 1:
                route.append(cylinders - 1)
            route += lower
        else:
            route += lower
            if higher and route[-1] != 0:
                route.append(0)
            route += higher
    movement = sum(abs(route[i + 1] - route[i]) for i in range(len(route) - 1))
    return {"algorithm": algorithm, "direction": direction if algorithm == "SCAN" else None,
            "route": route, "total_head_movement": movement,
            "average_movement_per_request": round(movement / len(requests), 3) if requests else 0,
            "requests_served": len(requests)}
