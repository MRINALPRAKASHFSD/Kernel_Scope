# KernelScope: Design system

> Visual and interaction specification for the KernelScope React, TypeScript, and Vite interface (`design-system/os-resource-lab/MASTER.md` retains its original folder path so existing archive references stay valid).

## Why generic dashboard templates were rejected

Initial catalog searches returned a single-column landing layout categorized as a "Calculator & Unit Converter" with an orange-on-dark palette, alongside Cyberpunk, OLED, Neumorphism, and HUD styles. Those patterns work poorly for an operating-system workbench. KernelScope spans ten routes for editing process queues and Banker matrices, stepping through page frames, inspecting cylinder routes, and auditing saved runs. Neon glow, scanlines, heavy shadows, and marketing hero cards compete with numeric data.

KernelScope instead follows a calm benchtop-instrument style: crisp 1 px borders, flat slate/paper panels, `Fira Sans` for labels and prose, `Fira Code` with tabular numerals for PIDs, cylinder addresses, matrices, and metrics, grouped bar charts for same-unit comparisons, and locally scrollable tables that never push the viewport wider than `100vw`.

## 1. Core design goals

Every simulator workbench answers three questions immediately:

1. Which workload or resource snapshot was submitted?
2. Which scheduling, replacement, or safety policy produced the active trace?
3. Which step-by-step events back up the summary numbers?

Every chart names its metric and unit, pairs with a readable HTML table, and exposes exact figures without forcing pointer hover.

## 2. Brand identity and shell chrome

Wide viewports (`> 1024 px`) render a fixed left navigation rail; narrower viewports collapse navigation into a focus-trapped modal drawer with `Escape` and scrim dismissal. Brand assets live in `frontend/public/`:

- `kernelscope-mark.svg` (and `kernelscope-mark.png`) renders at `38x38 px` in the sidebar header alongside `KernelScope / Simulation workbench`.
- `favicon.svg` and `favicon.ico` provide crisp browser tab icons in dark and light OS appearances.
- `kernelscope-logo.svg` (and `kernelscope-logo.png`) provides the horizontal lockup, while printable execution reports display the `KS` monogram badge under `KERNELSCOPE · EXECUTION REPORT`.

## 3. Semantic color tokens

All colors resolve through CSS custom properties in `frontend/src/styles.css` rather than inline component hex values.

| Token | Dark theme | Light theme | Role |
|---|---|---|---|
| `--page` | `#10161B` | `#F4F6F4` | Document canvas |
| `--panel` | `#171F25` | `#FFFFFF` | Primary card and workbench surface |
| `--panel-soft` | `#202B32` | `#E9EFED` | Nested trace block or selected row |
| `--text` | `#E9F0F2` | `#182429` | Primary headings and body copy |
| `--muted` | `#B6C2C6` | `#52646A` | Secondary labels and axis ticks |
| `--subtle` | `#91A2A8` | `#62757B` | Units and metadata |
| `--line` | `#63747A` | `#63747A` | Control and panel borders |
| `--grid` | `#2B383E` | `#DCE4E2` | Table rules and chart gridlines |
| `--accent` | `#41C7B5` | `#00796D` | Primary actions, focus ring, active nav |
| `--on-accent` | `#0B2523` | `#FFFFFF` | Foreground on `--accent` |
| `--info` | `#6DBDD2` | `#246B84` | Informational notices and series |
| `--green` | `#59C99A` | `#26734F` | `SAFE`, `HIT`, and `completed` states |
| `--amber` | `#F2B85F` | `#875400` | Warnings and `SCAN` boundary markers |
| `--red` | `#EE8B8B` | `#A83F43` | `UNSAFE`, `FAULT`, errors, delete actions |
| `--shadow` | `rgba(0,0,0,.24)` | `rgba(24,36,41,.09)` | Overlay and drawer elevation |

Color never carries state alone: hits/faults, safe/unsafe verdicts, and disk route stops always pair color with text badges (`HIT`, `FAULT`, `SAFE`, `UNSAFE`) or distinct marker shapes. Key contrast ratios clear WCAG AA/AAA thresholds (15.8:1 dark foreground on `--page`, 9.15:1 dark muted on `--panel`, 14.61:1 light foreground on `--page`, 6.20:1 light muted on white, and 5.31:1 white on light `--accent`).

## 4. Typography scale

| Role | Size / line height | Weight | Usage |
|---|---:|---:|---|
| Page title | 26 / 32 px | 600 to 700 | Single `h1` per route |
| Section title | 18 / 24 px | 600 | Workload and result card headings |
| Subsection title | 15 / 21 px | 600 | Matrix, timeline, and chart headings |
| Body | 14 / 21 px | 400 | Descriptions and model callouts |
| Control | 14 / 20 px | 500 | Buttons, inputs, selects, policy tabs |
| Data | 13 / 19 px | 400 to 500 | Tables, PIDs, cylinder routes, metrics |
| Supporting label | 12 / 16 px | 500 to 600 | Units, column headers, timestamps |

Headings and form labels use sentence case, essential labels stay at `12 px` or larger, and `tabular-nums` keeps numeric columns aligned vertically.

## 5. Spacing and responsive layout

Spacing follows a `4 px` rhythm (`4, 8, 12, 16, 24, 32, 40 px`, plus `48 px` major section breaks) inside a centered container up to `1440 px`.

Simulator routes use a two-column workbench on desktop (`workload + controls` on the left, `trace + metrics` on the right) and stack into a single column at tablet and mobile widths (`375, 768, 1024, 1440 px` verified in Playwright). Wide tables scroll horizontally inside `role="region"` wrappers (`overflow-x: auto`) with zero document-level horizontal overflow.

## 6. Domain visualization conventions

- CPU scheduling renders proportional `.gantt-segment` blocks with synthesized `IDLE` intervals alongside per-process completion, turnaround, and waiting columns.
- Memory management highlights the active step chip, `HIT`/`FAULT` badge, ordered resident pages (explicitly noted as algorithm residency order rather than physical RAM frame indices), eviction message, and offline `OPT` benchmark note.
- Deadlock handling displays `Available`, `Maximum`, `Allocation`, and `Need` matrices plus the numbered safe sequence and post-release `Work` table, keeping the `UNSAFE != active deadlock` explanation adjacent to the verdict.
- Disk scheduling plots cylinder position against service step using distinct shapes for initial head (`square`), direction turns (`triangle`), `SCAN` physical endpoints (`diamond`), and combined request + `SCAN` endpoints (`star`).

## 7. Error handling and theme persistence

Failed API loads display `role="alert"` banners with explicit retry buttons rather than empty-list placeholders. `[data-theme="dark"]` and `[data-theme="light"]` persist in `localStorage` (`osrl-theme`), update `document.documentElement.style.colorScheme` and `<meta name="theme-color">`, and format cleanly for monochrome printing on `/reports`.
