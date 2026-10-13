#!/usr/bin/env node
// LLM_Tails — doctor: checks that the install is healthy and shows what the hooks will do here.
// Read-only. Exit code 1 when a check fails.
//
// Usage: node scripts/doctor.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

if (!process.env.CLAUDE_PROJECT_DIR && !process.env.CURSOR_PROJECT_DIR) {
  process.env.CLAUDE_PROJECT_DIR = process.cwd();
}

const ROOT = path.join(__dirname, '..');
const results = [];
const check = (status, label, detail = '') => results.push({ status, label, detail });

function guarded(label, fn) {
  try {
    fn();
  } catch (e) {
    check('FAIL', label, e.message);
  }
}

// 1. Runtime
const major = Number(process.versions.node.split('.')[0]);
check(major >= 16 ? 'PASS' : 'FAIL', 'Node.js', `v${process.versions.node}${major >= 16 ? '' : ' (need >= 16)'}`);
guarded('git', () => {
  execFileSync('git', ['--version'], { stdio: 'ignore', timeout: 3000 });
  check('PASS', 'git', 'available (codebase map uses git ls-files)');
});

// 2. Plugin files: core skill, and every hook script referenced by the hook manifests
guarded('core skill', () => {
  const size = fs.statSync(path.join(ROOT, 'skills', 'tails', 'SKILL.md')).size;
  check('PASS', 'core skill', `skills/tails/SKILL.md (${size} bytes)`);
});
for (const manifest of fs.readdirSync(path.join(ROOT, 'hooks')).filter((f) => f.endsWith('.json'))) {
  guarded(`hooks/${manifest}`, () => {
    const text = fs.readFileSync(path.join(ROOT, 'hooks', manifest), 'utf8');
    JSON.parse(text);
    const missing = [...new Set(text.match(/hooks\/[\w-]+\.js(?!\w)/g) || [])]
      .filter((f) => !fs.existsSync(path.join(ROOT, f)));
    if (missing.length) check('FAIL', `hooks/${manifest}`, `missing: ${missing.join(', ')}`);
    else check('PASS', `hooks/${manifest}`, 'valid JSON, all scripts present');
  });
}

// 3. Host, mode, and state
const runtime = require('../hooks/tails-runtime');
const { defaultMode, getConfigPath } = require('../hooks/tails-config');
const host = ['isCopilot', 'isCodex', 'isQoder', 'isCodeBuddy', 'isCursor'].find((k) => runtime[k]);
check('INFO', 'host (as seen from this shell)', host ? host.slice(2) : 'Claude Code (default)');
check('INFO', 'state directory', runtime.stateDir);
const mode = runtime.readMode() || defaultMode();
check(mode === 'off' ? 'WARN' : 'PASS', 'active mode', mode === 'off' ? 'off: hooks inject nothing' : mode);
check('INFO', 'config file', fs.existsSync(getConfigPath()) ? getConfigPath() : `none (defaults; optional: ${getConfigPath()})`);
const overrides = ['LLM_TAILS_DEFAULT_MODE', 'TAILS_MAP', 'TAILS_MAP_CHARS', 'TAILS_MEMORY', 'TAILS_MEMORY_CHARS', 'TAILS_READ_MAX_KB']
  .filter((k) => process.env[k] !== undefined).map((k) => `${k}=${process.env[k]}`);
check('INFO', 'env overrides', overrides.join(', ') || 'none');

// Opt-in large-read guard lives in the user's Claude settings, not in the plugin hooks
const { getClaudeDir } = require('../hooks/tails-config');
let guardOn = false;
try {
  guardOn = fs.readFileSync(path.join(getClaudeDir(), 'settings.json'), 'utf8').includes('tails-read-guard.js');
} catch (_) {}
check('INFO', 'large-read guard', guardOn ? 'enabled in Claude settings' : 'off (opt-in, see INSTALL.md)');

// 4. What session start will inject here
guarded('context budget', () => {
  const { contextFootprint } = require('./stats');
  const f = contextFootprint(mode === 'off' ? 'full' : mode);
  check(f.sessionStart <= f.limit ? 'PASS' : 'WARN', 'context budget',
    `session start ${f.sessionStart}/${f.limit} chars (rules ${f.rules}, map ${f.map} in ${f.mapMs} ms)`);
  check(f.map ? 'PASS' : 'WARN', 'codebase map', f.map ? `${f.map} chars` : 'empty (no recognised source files here, or TAILS_MAP=0)');
  check('INFO', 'session memory', `${f.sessions} session(s), ${(f.memoryBytes / 1024).toFixed(1)} KB on disk`);
});
check('INFO', 'project wiki', fs.existsSync(path.join(process.cwd(), 'wiki', 'index.md'))
  ? 'wiki/index.md found' : 'none (optional: /tails-wiki-init)');

// 5. Cursor specifics: hooks install, and the always-on rule that disables mode switching
const cursorHooks = path.join(os.homedir(), '.cursor', 'hooks.json');
if (fs.existsSync(cursorHooks)) {
  guarded('Cursor hooks', () => {
    const { isTailsHook } = require('./cursor-hooks');
    const config = JSON.parse(fs.readFileSync(cursorHooks, 'utf8').replace(/^﻿/, ''));
    const n = Object.values(config.hooks || {}).flat().filter(isTailsHook).length;
    check(n ? 'PASS' : 'INFO', 'Cursor hooks', n ? `${n} LLM_Tails hook(s) in ${cursorHooks}` : 'not installed');
  });
}
if (fs.existsSync(path.join(process.cwd(), '.cursor', 'rules', 'llm-tails.mdc'))) {
  check('WARN', 'Cursor rule', '.cursor/rules/llm-tails.mdc present: Cursor hooks stay silent and /tails mode switching is unavailable');
}

// Report
for (const r of results) {
  console.log(`${r.status.padEnd(4)}  ${r.label}${r.detail ? ': ' + r.detail : ''}`);
}
const fails = results.filter((r) => r.status === 'FAIL').length;
const warns = results.filter((r) => r.status === 'WARN').length;
console.log(`\n${fails ? 'Unhealthy' : 'Healthy'}: ${fails} fail, ${warns} warn.`);
process.exitCode = fails ? 1 : 0;
