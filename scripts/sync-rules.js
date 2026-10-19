#!/usr/bin/env node
// LLM_Tails — generate every per-agent rule file from two sources, so they cannot drift:
//   AGENTS.md          full rules  → .agents/rules/llm-tails.md (Antigravity)
//   rules/compact.md   short rules → Windsurf, Cline, Copilot, Cursor, Kiro, Qoder
// Idea from ruler / rulesync (both MIT): one source of truth, rendered per agent.
//
// Usage: node scripts/sync-rules.js           write the files
//        node scripts/sync-rules.js --check   exit 1 and list files that drifted

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');

function targets() {
  const full = read('AGENTS.md').replace(/\n\(Yes, this file applies[^\n]*\)\s*$/, '').trim() + '\n';
  const compact = read('rules/compact.md').trim() + '\n';
  const title = compact.match(/^# (.+)$/m)[1];
  return {
    '.agents/rules/llm-tails.md': full,
    '.windsurf/rules/llm-tails.md': compact,
    '.clinerules/llm-tails.md': compact,
    '.github/copilot-instructions.md': compact,
    '.qoder/rules/llm-tails.md': compact,
    '.cursor/rules/llm-tails.mdc': '---\nalwaysApply: true\n---\n\n' + compact,
    '.kiro/steering/llm-tails.md': `---\ntitle: ${title}\ninclusion: always\n---\n\n` + compact,
  };
}

function drifted() {
  return Object.entries(targets()).filter(([file, text]) => {
    try { return read(file) !== text; } catch (_) { return true; }
  }).map(([file]) => file);
}

if (require.main === module) {
  if (process.argv.includes('--check')) {
    const files = drifted();
    if (files.length) {
      console.log(`Rule files out of sync (run: node scripts/sync-rules.js):\n- ${files.join('\n- ')}`);
      process.exitCode = 1;
    } else {
      console.log('Rule files in sync.');
    }
  } else {
    for (const [file, text] of Object.entries(targets())) {
      fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
      fs.writeFileSync(path.join(ROOT, file), text, 'utf8');
    }
    console.log(`Wrote ${Object.keys(targets()).length} rule files.`);
  }
}

module.exports = { drifted, targets };
