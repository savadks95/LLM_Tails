#!/usr/bin/env node
// LLM_Tails — UserPromptSubmit hook: tracks /tails mode switches and deactivation commands.

const { defaultMode, normalizeMode, isDeactivationCommand } = require('./tails-config');
const { getTailsInstructions } = require('./tails-instructions');
const { readMode, setMode, writeHookOutput } = require('./tails-runtime');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let userPrompt = '';
  let sessionId;
  try {
    const parsed = JSON.parse(input);
    userPrompt = (parsed.prompt || parsed.userPrompt || parsed.message || '').trim();
    sessionId = parsed.session_id;
  } catch (_) {
    userPrompt = input.trim();
  }

  // Standalone deactivation: "stop tails" / "normal mode"
  if (isDeactivationCommand(userPrompt)) {
    setMode('off'); // off lasts until switched back or a new session starts
    writeHookOutput('UserPromptSubmit', 'off', 'LLM_TAILS MODE DEACTIVATED. Reverted to standard agent behavior.');
    return;
  }

  // Match /tails or /tails <level>
  const match = userPrompt.match(/^\/tails(?:\s+(lite|full|ultra|off))?$/i);
  if (!match) {
    // Session memory: remember the request and any correction the user makes. Only hosts that
    // send a session id can restore memory later, so others record nothing.
    if (sessionId && (readMode() || defaultMode()) !== 'off') {
      try { require('./tails-session').recordPrompt(sessionId, userPrompt); } catch (_) {}
    }
    return;
  }

  const requestedLevel = match[1] ? match[1].toLowerCase() : null;
  const currentMode = readMode() || defaultMode();

  if (!requestedLevel) {
    // Bare /tails: report current mode or activate if off
    if (currentMode !== 'off') {
      writeHookOutput(
        'UserPromptSubmit',
        currentMode,
        `LLM_Tails active level: **${currentMode}**. Use \`/tails lite|full|ultra|off\` to switch.`
      );
    } else {
      const newMode = defaultMode() === 'off' ? 'full' : defaultMode();
      setMode(newMode);
      const instructions = getTailsInstructions(newMode);
      writeHookOutput('UserPromptSubmit', newMode, instructions);
    }
    return;
  }

  // Switch to requested level
  if (requestedLevel === 'off') {
    setMode('off'); // off lasts until switched back or a new session starts
    writeHookOutput('UserPromptSubmit', 'off', 'LLM_TAILS MODE DEACTIVATED. Normal mode restored.');
  } else {
    setMode(requestedLevel);
    const instructions = getTailsInstructions(requestedLevel);
    writeHookOutput('UserPromptSubmit', requestedLevel, instructions);
  }
});
