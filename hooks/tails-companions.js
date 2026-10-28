#!/usr/bin/env node
// LLM_Tails — detect companion tools that overlap with or extend LLM_Tails, so they cooperate
// instead of doing the same job twice:
//   context-mode (mksglu)             sandboxed tool output + its own session snapshot after compaction
//   ai-memory (akitaonrails)          cross-agent, cross-session memory and handoffs
//   claude-mem (thedotmack)           searchable history of past sessions
//   context7 (upstash)                current library docs (Pillar 3: verify APIs)
//   serena (oraios)                   LSP symbol navigation (Pillar 1: trace callers)
//   codebase-memory-mcp (DeusData)    code graph (replaces most of the codebase map)
//   qmd (tobi)                        hybrid local markdown search (wiki queries)
//   caveman (JuliusBrussee)           terse prose (LLM_Tails keeps honesty markers)
// Detection reads Claude Code config only (enabled plugins, MCP servers, hook commands).
// Read-only, best effort: any unreadable file counts as "not found".

const fs = require('fs');
const os = require('os');
const path = require('path');
const { getClaudeDir } = require('./tails-config');

// Ordered by how much they change what LLM_Tails itself does; notes are cut in this order.
const COMPANIONS = {
  'context-mode': /context-mode/i,
  'ai-memory': /ai-memory/i,
  'claude-mem': /claude-mem/i,
  context7: /context7(?!-admin)|ctx7/i, // context7-admin manages libraries, it has no docs tools
  serena: /serena/i,
  'codebase-memory-mcp': /codebase-memory/i,
  qmd: /(^|[^a-z])qmd([^a-z]|$)/i,
  caveman: /caveman/i,
};
const NOTES_BUDGET = 1000;

const NOTES = {
  'context-mode': 'context-mode: for large output (logs, test runs, big files, web pages) use its ctx_execute / ' +
    'ctx_batch(_execute) / ctx_search tools. It restores session state after compaction, so LLM_Tails does not repeat its own.',
  'ai-memory': 'ai-memory: before re-investigating, search it for past sessions and handoffs from other agents. ' +
    'wiki/ stays the reviewed project record.',
  'claude-mem': 'claude-mem: search past sessions (search → timeline → get_observations) before re-investigating.',
  context7: 'context7: verify library APIs against current docs there (resolve-library-id → query-docs, or ' +
    '`ctx7 docs <libraryId> <query>`) and tag them [verified].',
  serena: 'serena: trace callers and definitions with find_symbol / find_referencing_symbols instead of grep.',
  'codebase-memory-mcp': 'codebase-memory-mcp: use search_graph → trace_path for structure and callers; ' +
    'the LLM_Tails map is trimmed.',
  qmd: 'qmd: answer wiki questions with `qmd query "<topic>"` (index once: `qmd collection add wiki --name wiki`).',
  caveman: 'caveman: talk tersely, but never cut [verified]/[uncertain] markers, citations, or "not verified".',
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
  // `ctx7 setup --cli` installs a rule file instead of an MCP server or plugin.
  for (const base of [claude, path.join(dir, '.claude')]) {
    if (fs.existsSync(path.join(base, 'rules', 'context7.md'))) names.push('ctx7');
  }
  return names;
}

function detectCompanions(dir = process.cwd()) {
  const names = activeNames(dir);
  return Object.keys(COMPANIONS).filter((c) => names.some((n) => COMPANIONS[c].test(n)));
}

// One line per companion: how LLM_Tails and it split the work. Capped, so many companions can't
// crowd the rules out of the session-start budget; the rest are named for /tails-doctor.
function companionNotes(found, budget = NOTES_BUDGET) {
  const header = 'LLM_TAILS COMPANIONS (detected; use them, they extend these rules):';
  let out = header;
  const left = [];
  for (const c of found) {
    const line = '\n- ' + NOTES[c];
    if (!left.length && out.length + line.length <= budget) out += line;
    else left.push(c);
  }
  if (left.length) out += `\n- Also active: ${left.join(', ')} (see /tails-doctor).`;
  return found.length ? out : '';
}

module.exports = { companionNotes, detectCompanions };
