# OS Resource Lab: Design system

> Visual and interaction specification for the React, TypeScript, and Vite web interface in `Kernel_Scope`. Initial token candidates were explored with search catalogs and then pared back to fit a dense operating-system lab workbench.

## Why generic dashboard templates did not fit

Early catalog searches suggested a single-column landing page with an orange-on-dark palette categorized under "Calculator & Unit Converter", alongside flashier Cyberpunk, OLED, Neumorphism, and HUD themes. None of those matched how students or instructors use this tool. OS Resource Lab is a ten-route workbench for editing process queues and resource matrices, stepping through frame traces, comparing seek routes, and inspecting saved runs. Neon glow, scanlines, heavy drop shadows, and oversized marketing cards get in the way of reading numbers.

Instead, the interface borrows the calm feel of a benchtop lab instrument: crisp borders, flat neutral panels, Fira Sans for prose and labels, Fira Code with tabular numerals for IDs and measurements, grouped bar charts when exact comparisons matter, and keyboard-friendly tables that contain horizontal scrolling locally rather than stretching the page.

## 1. Core design goals

Every simulator screen should answer three questions at a glance:

1. Which workload or resource snapshot was submitted?
2. Which scheduling, replacement, or safety policy produced the active view?
3. Which trace steps and metrics back up the summary numbers?

Charts exist to explain algorithm behavior on a known input. Every chart names its metric and unit, pairs with a readable table, and avoids hiding essential numbers behind hover tooltips.

## 2. Visual character

Wide viewports keep a persistent left navigation rail; narrow viewports collapse navigation into a focus-managed drawer. Surfaces stay flat with clear 1 px borders, reserving subtle shadows for floating menus or drawers. Identity comes from four practical choices:

- Fira Sans for headings, controls, and explanations paired with Fira Code for PIDs, cylinder numbers, matrices, and metrics
- Explicit trace diagrams (CPU Gantt bars with idle spans, ordered memory frames, Banker release steps, and disk cylinder routes)
- Consistent Lucide icons paired with text labels
- A muted teal primary accent (`--accent`) and warm amber secondary highlight (`--amber`) over slate surfaces

## 3. Color tokens

Colors map through CSS custom properties in `frontend/src/styles.css` rather than hardcoded hex strings inside JSX components.

| Token | Dark theme | Light theme | Role |
|---|---|---|---|
| `--page` | `#10161B` | `#F4F6F4` | Page background |
| `--panel` | `#171F25` | `#FFFFFF` | Primary card and workbench surface |
| `--panel-soft` | `#202B32` | `#E9EFED` | Inset surface or selected row |
| `--text` | `#E9F0F2` | `#182429` | Body and heading text |
| `--muted` | `#B6C2C6` | `#52646A` | Secondary labels |
| `--subtle` | `#91A2A8` | `#62757B` | Units and timestamps |
| `--line` | `#63747A` | `#63747A` | Input and panel borders |
| `--grid` | `#2B383E` | `#DCE4E2` | Table dividers and chart gridlines |
| `--accent` | `#41C7B5` | `#00796D` | Primary buttons, focus ring, active nav |
| `--on-accent` | `#0B2523` | `#FFFFFF` | Foreground on `--accent` |
| `--info` | `#6DBDD2` | `#246B84` | Informational badges and chart series |
| `--green` | `#59C99A` | `#26734F` | `SAFE`, `HIT`, or completed status |
| `--amber` | `#F2B85F` | `#875400` | Warnings and SCAN boundary markers |
| `--red` | `#EE8B8B` | `#A83F43` | `UNSAFE`, `FAULT`, errors, delete actions |
| `--shadow` | `rgba(0,0,0,.24)` | `rgba(24,36,41,.09)` | Drawer and overlay elevation |

Never rely on color alone to separate a page hit from a fault, a safe state from an unsafe state, or one policy from another; always pair color with text badges (`HIT`, `FAULT`, `SAFE`, `UNSAFE`) or distinct markers. Key text pairs clear WCAG AA/AAA contrast ratios: dark text on `--page` hits 15.8:1 (muted on `--panel` 9.15:1), and light text on `--page` hits 14.61:1 (muted on white 6.20:1, white on light `--accent` 5.31:1).

## 4. Typography scale

| Role | Size / line height | Weight | Usage |
|---|---:|---:|---|
| Page title | 26 / 32 px | 600 to 700 | Single `h1` per route |
| Section title | 18 / 24 px | 600 | Editor and result panel headers |
| Subsection title | 15 / 21 px | 600 | Matrix, timeline, and chart titles |
| Body | 14 / 21 px | 400 | Explanations and callouts |
| Control | 14 / 20 px | 500 | Buttons, inputs, selects, tabs |
| Data | 13 / 19 px | 400 to 500 | Tables, PIDs, routes, numeric cells |
| Supporting label | 12 / 16 px | 500 to 600 | Units, column headers, metadata |

Keep functional labels at 12 px or above, write headings and form labels in sentence case, and enable `tabular-nums` on numeric columns so figures line up vertically.

## 5. Layout and spacing

Spacing steps follow a 4 px grid (`4, 8, 12, 16, 24, 32, 40 px`, with `48 px` reserved for major section breaks) inside a centered container capped near `1440 px`.

On desktop and laptop screens, simulator routes split into a two-column workbench: workload inputs and run buttons on the left, traces and comparison tables on the right (giving extra width to the result side). Tablet and mobile widths stack those panes into a single column without horizontal page overflow. Wide matrices scroll inside focusable table wrappers (`overflow-x: auto`) rather than pushing the viewport wider than `100vw`.

## 6. Charts and algorithm traces

- Use grouped bar charts when comparing algorithms on the same workload and unit; never plot unrelated units on a shared axis.
- Use ordered step lines only when step-to-step progression is meaningful (such as disk head movement across service stops).
- On CPU scheduling, show the Gantt timeline with explicit `IDLE` blocks alongside per-process completion, turnaround, and waiting columns.
- On Memory management, highlight the active reference step, `HIT`/`FAULT` badge, resident page order, and any evicted page, noting that `OPT` uses future knowledge.
- On Deadlock handling, display `Available`, `Maximum`, `Allocation`, and `Need` matrices plus the step-by-step release sequence, and keep the note explaining that `UNSAFE` does not prove an active deadlock next to the verdict.
- On Disk scheduling, mark starting head, requested cylinders, and SCAN's physical endpoint (`0` or `cylinders - 1`) distinctly while keeping duplicate stops visible.

## 7. Navigation, forms, and error states

Desktop navigation groups Overview, Analytics, Datasets, Run history, Reports, the four OS simulators, and About & docs in a fixed rail. Mobile screens (`375 px`) open the same links inside a dismissible drawer with Escape-key and backdrop support.

Forms keep labels, units, and numeric bounds visible, preserve typed inputs when validation fails, disable duplicate clicks while a request is in flight, and separate `Run comparison`, `Save as dataset`, and `Load baseline` visually. Failed API loads render an alert banner with an explicit retry button rather than pretending a list is empty.

## 8. Light and dark themes

Both `[data-theme="dark"]` and `[data-theme="light"]` define complete token sets with matching `color-scheme` values so native scrollbars, inputs, and selects match the active theme. Theme choice persists across route changes, and print styles keep report tables and charts legible on white paper.
