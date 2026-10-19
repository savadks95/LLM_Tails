#!/usr/bin/env node
// LLM_Tails — context lint: find stale references in the files agents read as truth
// (AGENTS.md, CLAUDE.md, agent rule files, wiki/). Idea from agentlint (MIT): context files
// are written once and rot as the code moves. Mechanical checks only, zero dependencies:
//   - `path/in/backticks` that no longer exists
//   - `file.js:L120` pointing past the end of the file
//   - `npm run <script>` that package.json does not define
// A line containing "tails-lint: ignore" is skipped. Exit code 1 when anything is found.
//
// Usage: node scripts/context-lint.js [project-dir]

const fs = require('fs');
const path = require('path');

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

function lintFile(root, file, scripts) {
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
  });
  return findings;
}

function lint(root = process.cwd()) {
  let scripts = null;
  try { scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts || {}; } catch (_) {}
  const files = contextFiles(root);
  return { files, findings: files.flatMap((f) => lintFile(root, f, scripts)) };
}

if (require.main === module) {
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

module.exports = { lint };
