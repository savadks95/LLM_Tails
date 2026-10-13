#!/usr/bin/env node
// LLM_Tails — cleanly remove state LLM_Tails wrote outside plugin files:
// active mode flags, per-project mode caches, and Cursor hook entries.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { getConfigPath, getClaudeDir, getQoderDir } = require('../hooks/tails-config');
const cursorHooks = require('./cursor-hooks');

function removeIfExists(filePath, label) {
  try {
    fs.unlinkSync(filePath);
    console.log(`Removed ${label}: ${filePath}`);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

// 1. Remove mode flags
removeIfExists(path.join(getClaudeDir(), '.tails-active'), 'Claude mode flag');
removeIfExists(path.join(os.homedir(), '.cursor', '.tails-active'), 'Cursor mode flag');
removeIfExists(path.join(getQoderDir(), '.tails-active'), 'Qoder mode flag');
removeIfExists(path.join(process.env.CODEBUDDY_CONFIG_DIR || path.join(os.homedir(), '.codebuddy'), '.tails-active'), 'CodeBuddy mode flag');

// 2. Remove per-project mode state and session memory directories
for (const base of [
  getClaudeDir(),
  path.join(os.homedir(), '.cursor'),
  getQoderDir(),
  process.env.CODEBUDDY_CONFIG_DIR || path.join(os.homedir(), '.codebuddy'),
]) {
  for (const [name, label] of [['tails-modes', 'per-project mode flags'], ['tails-sessions', 'session memory']]) {
    const dir = path.join(base, name);
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`Removed ${label}: ${dir}`);
      } catch (_) {}
    }
  }
}

// 3. Remove config file
removeIfExists(getConfigPath(), 'config file');

// 4. Remove Cursor hooks
try {
  const hooksFile = cursorHooks.uninstall('user');
  if (hooksFile) console.log(`Removed LLM_Tails hooks from ${hooksFile}`);
} catch (e) {
  if (e instanceof SyntaxError) {
    console.warn(`~/.cursor/hooks.json is malformed — remove LLM_Tails entries manually from: ${cursorHooks.hooksPath('user')}`);
  } else {
    throw e;
  }
}

console.log('LLM_Tails uninstall cleanup complete.');
