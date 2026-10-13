---
name: tails-debt
description: >
  Harvest every `tails:` and `shortcut:` comment across the codebase into a tracked
  debt ledger. These are deliberate simplifications with known ceilings and upgrade
  paths. Tracking them prevents "later" from becoming "never". One-shot report,
  changes nothing. Use for "tails debt", "/tails-debt", "what did we defer",
  "list shortcuts", or "what is our technical debt".
---

# Tails Debt

Every deliberate simplification is marked with a comment naming its ceiling and upgrade path:
`// tails: <the limit>, <when to upgrade>` or `// shortcut: <the limit>, <when to upgrade>`
(also captures legacy `ponytail:` comments). This command collects them into a single ledger so
a deferral cannot quietly become permanent.

## Scan

Grep the repository using git-aware filtering so `.git` and everything specified in `.gitignore`
files (dependencies, build outputs, caches, virtualenvs) are cleanly skipped across any stack:

```bash
git grep --no-index --exclude-standard -nE '(#|//|/[*]) ?(shortcut|tails|ponytail):'
```

If the user specifies a custom marker word (e.g. `/tails-debt TODO`), grep for that marker instead.

Each hit represents one ledger row. Non-deferral comments (such as keyboard shortcut references) are excluded.

## Output

One row per marker, grouped by file:

`<file>:<line>, <what was simplified>. ceiling: <limit named>. upgrade: <trigger to revisit>.`

Since the convention is `tails: <ceiling>, <upgrade path>` or `shortcut: <ceiling>, <upgrade path>`, extract both parts directly from the comment text.

Flag rot risks: any marker that omits an upgrade path or revisit trigger receives a `[no-trigger]` tag — these are the deferrals most prone to rotting in silence.

End with:
`<N> markers found (<M> with [no-trigger] rot risk).`

If clean: `No shortcut debt. Clean ledger.`

## Boundaries

Reads and reports only, changes no code. If requested by the user, writes the ledger to `TAILS-DEBT.md`. One-shot operation.
"stop tails-debt": cancel.
