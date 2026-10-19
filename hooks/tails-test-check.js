#!/usr/bin/env node
// LLM_Tails — Stop hook, `ultra` only: "non-trivial logic leaves ONE runnable check behind".
// Idea from tdd-guard (MIT), much lighter: no test runner, no model call. If this turn changed
// source files but no test file, the agent is sent back once to add a check or say in one line
// why none is needed. stop_hook_active (set by the host on the retry) lets it finish after that.

const { defaultMode } = require('./tails-config');
const { readHookInput, readMode, writeOut } = require('./tails-runtime');
const { readEvents } = require('./tails-session');

const SOURCE = /\.(py|js|jsx|mjs|cjs|ts|tsx|go|rs|rb|java|kt|scala|php|swift|cs)$/;
const TEST = /(^|\/)(tests?|__tests__|spec)\/|(^|\/)test_[^/]*$|[._-](test|spec)\.[a-z]+$|_test\.[a-z]+$/;

function verdict(input, mode) {
  if (mode !== 'ultra' || !input.session_id || input.stop_hook_active) return null;
  const events = readEvents(input.session_id);
  const turnStart = events.map((e) => e.type).lastIndexOf('prompt');
  const files = [...new Set(events.slice(turnStart + 1).filter((e) => e.type === 'file').map((e) => e.path))];
  const source = files.filter((f) => SOURCE.test(f) && !TEST.test(f));
  if (!source.length || files.some((f) => TEST.test(f))) return null;
  return `LLM_Tails ultra: this turn changed ${source.slice(0, 3).join(', ')}${source.length > 3 ? ', ...' : ''} ` +
    'but no test. Non-trivial logic leaves ONE runnable check: add or update one, or say in one line why ' +
    'this change needs none (trivial, config, already covered by <test>).';
}

if (require.main === module || process.argv[1] === undefined) {
  try {
    const reason = verdict(readHookInput(), readMode() || defaultMode());
    if (reason) writeOut(JSON.stringify({ decision: 'block', reason }));
  } catch (_) {
    // Fail-open: never trap the agent in a turn
  }
}

module.exports = { verdict };
