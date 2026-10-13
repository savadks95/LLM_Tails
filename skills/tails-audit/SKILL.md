---
name: tails-audit
description: >
  Full-codebase quality audit across all four LLM_Tails pillars: architecture
  soundness, bloat & over-engineering (Ponytail ladder), hallucination & API risks,
  consistency enforcement, and wiki health (drift, gaps, orphans). Ranked findings
  explained in plain English with structured 4-part items. One-shot report, changes
  nothing. Use for "audit this codebase", "tails audit", "/tails-audit", "find bloat",
  "check consistency", or "whole-repo health check".
---

Audit the whole repository like the senior developer who just inherited it and will be paged when it breaks. Order of importance: correct, safe, holds under load, verified, consistent, tested, fast, lean.

This is a comprehensive report the user requested, so give it in full.

## 1. Map first

- Audit what the user names: a folder, package, or the whole repo. Nothing named: the whole repo.
- Check `wiki/index.md` first if it exists. Read the README, build configs, dependencies, entry points (main, routes, jobs, CLI commands), and tests.
- State the assumed load: single-user CLI/script vs high-concurrency production service.
- Trace core flows end-to-end: input ingestion, auth, data writes, background workers, shared state.
- In large codebases, go deep where failure costs the most. Name any sections you did not inspect.

## 2. Look for (The Four Pillars)

1. **Bugs & Real-World Load (Pillars 1 & 2):** edge-case crashes, check-then-write race conditions, memory leaks, unindexed queries in loops, callers that disagree with return values.
2. **Risks & Security (Pillars 1 & 3):** injection, insecure defaults, swallowed exceptions, unverified trust boundaries.
3. **Hallucination & Speculative Dependencies (Pillar 3):**
   - `unverified:` calls to external APIs with unconfirmed signatures.
   - `invented:` dependency methods that do not match the installed version in `package.json` / `requirements.txt`.
   - `stale:` deprecated features, modules slated for removal.
4. **Consistency Violations (Pillar 4):**
   - `naming:` conflicting naming conventions across sister modules (`snake_case` vs `camelCase`).
   - `pattern:` mixed architectures (e.g. some services use repository pattern, others query DB directly in handlers; mixed async styles).
   - `style:` conflicting error handling strategies or inconsistent import structures.
5. **Wiki & Knowledge Integrity (Pillar 1):**
   - `drift:` wiki page claims something that active code has changed or deprecated.
   - `gap:` critical domain subsystem or security boundary with zero wiki coverage.
   - `orphan:` exported function, component, or wiki page unreferenced by anything.
6. **Lean & Minimal Code (Pillar 2):**
   - `delete:` dead code, dormant flags, uncalled exports.
   - `reuse:` duplicate helpers doing the same thing in separate folders.
   - `stdlib / native:` external package installed for what a standard library utility does.
   - `yagni:` single-implementation abstractions, unused generic factories, premature wrappers.
   - `split:` function or class handling multiple unrelated responsibilities.

## 3. Check before you report

- **Concrete case required:** Every finding must demonstrate a concrete failure mode or cost. No vague taste issues.
- Grep the entire tree before flagging code as dead/unused (check dynamic calls, tests, fixtures, templates).
- Marked shortcuts (`shortcut: ...` or `tails: ...`) are intentional decisions, not defects, unless load crosses their ceiling.
- Recommend the smallest working fix. Deletion beats addition.

## 4. Output Format

Start with `What this repo does:` in two or three sentences, and the assumed load.

Then findings grouped into three severity sections (omit empty sections):
- **Must fix:** bugs, security holes, data loss, breaks at expected load, hallucinated APIs.
- **Should fix:** risky untested logic, bloat/YAGNI, architectural drift, consistency splits, wiki contradictions.
- **Nice to have:** small speedups, consolidation of duplicate helpers, cleaner idioms.

Limit to at most 20 findings; if smaller items were omitted, note how many.
Every finding includes four structured parts:

```markdown
<N>. **<Title>** (`<file>:L<line>`) [tag: <tag>]
   - **What this is:** [1-2 sentences on what this component or file does]
   - **Problem:** [Concrete breakdown, consistency divergence, or hallucination risk]
   - **Fix:** [Smallest fix that works, naming exact replacement or deletion]
   - **If we skip it:** [Consequence to maintainers, users, or performance]
```

End with:
- `Verdict:` [One sentence: healthy, or what to tackle first]
- `Lean:` `-<N> lines, -<M> dependencies possible.`
- `Discipline Scorecard:` `<A> bugs/risks | <B> hallucination risks | <C> consistency splits | <D> wiki drift/gaps`
- `Not checked:` [Parts not read or requiring live runtime verification]

If clean: `What this repo does:`, then `Healthy. Nothing to fix.` and one line on what was verified.
