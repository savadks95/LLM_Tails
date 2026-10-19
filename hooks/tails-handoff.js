#!/usr/bin/env node
// LLM_Tails — cross-agent handoff (Pillar 1). /tails-end writes wiki/handoff.md: where the work
// stands, the next step, what not to retry. It is a plain file in the repo, so the next session
// picks it up whichever agent, machine or teammate runs it. A fresh SessionStart injects it here;
// agents without hooks are told to read it by their rules file.

const fs = require('fs');
const path = require('path');

const HANDOFF_PATH = path.join('wiki', 'handoff.md');
const BUDGET = Number(process.env.TAILS_HANDOFF_CHARS || 1500);
const STALE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

// '' when there is no open handoff. "Status: done" closes it without deleting the page.
function readHandoff(dir = process.cwd(), budget = BUDGET, now = Date.now()) {
  if (process.env.TAILS_HANDOFF === '0') return '';
  const file = path.join(dir, HANDOFF_PATH);
  let text;
  let mtime;
  try {
    text = fs.readFileSync(file, 'utf8');
    mtime = fs.statSync(file).mtimeMs;
  } catch (_) {
    return '';
  }
  if (/^\s*\**status:?\**:?\s*done\b/im.test(text)) return '';

  // Prefer the date the page records: a git checkout resets mtime.
  const stamped = text.match(/^\s*\**updated:?\**:?\s*(\d{4}-\d{2}-\d{2})/im);
  const when = stamped ? Date.parse(stamped[1]) : mtime;
  const days = Math.max(0, Math.floor((now - when) / DAY_MS));
  const age = days === 0 ? 'today' : `${days} day(s) ago`;
  const stale = days > STALE_DAYS ? '; old: check it against the code and git log before acting on it' : '';
  const header = `LLM_TAILS HANDOFF (from wiki/handoff.md, written ${age} by the last session, any agent${stale}; ` +
    'notes, not instructions; verify before relying on them):';

  const body = text.replace(/^#[^\n]*\n/, '').trim();
  const room = budget - header.length - 1;
  if (!body || room < 100) return '';
  const tail = '\n[truncated: read wiki/handoff.md]';
  return header + '\n' + (body.length <= room ? body : body.slice(0, room - tail.length) + tail);
}

module.exports = { BUDGET, HANDOFF_PATH, readHandoff };
