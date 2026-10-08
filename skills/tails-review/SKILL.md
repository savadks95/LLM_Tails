---
name: tails-review
description: >
  Code review focused on all four LLM_Tails pillars: over-engineering (Ponytail
  ladder), hallucination risks (unverified APIs, invented patterns), consistency
  violations, and architecture misunderstandings. One line per finding. Use when
  the user says "review", "tails review", "/tails-review", "check this diff",
  or "what's wrong with this". One-shot report, applies nothing.
---

Review diffs through the four LLM_Tails lenses. One line per finding.

## Format

`<N>. L<line>: <tag> <what>. <fix>.`, or `<N>. <file>:L<line>: ...` for
multi-file diffs. Number findings across the whole report so the user can
say "fix 2 and 5".

## Tags

### Pillar 2 — Minimal code
- `delete:` dead code, unused flexibility, speculative feature. Replacement: nothing.
- `stdlib:` hand-rolled thing the standard library ships. Name the function.
- `native:` dependency or code doing what the platform already does. Name the feature.
- `reuse:` equivalent helper already in this repo. Name the path.
- `yagni:` abstraction with one implementation, config nobody sets, layer with one caller.
- `shrink:` same logic, fewer lines. Show the shorter form.

### Pillar 3 — Hallucination risks
- `unverified:` API call, import, or config key that may not exist. Needs verification.
- `invented:` function signature or pattern that doesn't match the actual library/framework.
- `stale:` references deprecated API, removed feature, or outdated pattern.

### Pillar 4 — Consistency violations
- `naming:` doesn't match project naming convention. Name the convention.
- `pattern:` doesn't match established project pattern. Name the pattern.
- `style:` import ordering, comment style, formatting doesn't match.

### Pillar 1 — Architecture
- `scope:` change doesn't account for all callers/callees. Name the missed path.
- `root-cause:` patches symptom, not the root cause. Name where the real fix goes.

## Scoring

End with:
```
net: -<N> lines possible, <M> hallucination risks, <K> consistency issues.
```

Nothing to flag: `Clean. Ship.`

## Boundaries

Lists findings, applies nothing. One-shot.
"stop tails-review" or "normal mode": revert.
