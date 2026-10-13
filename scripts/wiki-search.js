#!/usr/bin/env node
// Zero-dependency ranked wiki search: splits wiki pages into heading sections and ranks them
// with BM25, so a query returns the few relevant sections instead of whole pages (Pillar 1).
//
// Usage:
//   node scripts/wiki-search.js "<query>" [--dir wiki] [--limit 5] [--json]

const fs = require('fs');
const path = require('path');
const { findWikiFiles } = require('./wiki-graph');

const K1 = 1.2;
const B = 0.75;
const STOPWORDS = new Set(('a an and are as at be by does for from has have how in is it its of on or ' +
  'that the this to was what when where which who why with').split(' '));

function stem(word) {
  return word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word;
}

// Identifiers count as a whole and by their parts: changePassword -> changepassword, change, password.
function tokenize(text) {
  const tokens = [];
  for (const word of String(text || '').match(/[A-Za-z0-9_]+/g) || []) {
    const parts = word.split(/_|(?<=[a-z0-9])(?=[A-Z])/).filter(Boolean);
    for (const t of new Set([word, ...(parts.length > 1 ? parts : [])])) {
      const w = t.toLowerCase();
      if (w.length > 1 && !STOPWORDS.has(w)) tokens.push(stem(w));
    }
  }
  return tokens;
}

function chunkMarkdown(text, file) {
  const body = String(text || '').replace(/^---[\s\S]*?---\s*/, '');
  const chunks = [];
  let current = { file, heading: '(top)', lines: [] };
  let inFence = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const h = !inFence && line.match(/^#{1,6}\s+(.+)/);
    if (h) {
      if (current.lines.join('').trim()) chunks.push(current);
      current = { file, heading: h[1].trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.join('').trim() || current.heading !== '(top)') chunks.push(current);
  return chunks.map((c) => ({ file: c.file, heading: c.heading, text: c.lines.join('\n').trim() }));
}

function snippet(text, terms, max = 240) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const hit = lines.find((l) => tokenize(l).some((t) => terms.has(t))) || lines[0] || '';
  const flat = hit.replace(/\s+/g, ' ');
  return flat.length > max ? flat.slice(0, max - 3) + '...' : flat;
}

function search(wikiDir, query, { limit = 5 } = {}) {
  const chunks = [];
  for (const file of findWikiFiles(wikiDir)) {
    const rel = path.relative(path.dirname(wikiDir), file).replace(/\\/g, '/');
    chunks.push(...chunkMarkdown(fs.readFileSync(file, 'utf8'), rel));
  }
  if (!chunks.length) return [];

  // Heading tokens are counted twice: a section named after the topic is usually the answer.
  const docs = chunks.map((c) => {
    const tokens = [...tokenize(c.heading), ...tokenize(c.heading), ...tokenize(c.text)];
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    return { chunk: c, tf, len: tokens.length };
  });
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / docs.length || 1;
  const terms = new Set(tokenize(query));
  const df = new Map();
  for (const t of terms) df.set(t, docs.filter((d) => d.tf.has(t)).length);

  return docs
    .map((d) => {
      let score = 0;
      for (const t of terms) {
        const f = d.tf.get(t);
        if (!f) continue;
        const idf = Math.log(1 + (docs.length - df.get(t) + 0.5) / (df.get(t) + 0.5));
        score += idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * d.len / avgLen));
      }
      return { file: d.chunk.file, heading: d.chunk.heading, score, snippet: snippet(d.chunk.text, terms) };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function main() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args.splice(i, 2)[1] : undefined;
  };
  const dir = path.resolve(flag('--dir') || path.join(process.cwd(), 'wiki'));
  const limit = Number(flag('--limit')) || 5;
  const asJson = args.includes('--json');
  const query = args.filter((a) => a !== '--json').join(' ').trim();

  if (!query) {
    console.error('Usage: node scripts/wiki-search.js "<query>" [--dir wiki] [--limit 5] [--json]');
    process.exit(1);
  }
  if (!fs.existsSync(dir)) {
    console.error(`Error: wiki directory not found at '${dir}'. Run /tails-wiki-init first.`);
    process.exit(1);
  }

  const results = search(dir, query, { limit });
  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
  } else if (!results.length) {
    console.log(`No wiki sections match "${query}".`);
  } else {
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.file} > ${r.heading}  (score ${r.score.toFixed(2)})`);
      if (r.snippet) console.log(`   ${r.snippet}`);
    });
  }
}

if (require.main === module) {
  main();
}

module.exports = { chunkMarkdown, search, tokenize };
