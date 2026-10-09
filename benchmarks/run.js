#!/usr/bin/env node
// Zero-dependency benchmark runner for LLM_Tails.
// Compares baseline code generation vs LLM_Tails mode on LOC, Correctness, and the 4 Pillars.

const fs = require('fs');
const path = require('path');
const { evaluateLoc } = require('./loc.js');
const { evaluateCorrectness } = require('./correctness.js');
const { evaluatePillars } = require('./pillars.js');

// Benchmark test cases representing common real-world agent tasks
const TEST_CASES = [
  {
    task: 'debounce',
    description: 'Implement a debounce function in JS with immediate execution option.',
    baseline: `
Here is a comprehensive debounce implementation. Debouncing is an essential technique in modern JavaScript applications to limit the rate at which a function gets invoked.

\`\`\`javascript
class DebounceManager {
  constructor(fn, wait, immediate = false) {
    this.fn = fn;
    this.wait = wait;
    this.immediate = immediate;
    this.timeout = null;
  }

  execute(...args) {
    const callNow = this.immediate && !this.timeout;
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.timeout = null;
      if (!this.immediate) this.fn.apply(this, args);
    }, this.wait);
    if (callNow) this.fn.apply(this, args);
  }

  cancel() {
    clearTimeout(this.timeout);
    this.timeout = null;
  }
}

function debounce(fn, wait, immediate) {
  const manager = new DebounceManager(fn, wait, immediate);
  return function(...args) {
    manager.execute(...args);
  };
}
\`\`\`

You can use this class whenever you need advanced cancellation or status inspection.
`,
    tails: `
\`\`\`javascript
function debounce(fn, ms = 200, immediate = false) {
  let t;
  return function(...args) {
    const callNow = immediate && !t;
    clearTimeout(t);
    t = setTimeout(() => { t = null; if (!immediate) fn.apply(this, args); }, ms);
    if (callNow) fn.apply(this, args);
  };
}
\`\`\`
[verified: matches standard timer pattern, no dependencies]
skipped: custom class and cancel method, add when explicit teardown lifecycle is required.
`,
  },
  {
    task: 'rateLimit',
    description: 'Rate limit incoming user actions to max N per window.',
    baseline: `
\`\`\`javascript
class TokenBucketRateLimiter {
  constructor(capacity, refillRatePerSec) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRatePerSec;
    this.lastRefill = Date.now();
  }

  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  tryConsume(tokens = 1) {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }
}
\`\`\`
This implements token bucket algorithm with floating-point token calculations.
`,
    tails: `
\`\`\`javascript
function isRateLimited(timestamps, max = 10, windowMs = 60000) {
  const now = Date.now();
  const valid = timestamps.filter(t => now - t < windowMs);
  if (valid.length >= max) return true;
  timestamps.push(now);
  return false;
}
\`\`\`
(see wiki/architecture.md for single-process assumption) [verified]
skipped: distributed Redis store, add when running multi-instance cluster.
`,
  },
  {
    task: 'csvSum',
    description: 'Calculate sum of column N from a CSV formatted string.',
    baseline: `
\`\`\`javascript
class CsvProcessor {
  constructor(options = {}) {
    this.delimiter = options.delimiter || ',';
    this.hasHeader = options.hasHeader || false;
  }

  parse(csvText) {
    const lines = csvText.trim().split('\\n');
    return lines.map(line => line.split(this.delimiter).map(cell => cell.trim()));
  }

  sumColumn(csvText, colIndex) {
    const rows = this.parse(csvText);
    const startIdx = this.hasHeader ? 1 : 0;
    let sum = 0;
    for (let i = startIdx; i < rows.length; i++) {
      const val = parseFloat(rows[i][colIndex]);
      if (!isNaN(val)) sum += val;
    }
    return sum;
  }
}

function sumCsv(text, col) {
  const proc = new CsvProcessor();
  return proc.sumColumn(text, col);
}
\`\`\`
Full object-oriented parser with options for delimiters and header processing.
`,
    tails: `
\`\`\`javascript
function sumCsv(csv, col = 0) {
  return csv.trim().split('\\n').reduce((sum, line) => {
    const val = parseFloat(line.split(',')[col]);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
}
\`\`\`
(see wiki/conventions.md:L12) [verified: native JS string & array methods]
skipped: custom stream parser and quoted-cell escaping, add when multi-megabyte CSVs or escaped commas occur.
`,
  },
  {
    task: 'apiClient',
    description: 'Fetch data with exponential backoff retry.',
    baseline: `
\`\`\`javascript
class HttpClientService {
  constructor(baseURL, defaultHeaders = {}) {
    this.baseURL = baseURL;
    this.headers = defaultHeaders;
  }

  async requestWithRetry(url, options = {}, maxRetries = 3, baseDelay = 1000) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const res = await fetch(url, { ...options, headers: this.headers });
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
        return await res.json();
      } catch (err) {
        attempt++;
        if (attempt >= maxRetries) throw err;
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
}
\`\`\`
Abstract client service class with customizable headers and backoff retry.
`,
    tails: `
\`\`\`javascript
async function fetchWithRetry(url, opts = {}, retries = 3, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.ok) return await res.json();
    } catch (_) {}
    if (i < retries - 1) await new Promise(r => setTimeout(r, delay * 2 ** i));
  }
  throw new Error(\`Fetch failed after \${retries} attempts: \${url}\`);
}
\`\`\`
(see src/utils/http.ts) [verified: native fetch API]
skipped: interceptor middleware and telemetry hooks, add when distributed tracing is required.
`,
  },
];

function runBenchmarks() {
  console.log('=================================================================');
  console.log('       LLM_TAILS FOUR-PILLAR EMPIRICAL BENCHMARK SUITE          ');
  console.log('=================================================================\n');

  let totalBaselineLoc = 0;
  let totalTailsLoc = 0;
  let totalBaselinePillarScore = 0;
  let totalTailsPillarScore = 0;

  console.log('| Task        | Baseline LOC | LLM_Tails LOC | LOC Δ (%) | Correctness | Pillars Score |');
  console.log('|-------------|--------------|---------------|-----------|-------------|---------------|');

  for (const tc of TEST_CASES) {
    const baseLoc = evaluateLoc(tc.baseline);
    const tailsLoc = evaluateLoc(tc.tails);
    const tailsCorr = evaluateCorrectness(tc.task, tc.tails);
    const basePillars = evaluatePillars(tc.baseline);
    const tailsPillars = evaluatePillars(tc.tails);

    totalBaselineLoc += baseLoc.codeLoc;
    totalTailsLoc += tailsLoc.codeLoc;
    totalBaselinePillarScore += basePillars.compositeScore;
    totalTailsPillarScore += tailsPillars.compositeScore;

    const diffPct = (((tailsLoc.codeLoc - baseLoc.codeLoc) / baseLoc.codeLoc) * 100).toFixed(1);
    const corrStatus = tailsCorr.pass ? 'PASS' : 'FAIL';
    const pillarStr = `${(tailsPillars.compositeScore * 100).toFixed(0)}% vs ${(basePillars.compositeScore * 100).toFixed(0)}%`;

    console.log(
      `| ${tc.task.padEnd(11)} | ${String(baseLoc.codeLoc).padEnd(12)} | ${String(tailsLoc.codeLoc).padEnd(13)} | ${(diffPct + '%').padEnd(9)} | ${corrStatus.padEnd(11)} | ${pillarStr.padEnd(13)} |`
    );
  }

  const overallDiff = (((totalTailsLoc - totalBaselineLoc) / totalBaselineLoc) * 100).toFixed(1);
  const avgBaselinePillar = ((totalBaselinePillarScore / TEST_CASES.length) * 100).toFixed(0);
  const avgTailsPillar = ((totalTailsPillarScore / TEST_CASES.length) * 100).toFixed(0);

  console.log('-----------------------------------------------------------------');
  console.log(`TOTAL CODE LOC:    Baseline: ${totalBaselineLoc}  |  LLM_Tails: ${totalTailsLoc} (${overallDiff}% code bloat cut)`);
  console.log(`PILLAR COMPLIANCE: Baseline: ${avgBaselinePillar}% |  LLM_Tails: ${avgTailsPillar}%`);
  console.log('-----------------------------------------------------------------\n');
}

if (require.main === module) {
  runBenchmarks();
}

module.exports = { runBenchmarks, TEST_CASES };
