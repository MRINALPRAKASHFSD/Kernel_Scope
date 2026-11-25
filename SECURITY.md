# Security policy

## Supported versions

| Version | Supported |
|---|---|
| `1.0.x` (`main`) | Yes |
| `< 1.0` | No |

## Deployment scope and threat model

KernelScope is designed as a single-user local operating-system simulation workbench for coursework, lab study, and classroom demonstrations:

- `start_web.sh` binds FastAPI (`127.0.0.1:8000`) and Vite (`127.0.0.1:5173`) to loopback only rather than `0.0.0.0`.
- The application intentionally omits user accounts, session cookies, and multi-tenant authorization. Do not expose the development servers directly to untrusted networks without placing them behind an authenticated reverse proxy and TLS termination.
- All HTTP inputs pass through strict Pydantic schemas (`backend/app/schemas.py`) and Python integer/matrix guards (`os_sim/validation.py`) before execution.
- SQLite queries run through parameterized SQLAlchemy 2.0 ORM statements (`backend/app/repositories.py`).
- `.env` files, runtime `.log` files, and local SQLite `.db` files are excluded from Git via `.gitignore`.

## Reporting a vulnerability

Please do not open a public GitHub issue for suspected security vulnerabilities.

Instead, report security issues privately through GitHub Security Advisories:

- https://github.com/MRINALPRAKASHFSD/Kernel_Scope/security/advisories/new

Include:

1. Affected component (`os_sim/`, `backend/`, `frontend/`, or launcher scripts)
2. Minimal reproduction payload or command sequence
3. Observed vs. expected behavior and potential impact

Reports are reviewed within 72 hours, with a fix or mitigation note published once verified.
