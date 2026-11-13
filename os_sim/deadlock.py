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
