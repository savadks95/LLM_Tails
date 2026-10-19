# LLM_Tails Empirical Benchmarks

This directory contains the automated benchmark suite evaluating the tangible impact of **LLM_Tails** compared to unconstrained baseline AI agents.

## Purpose

The benchmark measures three critical dimensions of software development:
1. **Code Bloat & Compactness (LOC):** Measures non-blank, non-comment lines of code required to achieve the task.
2. **Functional Correctness:** Runs each LLM_Tails sample in a VM sandbox against real behavior checks (debounce timing, CSV totals, rate-limit window, retry on a mocked flaky `fetch`), so minimal code only passes if it actually works.
3. **Four-Pillar Compliance:**
   - **Pillar 1 (Architecture Awareness):** Verifies that the solution cites callers, callees, or project wiki context.
   - **Pillar 2 (Minimal Correct Code / YAGNI):** Flags unrequested abstractions, factory patterns, or unnecessary dependencies.
   - **Pillar 3 (Epistemic Honesty):** Validates the presence of `[verified]`, `[likely]`, or `[uncertain]` markers and verifies that APIs are not invented.
   - **Pillar 4 (Consistency & Output Discipline):** Verifies code-first delivery and a concise (≤ 3 line) post-code explanation format.

---

## Benchmark Results

> These numbers score **hand-written** baseline and LLM_Tails sample outputs, not live agent runs. They illustrate the target behaviour and test the evaluator; for real overhead in your project use `/tails-stats`.

Evaluated across four canonical tasks (debouncing, token-bucket/window rate limiting, CSV aggregation, and resilient HTTP client with exponential backoff):

| Task | Baseline LOC | LLM_Tails LOC | Code Reduction (Δ) | Correctness Gate | Four-Pillar Compliance |
|------|-------------|---------------|-------------------|-------------------|------------------------|
| **`debounce`** | 27 | 9 | **-66.7%** | PASS | 75% vs 50% |
| **`rateLimit`** | 22 | 7 | **-68.2%** | PASS | 100% vs 50% |
| **`csvSum`** | 24 | 6 | **-75.0%** | PASS | 100% vs 50% |
| **`apiClient`** | 21 | 10 | **-52.4%** | PASS | 100% vs 50% |
| **TOTAL** | **94** | **32** | **-66.0%** | **100% PASS** | **94% vs 50%** |

### Key Takeaways
- **66% Code Reduction:** Following the laziness ladder (YAGNI → stdlib → native), the LLM_Tails samples drop the boilerplate classes and wrapper layers typical of unconstrained agent output.
- **No Unrequested Abstractions:** The baseline samples model the managers and factory classes agents commonly add (`DebounceManager`, `TokenBucketRateLimiter`, `HttpClientService`); the LLM_Tails samples stay with minimal native implementations.
- **100% Functional Correctness:** Every LLM_Tails sample passes its real-execution gate; `tests/benchmark.test.js` proves the gates reject broken code.

---

## Running the Benchmark

Run the suite locally with zero external dependencies:

```bash
node benchmarks/run.js
```

### Live-model run

`benchmarks/live/` sends the same four tasks to a real model through [promptfoo](https://github.com/promptfoo/promptfoo), once with no rules (`prompts/baseline.js`) and once with `AGENTS.md` as the system prompt (`prompts/tails.js`). `assert.js` reuses the checks above: correctness is the pass/fail gate; four-pillar compliance and code size are reported as scores. Needs `ANTHROPIC_API_KEY`:

```bash
npm run bench:live        # npx promptfoo eval -c benchmarks/live/promptfooconfig.yaml
npx promptfoo view        # side-by-side results in the browser
```

### Files
- [`loc.js`](loc.js): LOC measurement and code block extraction.
- [`correctness.js`](correctness.js): Real-execution correctness gates (VM sandbox).
- [`pillars.js`](pillars.js): Automated four-pillar evaluator.
- [`run.js`](run.js): Benchmark harness and scoreboard formatter.
