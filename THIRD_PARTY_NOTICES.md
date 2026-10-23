# Third-party notices

LLM_Tails is MIT-licensed. It contains the following third-party material.

## gitleaks

The provider token patterns in `hooks/tails-session.js` (`TOKEN_SHAPES`) are adapted from
`config/gitleaks.toml` in https://github.com/gitleaks/gitleaks.

```
MIT License

Copyright (c) 2019 Zachary Rice

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Hindsight

Adapted from https://github.com/vectorize-io/hindsight: the BOM-safe hook input in
`hooks/tails-runtime.js` (`stripBom`, from `hindsight-integrations/coding-agents/src/core/diag.ts`),
the session memory framing in `hooks/tails-session.js` (from `core/inject.ts`), and the distill,
page-update and correction rules in `skills/tails-end/SKILL.md`, `skills/tails-wiki-ingest/SKILL.md`,
`skills/tails/SKILL.md` and `AGENTS.md` (from `core/missions.ts`, `core/chat.ts`, `core/inject.ts`,
and `hindsight-api-slim/hindsight_api/engine/consolidation/prompts.py` and `engine/reflect/prompts.py`).
Also after its design, rewritten here: wiki recall once per session on the first prompt in
`hooks/tails-recall.js` (from `core/hook.ts`), and backup-once and CRLF-preserving writes in
`scripts/cursor-hooks.js` (from `src/installer.ts`).

```
MIT License

Copyright (c) 2025 Vectorize AI, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Ideas, not code

These projects inspired features that were written from scratch; no code or text was copied.
They are credited in the README: aider (repo-map ranking), superpowers and
andrej-karpathy-skills (rule wording), ruler and rulesync (rule-file sync), agentlint (context
lint), seatbelt (guard patterns), tdd-guard (test check), context-mode and ai-memory.
