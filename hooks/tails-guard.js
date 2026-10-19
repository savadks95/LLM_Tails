#!/usr/bin/env node
// LLM_Tails — PreToolUse hook on Bash/Edit/Write: guard patterns (Pillar 4, user decisions).
// Idea from seatbelt (MIT): a rule the user wrote down should get a heads-up at the moment a
// command is about to break it, not only be remembered. Guards are lines in the project's
// AGENTS.md / CLAUDE.md (any position, HTML comment or plain):
//   <!-- tails-guard: /\bredis\b/i No Redis: single instance, keep rate limits in memory -->
//   tails-guard: /(^|\/)migrations\// Never edit applied migrations; add a new one
// A Bash command or an edited file path that matches asks the user first (never blocks).
// Opt-in (see INSTALL.md): every matched tool call would pay Node's startup time.

const fs = require('fs');
const path = require('path');
const { defaultMode } = require('./tails-config');
const { projectDir, readHookInput, readMode, writeOut } = require('./tails-runtime');

const GUARD_FILES = ['AGENTS.md', 'CLAUDE.md', path.join('.claude', 'CLAUDE.md')];
const GUARD = /tails-guard:\s*\/(.+)\/([a-z]*)\s+(.+?)\s*(?:-->)?\s*$/;

function loadGuards(dir) {
  const guards = [];
  for (const f of GUARD_FILES) {
    let text;
    try { text = fs.readFileSync(path.join(dir, f), 'utf8'); } catch (_) { continue; }
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(GUARD);
      if (!m) continue;
      try {
        guards.push({ re: new RegExp(m[1], m[2].replace(/[^imsu]/g, '')), rule: m[3], source: f });
      } catch (_) {
        // An invalid pattern is the user's typo, not a reason to break their tool calls.
      }
    }
  }
  return guards;
}

// The text a guard is matched against: the shell command, or the edited file path.
function subject(input) {
  const ti = (input && input.tool_input) || {};
  if (typeof ti.command === 'string') return ti.command;
  return String(ti.file_path || ti.notebook_path || '').replace(/\\/g, '/');
}

function check(input, mode, dir) {
  const text = subject(input);
  if (mode === 'off' || !text) return null;
  const hit = loadGuards(dir).find((g) => g.re.test(text));
  return hit ? `LLM_Tails guard (${hit.source}): ${hit.rule}` : null;
}

if (require.main === module || process.argv[1] === undefined) {
  const input = readHookInput();
  const reason = check(input, readMode() || defaultMode(), projectDir || input.cwd || process.cwd());
  if (reason) {
    writeOut(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: reason },
    }));
  }
}

module.exports = { check, loadGuards };
