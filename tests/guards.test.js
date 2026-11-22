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

  // 1b. Wiki checks: broken [[links]], near-duplicate page names, and a page older than a source's last commit
  const repo = path.join(tmp, 'repo');
  fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'wiki', 'entities'), { recursive: true });
  const git = (...args) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args],
    { cwd: repo, encoding: 'utf8', env: { ...process.env, GIT_COMMITTER_DATE: '2026-03-10T12:00:00Z', GIT_AUTHOR_DATE: '2026-03-10T12:00:00Z' } });
  fs.writeFileSync(path.join(repo, 'src', 'limiter.js'), 'module.exports = {};\n');
  fs.writeFileSync(path.join(repo, 'src', 'login.js'), 'module.exports = {};\n');
  fs.writeFileSync(path.join(repo, 'wiki', 'entities', 'rate-limit.md'),
    '---\nupdated: 2026-03-01\nsources: [src/limiter.js, src/gone.js]\n---\n# Rate limit\nSee [[login]] and [[entities/rate_limits]].\n```\n[[in-fence]]\n```\n');
  fs.writeFileSync(path.join(repo, 'wiki', 'entities', 'rate_limits.md'), '# Rate limits\nDuplicate of [[rate-limit]].\n');
  fs.writeFileSync(path.join(repo, 'wiki', 'login.md'),
    '---\nupdated: 2026-03-20\nsources:\n  - src/login.js\n---\n# Login\nUses [[nowhere]].\n');
  const hashOf = (f) => spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'context-lint.js'), '--hash', f],
    { cwd: repo, encoding: 'utf8' }).stdout.trim();
  fs.writeFileSync(path.join(repo, 'wiki', 'hashed.md'),
    `---\nsources: [${hashOf('src/limiter.js')}, src/login.js#000000000000]\n---\n# Hashed\n`);
  fs.writeFileSync(path.join(repo, 'wiki', 'orphan.md'), '---\nsources: [src/nope.js]\n---\n# Orphan\n');
  fs.writeFileSync(path.join(repo, 'wiki', 'index.md'), '# Index\n- [[login]]\n- [Hashed](hashed.md)\n- [[orphan]]\n');
  git('init', '-q'); git('add', '.'); git('commit', '-q', '-m', 'init');
  const wikiText = lint(repo).findings.join('\n');
  assert.ok(wikiText.includes('wiki/entities/rate-limit.md is not listed in the index') &&
    !/wiki\/(login|hashed|orphan|index)\.md is not listed/.test(wikiText), 'Index drift: only unlisted pages\n' + wikiText);
  assert.ok(wikiText.includes('wiki/hashed.md  source `src/login.js` changed since the page was written'), wikiText);
  assert.ok(!wikiText.includes('wiki/hashed.md  source `src/limiter.js`'), 'A matching hash is current, whatever git says:\n' + wikiText);
  assert.ok(wikiText.includes('wiki/orphan.md  orphaned: none of its sources exist'), wikiText);
  assert.ok(wikiText.includes('wiki/login.md:7  [[nowhere]]: no such wiki page'), wikiText);
  assert.ok(!/\[\[(login|entities\/rate_limits|rate-limit|in-fence)\]\]/.test(wikiText), 'Resolvable links and fenced links pass:\n' + wikiText);
  assert.ok(wikiText.includes('possible duplicate pages: wiki/entities/rate-limit.md, wiki/entities/rate_limits.md'), wikiText);
  if (git('log', '-1').status === 0) {
    assert.ok(wikiText.includes('source `src/limiter.js` changed 2026-03-10, after updated: 2026-03-01'), wikiText);
    assert.ok(!wikiText.includes('wiki/login.md  source'), 'A page updated after its source is current:\n' + wikiText);
  }
  assert.ok(wikiText.includes('source `src/gone.js` not found'), wikiText);

  // 1c. First edit of a file a wiki page lists in sources: points at that page, once per session
  const edit = { session_id: 'sess-ptr', hook_event_name: 'PostToolUse', tool_name: 'Edit',
    tool_input: { file_path: path.join(repo, 'src', 'login.js') } };
  const pointer = runHook('tails-post-tool.js', edit, { CLAUDE_PROJECT_DIR: repo });
  assert.ok(pointer && pointer.hookSpecificOutput.hookEventName === 'PostToolUse' &&
    pointer.hookSpecificOutput.additionalContext.includes('wiki/login.md'), JSON.stringify(pointer));
  assert.strictEqual(runHook('tails-post-tool.js', edit, { CLAUDE_PROJECT_DIR: repo }), null, 'Second edit: silent');
  assert.strictEqual(runHook('tails-post-tool.js', { ...edit, session_id: 'sess-ptr2',
    tool_input: { file_path: path.join(repo, 'README.md') } }, { CLAUDE_PROJECT_DIR: repo }), null, 'Uncited file: silent');

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
