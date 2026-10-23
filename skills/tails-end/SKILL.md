---
name: tails-end
description: >
  Close a work session: distill what was decided and learned into the project
  wiki so it outlives the chat. Reads the session memory the hooks recorded,
  appends one history entry to wiki/log.md, updates the living wiki pages the
  session affected, flags pages it made stale, and writes wiki/handoff.md so the
  next session (any agent, machine or teammate) picks up where this one left
  off. Use for "/tails-end",
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
   It prints the files changed, open tasks, user decisions and corrections, and errors the hooks recorded. If it reports no memory (a host other than Claude Code or Codex, or `TAILS_MEMORY=0`) or the script is unavailable, use this conversation instead. Combine both when both exist.

2. **Distill, don't transcribe.** Keep only what a future session needs:
   - Decisions with their reason ("in-memory rate limit, not Redis: single instance").
   - Rejected approaches and why, so nobody retries them.
   - New or changed conventions, architecture, entry points, data flow.
   - Gotchas found while debugging, with the root cause.
   - Unfinished work and the next step.
   Drop: typos fixed, dead-end debugging steps, anything already true in the code and obvious from it.
   - **Final state wins.** A session revises itself: file only what ended up in effect. A superseded proposal appears only inside a rejected line ("proposed X, changed to Y because Z"); a setting changed three times is filed once, with its last value.
   - **Claims are not facts.** "Fixed", "passes", "works" said by an agent, you included, is a claim until a check proves it. Run the check, or file it as "reported fixed, not verified".
   - **Scale to substance, not length.** A short decision chat is one or two lines; never one item per message.
   Verify each claim against the current code before filing (Pillar 3). Mark what you could not verify `[uncertain]`.

3. **File it**, if `wiki/` exists:
   - Append ONE entry to `wiki/log.md` (append-only: never edit past entries):
     ```
     ## [YYYY-MM-DD] session | <short title>
     Decided: <...>. Rejected: <...>. Changed: <files/areas>. Next: <...>. Pages updated: <list>.
     ```
   - Update the living pages the session affected (`architecture.md`, `conventions.md`, `entities/*`) in place, citing code: `(see src/x.ts:L12)`. Follow **Updating a page** below.
   - A page the session made wrong: fix it, or mark `⚠️ stale since <date>: <what changed>` if it needs more than you know.
   - A page, handoff or memory note you verified was wrong all along: fix it and log a **correction** (below).
   - New page created → add it to `wiki/index.md`.
   - Rewrite `wiki/handoff.md` (living state: replace the whole page, history stays in `log.md`). The next session's start hook injects it, and agents without hooks read it from their rules file, so keep it under ~1,200 characters:
     ```
     # Handoff
     Updated: YYYY-MM-DD by <agent name>
     Status: open
     ## Where it stands
     <one or two lines: what works now, what is half-done>
     ## Next step
     <the first concrete action, with file paths>
     ## Don't retry
     <rejected approaches and failed attempts, each with the reason>
     ## Open questions
     <what needs the user's decision>
     ```
     Nothing left to hand off (work finished, nothing open) → write `Status: done` with a one-line summary; a done handoff is not injected. Add `handoff.md` to `wiki/index.md` the first time.

4. **No wiki?** Don't create one unasked. Print the distilled summary (same shape as the log entry) and suggest `/tails-wiki-init` if the project would benefit.

## Updating a page

- **Update, don't duplicate.** A page or line already covering the same decision, module or entity is edited in place. Create a page only for what nothing covers.
- **One facet per line.** Match on the specific entity or decision, not the broad topic. Names a letter apart (`ledger-sync` / `ledger-sink`) are different things.
- **Latest wins, by date.** What is current is decided by when it was true (commit date, source date, `Updated:`), not by the order you read it. An older fact adds history ("was X until 2026-03"); it never overwrites a newer value.
- **Cascade.** A change that makes other lines wrong (a renamed module, a dropped dependency) updates every page that states the old value.
- **Keep history, delete rarely.** A superseded rule becomes "now Y; was X until <date> because <reason>". Delete only exact repeats.
- **No arithmetic.** Never derive a count or total nobody stated.
- **Minimal edit.** Rewrite only the lines that change; leave the rest of the page byte-for-byte as it was.

## Correction

When you verify that the wiki, the handoff or a memory note is wrong, fix the page in place and append to `wiki/log.md`:
```
## [YYYY-MM-DD] correction | <topic>
Claimed: <what it said, and where>. Actually: <what is true now>. Evidence: <file:line or command output>.
```
The entry is what stops the next session from trusting a stale copy. Can't tell which side is right → flag it `[uncertain]` instead.

## Output

At most five lines: what was filed where, pages updated, pages flagged stale, handoff status and next step.

## Boundaries

Writes to `wiki/` only; never changes code. One-shot.
"stop tails-end": cancel before writing.
