#!/usr/bin/env node
// SessionStart hook: activate LLM_Tails at the default level on session start.

const { defaultMode, readActiveMode, writeActiveMode } = require('./tails-config');
const { getTailsInstructions } = require('./tails-instructions');

const mode = readActiveMode() || defaultMode();
writeActiveMode(mode);

const instructions = getTailsInstructions(mode);
if (instructions) {
  const output = { hookSpecificOutput: { additionalContext: instructions } };
  process.stdout.write(JSON.stringify(output));
}
