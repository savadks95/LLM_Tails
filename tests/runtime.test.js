#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Isolated state: never touch the real ~/.claude while testing
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tails-runtime-test-'));
process.env.CLAUDE_CONFIG_DIR = tmp;
delete process.env.CLAUDE_PROJECT_DIR;
delete process.env.CURSOR_PROJECT_DIR;
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));

const {
  normalizeMode,
  normalizeConfigMode,
  isDeactivationCommand,
  isShellSafe,
  defaultMode,
} = require('../hooks/tails-config');
const { setMode, readMode, clearMode, isCodexMemoryAgent, stripBom } = require('../hooks/tails-runtime');

// 1. Config normalization
assert.strictEqual(normalizeMode('lite'), 'lite');
assert.strictEqual(normalizeMode('FULL'), 'full');
assert.strictEqual(normalizeMode('ultra'), 'ultra');
assert.strictEqual(normalizeMode('off'), 'off');
assert.strictEqual(normalizeMode('invalid'), null);

assert.strictEqual(normalizeConfigMode('review'), 'review');
assert.strictEqual(normalizeConfigMode('full'), 'full');

// 2. Deactivation command detection
assert.strictEqual(isDeactivationCommand('stop tails'), true);
assert.strictEqual(isDeactivationCommand('stop tails!'), true);
assert.strictEqual(isDeactivationCommand('normal mode'), true);
assert.strictEqual(isDeactivationCommand('stop ponytail'), true);
assert.strictEqual(isDeactivationCommand('add a normal mode toggle to settings'), false);

// 3. Shell safety
assert.strictEqual(isShellSafe('/home/user/project'), true);
assert.strictEqual(isShellSafe('C:\\Users\\user\\project'), true);
assert.strictEqual(isShellSafe('/path/with;rm -rf /'), false);
assert.strictEqual(isShellSafe('/path/with`whoami`'), false);

// 4. Mode runtime persistence
setMode('ultra');
assert.strictEqual(readMode(), 'ultra');
assert.ok(fs.existsSync(path.join(tmp, '.tails-active')), 'State written to the isolated dir');
clearMode();
assert.strictEqual(readMode(), null);
fs.writeFileSync(path.join(tmp, '.tails-active'), 'garbage\n');
assert.strictEqual(readMode(), null, 'Invalid state is ignored');

// 5. Hook input through PowerShell on Windows: a BOM, raw or decoded as Windows-1252
assert.strictEqual(stripBom('﻿{"a":1}'), '{"a":1}');
assert.strictEqual(stripBom('ï»¿{"a":1}'), '{"a":1}');
assert.strictEqual(stripBom('{"prompt":"﻿ kept"}'), '{"prompt":"﻿ kept"}', 'Only a leading BOM is removed');

// 6. Codex's own background memory agent is not a user session
assert.strictEqual(isCodexMemoryAgent({ cwd: 'C:\\Users\\me\\.codex\\memories' }), true);
assert.strictEqual(isCodexMemoryAgent({ cwd: '/home/me/.Codex/memories/' }), true);
assert.strictEqual(isCodexMemoryAgent({ cwd: '/repo', prompt: '## Memory Writing Agent\nmerge notes' }), true);
assert.strictEqual(isCodexMemoryAgent({ cwd: '/repo/memories', prompt: 'fix the memories page' }), false);

console.log('✓ tests/runtime.test.js passed');
