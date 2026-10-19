#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// Isolated state: never touch the real ~/.claude or ~/.claude.json while testing
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tails-companions-test-'));
const project = path.join(tmp, 'project');
const claude = path.join(tmp, 'claude');
fs.mkdirSync(path.join(project, 'wiki'), { recursive: true });
fs.mkdirSync(claude);
process.env.CLAUDE_CONFIG_DIR = claude;
process.env.CLAUDE_PROJECT_DIR = project;
delete process.env.LLM_TAILS_DEFAULT_MODE;
delete process.env.TAILS_MEMORY;
delete process.env.TAILS_HANDOFF;

const HOOKS = path.join(__dirname, '..', 'hooks');
const { companionNotes, detectCompanions } = require('../hooks/tails-companions');
const { readHandoff } = require('../hooks/tails-handoff');
const { CONTEXT_LIMIT } = require('../hooks/tails-activate');

function runHook(file, input, env = {}) {
  const res = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(path.join(HOOKS, file))})`], {
    input: JSON.stringify(input), encoding: 'utf8', cwd: project, env: { ...process.env, ...env },
  });
  assert.strictEqual(res.status, 0, res.stderr);
  return res.stdout ? JSON.parse(res.stdout).hookSpecificOutput.additionalContext : '';
}
const write = (file, data) => fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));

try {
  // 1. Nothing configured: no companions, no notes
  assert.deepStrictEqual(detectCompanions(project), []);
  assert.strictEqual(companionNotes([]), '');

  // 2. A disabled plugin is not a companion; an enabled one, a project MCP server, or a hook command is
  write(path.join(claude, 'settings.json'), { enabledPlugins: { 'context-mode@context-mode': false } });
  assert.deepStrictEqual(detectCompanions(project), []);
  write(path.join(claude, 'settings.json'), { enabledPlugins: { 'context-mode@context-mode': true } });
  assert.deepStrictEqual(detectCompanions(project), ['context-mode']);
  write(path.join(project, '.mcp.json'), { mcpServers: { memory: { command: 'ai-memory', args: ['mcp-bridge'] } } });
  assert.deepStrictEqual(detectCompanions(project), ['context-mode', 'ai-memory']);
  fs.unlinkSync(path.join(project, '.mcp.json'));
  write(path.join(claude, '.claude.json'), { projects: { [project.replace(/\\/g, '/')]: { mcpServers: { 'ai-memory': { command: 'x' } } } } });
  assert.deepStrictEqual(detectCompanions(project), ['context-mode', 'ai-memory'], 'per-project servers in ~/.claude.json');
  write(path.join(claude, '.claude.json'), { projects: { '/some/other/project': { mcpServers: { 'ai-memory': {} } } } });
  assert.deepStrictEqual(detectCompanions(project), ['context-mode'], "another project's servers don't count");
  write(path.join(project, '.mcp.json'), '{ not json');
  assert.deepStrictEqual(detectCompanions(project), ['context-mode'], 'unreadable config fails open');

  // 3. With context-mode: the note is injected and LLM_Tails memory is not restored twice after compaction
  const id = 'sess-c';
  runHook('tails-activate.js', { session_id: id, source: 'startup' });
  runHook('tails-mode-tracker.js', { session_id: id, prompt: "No, don't use Redis" });
  const compacted = runHook('tails-activate.js', { session_id: id, source: 'compact' });
  assert.ok(compacted.includes('LLM_TAILS COMPANIONS') && compacted.includes('ctx_execute'));
  assert.ok(!compacted.includes('SESSION MEMORY'), 'context-mode restores session state itself');
  const both = runHook('tails-activate.js', { session_id: id, source: 'compact' }, { TAILS_MEMORY: '1' });
  assert.ok(both.includes("don't use Redis"), 'TAILS_MEMORY=1 keeps LLM_Tails memory as well');
  write(path.join(claude, 'settings.json'), {});

  // 4. Handoff: injected at a fresh start, closed by "Status: done", skipped after compaction
  const handoffFile = path.join(project, 'wiki', 'handoff.md');
  const today = new Date().toISOString().slice(0, 10);
  write(handoffFile, `# Handoff\nUpdated: ${today} by Codex\nStatus: open\n## Next step\nWire the limiter into src/login.js\n## Don't retry\nRedis: single instance, user rejected it\n`);
  const fresh = runHook('tails-activate.js', { session_id: 'sess-h', source: 'startup' });
  assert.ok(fresh.includes('LLM_TAILS HANDOFF') && fresh.includes('written today'));
  assert.ok(fresh.includes('Wire the limiter') && fresh.includes('Redis: single instance'));
  assert.ok(fresh.length <= CONTEXT_LIMIT, `SessionStart context ${fresh.length} exceeds ${CONTEXT_LIMIT}`);
  assert.ok(!runHook('tails-activate.js', { session_id: 'sess-h', source: 'compact' }).includes('HANDOFF'));
  assert.strictEqual(readHandoff(project, 1500, Date.now()).includes('old:'), false);
  assert.ok(readHandoff(project, 1500, Date.now() + 30 * 86400000).includes('old:'), 'A month-old handoff is flagged');
  fs.appendFileSync(handoffFile, '## Open questions\n' + '- keep the limit per IP or per account?\n'.repeat(60));
  const clipped = readHandoff(project, 600);
  assert.ok(clipped.length <= 600 && clipped.includes('[truncated: read wiki/handoff.md]'), 'Budget respected');
  assert.strictEqual(readHandoff(project, 50), '', 'No room: inject nothing rather than a stub');
  process.env.TAILS_HANDOFF = '0';
  assert.strictEqual(readHandoff(project), '', 'TAILS_HANDOFF=0 disables it');
  delete process.env.TAILS_HANDOFF;
  write(handoffFile, `# Handoff\nUpdated: ${today}\nStatus: done\nLimiter shipped.\n`);
  assert.strictEqual(readHandoff(project), '', 'A done handoff is not injected');
  assert.ok(!runHook('tails-activate.js', { session_id: 'sess-h2', source: 'startup' }).includes('HANDOFF'));

  console.log('✓ tests/companions.test.js passed');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
