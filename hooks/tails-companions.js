#!/usr/bin/env node
// LLM_Tails — detect companion tools that overlap with LLM_Tails, so the two cooperate instead
// of doing the same job twice:
//   context-mode (mksglu)      sandboxed tool output + its own session snapshot after compaction
//   ai-memory (akitaonrails)   cross-agent, cross-session memory and handoffs
// Detection reads Claude Code config only (enabled plugins, MCP servers, hook commands).
// Read-only, best effort: any unreadable file counts as "not found".

const fs = require('fs');
const os = require('os');
const path = require('path');
const { getClaudeDir } = require('./tails-config');

const COMPANIONS = {
  'context-mode': /context-mode/i,
  'ai-memory': /ai-memory/i,
};

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  } catch (_) {
    return null;
  }
}

const samePath = (a, b) => {
  const norm = (p) => path.resolve(p).replace(/\\/g, '/').replace(/\/$/, '');
  return process.platform === 'win32' ? norm(a).toLowerCase() === norm(b).toLowerCase() : norm(a) === norm(b);
};

// Names that mean "this tool is wired in": enabled plugins, MCP server names and commands, hook commands.
function activeNames(dir) {
  const claude = getClaudeDir();
  const names = [];
  const addServers = (servers) => {
    for (const [name, cfg] of Object.entries(servers || {})) {
      names.push(name, String(cfg && cfg.command || ''), ...((cfg && cfg.args) || []).map(String));
    }
  };

  for (const file of [
    path.join(claude, 'settings.json'),
    path.join(dir, '.claude', 'settings.json'),
    path.join(dir, '.claude', 'settings.local.json'),
  ]) {
    const s = readJson(file);
    if (!s) continue;
    names.push(...Object.entries(s.enabledPlugins || {}).filter(([, on]) => on).map(([k]) => k));
    addServers(s.mcpServers);
    for (const groups of Object.values(s.hooks || {})) {
      for (const group of groups || []) {
        names.push(...(group.hooks || []).map((h) => String(h.command || '')));
      }
    }
  }

  const global = readJson(path.join(process.env.CLAUDE_CONFIG_DIR || os.homedir(), '.claude.json'));
  if (global) {
    addServers(global.mcpServers);
    const project = Object.entries(global.projects || {}).find(([p]) => samePath(p, dir));
    if (project) addServers(project[1].mcpServers);
  }
  addServers((readJson(path.join(dir, '.mcp.json')) || {}).mcpServers);
  return names;
}

function detectCompanions(dir = process.cwd()) {
  const names = activeNames(dir);
  return Object.keys(COMPANIONS).filter((c) => names.some((n) => COMPANIONS[c].test(n)));
}

// One line per companion: how LLM_Tails and it split the work.
function companionNotes(found) {
  const notes = [];
  if (found.includes('context-mode')) {
    notes.push('context-mode is active: for large output (logs, test runs, big files, web pages) prefer its ' +
      'ctx_execute / ctx_batch_execute / ctx_search tools over raw reads. After compaction it restores ' +
      'session state, so LLM_Tails does not repeat its own session memory.');
  }
  if (found.includes('ai-memory')) {
    notes.push('ai-memory is active: before re-investigating, search it for past sessions and handoffs ' +
      'from other agents. wiki/ stays the reviewed project record: file durable decisions there as usual.');
  }
  return notes.length ? 'LLM_TAILS COMPANIONS:\n- ' + notes.join('\n- ') : '';
}

module.exports = { companionNotes, detectCompanions };
