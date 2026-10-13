#!/usr/bin/env node
// LLM_Tails — PreToolUse hook on Read: context discipline for large files (Pillar 2).
// A whole-file read above TAILS_READ_MAX_KB (default 64) gets advice in `full`/`lite`
// and is denied with the same advice in `ultra`. Ranged reads and media files pass untouched.
// Opt-in (see INSTALL.md): not in the plugin's hooks, because every Read would pay Node's startup time.

const fs = require('fs');
const path = require('path');
const { defaultMode } = require('./tails-config');
const { readHookInput, readMode, writeHookOutput, writeOut } = require('./tails-runtime');

const MAX_BYTES = Number(process.env.TAILS_READ_MAX_KB || 64) * 1024;
const MEDIA = /\.(png|jpe?g|gif|webp|bmp|ico|svg|pdf|ipynb)$/i;

function guard(input, mode) {
  const ti = (input && input.tool_input) || {};
  const file = ti.file_path;
  if (mode === 'off' || !file || ti.offset || ti.limit || MEDIA.test(file)) return null;

  let size;
  try {
    const st = fs.statSync(file);
    if (!st.isFile()) return null;
    size = st.size;
  } catch (_) {
    return null;
  }
  if (size <= MAX_BYTES) return null;

  const advice = `LLM_Tails context discipline: ${path.basename(file)} is ${Math.round(size / 1024)} KB. ` +
    'Read only the slice you need (offset/limit), or use grep -n or a short script that prints the answer. ' +
    'If the whole file is the change surface (Pillar 1), read it in ranged chunks.';
  return { deny: mode === 'ultra', advice };
}

if (require.main === module || process.argv[1] === undefined) {
  const result = guard(readHookInput(), readMode() || defaultMode());
  if (result && result.deny) {
    writeOut(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: result.advice,
      },
    }));
  } else if (result) {
    writeHookOutput('PreToolUse', readMode() || defaultMode(), result.advice);
  }
}

module.exports = { guard };
