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
