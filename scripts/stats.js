#!/usr/bin/env node
// LLM_Tails — honest context footprint: what LLM_Tails itself adds to the agent's context.
// Measures the real strings the hooks inject, for the current project and mode.
//
// Usage: node scripts/stats.js [--json]

const fs = require('fs');
const path = require('path');

// Run from a terminal or the agent's shell, the project dir is the current directory.
if (!process.env.CLAUDE_PROJECT_DIR && !process.env.CURSOR_PROJECT_DIR) {
  process.env.CLAUDE_PROJECT_DIR = process.cwd();
}

const { defaultMode } = require('../hooks/tails-config');
const { getSubagentInstructions, getTailsInstructions } = require('../hooks/tails-instructions');
const { readMode } = require('../hooks/tails-runtime');
const { CONTEXT_LIMIT } = require('../hooks/tails-activate');
const { BUDGET, buildMap } = require('../hooks/tails-map');
const session = require('../hooks/tails-session');

const ROOT = path.join(__dirname, '..');
const tokens = (chars) => Math.round(chars / 4);

function contextFootprint(mode = readMode() || defaultMode(), cwd = process.cwd()) {
  const rules = getTailsInstructions(mode).length;
  const started = Date.now();
  const map = process.env.TAILS_MAP === '0' ? 0
    : buildMap(cwd, Math.min(BUDGET, CONTEXT_LIMIT - rules - 2)).length;
  const mapMs = Date.now() - started;
  const latest = session.latestSessionId();
  const memory = latest ? session.buildSessionSummary(latest).length : 0;

  let sessions = 0;
  let memoryBytes = 0;
  try {
    for (const f of fs.readdirSync(session.sessionDir())) {
      sessions++;
      memoryBytes += fs.statSync(path.join(session.sessionDir(), f)).size;
    }
  } catch (_) {}

  return {
    mode,
    rules,
    map,
    mapMs,
    sessionStart: rules + map,
    memory,
    limit: CONTEXT_LIMIT,
    subagent: getSubagentInstructions(mode).length,
    agentsMd: fs.statSync(path.join(ROOT, 'AGENTS.md')).size,
    sessions,
    memoryBytes,
  };
}

function row(label, chars, note = '') {
  return `  ${label.padEnd(26)} ${chars.toLocaleString('en-US').padStart(7)} chars  ~${tokens(chars).toLocaleString('en-US').padStart(6)} tokens${note ? '  ' + note : ''}`;
}

function report(f) {
  if (f.mode === 'off') return 'LLM_Tails is off in this project: it adds nothing to context.';
  return [
    `LLM_Tails context footprint (mode: ${f.mode}; tokens estimated at ~4 chars each)`,
    '',
    'Injected once at session start:',
    row('rules', f.rules),
    row('codebase map', f.map, `(built in ${f.mapMs} ms)`),
    row('total', f.sessionStart, `(cap ${f.limit.toLocaleString('en-US')})`),
    '',
    'Injected only after compaction / resume:',
    row('session memory', f.memory, f.memory ? '' : '(none recorded yet)'),
    '',
    'Other:',
    row('per subagent (compact rules)', f.subagent),
    row('AGENTS.md (rule-file hosts)', f.agentsMd),
    `  session memory on disk      ${f.sessions} session(s), ${(f.memoryBytes / 1024).toFixed(1)} KB (local only)`,
    '',
    'This is the cost side only. Savings depend on how the agent behaves and are not measured here.',
  ].join('\n');
}

if (require.main === module) {
  const f = contextFootprint();
  console.log(process.argv.includes('--json') ? JSON.stringify(f, null, 2) : report(f));
}

module.exports = { contextFootprint, report };
