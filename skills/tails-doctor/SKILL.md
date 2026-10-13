---
name: tails-doctor
description: >
  Diagnose the LLM_Tails install for the current project: Node version, hook
  manifests and scripts, detected host, active mode, state paths, context budget,
  codebase map, session memory, wiki, and Cursor hook/rule conflicts. Read-only.
  Use for "/tails-doctor", "tails doctor", "is tails working", "tails not loading",
  "hooks not firing", or before filing an LLM_Tails bug report.
argument-hint: ""
license: MIT
---

# Tails Doctor

Run the diagnostic script from the project root and report its result:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.js"
```

If `${CLAUDE_PLUGIN_ROOT}` was not substituted (non-Claude hosts), run `scripts/doctor.js` from the LLM_Tails checkout with the project as the current directory. If the script cannot be found, say so and stop; do not guess the results.

## Output

Show the script output as-is in a code block. Then, only for `FAIL` and `WARN` lines, one line each: what it means and the smallest fix. Nothing else.

Note: host detection reflects the shell the script runs in, which may differ from the hook environment. Say so if the user is debugging host-specific behavior.

## Boundaries

Read-only. Changes nothing. One-shot.
"stop tails-doctor": cancel.
