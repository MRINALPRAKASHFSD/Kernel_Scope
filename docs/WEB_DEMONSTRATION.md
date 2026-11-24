# OS Resource Lab: Live demonstration guide

This guide lays out reproducible setup checks and a 6-minute live walkthrough for `Kernel_Scope`. All 13 Chromium screenshots in `evidence/browser/` come from automated Playwright runs against the real backend and are listed by route in `evidence/INDEX.md`.

## Pre-demo check

Open the `Kernel_Scope` root in VS Code, confirm Python 3.11+, Node.js/npm, and Bash are installed, and run the verification suite once before going live:

```bash
./run.sh --mode demo --dataset samples/baseline.json --output outputs
python3 -m unittest discover -s tests -v
PYTHONPATH=. backend/.venv/bin/pytest backend/tests -q
npm --prefix frontend test
npm --prefix frontend run test:e2e
(cd frontend && npx tsc -b --pretty false)
npm --prefix frontend run build
```

All 74 automated tests should pass (30 CLI, 9 backend, 26 frontend, and 9 Playwright), followed by clean TypeScript and production Vite builds. Playwright starts isolated local servers over a temporary SQLite file so your saved workspace data stays untouched. Re-run these checks anytime you edit code or sample files before presenting.

## Step-by-step walkthrough in VS Code

1. Open a terminal at the project root and launch both servers:

   ```bash
   ./start_web.sh
   ```

   Once the script prints the local URLs, open `http://localhost:5173` (with OpenAPI docs at `http://localhost:8000/docs`). Leave this terminal running so you can point out the backend and frontend logs, and press Ctrl+C at the end to free ports 5173 and 8000.

2. Start on the Overview dashboard (`/`). Point out the live API status pill, saved dataset and run counters, recent activity feed, and comparison chart (`evidence/browser/dashboard-dark.png`).

3. Go to CPU scheduling (`/cpu`), click `Load baseline`, and run the comparison. Switch across the `FCFS`, `SJF`, and `RR` tabs to show how the Gantt timeline, idle blocks, per-process table, and bar chart all come from the same four-process input (`evidence/browser/cpu-scheduling.png`).

4. Open Memory management (`/memory`) and run `FIFO`, `LRU`, and `OPT` on the baseline stream. Step forward and back through the reference buttons to show a hit, a fault, and which resident page got evicted (`evidence/browser/memory-resident-order.png`).

5. Open Deadlock handling (`/deadlock`). Load and run the safe sample first to show the `Need` matrix, completion order, and available-resource trace (`evidence/browser/banker-safe.png` and `evidence/browser/banker-safe-matrices.png`). Then load and run the unsafe sample (`evidence/browser/banker-unsafe.png`), pointing out the unfinished processes and explaining why an unsafe snapshot indicates risk rather than an active deadlock.

6. Open Storage scheduling (`/disk`), run a comparison, and switch to the `SCAN` tab. Point out the starting head, direction toggle, physical boundary stop (`199` when sweeping up, `0` when sweeping down), and counted movement (`evidence/browser/disk-scan-upper-boundary.png`).

7. Visit Datasets (`/datasets`) to show the seeded baseline/unsafe records and validation on edit. Then open Run history (`/history`), jump into Reports (`/reports`) to download JSON or CSV (`evidence/browser/reports-persisted-results.png`), and show Analytics (`/analytics`) comparing policies from a saved run (`evidence/browser/analytics-persisted-results.png`).

8. In a second terminal, run the CLI batch commands to show that the Bash and Python path produces the exact same numbers:

   ```bash
   ./run.sh --mode demo --dataset samples/baseline.json --output outputs
   ./run.sh --mode demo --dataset samples/unsafe.json --output outputs/unsafe_case
   ```

   Next, run the corrupted sample to demonstrate exit code `2` and stderr reporting:

   ```bash
   ./run.sh --mode demo --dataset samples/invalid.json --output outputs/invalid_case
   ```
