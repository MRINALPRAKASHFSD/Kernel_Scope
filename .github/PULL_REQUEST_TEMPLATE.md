## Summary

Describe what changed and why.

## Affected layers

- [ ] `os_sim/` Python simulation package or `run.sh` CLI
- [ ] `backend/` FastAPI routes, Pydantic schemas, SQLAlchemy models, or Alembic migrations
- [ ] `frontend/` React/TypeScript UI, styles, or Vitest/Playwright suites
- [ ] `docs/` or `README.md` documentation

## Verification checklist

- [ ] `python3 -m unittest discover -s tests -v` (CLI unit and integration tests pass)
- [ ] `PYTHONPATH=. backend/.venv/bin/python -m pytest backend/tests -q` (API and SQLite tests pass)
- [ ] `npm --prefix frontend test` (Vitest unit and component tests pass)
- [ ] `(cd frontend && npx tsc -b --pretty false) && npm --prefix frontend run build` (TypeScript and Vite build succeed)
- [ ] No simulation logic was duplicated in JavaScript/TypeScript outside `os_sim/`
