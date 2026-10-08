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
   Include: one-paragraph summary, key claims/facts, how it relates to existing
   wiki content, `[[wikilinks]]` to relevant pages.

4. **Update existing pages** — scan `wiki/index.md` for pages that should be
   updated with information from this source. Touch each relevant page:
   - Add new information with citation: `(source: <name>)`
   - Flag contradictions: `⚠️ contradicts [[other-page]]: <what>`
   - Add new cross-references

5. **Update index.md** — add the new page to the catalog.

6. **Append to log.md:**
   ```
   ## [YYYY-MM-DD] ingest | <source title>
   Summary: <one line>. Updated pages: <list>. Contradictions: <any>.
   ```

## Principles

- One source at a time for quality. Batch-ingest sacrifices cross-referencing quality.
- Flag contradictions explicitly — don't silently overwrite.
- The source is immutable. The wiki pages are the synthesis layer.
- Mark uncertain interpretations with `[uncertain]`.

## Boundaries

One-shot per source. Changes wiki pages only.
"stop tails-wiki-ingest": cancel.
