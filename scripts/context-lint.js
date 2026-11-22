#!/usr/bin/env node
// LLM_Tails — context lint: find stale references in the files agents read as truth
// (AGENTS.md, CLAUDE.md, agent rule files, wiki/). Idea from agentlint (MIT): context files
// are written once and rot as the code moves. Mechanical checks only, zero dependencies:
//   - `path/in/backticks` that no longer exists
//   - `file.js:L120` pointing past the end of the file
//   - `npm run <script>` that package.json does not define
//   - wiki/ only: [[links]] to no page; pages wiki/index.md does not list; pages whose names differ
//     only in case, separators or a plural (rate-limit / rate_limits); a page whose frontmatter
//     `sources:` file changed: content hash differs (`src/a.js#<hash>`), else a git commit after its
//     `updated:` date; a page none of whose sources exist (orphaned). The last three are ideas from the LLM Wiki gist thread
//     (karpathy/442a6bf5...): staleness and duplicates found by code, not by an LLM re-reading.
// A line containing "tails-lint: ignore" is skipped. Exit code 1 when anything is found.
//
// Usage: node scripts/context-lint.js [project-dir]
//        node scripts/context-lint.js --hash <file...>   prints `path#hash` for a page's sources:

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { findWikiFiles, parseWikiLinks } = require('./wiki-graph');

const ROOT_FILES = ['AGENTS.md', 'CLAUDE.md', '.claude/CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md'];
const RULE_DIRS = ['.cursor/rules', '.windsurf/rules', '.clinerules', '.kiro/steering', '.qoder/rules', '.agents/rules'];
// Paths the LLM_Tails rules mention conditionally ("if wiki/index.md exists").
const CONDITIONAL = new Set(['wiki/', 'wiki/index.md', 'wiki/log.md', 'wiki/handoff.md', 'raw/']);
const PATHLIKE = /^(?:\.{0,2}\/)?[\w@.-]+(?:\/[\w@.-]*)*$/;
const HAS_EXT = /\.(?:md|mdc|js|mjs|cjs|ts|tsx|jsx|py|go|rs|rb|java|kt|php|swift|cs|json|toml|ya?ml|sh|ps1|sql|css|scss|html)$/;

function contextFiles(root) {
  const out = ROOT_FILES.filter((f) => fs.existsSync(path.join(root, f)));
  for (const dir of RULE_DIRS) {
    try {
      for (const f of fs.readdirSync(path.join(root, dir))) if (/\.mdc?$/.test(f)) out.push(`${dir}/${f}`);
    } catch (_) {}
  }
  (function walk(dir) {
    try {
      for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
        const rel = `${dir}/${ent.name}`;
        if (ent.isDirectory()) walk(rel);
        else if (ent.name.endsWith('.md')) out.push(rel);
      }
    } catch (_) {}
  })('wiki');
  return out;
}

// Wiki page names (relative to wiki/, no .md) and a resolver that links like Obsidian and
// wiki-graph.js do: exact path first, else a basename only one page has.
function wikiPages(root) {
  const wikiDir = path.join(root, 'wiki');
  const names = findWikiFiles(wikiDir).map((f) => path.relative(wikiDir, f).replace(/\\/g, '/').replace(/\.md$/i, ''));
  const byBase = new Map();
  for (const n of names) byBase.set(path.posix.basename(n), byBase.has(path.posix.basename(n)) ? null : n);
  const set = new Set(names);
  const resolve = (target) => (set.has(target) ? target : byBase.get(path.posix.basename(target)) || null);
  return { names, resolve, resolves: (target) => Boolean(resolve(target)) };
}

// Pages wiki/index.md never links to, by [[link]] or a markdown link to the .md file. Entries that
// point at no page are already reported as broken [[links]]. Idea from llm-wiki-manager (MIT),
// scripts/lint_wiki.py check_index_drift.
const NOT_INDEXED = new Set(['index', 'log', 'handoff']);
function unindexedPages(root, pages) {
  let text;
  try { text = fs.readFileSync(path.join(root, 'wiki', 'index.md'), 'utf8'); } catch (_) { return []; }
  const listed = new Set(parseWikiLinks(text).map(pages.resolve));
  for (const [, href] of text.matchAll(/\]\(\.?\/?([^)#\s]+)\.md(?:#[^)]*)?\)/g)) listed.add(pages.resolve(href));
  return pages.names.filter((n) => !NOT_INDEXED.has(n) && !listed.has(n))
    .map((n) => `wiki/index.md  wiki/${n}.md is not listed in the index`);
}

// Content hash of a source file, as written next to it in `sources:` ("src/a.js#1a2b3c4d5e6f").
// Line endings normalised so a CRLF checkout does not look like an edit. It catches edits git has
// not seen yet; idea from freelance (MIT), src/sources.ts, and llm-wiki-compiler (MIT), hasher.ts.
function sourceHash(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  return require('crypto').createHash('sha256').update(text).digest('hex').slice(0, 12);
}

// tails: names equal after case, "-", "_" and a trailing "s" only. A prefix pair (eori /
// eori-number) is often a real duplicate too, but also a real sub-topic; /tails-wiki-ingest
// searches before creating a page for that case.
function duplicatePages(names) {
  const groups = new Map();
  for (const n of names) {
    const key = path.posix.basename(n).toLowerCase().replace(/[-_\s]+/g, '').replace(/s$/, '');
    groups.set(key, [...(groups.get(key) || []), n]);
  }
  return [...groups.values()].filter((g) => g.length > 1)
    .map((g) => `wiki/  possible duplicate pages: ${g.map((n) => `wiki/${n}.md`).join(', ')} (merge, or rename so [[links]] are not ambiguous)`);
}

// Frontmatter `updated: YYYY-MM-DD` and `sources:` as an inline [a, b] list or "- a" lines.
function frontmatter(text) {
  const fm = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return {};
  const updated = (fm[1].match(/^updated:\s*["']?(\d{4}-\d{2}-\d{2})/m) || [])[1];
  const inline = fm[1].match(/^sources:[ \t]*\[([^\]]*)\]/m);
  const block = fm[1].match(/^sources:[ \t]*\r?\n((?:[ \t]*-[ \t]+.+(?:\r?\n|$))+)/m);
  const raw = inline ? inline[1].split(',') : block ? block[1].split(/\r?\n/).map((l) => l.replace(/^\s*-\s+/, '')) : [];
  return {
    updated,
    sources: raw.map((s) => s.trim().replace(/^["']|["']$/g, '').replace(/:L?\d+(?:-L?\d+)?$/, '')).filter(Boolean),
  };
}

// Date (YYYY-MM-DD) of the last commit touching a path; null outside git or for untracked paths.
// tails: one git call per source; a single `git log --name-only` pass if wikis grow to hundreds of pages.
function lastCommitDate(root, file) {
  const r = spawnSync('git', ['log', '-1', '--format=%cI', '--', file], { cwd: root, encoding: 'utf8' });
  return r.status === 0 && /^\d{4}-\d{2}-\d{2}/.test(r.stdout) ? r.stdout.slice(0, 10) : null;
}

function staleSources(root, file) {
  const { updated, sources = [] } = frontmatter(fs.readFileSync(path.join(root, file), 'utf8'));
  const findings = [];
  let missing = 0;
  for (const entry of sources) {
    const [src, hash] = entry.split('#');
    if (!fs.existsSync(path.join(root, src))) {
      missing++;
      if (src.includes('/') || HAS_EXT.test(src)) findings.push(`${file}  source \`${src}\` not found`);
      continue;
    }
    if (hash) { // exact: the content the page was written from
      const now = sourceHash(path.join(root, src));
      if (now !== hash) findings.push(`${file}  source \`${src}\` changed since the page was written (hash ${hash} -> ${now})`);
      continue;
    }
    const changed = updated && lastCommitDate(root, src);
    if (changed && changed > updated) {
      findings.push(`${file}  source \`${src}\` changed ${changed}, after updated: ${updated} (re-check the page, then bump updated:)`);
    }
  }
  if (sources.length && missing === sources.length) findings.push(`${file}  orphaned: none of its sources exist (merge, re-source or delete it)`);
  return findings;
}

function lintFile(root, file, scripts, pages) {
  const findings = [];
  const exists = (p) => [root, path.join(root, path.dirname(file))].some((base) => fs.existsSync(path.join(base, p)));
  const lines = fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/);
  let fenced = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (fenced || line.includes('tails-lint: ignore')) return;
    const at = `${file}:${i + 1}`;

    for (const [, span] of line.matchAll(/`([^`\s]+)`/g)) {
      const m = span.match(/^(.+?)(?::L?(\d+)(?:-L?\d+)?)?[.,;:)]*$/);
      const ref = m[1];
      if (!PATHLIKE.test(ref) || CONDITIONAL.has(ref) || /^https?:/.test(ref)) continue;
      if (!ref.includes('/') && !HAS_EXT.test(ref)) continue;
      if (!exists(ref)) {
        // Bare file names (`config.json`) are often generic; only flag ones that look like a project path.
        if (ref.includes('/')) findings.push(`${at}  \`${ref}\` not found`);
        continue;
      }
      if (m[2]) {
        const full = [path.join(root, ref), path.join(root, path.dirname(file), ref)].find((p) => fs.existsSync(p));
        try {
          const count = fs.readFileSync(full, 'utf8').split('\n').length;
          if (Number(m[2]) > count) findings.push(`${at}  \`${span}\` points past the end (${ref} has ${count} lines)`);
        } catch (_) {}
      }
    }

    if (scripts) {
      for (const [, name] of line.matchAll(/\bnpm run ([\w:.-]+)/g)) {
        if (!(name in scripts)) findings.push(`${at}  \`npm run ${name}\`: no such script in package.json`);
      }
    }

    if (pages && file.startsWith('wiki/')) {
      for (const target of parseWikiLinks(line)) {
        if (!pages.resolves(target)) findings.push(`${at}  [[${target}]]: no such wiki page`);
      }
    }
  });
  return findings;
}

function lint(root = process.cwd()) {
  let scripts = null;
  try { scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts || {}; } catch (_) {}
  const files = contextFiles(root);
  const pages = wikiPages(root);
  const findings = files.flatMap((f) => lintFile(root, f, scripts, pages));
  for (const f of files.filter((f) => f.startsWith('wiki/'))) findings.push(...staleSources(root, f));
  findings.push(...duplicatePages(pages.names), ...unindexedPages(root, pages));
  return { files, findings };
}

if (require.main === module && process.argv[2] === '--hash') {
  // `sources:` entries with content hashes, for /tails-wiki-ingest to paste into a page
  for (const f of process.argv.slice(3)) console.log(`${f.replace(/\\/g, '/')}#${sourceHash(f)}`);
} else if (require.main === module) {
  const { files, findings } = lint(path.resolve(process.argv[2] || process.cwd()));
  if (!files.length) {
    console.log('No context files found (AGENTS.md, CLAUDE.md, rule files, wiki/).');
  } else if (findings.length) {
    console.log(`Stale references in context files (${findings.length}):\n${findings.join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log(`Context files clean: ${files.length} checked.`);
  }
}

module.exports = { frontmatter, lint };
