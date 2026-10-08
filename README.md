<p align="center">
  <img src="assets/banner.jpg" alt="LLM_Tails — Disciplined AI Coding Mode">
</p>




<p align="center">
  <em>Understand deeply. Write minimally. Never hallucinate. Stay consistent.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/pillars-4-111111?style=flat-square" alt="4 pillars">
  <img src="https://img.shields.io/badge/skills-8-111111?style=flat-square" alt="8 skills">
  <img src="https://img.shields.io/badge/agents-15+-111111?style=flat-square" alt="15+ agents">
  <img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT license">
</p>

---

## What is this?

LLM_Tails is a **disciplined AI coding mode** — a set of prompts and skills you install into your AI coding agent to make it write better, more reliable, and maintainable code.

This project is **directly based on and merges two pioneering open-source projects**:

- **[Ponytail](https://github.com/DietrichGebert/ponytail)** by [Dietrich Gebert](https://github.com/DietrichGebert) — the laziness ladder for writing minimal correct code without over-engineered bloat
- **[LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)** by [Andrej Karpathy](https://github.com/karpathy) — the persistent, compounding knowledge pattern for deep codebase understanding and architectural continuity

Building upon these foundations, LLM_Tails unifies them and adds two new critical pillars:

- **Anti-hallucination** — verify APIs, paths, and configs before using them; never invent function signatures or speculate on dependencies
- **Consistency enforcement** — match existing project idioms, naming conventions, error handling patterns, and import styles

## The four pillars

```
1. UNDERSTAND FIRST     Read the code a change touches. Trace callers.
                        Check the project wiki. Map conventions.

2. MINIMAL CORRECT CODE Stop at the first rung that holds:
                        YAGNI → reuse → stdlib → native → dep → one-line → minimum

3. NEVER HALLUCINATE    Verify before using. [verified] / [likely] / [uncertain].
                        Don't invent APIs. Say "I'm not sure" when you're not.

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

**Any agent that reads `AGENTS.md`:** copy [`AGENTS.md`](AGENTS.md) into your project root.

Step-by-step for Codex, Gemini, Antigravity, Cursor, Windsurf, Cline, Copilot, Kiro, and more: **[INSTALL.md](INSTALL.md)**.

## Before / after

You ask the AI to fix a login bug. Without LLM_Tails, it patches the login handler (wrong file) and adds speculative Redis cache clearing (hallucinated — the project doesn't use Redis).

With LLM_Tails:

1. **Pillar 1:** Reads `wiki/entities/auth.md`, traces the flow, finds the bug is in `changePassword()` — it stores plaintext instead of calling `hashPassword()`
2. **Pillar 2:** One-line fix in the right file
3. **Pillar 3:** `[verified]` — `hashPassword` confirmed in `src/auth/utils.js:L12`
4. **Pillar 4:** Matches the pattern already used in `createUser()`

More examples in [examples/](examples/).

## How it works

LLM_Tails is one prompt: [`skills/tails/SKILL.md`](skills/tails/SKILL.md). The compact version, for agents that read a rules file, is [`AGENTS.md`](AGENTS.md). Everything else loads that prompt into different agents.

### Skills

| Command | What it does |
|---------|-------------|
| `/tails [lite\|full\|ultra\|off]` | Set the intensity, or report current level |
| `/tails-review` | Review a diff through all four pillars |
| `/tails-audit` | Whole-repo audit: bloat, hallucination risks, consistency, architecture |
| `/tails-wiki-init` | Scaffold a project wiki from the current codebase |
| `/tails-wiki-ingest` | Process a new source into the wiki |
| `/tails-wiki-lint` | Health-check the wiki against current code |
| `/tails-debt` | Harvest `tails:` shortcut comments into a tracked ledger |
| `/tails-help` | Quick reference card |

### Intensity levels

| Level | Behavior |
|-------|----------|
| **lite** | Advisory — names the better alternative, user picks |
| **full** | All four pillars enforced (default) |
| **ultra** | Maximum strictness — every claim needs `[verified]`, challenges requirements before building |

### The project wiki

LLM_Tails can maintain a persistent `wiki/` directory in your project — a structured knowledge base of markdown files that the AI builds and maintains:

```
wiki/
├── index.md          # catalog of all wiki pages
├── log.md            # chronological record of updates
├── overview.md       # what this project does
├── architecture.md   # code structure, entry points, data flow
├── conventions.md    # naming, file org, error handling patterns
├── dependencies.md   # what's installed and why
└── entities/         # one page per major module/service
```

Run `/tails-wiki-init` to create one from your existing codebase. The wiki means the AI doesn't rediscover your architecture from scratch every session — it reads the wiki first.

## Compatibility

LLM_Tails works with **Ponytail** — they can coexist. Ponytail governs code minimalism (Pillar 2). LLM_Tails adds architecture awareness (Pillar 1), anti-hallucination (Pillar 3), and consistency (Pillar 4) on top.

It also works with **Caveman** — Caveman shrinks what the agent says, LLM_Tails governs what it builds and how honestly it communicates.

## Acknowledgments & Appreciation

**LLM_Tails is built directly on the shoulders of giants.** We extend our heartfelt thanks and credit to the original creators whose visionary work made this project possible:

- **[Dietrich Gebert](https://github.com/DietrichGebert)** for creating **[Ponytail](https://github.com/DietrichGebert/ponytail)**
  - Original Repository: [https://github.com/DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
  - *Thank you, Dietrich, for pioneering the "laziness ladder", the minimal-code philosophy, the debt tracking comment conventions, and the multi-agent adapter architecture.* Ponytail proved that the best code is often the code you don't write, and demonstrated how to stop AI agents from generating sprawling, unmaintainable boilerplate.

- **[Andrej Karpathy](https://github.com/karpathy)** for creating the **[LLM Wiki Pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)**
  - Original Gist & Publication: [https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
  - *Thank you, Andrej, for the groundbreaking insight that LLMs should stop relying solely on stateless query-time RAG and instead compile, maintain, and compound knowledge in a persistent, structured markdown wiki.* This pattern provides LLM_Tails with long-term codebase memory and deep architectural understanding.

- **[Tobi Lütke](https://github.com/tobi)** for **[qmd](https://github.com/tobi/qmd)** — referenced in the LLM Wiki pattern as a local markdown hybrid search engine tool for wiki querying.

LLM_Tails exists to synthesize and extend these two great concepts into a unified, cross-agent ecosystem.

## License

[MIT](LICENSE). The shortest license that works.
