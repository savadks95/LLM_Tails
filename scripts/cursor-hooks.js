#!/usr/bin/env node
// LLM_Tails — install or remove Cursor hooks (hooks/cursor-hooks.json) in
// ~/.cursor/hooks.json (default) or <cwd>/.cursor/hooks.json (--project),
// safely merging with existing user hooks.
//
// Usage:
//   node scripts/cursor-hooks.js install [--project]
//   node scripts/cursor-hooks.js uninstall [--project]

const fs = require('fs');
const os = require('os');
const path = require('path');
const { isShellSafe } = require('../hooks/tails-config');

const ROOT = path.join(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'hooks', 'cursor-hooks.json');
const TAILS_HOOK = /[\\/]hooks[\\/]tails-[\w-]+\.js(?=["'\s]|$)/;

function isTailsHook(entry) {
  return Boolean(entry && typeof entry.command === 'string' && TAILS_HOOK.test(entry.command));
}

function hooksPath(scope) {
  return scope === 'project'
    ? path.join(process.cwd(), '.cursor', 'hooks.json')
    : path.join(os.homedir(), '.cursor', 'hooks.json');
}

function readConfig(file) {
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(file + ' must contain a JSON object; nothing was changed');
  }
  if (config.hooks === undefined) config.hooks = {};
  if (!config.hooks || typeof config.hooks !== 'object' || Array.isArray(config.hooks)) {
    throw new Error(file + ': hooks must be an object; nothing was changed');
  }
  for (const [event, entries] of Object.entries(config.hooks)) {
    if (!Array.isArray(entries)) {
      throw new Error(file + ': hooks.' + event + ' must be an array; nothing was changed');
    }
  }
  return config;
}

function writeConfig(file, config) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

function loadTemplate(rootDir) {
  const normalized = rootDir.replace(/\\/g, '/');
  if (!isShellSafe(normalized)) {
    throw new Error(
      `Checkout path contains shell metacharacters: ${normalized}\n` +
      `Cursor runs hook commands through a shell; copy ${TEMPLATE} into hooks.json by hand.`
    );
  }
  const raw = fs.readFileSync(TEMPLATE, 'utf8').split('TAILS_DIR').join(normalized);
  return JSON.parse(raw);
}

function install(scope = 'user') {
  const target = hooksPath(scope);
  const config = readConfig(target);
  const tpl = loadTemplate(ROOT);

  for (const [event, newEntries] of Object.entries(tpl.hooks)) {
    const existing = (config.hooks[event] || []).filter((e) => !isTailsHook(e));
    config.hooks[event] = [...existing, ...newEntries];
  }

  writeConfig(target, config);
  return target;
}

function uninstall(scope = 'user') {
  const target = hooksPath(scope);
  let config;
  try {
    config = readConfig(target);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }

  let touched = false;
  for (const [event, entries] of Object.entries(config.hooks)) {
    const filtered = entries.filter((e) => !isTailsHook(e));
    if (filtered.length !== entries.length) {
      touched = true;
      if (filtered.length) config.hooks[event] = filtered;
      else delete config.hooks[event];
    }
  }

  if (!touched) return null;

  if (Object.keys(config.hooks).length === 0 && Object.keys(config).length === 1) {
    try { fs.unlinkSync(target); } catch (_) {}
  } else {
    writeConfig(target, config);
  }
  return target;
}

if (require.main === module) {
  const action = process.argv[2];
  const scope = process.argv.includes('--project') ? 'project' : 'user';

  if (action === 'install') {
    try {
      const file = install(scope);
      console.log(`Installed LLM_Tails Cursor hooks into ${file}`);
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  } else if (action === 'uninstall') {
    try {
      const file = uninstall(scope);
      if (file) console.log(`Removed LLM_Tails Cursor hooks from ${file}`);
      else console.log(`No LLM_Tails entries found in ${hooksPath(scope)}`);
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  } else {
    console.error('Usage: node scripts/cursor-hooks.js <install|uninstall> [--project]');
    process.exit(1);
  }
}

module.exports = { install, uninstall, hooksPath, isTailsHook };
