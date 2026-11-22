---
name: tails-wiki-ingest
description: >
  Ingest a new source into the project wiki. Reads the source, extracts key
  information, writes a summary page, and updates existing wiki pages with
  new cross-references and knowledge. Use when the user says "ingest this",
  "add to wiki", "process this source", "/tails-wiki-ingest", or drops a new
  file and says "file this". One-shot operation.
---

# Wiki Ingest

Process a new source and integrate its knowledge into the project wiki.

## Steps

1. **Read the source** fully. Understand what it says and how it relates to
   existing wiki content.

2. **Discuss** — briefly share key takeaways with the user before filing.
   "Key points: [X], [Y], [Z]. Filing now."

3. **Write a summary page** in `wiki/sources/` or appropriate subdirectory:
   ```
   wiki/sources/<source-name>.md
   ```
   If the source was placed in `raw/` (e.g. `raw/<name>.md`), keep `raw/` completely untouched (immutable source of truth).
   Include: one-paragraph summary, key claims/facts, how it relates to existing
   wiki content, `[[wikilinks]]` to relevant pages.

4. **Update existing pages** — scan `wiki/index.md` for pages that should be
   updated with information from this source. Touch each relevant page:
   - Add new information with citation: `(source: <name>)`
   - Flag contradictions: `⚠️ contradicts [[other-page]]: <what>`
   - Add new cross-references
   - Follow **Updating a page** below.

5. **Update index.md** — add the new page to the catalog.

6. **Append to log.md** (append-only; never edit past entries):
   ```
   ## [YYYY-MM-DD] ingest | <source title>
   Summary: <one line>. Updated pages: <list>. Contradictions: <any>.
   ```

## Updating a page

- **Update, don't duplicate.** A page or line already covering the same decision, module or entity is edited in place; the source becomes one more citation. Create a page only for what nothing covers: before creating one, search for its title (`node "${CLAUDE_PLUGIN_ROOT}/scripts/wiki-search.js" "<title words>" --limit 5`, or `grep -rli` in `wiki/`). A hit on the same entity under another name (`eori` / `eori-number`) means extend that page. A new page is for a distinct thing you would link to, not an attribute of one.
- **Durable bar.** Skip a fact the code, its tests or its comments already state plainly: a page that only restates code costs a read and goes stale. Write the why, the constraints and the traps, and point at the code (`file:line`) for the what.
- **Stamp what you checked.** On every page you edit, set frontmatter `updated:` to today and keep `sources:` listing the code files the page describes, with the content hash printed by `node "${CLAUDE_PLUGIN_ROOT}/scripts/context-lint.js" --hash <files>` (`sources: [src/limiter.js#1a2b3c4d5e6f]`). `context-lint.js` flags the page when a source's content no longer matches (without a hash: when it has a git commit after `updated:`).
- **One facet per line.** Match on the specific entity or claim, not the broad topic. Names a letter apart (`ledger-sync` / `ledger-sink`) are different things.
- **Latest wins, by date.** Sources arrive in any order, and an old one ingested today is still old. What is current is decided by when it was true (the source's date, commit date, `Updated:`), never by ingest order. An older source adds history ("was X until 2026-03"); it never overwrites a newer value. Undated and conflicting → flag the contradiction.
- **Cascade.** A fact that makes other lines wrong updates every page that states the old value.
- **Keep history, delete rarely.** A superseded claim becomes "now Y; was X until <date>". Delete only exact repeats.
- **No arithmetic.** Never derive a count or total the source doesn't state.
- **Minimal edit.** Rewrite only the lines that change; leave the rest of the page byte-for-byte as it was.
- **Corrections.** A source that proves a page wrong (verified, not just newer wording): fix the page and log `## [YYYY-MM-DD] correction | <topic>` with `Claimed: <...>. Actually: <...>. Evidence: <...>.` in `wiki/log.md`.

## Principles

- One source at a time for quality. Batch-ingest sacrifices cross-referencing quality.
- Flag contradictions explicitly — don't silently overwrite.
- The source is immutable. The wiki pages are the synthesis layer.
- Mark uncertain interpretations with `[uncertain]`.

## Boundaries

One-shot per source. Changes wiki pages only.
"stop tails-wiki-ingest": cancel.
