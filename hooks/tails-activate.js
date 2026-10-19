#!/usr/bin/env node
// LLM_Tails — SessionStart activation hook
// Activates LLM_Tails at the default/persisted level and injects the ruleset + automated codebase map.

const fs = require('fs');
const path = require('path');
const { defaultMode } = require('./tails-config');
const { getTailsInstructions } = require('./tails-instructions');
const {
  clearMode,
  cursorRuleNotice,
  cursorRulePath,
  isCodeBuddy,
  isCodex,
  isCopilot,
  isCursor,
  isQoder,
  projectDir,
  readHookInput,
  readMode,
  setMode,
  writeHookOutput,
} = require('./tails-runtime');

// Claude Code moves SessionStart context over 10,000 chars into a file and shows only a preview,
// so rules + session memory + codebase map share one budget below that line.
const CONTEXT_LIMIT = 9800;
const RESTORE_SOURCES = new Set(['compact', 'resume', 'fork']);

function activate(requestedMode, input = {}) {
  let mode = requestedMode || readMode() || defaultMode();

  // "off" lasts for the session: it survives compaction/resume, a brand-new session starts at the default.
  if (mode === 'off' && !requestedMode && readMode() === 'off' && !RESTORE_SOURCES.has(input.source)) {
    clearMode();
    mode = defaultMode();
  }

  if (mode === 'off') {
    process.exit(0);
  }

  // Cursor with always-on workspace rule: rule already contains instructions, avoid duplication
  if (isCursor) {
    const rule = cursorRulePath();
    if (rule) {
      try {
        writeHookOutput('SessionStart', mode, cursorRuleNotice(rule));
      } catch (_) {}
      process.exit(0);
    }
  }

  // Write live mode flag (both project-scoped and shared)
  try {
    setMode(mode);
  } catch (_) {}

  // 1. Core LLM_Tails instructions for active level
  let output = getTailsInstructions(mode);
  const dir = projectDir || process.cwd();

  // 2. Companions (context-mode, ai-memory): say how the work is split instead of duplicating it.
  // Detection reads Claude Code config, so only on Claude Code itself.
  let companions = [];
  if (!isCopilot && !isCodex && !isQoder && !isCodeBuddy && !isCursor) {
    try {
      const { companionNotes, detectCompanions } = require('./tails-companions');
      companions = detectCompanions(dir);
      const notes = companionNotes(companions);
      if (notes) output += '\n\n' + notes;
    } catch (_) {}
  }

  // 3. Session memory (Pillars 1 & 4): fresh session starts a clean log; after compaction or
  // resume, restore what was done and decided. Memory beats the map: the map can be re-derived.
  // context-mode restores its own snapshot after compaction: don't inject the same facts twice
  // (TAILS_MEMORY=1 keeps both). Fail-open everywhere: never block session start.
  const restoreMemory = !companions.includes('context-mode') || process.env.TAILS_MEMORY === '1';
  try {
    const session = require('./tails-session');
    if (RESTORE_SOURCES.has(input.source)) {
      if (restoreMemory) {
        const id = session.readEvents(input.session_id).length
          ? input.session_id
          : session.latestSessionId();
        const memory = session.buildSessionSummary(id, undefined,
          Math.min(Number(process.env.TAILS_MEMORY_CHARS || 2000), CONTEXT_LIMIT - output.length - 2));
        if (memory) output += '\n\n' + memory;
      }
    } else if (input.session_id) {
      session.startSession(input.session_id);
    }
  } catch (_) {}

  // 4. Handoff (Pillar 1): a new session picks up where the last one left off, whichever agent ran it.
  // After compaction/resume the session memory above already covers it.
  if (!RESTORE_SOURCES.has(input.source)) {
    try {
      const { BUDGET, readHandoff } = require('./tails-handoff');
      const handoff = readHandoff(dir, Math.min(BUDGET, CONTEXT_LIMIT - output.length - 2));
      if (handoff) output += '\n\n' + handoff;
    } catch (_) {}
  }

  // 5. Automated Codebase Map (Pillars 1 & 2): instant map of existing functions, classes, exports
  if (mode !== 'review' && process.env.TAILS_MAP !== '0') {
    try {
      const { BUDGET, GRAPH_BUDGET, buildMap } = require('./tails-map');
      // A code-graph companion answers structure questions better: keep only the top of the map.
      const cap = companions.includes('codebase-memory-mcp') ? Math.min(BUDGET, GRAPH_BUDGET) : BUDGET;
      const budget = Math.min(cap, CONTEXT_LIMIT - output.length - 2);
      const map = budget > 200 ? buildMap(process.cwd(), budget) : '';
      if (map) {
        output += '\n\n' + map;
      }
    } catch (_) {
      // Best effort fail-open
    }
  }

  try {
    writeHookOutput('SessionStart', mode, output);
  } catch (_) {}
}

if (require.main === module || process.argv[1] === undefined) {
  activate(process.argv[2], readHookInput());
}

module.exports = { CONTEXT_LIMIT, activate };
