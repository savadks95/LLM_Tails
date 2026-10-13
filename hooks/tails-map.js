#!/usr/bin/env node
// LLM_Tails — automated codebase map: what already exists, so "reuse first" (Pillar 1 & 2) costs zero search.
//
// Lists the top-level functions, classes, types and exports of the project's source files, one line
// per folder, inside a character budget. Zero-dependency: `git ls-files` (or directory walk)
// plus regex per language. Tests, generated, and vendored files are skipped;
// shared code (utils, lib, services, components, hooks, models) is prioritized.
// Also detects the persistent project wiki (wiki/index.md) when available.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BUDGET = Number(process.env.TAILS_MAP_CHARS || 2000);
const MAX_FILES = 4000;
const HEAD_BYTES = 65536;
const DEADLINE_MS = 2000;
const HEADER = 'Codebase map (what already exists; reuse first, read a file only when you need its details):';
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
    const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 })
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

function buildMap(root = process.cwd(), budget = BUDGET) {
  const deadline = Date.now() + DEADLINE_MS;
  const files = listFiles(root)
    .filter((f) => SAFE_PATH.test(f) && SRC.test(f) && !SKIP_DIR.test(f) && !SKIP_FILE.test(f))
    .slice(0, MAX_FILES)
    .sort((a, b) => (SHARED.test(b) - SHARED.test(a)) || a.localeCompare(b));

  // Group by folder first (no I/O), in priority order: shared code first.
  const dirs = new Map();
  for (const f of files) {
    const dir = path.dirname(f) === '.' ? '.' : path.dirname(f).replace(/\\/g, '/');
    dirs.set(dir, [...(dirs.get(dir) || []), f]);
  }

  const wikiNotice = fs.existsSync(path.join(root, 'wiki', 'index.md'))
    ? 'Project wiki detected at wiki/ (index.md exists): read wiki/index.md for architectural memory before exploring from scratch.'
    : '';

  // The budget covers the whole output: header, folder lines, footer, wiki notice.
  const lines = [];
  let used = HEADER.length + 40 + (wikiNotice ? wikiNotice.length + 1 : 0);
  let skipped = 0;
  let misses = 0;
  for (const [dir, dirFiles] of dirs) {
    // Stop reading once nothing more fits (5 misfits in a row) or time is up; the rest are counted.
    if (budget - used < 40 || misses >= 5 || Date.now() > deadline) { skipped++; continue; }
    const perFile = [];
    for (const f of dirFiles) {
      try {
        const full = path.join(root, f);
        if (!fs.lstatSync(full).isFile()) continue;
        const names = namesIn(f, readHead(full));
        if (names.length) perFile.push(names);
      } catch (e) { continue; }
    }
    if (!perFile.length) continue;
    const names = [...new Set(perFile.flatMap((n) => n.slice(0, perFile.length > 8 ? 1 : 3)))];
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

module.exports = { BUDGET, buildMap };

if (require.main === module) {
  const out = buildMap(process.argv[2] || process.cwd());
  if (out) process.stdout.write(out + '\n');
}
