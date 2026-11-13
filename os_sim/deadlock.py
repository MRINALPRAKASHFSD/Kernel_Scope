"""Banker's safety check for multiple-instance resources."""
from .validation import integer_list, matrix


def banker(available, maximum, allocation):
    available = integer_list(available, "available", 0)
    if not isinstance(maximum, list) or not maximum:
        raise ValueError("maximum must have at least one process")
    n, r = len(maximum), len(available)
    matrix(maximum, "maximum", n, r)
    matrix(allocation, "allocation", n, r)
    if any(allocation[i][j] > maximum[i][j] for i in range(n) for j in range(r)):
        raise ValueError("allocation cannot exceed maximum")
    need = [[maximum[i][j] - allocation[i][j] for j in range(r)] for i in range(n)]
    work, done, sequence, trace = available.copy(), [False] * n, [], []
    while True:
        candidate = next((i for i in range(n) if not done[i] and all(need[i][j] <= work[j] for j in range(r))), None)
        if candidate is None:
            break
        i = candidate
        work = [work[j] + allocation[i][j] for j in range(r)]
        done[i] = True
        sequence.append(f"P{i}")
        trace.append({"completed": f"P{i}", "available_after": work.copy()})
    return {"safe": all(done), "safe_sequence": sequence if all(done) else None,
            "completed_prefix": sequence, "unfinished": [f"P{i}" for i in range(n) if not done[i]],
            "need": need, "trace": trace,
            "note": "Unsafe state is not proof of an existing deadlock."}
