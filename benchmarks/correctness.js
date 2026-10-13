// Correctness gate: runs each sample in a VM sandbox and checks real behavior, so a minimal
// solution only passes if it actually works. No keyword or "function exists" checks.

const vm = require('vm');
const { extractCodeBlocks } = require('./loc.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Top-level function declarations in the sample become properties of the sandbox.
function load(code, globals = {}) {
  const sandbox = { setTimeout, clearTimeout, Promise, Error, ...globals };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { timeout: 1000 });
  return sandbox;
}

function need(sandbox, name) {
  if (typeof sandbox[name] !== 'function') throw new Error(`function ${name}() not found`);
  return sandbox[name];
}

const TASKS = {
  async debounce(code) {
    const debounce = need(load(code), 'debounce');
    let count = 0;
    const d = debounce(() => { count++; }, 20);
    d(); d(); d();
    if (count !== 0) return { pass: false, reason: `fired ${count}x synchronously` };
    await sleep(60);
    return count === 1
      ? { pass: true, reason: '3 rapid calls -> 1 trailing call' }
      : { pass: false, reason: `expected 1 call after wait, got ${count}` };
  },

  async csvSum(code) {
    const total = need(load(code), 'sumCsv')('a,10\nb,20\nc,x\nd,30', 1);
    return total === 60
      ? { pass: true, reason: 'sums column, skips non-numeric' }
      : { pass: false, reason: `expected 60, got ${total}` };
  },

  async rateLimit(code) {
    const isRateLimited = need(load(code), 'isRateLimited');
    const ts = [];
    const got = [isRateLimited(ts, 2, 1000), isRateLimited(ts, 2, 1000), isRateLimited(ts, 2, 1000)];
    const old = [Date.now() - 5000, Date.now() - 5000];
    const expired = isRateLimited(old, 2, 1000);
    return JSON.stringify(got) === '[false,false,true]' && expired === false
      ? { pass: true, reason: 'limits the 3rd call in window, old calls expire' }
      : { pass: false, reason: `got ${JSON.stringify(got)}, expired window -> ${expired}` };
  },

  async apiClient(code) {
    let calls = 0;
    const flaky = async () => {
      calls++;
      if (calls < 3) throw new Error('network');
      return { ok: true, json: async () => ({ id: 1 }) };
    };
    const fetchWithRetry = need(load(code, { fetch: flaky }), 'fetchWithRetry');
    const data = await fetchWithRetry('/x', {}, 3, 1);
    if (!data || data.id !== 1) return { pass: false, reason: 'did not return data after retries' };

    const down = need(load(code, { fetch: async () => { throw new Error('down'); } }), 'fetchWithRetry');
    const failed = await down('/x', {}, 2, 1).then(() => false, () => true);
    return failed
      ? { pass: true, reason: 'retries transient failures, throws when exhausted' }
      : { pass: false, reason: 'resolved although every attempt failed' };
  },
};

async function evaluateCorrectness(taskName, output) {
  const code = extractCodeBlocks(output) || output;
  const runner = TASKS[taskName];
  if (!runner) return { pass: false, reason: `no correctness runner for '${taskName}'` };
  try {
    return await runner(code);
  } catch (e) {
    return { pass: false, reason: e.message };
  }
}

module.exports = { evaluateCorrectness, TASKS };
