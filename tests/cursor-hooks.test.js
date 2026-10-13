#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { install, uninstall, isTailsHook } = require('../scripts/cursor-hooks');

// 1. isTailsHook matcher test
assert.strictEqual(isTailsHook({ command: 'node "/path/to/hooks/tails-activate.js"' }), true);
assert.strictEqual(isTailsHook({ command: 'node "/path/to/hooks/tails-mode-tracker.js"' }), true);
assert.strictEqual(isTailsHook({ command: 'node "hooks/other-plugin.js"' }), false);
assert.strictEqual(isTailsHook(null), false);

// 2. Safe JSON parsing & idempotence test
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-hooks-test-'));
const hooksFile = path.join(tmp, 'hooks.json');

try {
  // Simulate user hooks file with custom user hook
  const initial = {
    version: 1,
    hooks: {
      sessionStart: [
        { command: 'node my-custom-hook.js', timeout: 3 }
      ]
    }
  };
  fs.writeFileSync(hooksFile, JSON.stringify(initial, null, 2));

  // Verify non-tails hook isn't flagged
  const content = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));
  assert.strictEqual(content.hooks.sessionStart.filter(isTailsHook).length, 0);

  // 3. Real install/uninstall against <cwd>/.cursor/hooks.json (--project scope)
  const cwd = process.cwd();
  process.chdir(tmp);
  try {
    const target = path.join(tmp, '.cursor', 'hooks.json');
    fs.mkdirSync(path.dirname(target));
    fs.writeFileSync(target, JSON.stringify(initial, null, 2));

    install('project');
    install('project'); // idempotent: no duplicates
    let cfg = JSON.parse(fs.readFileSync(target, 'utf8'));
    assert.strictEqual(cfg.hooks.sessionStart.length, 2, 'User hook kept + one LLM_Tails hook');
    assert.strictEqual(cfg.hooks.beforeSubmitPrompt.filter(isTailsHook).length, 1);
    assert.ok(!JSON.stringify(cfg).includes('TAILS_DIR'), 'Placeholder replaced by the checkout path');

    uninstall('project');
    cfg = JSON.parse(fs.readFileSync(target, 'utf8'));
    assert.deepStrictEqual(cfg.hooks, initial.hooks, 'Only LLM_Tails entries removed');

    // Only LLM_Tails hooks in the file: uninstall removes the file
    fs.unlinkSync(target);
    install('project');
    uninstall('project');
    assert.ok(!fs.existsSync(target), 'File created by install is removed by uninstall');

    // Malformed file is refused, not overwritten
    fs.writeFileSync(target, '{ not json');
    assert.throws(() => install('project'));
    assert.strictEqual(fs.readFileSync(target, 'utf8'), '{ not json');
  } finally {
    process.chdir(cwd);
  }

  console.log('✓ tests/cursor-hooks.test.js passed');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
