---
name: tails-debt
description: >
  Harvest every `tails:` comment in the codebase into a tracked ledger. These
  are deliberate simplifications with known ceilings and upgrade paths left
  behind by the tails skill. Tracking them prevents "later" from becoming
  "never". Use when the user says "tails debt", "/tails-debt", "what did we
  defer", "list shortcuts", or "what's the tech debt". One-shot report.
---

# Tails Debt

Collect every deliberate `tails:` shortcut into one ledger so deferrals can't
quietly become permanent.

## Scan

Grep the repo for comment markers, skipping `.git`, `node_modules`, and build
output:

```bash
grep -rnE --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build '(#|//|/[*]) ?tails:' .
```

Also scan for `ponytail:` comments (backward compatibility with Ponytail).

Each hit is one ledger row.

## Output

One row per marker, grouped by file:

`<file>:<line>, <what was simplified>. ceiling: <the limit named>. upgrade: <the trigger to revisit>.`

Flag the rot risk: any `tails:` comment that names no upgrade path or trigger
gets a `no-trigger` tag — those are the ones that silently rot.

End with: `<N> markers, <M> with no trigger.`

Nothing found: `No tails: debt. Clean ledger.`

## Boundaries

Reads and reports only, changes nothing. To persist, ask and it writes the
ledger to `TAILS-DEBT.md`. One-shot.
"stop tails-debt": cancel.
