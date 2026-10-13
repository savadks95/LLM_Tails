# Cursor Hooks

Native Cursor integration through `hooks.json`. Reuses shared hook scripts (`hooks/tails-activate.js` and `hooks/tails-mode-tracker.js`) to provide automated session activation, codebase mapping, and `/tails` mode tracking in Cursor.

## Summary

| File | Role |
|------|------|
| `hooks/cursor-hooks.json` | Template: `sessionStart` and `beforeSubmitPrompt` with `TAILS_DIR` placeholder. |
| `scripts/cursor-hooks.js` | `install` / `uninstall`, merges into `~/.cursor/hooks.json` (or `.cursor/hooks.json` with `--project`). |
| `hooks/tails-activate.js` | `sessionStart`: injects active level ruleset and automated codebase map. |
| `hooks/tails-mode-tracker.js` | `beforeSubmitPrompt`: tracks `/tails` mode changes and updates session state. |
| `hooks/tails-runtime.js` | Detects Cursor (`CURSOR_VERSION`), persists mode state, and outputs Cursor-format JSON. |

## Installation & Removal

```bash
git clone https://github.com/savadks95/LLM_Tails
node LLM_Tails/scripts/cursor-hooks.js install            # ~/.cursor/hooks.json (global)
node LLM_Tails/scripts/cursor-hooks.js install --project  # <cwd>/.cursor/hooks.json (project only)
node LLM_Tails/scripts/cursor-hooks.js uninstall          # add --project for project file
```

### Safe Merging
- Reads existing `hooks.json` and preserves any other hooks you have configured.
- Replaces previous LLM_Tails entries idempotently without duplicate entries.
- Validates JSON format and refuses to overwrite malformed files.
