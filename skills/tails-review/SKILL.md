---
name: tails-review
description: >
  Deep four-pillar quality review of a diff or change: correctness, safety, load,
  hallucination risks (unverified APIs/types), consistency violations, tests, and
  lean minimal code. Reads the connected code, not just the diff. Each finding has
  a concrete case and four structured parts. Use for "review this", "tails review",
  "/tails-review", "review my PR", "is this over-engineered", "audit this diff".
---

Review a change through all four LLM_Tails pillars like the senior developer who will be paged when it breaks:
1. **Understand first:** callers, callees, real flow, expected load.
2. **Minimal correct code:** YAGNI, reuse, stdlib, native, shortest working diff.
3. **Never hallucinate:** verify every referenced API, path, signature, and dependency.
4. **Enforce consistency:** match naming conventions, patterns, and error strategies.

This is a report the user asked for, so give it in full.

## 1. Understand first

- Review what the user names: uncommitted or staged changes, a branch, a PR, or files. Nothing named: uncommitted changes (or the last commit).
- Read the diff, then the code it touches: callers of every changed function, functions called downstream, tests, configs, and `wiki/` (if it exists).
- Trace the real flow: where data enters, how it transforms, where it is stored or exported.
- A change can break code it does not touch: when signatures, return types, or behaviors change, grep every caller.
- State the assumed load (e.g., single script run vs concurrent production traffic).

## 2. Look for (The Four Pillars)

1. **Bugs & Root Causes (Pillars 1 & 2):** wrong result, crash, missed edge cases (empty, zero, bounds, timezones), a caller broken by the change, or a patch applied to a symptom instead of the shared root cause.
2. **Risks & Security (Pillars 1 & 3):** injection, weak randomness, data loss (swallowed errors, out-of-order writes, missing transactions), unverified input at trust boundaries.
3. **Hallucination Risks (Pillar 3):**
   - `unverified:` API, method, flag, or dependency that may not exist in the installed version.
   - `invented:` signature or option that doesn't match the actual upstream library.
   - `stale:` deprecated or removed methods referenced from memory.
4. **Consistency Violations (Pillar 4):**
   - `naming:` identifier violates existing project naming conventions (`camelCase` vs `snake_case`).
   - `pattern:` diverges from project error handling (e.g. throwing error where project uses `Result`), import style, or architectural layering.
5. **Missing Checks (Pillars 1 & 2):** risky new logic (branch, parser, money, security, data write) with no test or assert check. One targeted test, not bloat coverage.
6. **Lean & Minimal Code (Pillar 2):**
   - `delete:` dead code, speculative options, unused flexibility.
   - `reuse:` project already has this helper (name the path).
   - `stdlib / native:` standard library or platform feature already covers it; adding dependencies for a few lines.
   - `yagni:` abstraction with one implementation, config nobody sets.
   - `shrink:` same logic, fewer lines. Show the shorter form.

## 3. Check before you report

- **Concrete case rule:** Every finding must cite a concrete scenario: "this input or situation leads to this wrong result". No case, no finding.
- Re-read lines and confirm: the caller exists, the API is verified or unverified, the code is truly unused.
- Marked shortcuts: a comment in the form `shortcut: <ceiling>, <upgrade path>` or `tails: ...` is an intentional decision, not a defect, unless load already crosses the ceiling.
- Propose the smallest fix that works. Deletion beats addition.

## 4. Output Format

Start with `What this change does:` in two or three sentences, and the assumed load.

Then findings grouped into three severity sections (omit empty sections):
- **Must fix:** bugs, security holes, data loss, breaks under load, hallucinated APIs.
- **Should fix:** risky code without a test, bloat/YAGNI, consistency drift, missed callers.
- **Nice to have:** small speedups, cleaner idioms, shorter forms.

Number findings sequentially across all groups so the user can say "fix 2 and 5".
Every finding includes four structured parts:

```markdown
<N>. **<Title>** (`<file>:L<line>`) [tag: <tag>]
   - **What this is:** [1-2 sentences on what the code does]
   - **Problem:** [Concrete situation that fails, breaks consistency, or risks hallucination]
   - **Fix:** [Smallest working fix, showing exact replacement or diff]
   - **If we skip it:** [Concrete consequence if merged as-is]
```

End with:
- `Verdict:` `Ship.` or `Fix <N> and <M> first.`
- `Lean:` `-<N> lines possible, -<M> deps possible.`
- `Discipline Scorecard:` `<A> bugs/risks | <B> hallucination risks | <C> consistency issues | <D> lean cuts`
- `Not checked:` [One line stating what was outside scope or could not be verified]

If clean: `What this change does:`, then `Clean. Ship.` and one line on what was verified.
