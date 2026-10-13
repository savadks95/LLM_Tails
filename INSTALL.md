# Install

Pick your agent below. Not listed? Most agents read [`AGENTS.md`](AGENTS.md): copy it into your project root.

## Claude Code

```
/plugin marketplace add savadks95/LLM_Tails
```
```
/plugin install llm-tails@tails
```

(Two separate prompts required.)

## Codex

```bash
codex plugin marketplace add savadks95/LLM_Tails
codex plugin add llm-tails@tails
```

Run `codex` and open `/hooks`, trust the lifecycle hooks, start a new thread.

## Antigravity (IDE & CLI)

- **Antigravity IDE**: Place [`.agents/rules/llm-tails.md`](.agents/rules/llm-tails.md) in your workspace root, or copy [`AGENTS.md`](AGENTS.md) to your project root.
- **Antigravity CLI**:
  ```bash
  agy plugin install https://github.com/savadks95/LLM_Tails
  ```
  Commands are invoked as slash commands (e.g. `/tails-review`).

## Cursor

- **Native Hooks (Recommended):**
  ```bash
  git clone https://github.com/savadks95/LLM_Tails
  node LLM_Tails/scripts/cursor-hooks.js install            # global (~/.cursor/hooks.json)
  node LLM_Tails/scripts/cursor-hooks.js install --project  # project-only (.cursor/hooks.json)
  ```
- **Rule file alternative:** Copy [`.cursor/rules/llm-tails.mdc`](.cursor/rules/llm-tails.mdc) into your project's `.cursor/rules/`.

## GitHub Copilot / Copilot CLI

- **Lifecycle hooks:** Configured via [`hooks/copilot-hooks.json`](hooks/copilot-hooks.json).
- **Rule instructions:** Copy [`.github/copilot-instructions.md`](.github/copilot-instructions.md) into your project root, or `~/.copilot/copilot-instructions.md` for global use.

## Qoder

Qoder auto-loads [`AGENTS.md`](AGENTS.md) from the workspace. For plugin features:
Point to `.qoder-plugin/plugin.json` and [`hooks/qoder-hooks.json`](hooks/qoder-hooks.json).

## Devin CLI

```bash
devin plugins install savadks95/LLM_Tails
```

## Gemini CLI

```bash
gemini extensions install https://github.com/savadks95/LLM_Tails
```

Loads the ruleset as always-on context and registers the `/tails` commands.

## Windsurf

Copy [`.windsurf/rules/llm-tails.md`](.windsurf/rules/llm-tails.md) into your project's `.windsurf/rules/`.

## Cline

Copy [`.clinerules/llm-tails.md`](.clinerules/llm-tails.md) into your project's `.clinerules/`, or into `~/.cline/rules/` for global use.

## Kiro

Copy [`.kiro/steering/llm-tails.md`](.kiro/steering/llm-tails.md) into your project's `.kiro/steering/`, or `~/.kiro/steering/` for global use.

## Any other agent

Copy [`AGENTS.md`](AGENTS.md) into your project root. Modern AI coding agents (Amp, Jules, Zed, CodeWhale, Junie, Factory Droid, OpenCode, OpenClaw) auto-read `AGENTS.md`.

## Settings

Set the default level with the `LLM_TAILS_DEFAULT_MODE` env var (`lite`/`full`/`ultra`/`off`), or a `defaultMode` field in `~/.config/llm-tails/config.json` (`%APPDATA%\llm-tails\config.json` on Windows). Default is `full`.

Optional env vars:

| Variable | Default | Effect |
|----------|---------|--------|
| `TAILS_MAP=0` | on | Disable the codebase map at session start |
| `TAILS_MAP_CHARS` | `2000` | Codebase map character budget |
| `TAILS_MEMORY=0` | on | Disable session memory (Claude Code) |
| `TAILS_MEMORY_CHARS` | `2000` | Restored session memory budget |
| `TAILS_READ_MAX_KB` | `64` | Whole-file read size that triggers the opt-in large-read guard |

### Optional: large-read guard (Claude Code)

Advises (or in `ultra`, blocks) whole-file reads over `TAILS_READ_MAX_KB` and points the agent to a ranged read or `grep`. It is off by default: every `Read` would pay Node's startup time (~100+ ms). To enable it, clone the repo and add this to `~/.claude/settings.json` (merge into an existing `hooks` object if you have one):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          { "type": "command", "command": "node \"/path/to/LLM_Tails/hooks/tails-read-guard.js\"", "timeout": 5 }
        ]
      }
    ]
  }
}
```

Remove the entry to turn it off. `/tails-doctor` shows whether it is enabled.

Check your setup with `/tails-doctor` (or `node scripts/doctor.js` from your project) and the context cost with `/tails-stats`.

## Uninstall

Run the automated cleanup script:
```bash
node scripts/uninstall.js
```

Or by host:

| Host | How |
|------|-----|
| Claude Code | `/plugin remove llm-tails` |
| Codex | `codex plugin remove llm-tails` |
| Cursor | `node scripts/cursor-hooks.js uninstall` or delete rule file |
| Gemini / Antigravity | `gemini extensions uninstall llm-tails` |
| Windsurf / Cline / Copilot / Kiro | Delete copied rule file |
