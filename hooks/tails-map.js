#!/usr/bin/env node
// LLM_Tails — automated codebase map: what already exists, so "reuse first" (Pillar 1 & 2) costs zero search.
//
// Lists the top-level functions, classes, types and exports of the project's source files, one line
// per folder, inside a character budget. Zero-dependency: `git ls-files` (or directory walk)
// plus regex per language. Tests, generated, and vendored files are skipped. Names and folders
// are ranked by how many other files use them; shared code (utils, lib, services...) breaks ties.
// Also detects the persistent project wiki (wiki/index.md) when available.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BUDGET = Number(process.env.TAILS_MAP_CHARS || 2000);
const GRAPH_BUDGET = 600; // when codebase-memory-mcp is detected (see tails-companions.js)
const MAX_FILES = 4000;
const HEAD_BYTES = 65536;
const DEADLINE_MS = 2000;
const MAX_READ_BYTES = 16 * 1024 * 1024;
const IDENT = /[A-Za-z_$][\w$]{2,}/g;
const HEADER = 'Codebase map (what already exists, most-used first; reuse first, read a file only when you need its details):';
const SRC = /\.(py|js|jsx|mjs|cjs|ts|tsx|go|rs|rb|java|kt|scala|php|swift|cs)$/;
const SKIP_DIR = /(^|\/)(node_modules|\.git|dist|build|out|vendor|venv|\.venv|__pycache__|coverage|\.next|target|migrations|versions|fixtures|tests?|__tests__|spec)(\/|$)/;
const SKIP_FILE = /(^|\/)(test_[^/]*|[^/]*(_test|\.test|\.spec|\.gen|\.min|\.d)\.[a-z]+)$/;
const NAME = /^(?:type\s+)?(?:[\w$]+\s+as\s+)?([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)$/;
const SAFE_PATH = /^[\w.@+$()[\]\/-]+$/;
const SHARED = /(util|helper|lib|common|shared|service|component|hook|core|model|schema|api|store)/i;

const PATTERNS = {
  py: [/^(?:async\s+)?def\s+([A-Za-z]\w*)/gm, /^class\s+([A-Za-z]\w*)/gm],
  js: [
    /^export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm,
    /^export\s*\{([^}]*)\}/gm,
    /^(?:module\.)?exports\s*=\s*\{([^}]*)\}/gm,
    /^(?:module\.)?exports\.([A-Za-z_$][\w$]*)\s*=/gm,
    /^(?:export\s+default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm,
    /^class\s+([A-Za-z_$][\w$]*)/gm,
  ],
  go: [/^func\s+(?:\([^)]*\)\s*)?([A-Z]\w*)/gm, /^type\s+([A-Z]\w*)/gm],
  rs: [/^pub\s+(?:async\s+)?(?:fn|struct|enum|trait|type)\s+(\w+)/gm],
  rb: [/^\s*(?:def|class|module)\s+([A-Za-z][\w.]*)/gm],
  jvm: [/^\s*(?:public\s+)?(?:static\s+)?(?:final\s+)?(?:class|interface|enum|record)\s+(\w+)/gm],
};

const LANG = {
  py: 'py',
  js: 'js', jsx: 'js', mjs: 'js', cjs: 'js', ts: 'js', tsx: 'js',
  go: 'go',
  rs: 'rs',
  rb: 'rb',
  java: 'jvm', kt: 'jvm', scala: 'jvm', swift: 'jvm', cs: 'jvm', php: 'jvm',
};

function listFiles(root) {
  try {
    const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000, maxBuffer: 64 * 1024 * 1024 })
      .split('\n').filter(Boolean).slice(0, MAX_FILES * 5);
    if (tracked.length) return tracked;
  } catch (e) { /* not a git repo or git not found */ }

  const out = [];
  (function walk(dir, depth) {
    if (depth > 6 || out.length > MAX_FILES * 5) return;
    try {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.name.startsWith('.')) continue;
        const rel = path.relative(root, path.join(dir, ent.name)).replace(/\\/g, '/');
        if (ent.isDirectory()) {
          if (!SKIP_DIR.test(rel + '/')) walk(path.join(dir, ent.name), depth + 1);
        } else {
          out.push(rel);
        }
      }
    } catch (_) {}
  })(root, 0);
  return out;
}

function namesIn(file, text) {
  const ext = path.extname(file).slice(1);
  const lang = LANG[ext];
  const names = [];
  for (const re of PATTERNS[lang] || []) {
    for (const m of text.matchAll(re)) {
      const raw = m.slice(1).find((v) => typeof v === 'string' && v.trim()) || '';
      for (const n of raw.split(',').map((s) => (s.trim().match(NAME) || [])[1]).filter(Boolean)) {
        if (!n.startsWith('_') && !names.includes(n)) names.push(n);
      }
    }
  }
  return names;
}

// Only the head of a file is scanned: top-level declarations live there, and generated
// or bundled giants must not cost a full read.
function readHead(full) {
  const fd = fs.openSync(full, 'r');
  try {
    const buf = Buffer.alloc(HEAD_BYTES);
    return buf.toString('utf8', 0, fs.readSync(fd, buf, 0, HEAD_BYTES, 0));
  } finally {
    fs.closeSync(fd);
  }
}

// Reference ranking (the repo-map idea from aider, Apache-2.0; reimplemented without tree-sitter):
// a name that many other files mention is what the agent most likely needs to reuse. Score =
// number of other files using the name, divided by how many files define it (so `main`, `init`
// and other generic names don't win). Names under 3 chars are too ambiguous to count.
function rankNames(parsed) {
  const key = (n) => n.split('.').pop();
  const definedIn = new Map();
  for (const p of parsed) for (const n of new Set(p.names.map(key))) definedIn.set(n, (definedIn.get(n) || 0) + 1);
  const usedBy = new Map();
  for (const p of parsed) {
    const own = new Set(p.names.map(key));
    for (const id of p.ids) {
      if (definedIn.has(id) && !own.has(id)) usedBy.set(id, (usedBy.get(id) || 0) + 1);
    }
  }
  return (n) => (key(n).length < 3 ? 0 : (usedBy.get(key(n)) || 0) / definedIn.get(key(n)));
}

function buildMap(root = process.cwd(), budget = BUDGET) {
  const deadline = Date.now() + DEADLINE_MS;
  const files = listFiles(root)
    .filter((f) => SAFE_PATH.test(f) && SRC.test(f) && !SKIP_DIR.test(f) && !SKIP_FILE.test(f))
    .slice(0, MAX_FILES)
    .sort((a, b) => (SHARED.test(b) - SHARED.test(a)) || a.localeCompare(b));

  // 1. Read heads (shared code first) until the time or byte budget runs out.
  const parsed = [];
  let bytes = 0;
  let unread = 0;
  for (const f of files) {
    if (Date.now() > deadline || bytes > MAX_READ_BYTES) { unread++; continue; }
    try {
      const full = path.join(root, f);
      if (!fs.lstatSync(full).isFile()) continue;
      const text = readHead(full);
      bytes += text.length;
      parsed.push({ f, names: namesIn(f, text), ids: new Set(text.match(IDENT) || []) });
    } catch (e) { continue; }
  }
  const score = rankNames(parsed);

  // 2. Group by folder. Inside a folder: most-used names first; unused names keep the old
  // per-file cap so one big file can't crowd out its neighbours. Folders: most-used first.
  const dirs = new Map();
  for (const p of parsed) {
    if (!p.names.length) continue;
    const dir = path.dirname(p.f) === '.' ? '.' : path.dirname(p.f).replace(/\\/g, '/');
    dirs.set(dir, [...(dirs.get(dir) || []), p]);
  }
  const ranked = [...dirs].map(([dir, dirFiles]) => {
    const cap = dirFiles.length > 8 ? 1 : 3;
    const names = [];
    for (const p of dirFiles) {
      p.names.forEach((n, i) => { if (score(n) > 0 || i < cap) names.push(n); });
    }
    const unique = [...new Set(names)].sort((a, b) => score(b) - score(a));
    const weight = unique.slice(0, 5).reduce((sum, n) => sum + score(n), 0);
    return { dir, names: unique, weight, shared: SHARED.test(dir) };
  }).sort((a, b) => (b.weight - a.weight) || (b.shared - a.shared) || a.dir.localeCompare(b.dir));

  const wikiNotice = fs.existsSync(path.join(root, 'wiki', 'index.md'))
    ? 'Project wiki detected at wiki/ (index.md exists): read wiki/index.md for architectural memory before exploring from scratch.'
    : '';

  // The budget covers the whole output: header, folder lines, footer, wiki notice.
  const lines = [];
  let used = HEADER.length + 40 + (wikiNotice ? wikiNotice.length + 1 : 0);
  let skipped = unread ? 1 : 0;
  let misses = 0;
  for (const { dir, names } of ranked) {
    // Stop once nothing more fits (5 misfits in a row); the rest are counted.
    if (budget - used < 40 || misses >= 5) { skipped++; continue; }
    const line = `${dir}/: ${names.slice(0, 30).join(', ')}${names.length > 30 ? ', ...' : ''}`;
    if (used + line.length + 1 > budget) { skipped++; misses++; continue; }
    misses = 0;
    lines.push(line);
    used += line.length + 1;
  }

  const mapSection = lines.length
    ? HEADER + '\n' + lines.join('\n') + (skipped ? `\n(${skipped} more folders not listed)` : '')
    : '';
  return [mapSection, wikiNotice].filter(Boolean).join('\n');
}

module.exports = { BUDGET, GRAPH_BUDGET, buildMap };

if (require.main === module) {
  const out = buildMap(process.argv[2] || process.cwd());
  if (out) process.stdout.write(out + '\n');
}
