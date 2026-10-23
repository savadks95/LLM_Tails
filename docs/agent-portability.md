# Agent Portability

LLM_Tails is an agent-portable skill distribution. The skills in `skills/` hold
the core behavior; host-specific files are thin adapters that wire that behavior into
various AI coding agents.

## Supported Adapters

| Host | Files | Capabilities |
|------|-------|-------------|
| Claude Code | `.claude-plugin/plugin.json`, `hooks/claude-hooks.json`, `commands/`, `skills/` | Full plugin: lifecycle hooks, automated codebase map on SessionStart, `/tails` commands, mode persistence, subagent injection, session memory across compaction (PostToolUse / PostToolUseFailure); optional large-read guard (opt-in, see INSTALL.md) |
| Codex | `.codex-plugin/plugin.json`, `hooks/claude-codex-hooks.json`, `commands/`, `skills/` | Plugin: SessionStart, SubagentStart, UserPromptSubmit, PostToolUse on `apply_patch` and `update_plan` (session memory records prompts, files and tasks; no tool errors, since Codex's shell `tool_response` carries no exit code) |
| Antigravity (IDE) | `.agents/rules/llm-tails.md`, `.agents/plugins/marketplace.json`, `AGENTS.md` | Native workspace rules and IDE plugin discovery |
| Antigravity CLI | `gemini-extension.json`, `AGENTS.md`, `commands/`, `skills/` | Extension: always-on context + slash commands + skills |
| Cursor | `hooks/cursor-hooks.json`, `scripts/cursor-hooks.js`, `docs/cursor-hooks.md`, `.cursor/rules/llm-tails.mdc` | Full lifecycle hooks: sessionStart ruleset + codebase map, beforeSubmitPrompt level tracking; or instruction-only rule fallback |
| GitHub Copilot / CLI | `hooks/copilot-hooks.json`, `.github/copilot-instructions.md` | Full lifecycle hooks (sessionStart + userPromptSubmitted in bash/PowerShell) and repository instructions |
| Qoder | `.qoder-plugin/plugin.json`, `.qoder/rules/llm-tails.md`, `hooks/qoder-hooks.json`, `skills/` | Full plugin: UserPromptSubmit mode tracking, PreToolUse subagent injection, workspace rules |
| Devin CLI | `.devin-plugin/plugin.json`, `skills/` | Plugin: native skill import for `/tails`, `/tails-review`, etc. |
| CodeBuddy | `.claude-plugin/plugin.json`, `hooks/`, `skills/` | Auto-detected by hooks runtime; responds via `hookSpecificOutput` JSON |
| Gemini CLI | `gemini-extension.json`, `AGENTS.md`, `commands/`, `skills/` | Extension: always-on context + commands + skills |
| Windsurf | `.windsurf/rules/llm-tails.md` | Instruction-only: project rule |
| Cline | `.clinerules/llm-tails.md` | Instruction-only: project rule |
| Kiro | `.kiro/steering/llm-tails.md` | Instruction-only: steering rule |
| Amp, Jules, Zed, CodeWhale, Junie | `AGENTS.md` | Instruction-only: auto-read from project root |
| Any generic agent | `AGENTS.md` or `skills/*/SKILL.md` | Copy the compact rule file or load skills directly |

## Adapter Rule

Keep adapters thin. When a host supports skills or hooks, point at the existing
`skills/` and `hooks/` directories. When a host only supports project
instructions, add its file to `scripts/sync-rules.js` (rendered from `AGENTS.md` or
`rules/compact.md`) instead of hand-copying rule text; `npm test` fails when a copy drifts.

## Portable Behavior

- `skills/tails/SKILL.md`: the four pillars (core skill)
- `skills/tails-review/SKILL.md`: four-pillar diff review (4-part structured findings & severity groups)
- `skills/tails-audit/SKILL.md`: whole-repo four-pillar audit (architecture, bloat, hallucination, consistency, wiki health)
- `skills/tails-wiki-init/SKILL.md`: scaffold project wiki with Karpathy 3-layer pattern (`raw/`, `wiki/`, `AGENTS.md`)
- `skills/tails-wiki-ingest/SKILL.md`: ingest sources into the wiki, preserving immutable raw sources
- `skills/tails-wiki-lint/SKILL.md`: health-check wiki against code (stale claims, contradictions, orphans, gaps)
- `skills/tails-wiki-query/SKILL.md`: targeted 1-hop wiki query with compounding knowledge filing (`--save`)
- `skills/tails-debt/SKILL.md`: harvest `tails:` and `shortcut:` comments into a ledger with `git grep`
- `skills/tails-gain/SKILL.md`: four-pillar impact scoreboard and benchmark gains
- `skills/tails-end/SKILL.md`: session close, distills session memory into the wiki (`scripts/memory.js`)
- `skills/tails-stats/SKILL.md`: real context footprint (`scripts/stats.js`)
- `skills/tails-doctor/SKILL.md`: install diagnostics (`scripts/doctor.js`)
- `skills/tails-help/SKILL.md`: quick reference
- `hooks/tails-map.js`: automated codebase map (zero-dependency regex map of functions, classes, and exports at session start)
- `hooks/tails-session.js`: session memory restored after compaction/resume (Claude Code and Codex hooks)
- `hooks/tails-recall.js`: on the first real prompt of a session, injects the `wiki/` sections that match it (BM25, at most 3, 1,200 chars)
- `hooks/tails-handoff.js`: injects an open `wiki/handoff.md` (written by `/tails-end`) at a fresh session start; hook-less agents read it via their rules file
- `hooks/tails-companions.js`: detects context-mode, ai-memory, claude-mem, context7, serena, codebase-memory-mcp, qmd and caveman in Claude Code config so LLM_Tails cooperates instead of duplicating them
- `hooks/tails-guard.js`: opt-in guard patterns (`tails-guard:` lines in AGENTS.md / CLAUDE.md) that ask before a matching command or edit (Claude Code PreToolUse)
- `hooks/tails-test-check.js`: `ultra` only, sends the agent back once when a turn changed source but no test (Claude Code Stop)
- `scripts/context-lint.js`: stale paths, line refs and `npm run` scripts in AGENTS.md, CLAUDE.md, rule files and `wiki/`
- `scripts/sync-rules.js`: generates every per-agent rule file from `AGENTS.md` and `rules/compact.md`
- `hooks/tails-read-guard.js`: opt-in large whole-file read guard (Claude Code PreToolUse, added via settings.json)
- `scripts/wiki-search.js`: zero-dependency BM25 section search over `wiki/`
- `AGENTS.md`: compact always-on instruction set for agents without skill support
