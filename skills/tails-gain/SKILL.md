---
name: tails-gain
description: >
  Display the empirical impact scoreboard of LLM_Tails: code bloat reduction,
  correctness pass rates, hallucination prevention, and four-pillar compliance.
  Use when the user asks "show gains", "/tails-gain", "what are the benchmarks",
  "is tails saving code", or asks for proof of LLM_Tails efficiency.
argument-hint: ""
license: MIT
---

# Tails Gain (Impact Scoreboard)

Report the benchmark scoreboard of LLM_Tails across lines of code, functional
correctness, and the four pillars. Always state that it scores hand-written
baseline and LLM_Tails samples, not live agent runs; point to `/tails-stats`
for real overhead in this project.

## Scoreboard

```
=================================================================
       LLM_TAILS FOUR-PILLAR BENCHMARK (hand-written samples)
=================================================================

Metric                   Baseline sample    LLM_Tails sample
-----------------------------------------------------------------
Code Size (LOC)          94 loc             32 loc   (-66%)
Unrequested Classes      4 classes          0 classes
Functional Correctness   (not executed)     4/4 pass (real execution in VM)
Four-Pillar Compliance   50%                94%
-----------------------------------------------------------------
```

## Highlights

1. **Pillar 1 (Understand First):** LLM_Tails samples cite existing project paths or wiki entities before modifying code.
2. **Pillar 2 (Minimal Correct Code):** Shorter working diffs; no unrequested manager classes or premature abstractions.
3. **Pillar 3 (Never Hallucinate):** `[verified]` citations and no invented library calls in the samples.
4. **Pillar 4 (Enforce Consistency):** Matches prevailing idioms, keeps output code-first, and avoids conversational fluff.

## Run Benchmarks Locally

To verify or run the benchmark suite against new test cases:

```bash
node benchmarks/run.js
```

## Boundaries

- Read-only report. Changes nothing. One-shot.
- "stop tails-gain": cancel.
