---
name: tails-wiki-init
description: >
  Scaffold a project wiki for LLM-maintained knowledge. Creates the wiki/
  directory structure, index, log, and initial architecture pages by reading
  the current codebase. Use when the user says "init wiki", "create wiki",
  "tails wiki init", "/tails-wiki-init", "set up project knowledge base",
  or "I want the AI to understand this project". One-shot setup.
---

# Wiki Init

Scaffold a `wiki/` directory that serves as the project's persistent knowledge
base. The wiki is LLM-maintained: you (the AI) own it, the human reads it.

## Steps

1. **Read the project** — scan the directory structure, README, package/config
   files, entry points, and key modules. Build an understanding of what this
   project does, how it's structured, and what its conventions are.

2. **Create the structure:**

```
wiki/
├── index.md          # catalog of all wiki pages with links and summaries
├── log.md            # chronological record of wiki updates
├── overview.md       # what this project does, in plain language
├── architecture.md   # how the code is structured, entry points, data flow
├── conventions.md    # naming, file organization, error handling, import style
├── dependencies.md   # what's installed, why, what each one does
└── entities/         # one page per major module, service, or component
    └── (created per entity discovered)
```

3. **Write each page** with the content discovered from reading the codebase.
   Use `[[wikilink]]` syntax for cross-references (Obsidian-compatible).

4. **Write the index** — every page listed with a one-line summary, organized
   by category.

5. **Write the first log entry:**
   ```
   ## [YYYY-MM-DD] init | Wiki scaffolded
   Created wiki from codebase scan. Pages: <N>. Key findings: <summary>.
   ```

## Page format

Each wiki page:
- Starts with a `# Title`
- Has a YAML frontmatter block: `tags`, `sources` (files that informed it), `updated`
- Uses `[[wikilink]]` for cross-references to other wiki pages
- Cites source files: `(see src/auth/middleware.ts:L42)`

## Principles

- Write what you actually found, not what you assume.
- Mark anything uncertain with `[uncertain]`.
- The wiki is a snapshot — it will be updated incrementally by future sessions.
- Don't over-wiki: only create pages for concepts/entities that are substantial
  enough to warrant one. A project with 3 files needs 3-4 wiki pages, not 20.

## Boundaries

One-shot setup. After scaffolding, the always-on `tails` skill handles
incremental wiki maintenance. "stop tails-wiki-init": cancel before writing.
