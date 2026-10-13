---
name: tails-end
description: >
  Close a work session: distill what was decided and learned into the project
  wiki so it outlives the chat. Reads the session memory the hooks recorded,
  appends one history entry to wiki/log.md, updates the living wiki pages the
  session affected, and flags pages it made stale. Use for "/tails-end",
  "tails end", "wrap up", "end session", "save what we learned", or before
  closing a long session.
argument-hint: "[notes]"
license: MIT
---

# Tails End (session close)

Turn this session's working memory into durable project knowledge. Living state goes to wiki pages; history goes to `wiki/log.md`.

## Steps

1. **Gather.** Run from the project root:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/memory.js"
   ```
   It prints the files changed, open tasks, user decisions and corrections, and errors the hooks recorded. If it reports no memory (non-Claude host, or `TAILS_MEMORY=0`) or the script is unavailable, use this conversation instead. Combine both when both exist.

2. **Distill, don't transcribe.** Keep only what a future session needs:
   - Decisions with their reason ("in-memory rate limit, not Redis: single instance").
   - Rejected approaches and why, so nobody retries them.
   - New or changed conventions, architecture, entry points, data flow.
   - Gotchas found while debugging, with the root cause.
   - Unfinished work and the next step.
   Drop: typos fixed, dead-end debugging steps, anything already true in the code and obvious from it.
   Verify each claim against the current code before filing (Pillar 3). Mark what you could not verify `[uncertain]`.

3. **File it**, if `wiki/` exists:
   - Append ONE entry to `wiki/log.md` (append-only: never edit past entries):
     ```
     ## [YYYY-MM-DD] session | <short title>
     Decided: <...>. Rejected: <...>. Changed: <files/areas>. Next: <...>. Pages updated: <list>.
     ```
   - Update the living pages the session affected (`architecture.md`, `conventions.md`, `entities/*`) in place, citing code: `(see src/x.ts:L12)`.
   - A page the session made wrong: fix it, or mark `⚠️ stale since <date>: <what changed>` if it needs more than you know.
   - New page created → add it to `wiki/index.md`.

4. **No wiki?** Don't create one unasked. Print the distilled summary (same shape as the log entry) and suggest `/tails-wiki-init` if the project would benefit.

## Output

At most five lines: what was filed where, pages updated, pages flagged stale, open items carried forward.

## Boundaries

Writes to `wiki/` only; never changes code. One-shot.
"stop tails-end": cancel before writing.
