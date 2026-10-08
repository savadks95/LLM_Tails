---
name: tails-wiki-lint
description: >
  Health-check the project wiki. Find stale pages, contradictions, orphans,
  missing cross-references, and gaps where important concepts lack a page.
  Use when the user says "lint wiki", "check wiki health", "/tails-wiki-lint",
  "is the wiki up to date", or "wiki maintenance". One-shot report.
---

# Wiki Lint

Health-check the project wiki against the current codebase.

## Checks

1. **Stale** — wiki page describes code that has since changed. Compare key
   claims in wiki pages against the actual code they reference.

2. **Contradictions** — two wiki pages make conflicting claims. Read cross-
   referenced pages and check for inconsistencies.

3. **Orphans** — wiki pages with no inbound `[[wikilinks]]` from other pages.
   Check `wiki/index.md` links and grep all wiki pages for references.

4. **Missing pages** — concepts, modules, or entities mentioned in wiki pages
   (via `[[wikilink]]`) that don't have their own page yet.

5. **Missing cross-references** — pages that discuss related concepts but don't
   link to each other.

6. **Code gaps** — important code files, modules, or patterns that have no
   wiki coverage at all. Compare the source tree against wiki/entities/.

7. **Index drift** — pages that exist but aren't listed in `wiki/index.md`,
   or index entries pointing to pages that no longer exist.

## Output

One line per finding, grouped by check type:

```
Stale:
  1. wiki/entities/auth.md — references `authMiddleware()` but function was renamed to `authenticate()` in src/auth.ts:L15.

Contradictions:
  2. wiki/architecture.md says "SQLite" but wiki/dependencies.md says "PostgreSQL".

Orphans:
  3. wiki/entities/legacy-parser.md — no inbound links.

Missing pages:
  4. [[caching-strategy]] referenced in wiki/architecture.md but no page exists.

Code gaps:
  5. src/services/payment/ has no wiki coverage.
```

End with: `<N> issues found. <M> stale, <K> contradictions, <J> orphans, <I> gaps.`

Clean wiki: `Wiki is healthy. No issues found.`

## Boundaries

Read-only report. Changes nothing. One-shot.
"stop tails-wiki-lint": cancel.
