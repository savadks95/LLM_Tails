const fs = require('fs');
const path = require('path');
const os = require('os');
const { createHash } = require('crypto');
const { getClaudeDir, getQoderDir, normalizeMode } = require('./tails-config');

const STATE_FILE = '.tails-active';

function isVsCodeCopilotRoot(pluginRoot) {
  if (!pluginRoot) return false;
  return pluginRoot.split(/[\\/]+/).includes('agent-plugins') &&
    pluginRoot.toLowerCase().includes('.vscode');
}

const isCopilot = Boolean(process.env.COPILOT_PLUGIN_DATA) ||
  isVsCodeCopilotRoot(process.env.CLAUDE_PLUGIN_ROOT);
const isCodex = !isCopilot && Boolean(process.env.PLUGIN_DATA);
const isQoder = !isCopilot && !isCodex && Boolean(process.env.QODER_SESSION_ID);
const isCodeBuddy = !isCopilot && !isCodex && !isQoder && Boolean(process.env.CODEBUDDY_PLUGIN_ROOT);
const isCursor = !isCopilot && !isCodex && !isQoder && !isCodeBuddy && Boolean(process.env.CURSOR_VERSION);

let stateDir = getClaudeDir();
if (isCodex) stateDir = process.env.PLUGIN_DATA;
if (isCopilot) stateDir = process.env.COPILOT_PLUGIN_DATA || getClaudeDir();
if (isQoder) stateDir = getQoderDir();
if (isCodeBuddy) stateDir = process.env.CODEBUDDY_CONFIG_DIR || path.join(os.homedir(), '.codebuddy');
if (isCursor) stateDir = path.join(os.homedir(), '.cursor');

const statePath = path.join(stateDir, STATE_FILE);

const projectDir = (process.env.CLAUDE_PROJECT_DIR || process.env.CURSOR_PROJECT_DIR || '').trim();

// Windows paths are case-insensitive: D:\x and d:\x must map to the same project state.
function projectKey(dir) {
  const norm = path.normalize(dir);
  return createHash('sha256').update(process.platform === 'win32' ? norm.toLowerCase() : norm).digest('hex');
}

const projectStatePath = projectDir
  ? path.join(stateDir, 'tails-modes', projectKey(projectDir))
  : null;

function setMode(mode) {
  for (const file of [projectStatePath, statePath]) {
    if (!file) continue;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, mode, 'utf8');
  }
}

function clearMode() {
  for (const file of [projectStatePath, statePath]) {
    if (file) try { fs.unlinkSync(file); } catch (e) {}
  }
}

function readMode() {
  try {
    return normalizeMode(fs.readFileSync(projectStatePath || statePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function cursorRulePath() {
  const root = process.env.CURSOR_PROJECT_DIR || process.cwd();
  const rule = path.join(root, '.cursor', 'rules', 'llm-tails.mdc');
  return fs.existsSync(rule) ? rule : null;
}

function cursorRuleNotice(rule) {
  return 'LLM_TAILS: the always-on Cursor rule ' + rule + ' is active in this workspace and ' +
    'already carries the LLM_Tails ruleset, so the hooks injected nothing further. ' +
    'Mode switching (/tails lite|full|ultra|off, "stop tails") is unavailable while ' +
    'that rule exists. When the user tries to switch or turn off LLM_Tails, tell them to ' +
    'delete that rule so hooks.json can manage the level.';
}

// Hosts on Windows can pipe the event through PowerShell, which prepends a UTF-8 BOM, either raw
// or decoded as Windows-1252 ("ï»¿"). JSON.parse rejects both, and every hook would silently do
// nothing. Adapted from Hindsight (MIT), coding-agents core/diag.ts.
function stripBom(text) {
  return String(text).replace(/^(?:﻿|ï»¿)+/, '');
}

// Hook event JSON from stdin. Empty object when run by hand from a terminal or on bad input.
function readHookInput() {
  if (process.stdin.isTTY) return {};
  try {
    return JSON.parse(stripBom(fs.readFileSync(0, 'utf8')) || '{}') || {};
  } catch (e) {
    return {};
  }
}

// Synchronous: process.exit() is often called right after this, and on some platforms
// asynchronous pipe writes would be dropped when the process exits.
function writeOut(text) {
  fs.writeSync(1, text);
}

function writeHookOutput(event, mode, context = '') {
  if (isCopilot) {
    writeOut(JSON.stringify(
      event === 'SessionStart' && context ? { additionalContext: context } : {}));
    return;
  }
  if (isCodex) {
    const output = {};
    if (context) {
      output.hookSpecificOutput = {
        hookEventName: event,
        additionalContext: context,
      };
    }
    writeOut(JSON.stringify(output));
    return;
  }
  if (isQoder || isCodeBuddy) {
    const output = {};
    if (context) {
      output.hookSpecificOutput = {
        hookEventName: event,
        additionalContext: context,
      };
    }
    writeOut(JSON.stringify(output));
    return;
  }
  if (isCursor) {
    if (!context) return;
    const output = { additional_context: context };
    if (event === 'UserPromptSubmit') output.continue = true;
    writeOut(JSON.stringify(output));
    return;
  }

  // Native Claude
  if (event === 'SubagentStart' || event === 'UserPromptSubmit') {
    writeOut(JSON.stringify(
      { hookSpecificOutput: { hookEventName: event, additionalContext: context } }));
    return;
  }

  // SessionStart in Claude Code accepts hookSpecificOutput or text
  if (context) {
    writeOut(JSON.stringify(
      { hookSpecificOutput: { hookEventName: event, additionalContext: context } }));
  }
}

module.exports = {
  clearMode,
  cursorRuleNotice,
  cursorRulePath,
  isCodeBuddy,
  isCodex,
  isCopilot,
  isCursor,
  isQoder,
  projectDir,
  projectKey,
  readHookInput,
  readMode,
  setMode,
  stateDir,
  stripBom,
  writeHookOutput,
  writeOut,
};
