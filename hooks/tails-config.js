#!/usr/bin/env node
// Shared LLM_Tails configuration utilities.

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_MODE = 'full';
const RUNTIME_MODES = new Set(['off', 'lite', 'full', 'ultra']);
const VALID_MODES = new Set(['off', 'lite', 'full', 'ultra', 'review']);

function normalizeMode(mode) {
  if (typeof mode !== 'string') return null;
  const m = mode.trim().toLowerCase();
  return RUNTIME_MODES.has(m) ? m : null;
}

function normalizeConfigMode(mode) {
  if (typeof mode !== 'string') return null;
  const m = mode.trim().toLowerCase();
  return VALID_MODES.has(m) ? m : null;
}

function isDeactivationCommand(text) {
  const t = String(text || '').trim().toLowerCase().replace(/[.!?\s]+$/, '');
  return t === 'stop tails' || t === 'stop ponytail' || t === 'normal mode';
}

function isShellSafe(p) {
  return typeof p === 'string' && /^[A-Za-z0-9 _.\-:/\\~]+$/.test(p);
}

function configDir() {
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, 'llm-tails');
  }
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'llm-tails');
  }
  return path.join(os.homedir(), '.config', 'llm-tails');
}

function getConfigPath() {
  return path.join(configDir(), 'config.json');
}

function getClaudeDir() {
  if (process.env.CLAUDE_CONFIG_DIR) return process.env.CLAUDE_CONFIG_DIR;
  return path.join(os.homedir(), '.claude');
}

function getQoderDir() {
  if (process.env.QODER_CONFIG_DIR) return process.env.QODER_CONFIG_DIR;
  return path.join(os.homedir(), '.qoder');
}

function defaultMode() {
  const envMode = normalizeMode(process.env.LLM_TAILS_DEFAULT_MODE || process.env.TAILS_DEFAULT_MODE);
  if (envMode) return envMode;

  try {
    const configPath = getConfigPath();
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const fileMode = normalizeMode(data.defaultMode);
    if (fileMode) return fileMode;
  } catch (_) {
    // no config file — fine
  }

  return DEFAULT_MODE;
}

module.exports = {
  DEFAULT_MODE,
  RUNTIME_MODES,
  normalizeMode,
  normalizeConfigMode,
  isDeactivationCommand,
  isShellSafe,
  configDir,
  getConfigPath,
  getClaudeDir,
  getQoderDir,
  defaultMode,
};
