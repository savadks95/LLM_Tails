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

## Gemini CLI

```bash
gemini extensions install https://github.com/savadks95/LLM_Tails
```

Loads the ruleset as always-on context and registers the `/tails` commands.

## Antigravity CLI

```bash
agy plugin install https://github.com/savadks95/LLM_Tails
```

Reuses `gemini-extension.json`. Commands are typed as messages (e.g., `/tails-review`).

## Cursor

Copy [`.cursor/rules/llm-tails.mdc`](.cursor/rules/llm-tails.mdc) into your project's `.cursor/rules/`, or into `~/.cursor/rules/` for global use.

## Windsurf

Copy [`.windsurf/rules/llm-tails.md`](.windsurf/rules/llm-tails.md) into your project's `.windsurf/rules/`.

## Cline

Copy [`.clinerules/llm-tails.md`](.clinerules/llm-tails.md) into your project's `.clinerules/`, or into `~/.cline/rules/` for global use.

## GitHub Copilot

Copy [`.github/copilot-instructions.md`](.github/copilot-instructions.md) into your project. For global use, copy to `~/.copilot/copilot-instructions.md`.

## Kiro

Copy the rules into `.kiro/steering/llm-tails.md` in your project, or `~/.kiro/steering/` for global use.

## Any other agent

Copy [`AGENTS.md`](AGENTS.md) into your project root. Most modern AI coding agents (Amp, Jules, Zed, CodeWhale, Junie, Factory Droid) auto-read `AGENTS.md`.

## Settings

Set the default level with the `LLM_TAILS_DEFAULT_MODE` env var (`lite`/`full`/`ultra`/`off`), or a `defaultMode` field in `~/.config/llm-tails/config.json` (`%APPDATA%\llm-tails\config.json` on Windows). Default is `full`.

## Uninstall

| Host | How |
|------|-----|
| Claude Code | `/plugin remove llm-tails` |
| Codex | `codex plugin remove llm-tails` |
| Cursor / Windsurf / Cline / Copilot | Delete the copied rule file |
| Gemini / Antigravity | `gemini extensions uninstall llm-tails` |
