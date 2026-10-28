#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// Isolated state: never touch the real ~/.claude while testing
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tails-session-test-'));
const project = path.join(tmp, 'project');
fs.mkdirSync(project);
process.env.CLAUDE_CONFIG_DIR = path.join(tmp, 'claude');
process.env.CLAUDE_PROJECT_DIR = project;
delete process.env.LLM_TAILS_DEFAULT_MODE;

const HOOKS = path.join(__dirname, '..', 'hooks');
const session = require('../hooks/tails-session');
const { guard } = require('../hooks/tails-read-guard');
const { CONTEXT_LIMIT } = require('../hooks/tails-activate');

// Run a hook the way the plugin does: `node -e "require(<hook>)"` with JSON on stdin (a string is sent as is)
function runHook(file, input, env = {}) {
  const res = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(path.join(HOOKS, file))})`], {
    input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8', cwd: project,
    env: { ...process.env, ...env },
  });
  assert.strictEqual(res.status, 0, res.stderr);
  return res.stdout;
}

try {
  // 1. Secrets are masked before anything is stored
  assert.ok(!session.redact('key sk-abcdefghijklmnopqrstuv').includes('abcdefghij'));
  assert.ok(!session.redact('password: hunter2').includes('hunter2'));
  assert.ok(!session.redact('Authorization: Bearer abc.def.ghi123').includes('abc.def'));
  assert.ok(!session.redact('https://bob:s3cret@example.com').includes('s3cret'));
  assert.strictEqual(session.redact('rename tokenize() helper'), 'rename tokenize() helper');
  const pgp = '-----BEGIN PGP PRIVATE KEY BLOCK-----\nlQOYBGXsecret\n-----END PGP PRIVATE KEY BLOCK-----';
  assert.strictEqual(session.redact(`key: ${pgp} done`), 'key: [REDACTED KEY] done');
  for (const token of ['sk_live_' + 'a'.repeat(24), 'glpat-' + 'x'.repeat(20), 'npm_' + 'a'.repeat(36),
    'hf_' + 'a'.repeat(34), 'ASIA' + 'A'.repeat(16), 'gho_' + 'a'.repeat(36), 'dop_v1_' + 'a'.repeat(64),
    'eyJhbGciOiJIUzI1NiJ9xx.eyJzdWIiOiIxMjM0NTY3ODkwIn0.' + 's'.repeat(20)]) {
    assert.ok(!session.redact(`deploy with ${token} now`).includes(token), `gitleaks shape masked: ${token.slice(0, 8)}`);
  }

  // 2. Hooks record prompts, corrections, files, tasks and errors
  const id = 'sess-1';
  runHook('tails-mode-tracker.js', { session_id: id, prompt: 'Add rate limiting to the login route' });
  runHook('tails-mode-tracker.js', { session_id: id, prompt: "No, don't use Redis, keep it in memory" });
  runHook('tails-mode-tracker.js', { session_id: id, prompt: '/tails ultra' });
  runHook('tails-post-tool.js', { session_id: id, hook_event_name: 'PostToolUse', tool_name: 'Edit',
    tool_input: { file_path: path.join(project, 'src', 'login.js') } });
  runHook('tails-post-tool.js', { session_id: id, hook_event_name: 'PostToolUse', tool_name: 'TodoWrite',
    tool_input: { todos: [{ content: 'Write limiter', status: 'completed' }, { content: 'Add test', status: 'in_progress' }] } });
  runHook('tails-post-tool.js', { session_id: id, hook_event_name: 'PostToolUseFailure', tool_name: 'Bash',
    error: 'Exit code 1\ntoken=abc123secret npm test failed' });

  const summary = session.buildSessionSummary(id);
  assert.ok(summary.includes("don't use Redis"), 'Should keep the user correction');
  assert.ok(summary.includes('src/login.js'), 'Should list changed files relative to the project');
  assert.ok(summary.includes('[in_progress] Add test') && !summary.includes('Write limiter'), 'Only open tasks');
  assert.ok(summary.includes('npm test failed') && !summary.includes('abc123secret'), 'Errors kept, secrets masked');
  assert.ok(!summary.includes('/tails ultra'), 'Mode commands are not memory');
  const small = session.buildSessionSummary(id, undefined, 400);
  assert.ok(small.length <= 400, 'Budget respected');
  assert.ok(small.includes('Last request:'), 'Header and footer leave room for memory in a small budget');
  assert.ok(small.includes('user decisions still stand'), 'User corrections are framed as still in force');

  // 3. After compaction, SessionStart restores memory and stays under the host's context limit
  const restored = JSON.parse(runHook('tails-activate.js', { session_id: id, source: 'compact' }));
  const ctx = restored.hookSpecificOutput.additionalContext;
  assert.ok(ctx.includes('LLM_TAILS SESSION MEMORY') && ctx.includes("don't use Redis"));
  assert.ok(ctx.length <= CONTEXT_LIMIT, `SessionStart context ${ctx.length} exceeds ${CONTEXT_LIMIT}`);

  // 3b. /tails-end reads the same memory from the agent's shell (no hook env, project = cwd)
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  const printed = spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'memory.js')],
    { cwd: project, env, encoding: 'utf8' }).stdout;
  assert.ok(printed.includes("don't use Redis") && printed.includes('src/login.js'), 'memory.js prints session memory');
  if (process.platform === 'win32') {
    const { projectKey } = require('../hooks/tails-runtime');
    assert.strictEqual(projectKey('D:\\Work\\App'), projectKey('d:\\work\\app'), 'Windows keys ignore case');
  }

  // 4. A fresh session starts with clean memory
  const fresh = JSON.parse(runHook('tails-activate.js', { session_id: id, source: 'startup' }));
  assert.ok(!fresh.hookSpecificOutput.additionalContext.includes('SESSION MEMORY'));
  assert.deepStrictEqual(session.readEvents(id), []);

  // 5. Read guard: advise in full, deny in ultra, ranged reads untouched
  const big = path.join(tmp, 'big.log');
  fs.writeFileSync(big, 'x'.repeat(200 * 1024));
  assert.deepStrictEqual(guard({ tool_input: { file_path: big } }, 'full').deny, false);
  assert.strictEqual(guard({ tool_input: { file_path: big } }, 'ultra').deny, true);
  assert.strictEqual(guard({ tool_input: { file_path: big, limit: 100 } }, 'ultra'), null);
  assert.strictEqual(guard({ tool_input: { file_path: big } }, 'off'), null);
  const denied = JSON.parse(runHook('tails-read-guard.js', { tool_name: 'Read', tool_input: { file_path: big } },
    { LLM_TAILS_DEFAULT_MODE: 'ultra' }));
  assert.strictEqual(denied.hookSpecificOutput.permissionDecision, 'deny');

  // 6. "off" holds for the rest of the session (subagents, memory), and a new session resets it
  runHook('tails-mode-tracker.js', { session_id: id, prompt: 'stop tails' });
  assert.strictEqual(runHook('tails-subagent.js', {}), '', 'No rules for subagents while off');
  runHook('tails-mode-tracker.js', { session_id: id, prompt: 'add a cache' });
  assert.ok(!session.readEvents(id).some((e) => e.text === 'add a cache'), 'No memory while off');
  assert.strictEqual(runHook('tails-activate.js', { session_id: id, source: 'compact' }), '', 'Off survives compaction');
  const next = JSON.parse(runHook('tails-activate.js', { session_id: 'sess-2', source: 'startup' }));
  assert.ok(next.hookSpecificOutput.additionalContext.includes('LLM_TAILS MODE ACTIVE'), 'New session starts active');

  // 7. Subagents get the compact ruleset, well under the full skill
  const sub = JSON.parse(runHook('tails-subagent.js', {})).hookSpecificOutput.additionalContext;
  assert.ok(sub.includes('LLM_TAILS MODE ACTIVE') && sub.includes('Never hallucinate'));
  assert.ok(sub.length < fresh.hookSpecificOutput.additionalContext.length * 0.7, 'Subagent rules are compact');

  // 8. Hook input piped through PowerShell on Windows starts with a BOM, raw or as "ï»¿"
  const bomId = 'sess-bom';
  runHook('tails-mode-tracker.js', '﻿' + JSON.stringify({ session_id: bomId, prompt: 'Use pnpm, not npm' }));
  runHook('tails-post-tool.js', 'ï»¿' + JSON.stringify({ session_id: bomId,
    hook_event_name: 'PostToolUse', tool_name: 'Write', tool_input: { file_path: path.join(project, 'pnpm-workspace.yaml') } }));
  const bomEvents = session.readEvents(bomId);
  assert.ok(bomEvents.some((e) => e.type === 'prompt' && e.text === 'Use pnpm, not npm'), 'BOM prompt recorded');
  assert.ok(bomEvents.some((e) => e.type === 'file' && e.path === 'pnpm-workspace.yaml'), 'BOM tool event recorded');
  runHook('tails-mode-tracker.js', 'ï»¿' + JSON.stringify({ session_id: bomId, prompt: '/tails lite' }));
  assert.strictEqual(require('../hooks/tails-runtime').readMode(), 'lite', 'BOM /tails switch applied');

  // 9. Codex: PostToolUse sends apply_patch (paths in the patch, relative to the session cwd) and update_plan
  const codexHooks = require('../hooks/claude-codex-hooks.json').hooks.PostToolUse;
  assert.ok(codexHooks.some((g) => /apply_patch/.test(g.matcher) && /update_plan/.test(g.matcher)), 'Codex wires PostToolUse');
  const cx = 'sess-codex';
  runHook('tails-post-tool.js', { session_id: cx, hook_event_name: 'PostToolUse', tool_name: 'apply_patch', cwd: project,
    tool_input: { command: '*** Begin Patch\n*** Update File: src/a.js\n@@\n-x\n+y\n*** Add File: src/b.js\n+z\n' +
      '*** Delete File: old.js\n*** Update File: src/c.js\n*** Move to: src/d.js\n@@\n-q\n+r\n*** End Patch' } });
  runHook('tails-post-tool.js', { session_id: cx, hook_event_name: 'PostToolUse', tool_name: 'apply_patch',
    cwd: path.join(project, 'pkg'), tool_input: { command: '*** Begin Patch\n*** Update File: x.js\n*** End Patch' } });
  runHook('tails-post-tool.js', { session_id: cx, hook_event_name: 'PostToolUse', tool_name: 'update_plan',
    tool_input: { plan: [{ step: 'Parse patch', status: 'completed' }, { step: 'Write test', status: 'in_progress' }] } });
  const cxFiles = session.readEvents(cx).filter((e) => e.type === 'file').map((e) => e.path);
  assert.deepStrictEqual(cxFiles, ['src/a.js', 'src/b.js', 'old.js', 'src/c.js', 'src/d.js', 'pkg/x.js']);
  const cxSummary = session.buildSessionSummary(cx);
  assert.ok(cxSummary.includes('[in_progress] Write test') && !cxSummary.includes('Parse patch'), 'Codex plan = open tasks');

  // 10. Wiki recall: once per session, on the first prompt that names a topic
  fs.mkdirSync(path.join(project, 'wiki', 'entities'), { recursive: true });
  fs.writeFileSync(path.join(project, 'wiki', 'index.md'), '# Index\n- [[entities/auth]] rate limiting, login\n');
  fs.writeFileSync(path.join(project, 'wiki', 'entities', 'auth.md'),
    '# Auth\nSessions.\n## Rate limiting\nLogin attempts are limited in memory per IP (see src/limiter.js:L10).\n');
  fs.writeFileSync(path.join(project, 'wiki', 'entities', 'billing.md'), '# Billing\nInvoices go out monthly via Stripe.\n');
  const rc = 'sess-recall';
  assert.strictEqual(runHook('tails-mode-tracker.js', { session_id: rc, prompt: 'hi, please help' }), '', 'No topic, no recall');
  assert.strictEqual(runHook('tails-mode-tracker.js', { session_id: rc, prompt: '/tails-wiki-query login rate limiting' }), '',
    'Slash commands are not searched');
  const recalled = JSON.parse(runHook('tails-mode-tracker.js', { session_id: rc,
    prompt: 'Why is login rate limiting kept in memory?' })).hookSpecificOutput.additionalContext;
  assert.ok(recalled.includes('LLM_TAILS WIKI RECALL') && recalled.includes('wiki/entities/auth.md > Rate limiting'));
  assert.ok(!recalled.includes('billing') && !recalled.includes('wiki/index.md'), 'Only matching sections, never the index');
  assert.ok(recalled.length <= 1200, 'Recall budget respected');
  assert.strictEqual(runHook('tails-mode-tracker.js', { session_id: rc, prompt: 'And login rate limiting for the API?' }), '',
    'Recall runs once per session');
  assert.strictEqual(runHook('tails-mode-tracker.js', { session_id: 'sess-recall-off', prompt: 'login rate limiting' },
    { TAILS_RECALL: '0' }), '', 'TAILS_RECALL=0 disables it');

  console.log('✓ tests/session.test.js passed');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
