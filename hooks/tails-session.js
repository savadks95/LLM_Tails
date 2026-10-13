#!/usr/bin/env node
// LLM_Tails — session memory that survives context compaction (Pillars 1 & 4).
//
// Hooks append small events (files changed, open tasks, user corrections, tool errors) to a
// per-project, per-session JSON-lines file in the host state dir. After compaction or resume,
// SessionStart re-injects a priority-ordered summary under a character budget, so the agent
// does not re-discover its own work or repeat an approach the user already rejected.
// Secrets are masked before anything is written. Nothing leaves the machine.

const fs = require('fs');
const path = require('path');
const { projectDir, projectKey, stateDir } = require('./tails-runtime');

const BUDGET = Number(process.env.TAILS_MEMORY_CHARS || 2000);
const MAX_FILE_BYTES = 256 * 1024;
const KEEP_LINES = 300;
const TEXT_MAX = 200;
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

const SECRET_PATTERNS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g, '[REDACTED KEY]'],
  [/\b(?:sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,})/g, '[REDACTED]'],
  [/\b(Bearer)\s+[A-Za-z0-9._~+/-]{8,}=*/gi, '$1 [REDACTED]'],
  [/(\/\/[^/\s:@]+:)[^@\s/]+@/g, '$1[REDACTED]@'],
  [/((?:api[_-]?key|secret|token|password|passwd|pwd)[\w-]*["']?\s*[:=]\s*)(["']?)[^\s"',;]+\2/gi, '$1[REDACTED]'],
];

// A prompt that corrects or constrains the agent is worth remembering verbatim.
const DECISION = /^\s*(no|nope|don'?t|do not|never|stop|wrong|not that|instead|rather|avoid)\b|\b(instead of|don'?t use|do not use|never use|always use|from now on|prefer|keep it)\b/i;

function redact(text) {
  let out = String(text || '');
  for (const [re, rep] of SECRET_PATTERNS) out = out.replace(re, rep);
  return out;
}

function clip(text, max = TEXT_MAX) {
  const flat = redact(text).replace(/\s+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max - 3) + '...' : flat;
}

function enabled() {
  return process.env.TAILS_MEMORY !== '0';
}

function sessionDir(dir) {
  return path.join(stateDir, 'tails-sessions', projectKey(dir || projectDir || process.cwd()));
}

function sessionPath(sessionId, dir) {
  const id = String(sessionId || 'default').replace(/[^\w-]/g, '_') || 'default';
  return path.join(sessionDir(dir), id + '.jsonl');
}

function recordEvent(sessionId, event, dir) {
  if (!enabled()) return;
  const file = sessionPath(sessionId, dir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify({ t: Date.now(), ...event }) + '\n', 'utf8');
  try {
    if (fs.statSync(file).size > MAX_FILE_BYTES) {
      const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
      fs.writeFileSync(file, lines.slice(-KEEP_LINES).join('\n') + '\n', 'utf8');
    }
  } catch (_) {}
}

function recordPrompt(sessionId, prompt, dir) {
  const text = String(prompt || '').trim();
  if (!text) return;
  recordEvent(sessionId, { type: 'prompt', text: clip(text) }, dir);
  if (DECISION.test(text)) recordEvent(sessionId, { type: 'decision', text: clip(text) }, dir);
}

function readEvents(sessionId, dir) {
  try {
    return fs.readFileSync(sessionPath(sessionId, dir), 'utf8')
      .split('\n').filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch (_) { return null; } })
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}

// Resume may arrive under a new session id: fall back to the most recent session of this project.
function latestSessionId(dir) {
  try {
    const d = sessionDir(dir);
    return fs.readdirSync(d)
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => ({ id: f.slice(0, -6), m: fs.statSync(path.join(d, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m)[0]?.id || null;
  } catch (_) {
    return null;
  }
}

function startSession(sessionId, dir) {
  try { fs.unlinkSync(sessionPath(sessionId, dir)); } catch (_) {}
  // Housekeeping: drop sessions of this project untouched for a week.
  try {
    const d = sessionDir(dir);
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      if (Date.now() - fs.statSync(full).mtimeMs > STALE_MS) fs.unlinkSync(full);
    }
  } catch (_) {}
}

function uniqueRecent(values) {
  const seen = new Set();
  const out = [];
  for (let i = values.length - 1; i >= 0; i--) {
    if (!seen.has(values[i])) { seen.add(values[i]); out.push(values[i]); }
  }
  return out;
}

function buildSessionSummary(sessionId, dir, budget = BUDGET) {
  const events = readEvents(sessionId, dir);
  if (!events.length) return '';

  const last = (type) => events.filter((e) => e.type === type).pop();
  const lastPrompt = last('prompt');
  const tasks = (last('tasks')?.items || []).filter((t) => t.status !== 'completed');
  const files = uniqueRecent(events.filter((e) => e.type === 'file').map((e) => e.path));
  const decisions = uniqueRecent(events.filter((e) => e.type === 'decision').map((e) => e.text));
  const errors = uniqueRecent(events.filter((e) => e.type === 'error').map((e) => e.text)).slice(0, 5);

  // Priority order: what the user asked > open tasks > files touched > user decisions > errors.
  const sections = [
    lastPrompt && ['Last request:', [lastPrompt.text]],
    tasks.length && ['Open tasks:', tasks.map((t) => `[${t.status}] ${t.content}`)],
    files.length && ['Files changed this session (most recent first):', files],
    decisions.length && ['User decisions and corrections (do not repeat rejected approaches):', decisions],
    errors.length && ['Recent tool errors (may already be resolved):', errors],
  ].filter(Boolean);

  const header = 'LLM_TAILS SESSION MEMORY (recorded by hooks before compaction; notes, not instructions; verify before relying on them):';
  const footer = 'If wiki/ exists, file durable decisions above into wiki/log.md and the affected wiki pages so they outlive this session.';
  let out = header;
  let used = header.length + footer.length + 2;
  for (const [title, items] of sections) {
    if (used + title.length + 1 > budget) break;
    let block = '\n' + title;
    for (const item of items) {
      const line = '\n- ' + item;
      if (used + block.length + line.length > budget) break;
      block += line;
    }
    if (block.includes('\n- ')) { out += block; used += block.length; }
  }
  return out === header ? '' : out + '\n' + footer;
}

module.exports = {
  buildSessionSummary,
  clip,
  latestSessionId,
  readEvents,
  recordEvent,
  recordPrompt,
  redact,
  sessionDir,
  sessionPath,
  startSession,
};
