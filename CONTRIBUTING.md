# Contributing to KernelScope

Thank you for taking time to contribute to KernelScope. Whether you are fixing an edge case, adding a new scheduling or paging policy, or tightening documentation, these guidelines keep the CLI and web layers synchronized.

## Core architectural invariants

1. **Single simulation source (`os_sim/`)**: All operating-system simulation logic lives in `os_sim/` using only the Python standard library. Never reimplement scheduling, page replacement, Banker safety checks, or disk seek calculations in TypeScript/JavaScript; browser charts and tables must render backend responses.
2. **Strict input validation**: Reject invalid types (including Python `bool`, since `bool` subclasses `int`), negative values, duplicate PIDs, mismatched Banker matrix dimensions, and out-of-range cylinders at both `os_sim/validation.py` and `backend/app/schemas.py`.
3. **Same-input comparisons**: Only compare policies within the same resource domain and against the exact same input snapshot.

## Local development setup

Clone the repository and install backend and frontend dependencies locally:

```bash
git clone https://github.com/MRINALPRAKASHFSD/Kernel_Scope.git
cd Kernel_Scope

python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
npm --prefix frontend ci
PYTHONPATH=. backend/.venv/bin/alembic -c backend/alembic.ini upgrade head
```

Start both local servers with `./start_web.sh` (`http://localhost:5173` and `http://localhost:8000/docs`), or run the standalone CLI with `./run.sh --mode demo` and `./run.sh --mode menu`.

## Pre-PR verification checklist

Run all checks from the repository root before opening a pull request:

```bash
python3 -m unittest discover -s tests -v
PYTHONPATH=. backend/.venv/bin/python -m pytest backend/tests -q
npm --prefix frontend test
(cd frontend && npx tsc -b --pretty false)
npm --prefix frontend run build
npm --prefix frontend run test:e2e
```

## Commit and pull request conventions

- Create a focused feature branch off `main` (`feat/...`, `fix/...`, `docs/...`, `refactor/...`, or `test/...`).
- Keep commits small and logically independent using Conventional Commits (`feat(cpu): ...`, `fix(storage): ...`, `docs(readme): ...`, `test(api): ...`).
- Never commit `.env`, `backend/data/*.db*`, `backend/.venv/`, `frontend/node_modules/`, `frontend/dist/`, or `outputs/*.log`.
- Write plain, direct technical prose in docs and PR descriptions without promotional filler.
