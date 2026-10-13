---
name: tails-help
description: >
  Quick-reference card for all LLM_Tails modes, skills, and commands.
  One-shot display. Trigger: /tails-help, "tails help", "how do I use tails".
---

# LLM_Tails Help

Display this reference card when invoked. One-shot, do NOT change mode.

## The Four Pillars

| # | Pillar | What it does |
|---|--------|-------------|
| 1 | **Understand first** | Read the codebase before editing. Trace callers, callees, conventions. Check the wiki. |
| 2 | **Minimal correct code** | The laziness ladder: YAGNI → stdlib → native → one-line → minimum. |
| 3 | **Never hallucinate** | Verify APIs, paths, configs before using them. Confidence markers: `[verified]`, `[likely]`, `[uncertain]`. |
| 4 | **Enforce consistency** | Match naming, patterns, error handling, imports, tests to what the project already does. |

## Levels

| Level | Trigger | What changes |
|-------|---------|-------------|
| **Lite** | `/tails lite` | Advisory: names the better alternative, user picks. |
| **Full** | `/tails` | All four pillars enforced. Default. |
| **Ultra** | `/tails ultra` | Maximum strictness. Every claim needs `[verified]` or explicit `[uncertain]`. |

## Skills

| Skill | Trigger | What it does |
|-------|---------|-------------|
| **tails** | `/tails` | The four pillars, always-on. |
| **tails-review** | `/tails-review` | Diff review through all four lenses, 4-part findings. |
| **tails-audit** | `/tails-audit` | Whole-repo audit: bloat, hallucination risks, consistency, architecture. |
| **tails-wiki-init** | `/tails-wiki-init` | Scaffold a project wiki from the current codebase. |
| **tails-wiki-ingest** | `/tails-wiki-ingest` | Process a new source into the wiki. |
| **tails-wiki-lint** | `/tails-wiki-lint` | Health-check the wiki against current code. |
| **tails-wiki-query** | `/tails-wiki-query` | Ranked wiki search + 1-hop links; `--save` files the answer back. |
| **tails-end** | `/tails-end` | Close the session: file decisions and learnings into the wiki. |
| **tails-debt** | `/tails-debt` | Harvest `tails:` / `shortcut:` comments into a tracked ledger. |
| **tails-gain** | `/tails-gain` | Benchmark scoreboard (illustrative examples). |
| **tails-stats** | `/tails-stats` | Real context footprint LLM_Tails adds in this project. |
| **tails-doctor** | `/tails-doctor` | Diagnose the install: hooks, host, mode, budget, memory. |
| **tails-help** | `/tails-help` | This card. |

## Context discipline

- Never pull large raw output into context; filter at the source or script it.
- Claude Code: session memory is restored after compaction (opt out: `TAILS_MEMORY=0`). Optional large-read guard: see INSTALL.md.

## Comment markers

- `tails:` — deliberate simplification with ceiling and upgrade path.
- `tails: inconsistent pattern` — noted pattern conflict, following the prevalent one.

## Deactivate

Say "stop tails" or "normal mode". Resume with `/tails`.
`/tails off` also works.

## Compatibility

LLM_Tails is compatible with Ponytail (they can coexist — Ponytail governs
code minimalism, Tails adds architecture awareness, anti-hallucination, and
consistency on top).

## More

Full docs: https://github.com/savadks95/LLM_Tails
