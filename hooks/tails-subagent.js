#!/usr/bin/env node
// SubagentStart hook: inject LLM_Tails instructions into spawned subagents.

const { readActiveMode, defaultMode } = require('./tails-config');
const { getTailsInstructions } = require('./tails-instructions');

const mode = readActiveMode() || defaultMode();
const instructions = getTailsInstructions(mode);

if (instructions) {
  const output = { hookSpecificOutput: { additionalContext: instructions } };
  process.stdout.write(JSON.stringify(output));
}
