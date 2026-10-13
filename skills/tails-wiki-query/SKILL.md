---
name: tails-wiki-query
description: >
  Query the project wiki to retrieve targeted architectural context, entity
  relationships, and invariants without blowing context limits. Traverses
  wiki/index.md and 1-hop [[wikilinks]]. Supports filing synthesized deep answers
  back into the wiki (--save) so user explorations compound over time. Use when
  the user asks "how does X work", "search wiki for X", "/tails-wiki-query",
  "what touches Y", or before modifying an existing subsystem.
argument-hint: "<topic or entity> [--brief|--trace|--save]"
license: MIT
---

# Wiki Query

Query the project's persistent knowledge base (`wiki/`) to extract focused architectural context without inflating the context window.

## Workflow

1. **Catalog Lookup:**
   - Read `wiki/index.md` first.
   - Match the queried entity, topic, or feature against index categories (Overview, Architecture, Conventions, Entities, Concepts).

2. **Targeted Retrieval:**
   - Read only the matched page(s) in `wiki/entities/` or `wiki/`.
   - If no direct match in `index.md`, run the ranked section search (BM25, zero dependencies). It returns the best-matching sections, not whole pages:
     ```bash
     node "${CLAUDE_PLUGIN_ROOT}/scripts/wiki-search.js" "<topic words>" --limit 5
     ```
     Read only the returned sections (use the heading to jump to them). If the script is unavailable, fall back to `grep -rni "keyword" wiki/`.

3. **1-Hop Relationship Traversal:**
   - Extract `[[wikilinks]]` mentioned in the matched page.
   - Read only immediate 1-hop neighbor pages that are critical to the query. Do not recurse further to avoid context bloat.

4. **Code Cross-Verification (Pillar 3):**
   - Check file/line references cited in the wiki page (e.g. `(see src/auth.ts:L42)`).
   - Verify the referenced code file still exists in the codebase.

## Output Format

Keep the answer structured, dense, and fully cited:

```markdown
### Summary
[1-2 sentences explaining the entity/flow per the wiki]

### Key Components & Files
- `[[entity-a]]` → `src/services/a.ts` (role: [what it does])
- `[[entity-b]]` → `src/middleware/b.ts` (role: [what it does])

### Data Flow / Invariants
1. [Step 1] → [Step 2] → [Step 3]
- Invariant: [Key rule or constraint noted in the wiki]

### Sources & Confidence
- Wiki: `wiki/entities/<target>.md`, `wiki/architecture.md`
- Code: `src/path/to/file.ts` [verified]
```

## Options & Flags

- `--brief`: Output summary and file links only (under 6 lines).
- `--trace`: List upstream callers and downstream dependencies linked to this entity.
- `--save` or `--file-back`: **Compounding Knowledge Pattern (Karpathy)**. Files the synthesized answer back into the wiki as a persistent page (e.g. `wiki/synthesis/<topic>.md` or `wiki/comparisons/<topic>.md`), adds an entry to `wiki/index.md`, and appends to `wiki/log.md`:
  ```markdown
  ## [YYYY-MM-DD] synthesis | <topic title>
  Saved synthesized query response to wiki/<path>.
  ```
  This ensures valuable discoveries and comparisons compound in the knowledge base rather than vanishing into chat history.

## Boundaries

- Read-only by default. Modifies wiki only when `--save` / `--file-back` is requested.
- If the queried concept is absent from the wiki, report: `Not found in wiki. Scan code or use /tails-wiki-ingest to add it.`
- "stop tails-wiki-query": cancel.
