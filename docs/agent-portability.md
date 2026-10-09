# Agent Portability

LLM_Tails is an agent-portable skill distribution. The skills in `skills/` hold
the core behavior; host-specific files are thin adapters.

## Supported Adapters

| Host | Files | Capabilities |
|------|-------|-------------|
| Claude Code | `.claude-plugin/plugin.json`, `hooks/claude-codex-hooks.json`, `commands/`, `skills/` | Full plugin: lifecycle hooks, `/tails` commands, mode persistence, subagent injection |
| Codex | `.codex-plugin/plugin.json`, `hooks/claude-codex-hooks.json`, `commands/`, `skills/` | Full plugin: same as Claude Code |
| Gemini CLI | `gemini-extension.json`, `AGENTS.md`, `commands/`, `skills/` | Extension: always-on context + commands + skills |
| Antigravity CLI | `gemini-extension.json`, `AGENTS.md`, `commands/`, `skills/` | Extension: same as Gemini CLI |
| Cursor | `.cursor/rules/llm-tails.mdc` | Instruction-only: always-on rules, no mode switching |
| Windsurf | `.windsurf/rules/llm-tails.md` | Instruction-only: project rule |
| Cline | `.clinerules/llm-tails.md` | Instruction-only: project rule |
| GitHub Copilot | `.github/copilot-instructions.md` | Instruction-only: repository instructions |
| Kiro | Copy to `.kiro/steering/` | Instruction-only: steering rule |
| Amp, Jules, Zed, CodeWhale, Junie | `AGENTS.md` | Instruction-only: auto-read from project root |
| Any generic agent | `AGENTS.md` or `skills/*/SKILL.md` | Copy the compact rule file or load skills directly |

## Adapter Rule

Keep adapters thin. When a host supports skills or hooks, point at the existing
`skills/` and `hooks/` directories. When a host only supports project
instructions, keep its copied rule text aligned with `AGENTS.md`.

## Portable Behavior

- `skills/tails/SKILL.md`: the four pillars (core skill)
- `skills/tails-review/SKILL.md`: four-pillar diff review
- `skills/tails-audit/SKILL.md`: whole-repo four-pillar audit
- `skills/tails-wiki-init/SKILL.md`: scaffold a project wiki
- `skills/tails-wiki-ingest/SKILL.md`: ingest sources into the wiki
- `skills/tails-wiki-lint/SKILL.md`: health-check wiki against code
- `skills/tails-wiki-query/SKILL.md`: query wiki for targeted architecture context
- `skills/tails-debt/SKILL.md`: harvest `tails:` shortcuts into a ledger
- `skills/tails-gain/SKILL.md`: four-pillar impact scoreboard and benchmark gains
- `skills/tails-help/SKILL.md`: quick reference
- `AGENTS.md`: compact always-on instruction set for agents without skill support
