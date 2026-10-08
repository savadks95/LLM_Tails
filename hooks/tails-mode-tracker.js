#!/usr/bin/env node
// UserPromptSubmit hook: track /tails level switching commands.

const { normalizeMode, readActiveMode, writeActiveMode, defaultMode } = require('./tails-config');
const { getTailsInstructions } = require('./tails-instructions');

// Read the user's prompt from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let userPrompt = '';
  try {
    const parsed = JSON.parse(input);
    userPrompt = (parsed.prompt || parsed.userPrompt || parsed.message || '').trim();
  } catch (_) {
    userPrompt = input.trim();
  }

  // Match /tails or /tails <level> commands
  const match = userPrompt.match(/^\/tails(?:\s+(lite|full|ultra|off))?$/i);
  if (!match) return;

  const requestedLevel = match[1] ? match[1].toLowerCase() : null;
  const currentMode = readActiveMode() || defaultMode();

  if (!requestedLevel) {
    // Bare /tails: report current mode or activate if off
    if (currentMode !== 'off') {
      const output = {
        hookSpecificOutput: {
          additionalContext: `LLM_Tails mode: ${currentMode}. Use \`/tails lite|full|ultra|off\` to switch.`
        }
      };
      process.stdout.write(JSON.stringify(output));
    } else {
      const newMode = defaultMode() === 'off' ? 'full' : defaultMode();
      writeActiveMode(newMode);
      const instructions = getTailsInstructions(newMode);
      const output = { hookSpecificOutput: { additionalContext: instructions } };
      process.stdout.write(JSON.stringify(output));
    }
    return;
  }

  // Switch to requested level
  writeActiveMode(requestedLevel);
  if (requestedLevel === 'off') {
    const output = {
      hookSpecificOutput: {
        additionalContext: 'LLM_Tails deactivated. Normal mode.'
      }
    };
    process.stdout.write(JSON.stringify(output));
  } else {
    const instructions = getTailsInstructions(requestedLevel);
    const output = { hookSpecificOutput: { additionalContext: instructions } };
    process.stdout.write(JSON.stringify(output));
  }
});
