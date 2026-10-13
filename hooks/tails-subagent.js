#!/usr/bin/env node
// LLM_Tails — SubagentStart hook: injects the compact LLM_Tails ruleset into spawned subagents.

const { defaultMode } = require('./tails-config');
const { getSubagentInstructions } = require('./tails-instructions');
const { readMode, writeHookOutput } = require('./tails-runtime');

const mode = readMode() || defaultMode();
if (mode && mode !== 'off') {
  const instructions = getSubagentInstructions(mode);
  if (instructions) {
    try {
      writeHookOutput('SubagentStart', mode, instructions);
    } catch (_) {}
  }
}
