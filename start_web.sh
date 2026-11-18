#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

for tool in python3 node npm curl; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf 'Required tool not found: %s\n' "$tool" >&2
    exit 127
  fi
done

if ! python3 -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)'; then
  echo 'Python 3.11 or newer is required.' >&2
  exit 1
fi

VENV="$ROOT/backend/.venv"
if [[ ! -x "$VENV/bin/python" ]]; then
  echo 'Creating the project-local Python environment...'
  python3 -m venv "$VENV"
fi
if ! "$VENV/bin/python" -c 'import alembic, dotenv, fastapi, sqlalchemy, uvicorn' >/dev/null 2>&1; then
  echo 'Installing backend packages into backend/.venv...'
  "$VENV/bin/python" -m pip install -r backend/requirements.txt
fi

if [[ ! -x "$ROOT/frontend/node_modules/.bin/vite" ]]; then
  echo 'Installing frontend packages into frontend/node_modules...'
  npm --prefix frontend install
fi

mkdir -p outputs
export PYTHONPATH="$ROOT${PYTHONPATH:+:$PYTHONPATH}"
"$VENV/bin/alembic" -c backend/alembic.ini upgrade head

BACKEND_PID=''
FRONTEND_PID=''
cleanup() {
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  [[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  [[ -n "$FRONTEND_PID" ]] && wait "$FRONTEND_PID" 2>/dev/null || true
  [[ -n "$BACKEND_PID" ]] && wait "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

"$VENV/bin/uvicorn" backend.app.main:app --host 127.0.0.1 --port 8000 >outputs/web-backend.log 2>&1 &
BACKEND_PID=$!
(cd "$ROOT/frontend" && exec "$ROOT/frontend/node_modules/.bin/vite" --host 127.0.0.1 --port 5173 >"$ROOT/outputs/web-frontend.log" 2>&1) &
FRONTEND_PID=$!

wait_for_url() {
  local url="$1" label="$2" attempt
  for attempt in {1..40}; do
    if curl --silent --fail "$url" >/dev/null; then return 0; fi
    if ! kill -0 "$BACKEND_PID" 2>/dev/null || ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
      printf '%s failed to start. Check outputs/web-backend.log and outputs/web-frontend.log.\n' "$label" >&2
      return 1
    fi
    sleep 1
  done
  printf 'Timed out waiting for %s. Check outputs/web-backend.log and outputs/web-frontend.log.\n' "$label" >&2
  return 1
}

wait_for_url http://127.0.0.1:8000/api/health 'Backend'
wait_for_url http://127.0.0.1:5173/ 'Frontend'
printf '\nOS Resource Lab is running.\n  Web app:  http://localhost:5173\n  API docs: http://localhost:8000/docs\n  Stop both servers with Ctrl+C.\n\n'

while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
  sleep 1
done
echo 'A development server exited. Check the logs in outputs/.' >&2
exit 1
