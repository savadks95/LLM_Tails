---
name: tails-audit
description: >
  Whole-repo audit through all four LLM_Tails pillars. Scans the entire
  codebase for over-engineering, hallucination-prone patterns, consistency
  violations, and architecture gaps. Ranked findings, biggest impact first.
  Use when the user says "audit", "tails audit", "/tails-audit", "scan this
  repo", "find bloat", or "check the whole project". One-shot report.
---

Full-repo audit. Like tails-review but scans the whole tree, not just a diff.
Rank findings biggest impact first.

## Tags

Same as tails-review:

### Minimal code
- `delete:` / `stdlib:` / `native:` / `reuse:` / `yagni:` / `shrink:`

### Hallucination risks
- `unverified:` / `invented:` / `stale:`

### Consistency
- `naming:` / `pattern:` / `style:`

### Architecture
- `scope:` / `root-cause:`

Plus audit-specific:
- `orphan:` code, file, or export that nothing references. Dead weight.
- `drift:` wiki page or doc that contradicts current code.
- `gap:` important concept or flow with no documentation or wiki page.

## Hunt checklist

- Dependencies the stdlib or platform already ships
- Single-implementation interfaces and factories with one product
- Wrappers that only delegate
- Dead flags, dead config, dead exports
- Hand-rolled stdlib
- Helpers duplicating another helper in the same repo
- API calls with unverified signatures
- Imports of deprecated or renamed modules
- Naming convention violations across the codebase
- Mixed patterns (e.g., some files use try/catch, others use Result types)
- Wiki pages that don't match current code

Before emitting `delete:`, grep the whole tree for the symbol, including tests
and dynamic references.

## Output

One line per finding, numbered and ranked:
`<N>. <tag> <what to fix>. <replacement>. [path]`

End with:
```
net: -<N> lines, -<M> deps possible. <K> hallucination risks. <J> consistency issues. <I> wiki gaps.
```

Nothing to cut: `Lean and consistent. Ship.`

## Boundaries

Scope: all four pillars. Lists findings, applies nothing. One-shot.
"stop tails-audit" or "normal mode": revert.
