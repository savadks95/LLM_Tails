<p align="center">
  <img src="assets/banner.jpg" alt="LLM_Tails — Disciplined AI Coding Mode">
</p>


<p align="center">
  <em>Understand deeply. Write minimally. Never hallucinate. Stay consistent.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/pillars-4-111111?style=flat-square" alt="4 pillars">
  <img src="https://img.shields.io/badge/skills-13-111111?style=flat-square" alt="13 skills">
  <img src="https://img.shields.io/badge/agents-20+-111111?style=flat-square" alt="20+ agents">
  <img src="https://img.shields.io/badge/version-v2.0.0-111111?style=flat-square" alt="v2.0.0">
  <img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT license">
</p>

## Support

If you find LLM_Tails helpful, consider buying me a coffee:

<p align="center">
  <img src="assets/buymeacoffee-qr.png" alt="Buy Me A Coffee QR Code" width="180">
  <br><br>
  <a href="https://buymeacoffee.com/MrNotorious" target="_blank">
    <img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=MrNotorious&button_colour=FFDD00&font_colour=000000&font_family=Bree&outline_colour=000000&coffee_colour=ffffff" alt="Buy me a coffee">
  </a>
</p>

## What is this?

LLM_Tails is a **disciplined AI coding mode** — a set of prompts, lifecycle hooks, and skills you install into your AI coding agent to make it write better, more reliable, and maintainable code.

This project is **directly based on and merges two pioneering open-source projects**:

- **[Ponytail](https://github.com/DietrichGebert/ponytail)** by [Dietrich Gebert](https://github.com/DietrichGebert) — the laziness ladder for writing minimal correct code without over-engineered bloat
- **[LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)** by [Andrej Karpathy](https://github.com/karpathy) — the persistent, compounding knowledge pattern for deep codebase understanding and architectural continuity

Building upon these foundations, LLM_Tails unifies them and adds two new critical pillars:

- **Anti-hallucination** — verify APIs, paths, and configs before using them; never invent function signatures or speculate on dependencies
- **Consistency enforcement** — match existing project idioms, naming conventions, error handling patterns, and import styles

## The four pillars

```
1. UNDERSTAND FIRST     Read the code a change touches. Trace callers & callees.
                        Check the project wiki. Injects automated codebase map.

2. MINIMAL CORRECT CODE Stop at the first rung that holds:
                        YAGNI → reuse → stdlib → native → dep → one-line → minimum

3. NEVER HALLUCINATE    Verify before using. [verified] / [likely] / [uncertain].
                        Don't invent APIs. Say "I'm not sure" when you're not.
                        Don't agree to please: contradict wrong premises with evidence.

4. ENFORCE CONSISTENCY  Match what's already here: naming, patterns, error handling,
                        imports, tests. Note conflicts, don't silently diverge.
```

## Install

**Claude Code:**

```
/plugin marketplace add savadks95/LLM_Tails
```
```
/plugin install llm-tails@tails
```

**Antigravity (IDE & CLI):**
- **IDE**: Copy [`.agents/rules/llm-tails.md`](.agents/rules/llm-tails.md) or [`AGENTS.md`](AGENTS.md) into your workspace root.
- **CLI**: `agy plugin install https://github.com/savadks95/LLM_Tails`

**Cursor:**
- Run `node scripts/cursor-hooks.js install` to merge native sessionStart and prompt hooks into `~/.cursor/hooks.json` (or add `--project`), or copy [`.cursor/rules/llm-tails.mdc`](.cursor/rules/llm-tails.mdc).

**GitHub Copilot / Copilot CLI:**
- Hooks configured in [`hooks/copilot-hooks.json`](hooks/copilot-hooks.json), or copy [`.github/copilot-instructions.md`](.github/copilot-instructions.md).

**Any agent that reads `AGENTS.md`:** copy [`AGENTS.md`](AGENTS.md) into your project root.

Step-by-step for Codex, Gemini, Qoder, Devin, Windsurf, Cline, Copilot, Kiro, and more: **[INSTALL.md](INSTALL.md)**.

## Before / after

You ask the AI to fix a login bug. Without LLM_Tails, it patches the login handler (wrong file) and adds speculative Redis cache clearing (hallucinated — the project doesn't use Redis).

With LLM_Tails:

1. **Pillar 1:** Reads `wiki/entities/auth.md` and session codebase map, traces the flow, finds the bug is in `changePassword()` — it stores plaintext instead of calling `hashPassword()`
2. **Pillar 2:** One-line fix in the right file
3. **Pillar 3:** `[verified]` — `hashPassword` confirmed in `src/auth/utils.js:L12`
4. **Pillar 4:** Matches the pattern already used in `createUser()`

More examples in [examples/](examples/).

## How it works

LLM_Tails is one prompt: [`skills/tails/SKILL.md`](skills/tails/SKILL.md). The compact version, for agents that read a rules file, is [`AGENTS.md`](AGENTS.md). Everything else loads that prompt and lifecycle hooks into different agents.

### Skills

| Command | What it does |
|---------|-------------|
| `/tails [lite\|full\|ultra\|off]` | Set the intensity, or report current level |
| `/tails-review` | Rebuilt quality review: 4-part findings (What this is, Problem, Fix, Consequence) across all four pillars |
| `/tails-audit` | Whole-repo quality audit: bloat, hallucination risks, consistency, and wiki health |
| `/tails-wiki-init` | Scaffold 3-layer persistent wiki (`raw/`, `wiki/`, `AGENTS.md`) from current codebase |
| `/tails-wiki-ingest` | Process a new source into the wiki, preserving immutable raw sources |
| `/tails-wiki-lint` | Health-check the wiki against code (stale claims, contradictions, orphans, gaps) |
| `/tails-wiki-query` | Query the wiki with ranked (BM25) section search, 1-hop relationship traversal, and compounding knowledge filing (`--save`) |
| `/tails-end` | Close the session: distill decisions, rejected approaches, and gotchas into the wiki (`log.md` + affected pages) |
| `/tails-debt` | Harvest `tails:` and `shortcut:` comments into a tracked ledger via git-aware scan |
| `/tails-gain` | Show the measured four-pillar impact scoreboard and benchmark gains |
| `/tails-stats` | Show the real context footprint LLM_Tails adds here: rules, codebase map, session memory |
| `/tails-doctor` | Diagnose the install: hooks, detected host, mode, context budget, map, memory |
| `/tails-help` | Quick reference card |

### Intensity levels

| Level | Behavior |
|-------|----------|
| **lite** | Advisory — names the better alternative, user picks |
| **full** | All four pillars enforced (default) |
| **ultra** | Maximum strictness — every claim needs `[verified]`, challenges requirements before building |

### Automated Codebase Map at Session Start

LLM_Tails includes a zero-dependency, regex-based codebase mapper ([`hooks/tails-map.js`](hooks/tails-map.js)) that automatically activates on `SessionStart`:
- Lists functions, classes, and exports across 10 languages (JS, TS, Python, Go, Rust, Ruby, JVM, PHP, Swift, C#).
- Keeps within a token-friendly character budget (default 2000 chars), prioritizing shared libraries (`utils`, `lib`, `services`, `components`, `hooks`, `models`).
- Injects immediate architectural awareness into the agent so "reuse first" (Pillar 2) costs zero search queries.
- Automatically detects and links the project wiki (`wiki/index.md`) if one exists.

### Context discipline & session memory

Context is a budget. LLM_Tails spends it on understanding, not on raw data:

- **Think in code (all agents):** the rules tell the agent never to pull large raw output (logs, test dumps, lockfiles, generated files, big JSON) into context. It filters at the source (`grep -n`, `head`, `git log -n`, `jq`, line ranges) or writes a short script that prints only the answer. Code a change touches is still read fully.
- **Large-read guard (Claude Code, opt-in):** a whole-file read over 64 KB gets advice to read a slice instead; in `ultra` it is blocked with the same advice. Ranged reads pass untouched. Off by default because it would add Node's startup time (~100+ ms) to every Read; enable it with one settings entry ([INSTALL.md](INSTALL.md#optional-large-read-guard-claude-code)).
- **Session memory (Claude Code):** hooks record the files changed, open tasks, your corrections ("no, don't use Redis"), and tool errors, with secrets masked, in a local per-project, per-session file. After context compaction or resume, a summary of at most 2 KB is restored, so the agent does not redo work or repeat a rejected approach, and is nudged to file lasting decisions into `wiki/log.md`. Disable with `TAILS_MEMORY=0`.
- **Fits the host's limit:** rules, memory, and map share one budget under Claude Code's 10,000-character limit for session-start context; after compaction, memory wins over the map.

See the cost for your project anytime with `/tails-stats`, and check the install with `/tails-doctor`.

### The project wiki (Karpathy 3-Layer Pattern)

LLM_Tails maintains a persistent knowledge base structured according to Karpathy's LLM Wiki architecture:

```
raw/                  # (optional) immutable raw sources: articles, papers, specs
wiki/
├── index.md          # content-oriented catalog of all wiki pages
├── log.md            # history: append-only, past entries never edited
├── overview.md       # what this project does in plain language
├── architecture.md   # code structure, entry points, data flow
├── conventions.md    # naming, file org, error handling patterns
├── dependencies.md   # what's installed and why
├── synthesis/        # compounding deep analyses and query findings (--save)
└── entities/         # one page per major module/service
AGENTS.md             # the schema: tells the LLM how to maintain the wiki
```

- Run `/tails-wiki-init` to scaffold the wiki from your current codebase.
- Pages are living state (updated in place); `log.md` is history (append-only); `raw/` is immutable.
- Run `/tails-end` when you finish a session: decisions, rejected approaches, and gotchas from the session memory are filed into `log.md` and the affected pages, so the next session starts with them.
- Run `/tails-wiki-query <topic> [--save]` for targeted 1-hop context retrieval. Using `--save` files synthesized discoveries back into `wiki/synthesis/`, compounding knowledge instead of losing it in chat history.
- Run `node scripts/wiki-search.js "<topic>"` for ranked (BM25) section search across the wiki, with zero dependencies.
- Run `node scripts/wiki-graph.js` to inspect connectivity and automatically generate a Mermaid architecture graph.

## Empirical Benchmarks

LLM_Tails includes an automated zero-dependency benchmark suite ([benchmarks/](benchmarks/)) measuring generated code size, correctness, and pillar compliance across canonical engineering tasks:

```
=================================================================
       LLM_TAILS FOUR-PILLAR EMPIRICAL SCOREBOARD
=================================================================

Metric                   Baseline Agent     LLM_Tails       Gain / Impact
-----------------------------------------------------------------
Code Size (LOC)          94 loc             32 loc          -66.0% bloat cut
Unrequested Classes      4 classes          0 classes       100% YAGNI compliant
Functional Correctness   (not executed)     100% pass       Real execution in VM
Four-Pillar Compliance   50%                94%             +44% discipline score
Output Discipline        Verbose prose      <= 3 lines      ~70% response token cut
-----------------------------------------------------------------
```

Run benchmarks and tests locally:
```bash
npm test
npm run bench
```
Or check the scoreboard anytime inside your agent using `/tails-gain`.

> The benchmark compares hand-written baseline and LLM_Tails example outputs; it illustrates the pillars, it does not measure live agent runs. For real numbers on your project's overhead, use `/tails-stats` (`npm run stats`).

## Compatibility

LLM_Tails works with **Ponytail** — they can coexist. Ponytail governs code minimalism (Pillar 2). LLM_Tails adds architecture awareness (Pillar 1), anti-hallucination (Pillar 3), and consistency (Pillar 4) on top.

It also works with **Caveman** — Caveman shrinks what the agent says, LLM_Tails governs what it builds and how honestly it communicates.

## Acknowledgments & Appreciation

**LLM_Tails is built directly on the shoulders of giants.** We extend our heartfelt thanks and credit to the original creators whose visionary work made this project possible:

- **[Dietrich Gebert](https://github.com/DietrichGebert)** for creating **[Ponytail](https://github.com/DietrichGebert/ponytail)**
  - Original Repository: [https://github.com/DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
  - *Thank you, Dietrich, for pioneering the "laziness ladder", the minimal-code philosophy, the codebase map hook, the debt tracking comment conventions, and the multi-agent adapter architecture.* Ponytail proved that the best code is often the code you don't write, and demonstrated how to stop AI agents from generating sprawling, unmaintainable boilerplate.

- **[Andrej Karpathy](https://github.com/karpathy)** for creating the **[LLM Wiki Pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)**
  - Original Gist & Publication: [https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
  - *Thank you, Andrej, for the groundbreaking insight that LLMs should stop relying solely on stateless query-time RAG and instead compile, maintain, and compound knowledge in a persistent, structured markdown wiki.* This pattern provides LLM_Tails with long-term codebase memory and deep architectural understanding.

- **[Tobi Lütke](https://github.com/tobi)** for **[qmd](https://github.com/tobi/qmd)** — referenced in the LLM Wiki pattern as a local markdown hybrid search engine tool for wiki querying.

- **[mksglu](https://github.com/mksglu)** for **[context-mode](https://github.com/mksglu/context-mode)** — the inspiration for "think in code" context discipline, session memory across compaction, ranked local search, and the doctor/stats commands. These are independent clean-room implementations; no context-mode code is used (context-mode is licensed under ELv2).

- **[Winston Koh](https://github.com/winstonkoh87)** for **[Athena-Public](https://github.com/winstonkoh87/Athena-Public)** — the inspiration for the explicit session close (`/tails-end`), the strict state-vs-history split in the wiki, and the "don't agree to please" honesty rule. Independent implementations; no Athena code is used.

LLM_Tails exists to synthesize and extend these two great concepts into a unified, cross-agent ecosystem.


## License

[MIT](LICENSE). The shortest license that works.
