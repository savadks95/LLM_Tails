#!/usr/bin/env node
// LLM_Tails — wiki recall on the first prompt (Pillar 1). The wiki is only useful if the agent reads
// the part that bears on the task; SessionStart can't know the task yet. So on the first prompt of a
// session that has real search terms, BM25-search wiki/ with it and inject the top sections once.
// Once per session, after Hindsight (MIT) coding-agents core/hook.ts: later turns pull on demand
// with /tails-wiki-query. Framing as in tails-session.js: a record that may not bear on the task.

const fs = require('fs');
const path = require('path');
const { projectDir } = require('./tails-runtime');
const { sessionPath } = require('./tails-session');
const { search, tokenize } = require('../scripts/wiki-search');

const BUDGET = Number(process.env.TAILS_RECALL_CHARS || 1200);
const MAX_HITS = 3;
// A hit must score at least this share of the best one: a weak tail is noise, not context.
const MIN_SHARE = 0.5;
// Pages injected elsewhere or with no content of their own.
const SKIP = new Set(['wiki/index.md', 'wiki/handoff.md']);
// Request words that match half the wiki and say nothing about the topic.
const PROMPT_NOISE = new Set(('please can could you we me my add make fix update change let need want ' +
  'should would do not use like just also now then new file code help').split(' '));

function markerPath(sessionId, dir) {
  return sessionPath(sessionId, dir).replace(/\.jsonl$/, '.recall');
}

// '' when there is nothing worth injecting. Marks the session once a real query was searched.
function recallForPrompt(sessionId, prompt, root = projectDir || process.cwd()) {
  if (process.env.TAILS_RECALL === '0' || !sessionId || /^\s*\//.test(prompt)) return ''; // slash commands
  const wiki = path.join(root, 'wiki');
  const marker = markerPath(sessionId, root);
  if (fs.existsSync(marker) || !fs.existsSync(wiki)) return '';

  const terms = [...new Set(tokenize(prompt))].filter((t) => !PROMPT_NOISE.has(t));
  if (terms.length < 2) return ''; // "hi", "continue": wait for a prompt that names the topic
  fs.mkdirSync(path.dirname(marker), { recursive: true });
  fs.writeFileSync(marker, '');

  const hits = search(wiki, terms.join(' '), { limit: MAX_HITS + SKIP.size })
    .filter((r) => !SKIP.has(r.file));
  const top = hits[0] ? hits[0].score : 0;
  const header = 'LLM_TAILS WIKI RECALL (keyword matches in wiki/ for this request; they may not bear on it. ' +
    'Use what is relevant, ignore the rest, verify against the code before relying on it, read the page for more):';
  let out = header;
  for (const r of hits.filter((h) => h.score >= top * MIN_SHARE).slice(0, MAX_HITS)) {
    const line = `\n- ${r.file} > ${r.heading}: ${r.snippet}`;
    if (out.length + line.length > BUDGET) break;
    out += line;
  }
  return out === header ? '' : out;
}

module.exports = { recallForPrompt };
