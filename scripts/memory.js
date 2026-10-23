#!/usr/bin/env node
// LLM_Tails — print this project's session memory (what the hooks recorded), for /tails-end.
// Run from the project root.
//
// Usage: node scripts/memory.js [--chars 6000] [--json]

if (!process.env.CLAUDE_PROJECT_DIR && !process.env.CURSOR_PROJECT_DIR) {
  process.env.CLAUDE_PROJECT_DIR = process.cwd();
}

const session = require('../hooks/tails-session');

const args = process.argv.slice(2);
const i = args.indexOf('--chars');
const budget = i >= 0 ? Number(args[i + 1]) || 6000 : 6000;
const id = session.latestSessionId();

if (!id) {
  console.log('No session memory recorded for this project (memory is recorded by Claude Code and Codex hooks).');
} else if (args.includes('--json')) {
  console.log(JSON.stringify(session.readEvents(id), null, 2));
} else {
  console.log(session.buildSessionSummary(id, undefined, budget) || 'Session memory is empty.');
}
