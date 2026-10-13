---
name: tails-stats
description: >
  Show the real context footprint LLM_Tails adds in this project: rules,
  codebase map, session memory, per-subagent injection, measured from the actual
  strings the hooks inject. Use for "/tails-stats", "tails stats", "how many
  tokens does tails use", "what does tails cost", or "tails overhead".
argument-hint: "[--json]"
license: MIT
---

# Tails Stats

Run the footprint script from the project root and report its result:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/stats.js"
```

If `${CLAUDE_PLUGIN_ROOT}` was not substituted (non-Claude hosts), run `scripts/stats.js` from the LLM_Tails checkout with the project as the current directory. If the script cannot be found, say so; do not estimate numbers yourself.

## Output

Show the script output as-is in a code block. At most two lines after it, only if useful:
- Map near its cap or empty → mention `TAILS_MAP_CHARS` / `TAILS_MAP=0`.
- Footprint matters more than strictness → `/tails lite` costs about the same; the cost is the rules text, not the level.

These numbers are the cost side only. Do not claim savings here; `/tails-gain` shows the benchmark examples.

## Boundaries

Read-only. Changes nothing. One-shot.
"stop tails-stats": cancel.
