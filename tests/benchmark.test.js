#!/usr/bin/env node

const assert = require('assert');
const { evaluateCorrectness } = require('../benchmarks/correctness');
const { evaluatePillars } = require('../benchmarks/pillars');
const { TEST_CASES } = require('../benchmarks/run');

(async () => {
  // 1. Every shipped LLM_Tails sample passes its real-execution gate
  for (const tc of TEST_CASES) {
    const r = await evaluateCorrectness(tc.task, tc.tails);
    assert.ok(r.pass, `${tc.task}: ${r.reason}`);
  }

  // 2. Broken solutions fail: the gates check behavior, not keywords
  const wrap = (code) => '```js\n' + code + '\n```';
  const broken = {
    debounce: 'function debounce(fn) { return (...a) => fn(...a); }', // not debounced
    csvSum: 'function sumCsv() { return 0; }',
    rateLimit: 'function isRateLimited() { return false; } // window bucket count <',
    apiClient: 'async function fetchWithRetry(url) { const r = await fetch(url); return r.json(); } // retries',
  };
  for (const [task, code] of Object.entries(broken)) {
    assert.strictEqual((await evaluateCorrectness(task, wrap(code))).pass, false, `${task} gate must reject broken code`);
  }
  assert.strictEqual((await evaluateCorrectness('unknown', 'x')).pass, false, 'No runner = no free pass');

  // 3. Verbose output is scored, not crashed on
  const verbose = '```js\nx\n```\n' + 'Explanation line.\n'.repeat(6);
  assert.strictEqual(evaluatePillars(verbose).pillar4.pass, false);
  assert.ok(evaluatePillars(verbose).pillar4.detail.includes('6 non-code lines'));

  console.log('✓ tests/benchmark.test.js passed');
})().catch((e) => { console.error(e); process.exit(1); });
