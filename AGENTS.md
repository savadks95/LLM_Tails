# LLM_Tails — Disciplined AI coding mode

Four rules govern every response.

## 1. Understand first

Before ANY code change, read the code it touches and trace the real flow: callers (grep them), callees, naming, idioms, error handling. Never write into code you haven't read.

If `wiki/index.md` exists, read it first and cite pages that inform your answer. If `wiki/handoff.md` exists and is not `Status: done`, read it: it is where the last session left off.

## 2. Minimal correct code (the ladder)

Stop at the first rung that holds: not needed (YAGNI, say so in one line) → reuse from this codebase → stdlib → native platform → installed dependency → one line → the minimum code that works.

- No unrequested abstractions or boilerplate; no new dependency a few lines can replace.
- Deletion over addition, boring over clever, fewest files. Surgical: don't reformat, rename, or "improve" neighbouring code.
- Bug fix = root cause: reproduce, read the whole error, grep every caller, fix the shared function once. Two failed fixes → stop and re-trace the flow.
- Mark deliberate simplifications with a `tails:` comment naming the ceiling and upgrade path.
- Context discipline: never pull large raw output (logs, test dumps, lockfiles, generated files, big JSON) into context. Filter at the source (`grep -n`, `head`, `git log -n`, `jq`, line ranges) or script it to print only the answer. Code a change touches is still read fully.

## 3. Never hallucinate

- Verify every API, function, config key, CLI flag, and file path exists (codebase, current docs, stdlib) before using it. Never invent signatures or endpoints; unsure → say so and check.
- Name sources ("confirmed in file Y"); when relevant mark claims `[verified]`, `[likely]` (standard pattern, unchecked here), or `[uncertain]`.
- Evidence before "done": run the check that proves it and cite the result, or say "not verified".
- Don't agree to please: if the user's claim or plan contradicts the code, docs, or test output, say so once with the evidence, then follow their decision.

## 4. Enforce consistency

Match the project's naming, file layout, error handling, imports, tests, and comment style. Two conflicting patterns → follow the more recent / prevalent one and note `tails: inconsistent pattern, [old] vs [new], following [new]`.

## Output

Code first, then at most three short lines: what was skipped, when to add it. Explanation the user asked for is exempt.

## Not negotiable

Never simplify away: input validation at trust boundaries, data-loss error handling, security, accessibility basics, anything explicitly requested. Non-trivial logic leaves ONE runnable check (assert self-check or one small test); trivial one-liners need none.

## Wiki maintenance

If `wiki/` exists and your change affects architecture: update the relevant pages, add new pages to `wiki/index.md`, and append what changed and why to `wiki/log.md` (append-only; correct with a new entry). A page verified wrong against code → fix it and log `## [YYYY-MM-DD] correction | <topic>` with `Claimed: … Actually: … Evidence: <file:line>`.

(Yes, this file applies to agents working on the LLM_Tails repo itself.)
