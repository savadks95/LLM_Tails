#!/usr/bin/env node
// Context lint, guard patterns, and the ultra test check.

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tails-guards-test-'));
const project = path.join(tmp, 'project');
fs.mkdirSync(path.join(project, 'src'), { recursive: true });
fs.mkdirSync(path.join(project, 'wiki'));
process.env.CLAUDE_CONFIG_DIR = path.join(tmp, 'claude');
process.env.CLAUDE_PROJECT_DIR = project;
delete process.env.LLM_TAILS_DEFAULT_MODE;

const HOOKS = path.join(__dirname, '..', 'hooks');
const { lint } = require('../scripts/context-lint');
const { check } = require('../hooks/tails-guard');
const { verdict } = require('../hooks/tails-test-check');
const { recordEvent, recordPrompt } = require('../hooks/tails-session');

function runHook(file, input, env = {}) {
  const res = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(path.join(HOOKS, file))})`], {
    input: JSON.stringify(input), encoding: 'utf8', cwd: project, env: { ...process.env, ...env },
  });
  assert.strictEqual(res.status, 0, res.stderr);
  return res.stdout ? JSON.parse(res.stdout) : null;
}

try {
  // 1. Context lint: stale paths, line refs past the end, unknown npm scripts; clean refs pass
  fs.writeFileSync(path.join(project, 'src', 'auth.js'), 'a\nb\nc\n');
  fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify({ scripts: { test: 'node t.js' } }));
  fs.writeFileSync(path.join(project, 'AGENTS.md'), [
    'Auth lives in `src/auth.js:L2`. Read `wiki/index.md` if it exists.',
    'Sessions: `src/session.js`. Run `npm run test` and `npm run lint`.',
    'Old note: `src/auth.js:L99`.',
    'Example only: `src/example.ts` tails-lint: ignore',
    '```', 'see `src/in-fence.js`', '```',
  ].join('\n'));
  fs.writeFileSync(path.join(project, 'wiki', 'auth.md'), '# Auth\nSee `../src/auth.js` and `src/gone/`.\n');
  const { files, findings } = lint(project);
  assert.deepStrictEqual(files, ['AGENTS.md', 'wiki/auth.md']);
  const text = findings.join('\n');
  assert.ok(text.includes('AGENTS.md:2  `src/session.js` not found'), text);
  assert.ok(text.includes('`npm run lint`: no such script') && !text.includes('npm run test`'), text);
  assert.ok(text.includes('AGENTS.md:3  `src/auth.js:L99` points past the end'), text);
  assert.ok(text.includes('wiki/auth.md:2  `src/gone/` not found'), text);
  assert.ok(!/auth\.js:L2|wiki\/index|example|in-fence|\.\.\/src\/auth/.test(text), 'No false positives:\n' + text);
  assert.strictEqual(findings.length, 4, text);

  // 2. Guard patterns from AGENTS.md / CLAUDE.md: ask before a matching command or file edit
  fs.writeFileSync(path.join(project, 'CLAUDE.md'), [
    '<!-- tails-guard: /\\bredis\\b/i No Redis: single instance, keep rate limits in memory -->',
    '- tails-guard: /(^|\\/)migrations\\// Never edit applied migrations; add a new one',
    'tails-guard: /([/ Broken pattern is ignored',
  ].join('\n'));
  assert.match(check({ tool_input: { command: 'npm i Redis' } }, 'full', project), /CLAUDE\.md\): No Redis/);
  assert.match(check({ tool_input: { file_path: path.join(project, 'db', 'migrations', '001.sql') } }, 'full', project), /applied migrations/);
  assert.strictEqual(check({ tool_input: { command: 'npm test' } }, 'full', project), null);
  assert.strictEqual(check({ tool_input: { command: 'redis-cli' } }, 'off', project), null, 'Off means off');
  const asked = runHook('tails-guard.js', { tool_name: 'Bash', tool_input: { command: 'docker run redis' } });
  assert.strictEqual(asked.hookSpecificOutput.permissionDecision, 'ask');

  // 3. Ultra test check: source changed without a test → sent back once; tests or retry → allowed
  const id = 'sess-t';
  recordPrompt(id, 'add rate limiting');
  recordEvent(id, { type: 'file', path: 'src/limiter.js' });
  assert.strictEqual(verdict({ session_id: id }, 'full'), null, 'Only in ultra');
  assert.match(verdict({ session_id: id }, 'ultra'), /changed src\/limiter\.js but no test/);
  assert.strictEqual(verdict({ session_id: id, stop_hook_active: true }, 'ultra'), null, 'No loop on retry');
  const blocked = runHook('tails-test-check.js', { session_id: id }, { LLM_TAILS_DEFAULT_MODE: 'ultra' });
  assert.strictEqual(blocked.decision, 'block');
  recordEvent(id, { type: 'file', path: 'tests/limiter.test.js' });
  assert.strictEqual(verdict({ session_id: id }, 'ultra'), null, 'A test file satisfies it');
  recordPrompt(id, 'update the docs');
  recordEvent(id, { type: 'file', path: 'README.md' });
  assert.strictEqual(verdict({ session_id: id }, 'ultra'), null, 'Only source changes in this turn count');

  console.log('✓ tests/guards.test.js passed');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
