#!/usr/bin/env node
// Shared LLM_Tails configuration utilities.

const fs = require('fs');
const path = require('path');

const DEFAULT_MODE = 'full';
const RUNTIME_MODES = new Set(['off', 'lite', 'full', 'ultra']);

function normalizeMode(mode) {
  if (typeof mode !== 'string') return null;
  const m = mode.trim().toLowerCase();
  return RUNTIME_MODES.has(m) ? m : null;
}

function configDir() {
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, 'llm-tails');
  }
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'), 'llm-tails');
  }
  return path.join(require('os').homedir(), '.config', 'llm-tails');
}

function defaultMode() {
  const envMode = normalizeMode(process.env.LLM_TAILS_DEFAULT_MODE);
  if (envMode) return envMode;

  try {
    const configPath = path.join(configDir(), 'config.json');
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const fileMode = normalizeMode(data.defaultMode);
    if (fileMode) return fileMode;
  } catch (_) {
    // no config file — fine
  }

  return DEFAULT_MODE;
}

function getActiveModeFlagPath() {
  // Claude Code stores its config in ~/.claude
  const claudeDir = path.join(require('os').homedir(), '.claude');
  return path.join(claudeDir, '.tails-active');
}

function readActiveMode() {
  try {
    return normalizeMode(fs.readFileSync(getActiveModeFlagPath(), 'utf8'));
  } catch (_) {
    return null;
  }
}

function writeActiveMode(mode) {
  const flagPath = getActiveModeFlagPath();
  const dir = path.dirname(flagPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(flagPath, mode, 'utf8');
}

module.exports = {
  DEFAULT_MODE,
  RUNTIME_MODES,
  normalizeMode,
  configDir,
  defaultMode,
  readActiveMode,
  writeActiveMode,
};
