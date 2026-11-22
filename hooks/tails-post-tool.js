#!/usr/bin/env node
// LLM_Tails — PostToolUse / PostToolUseFailure hook: records files changed, open tasks, the user's
// AskUserQuestion answers and tool errors into session memory (see tails-session.js). The only
// thing it injects: on the first edit of a file in a session, which wiki pages list it in sources:.
// Codex sends apply_patch (paths in the patch headers) and update_plan instead of Edit/TodoWrite.
// Its shell tool_response is output text with no exit code, so Codex records no tool errors.

const fs = require('fs');
const path = require('path');
const { defaultMode } = require('./tails-config');
const { isCodexMemoryAgent, projectDir, readHookInput, readMode, writeHookOutput } = require('./tails-runtime');
const { clip, readEvents, recordEvent } = require('./tails-session');

function relativeToProject(file, cwd) {
  const rel = path.relative(projectDir || cwd || process.cwd(), file).replace(/\\/g, '/');
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : file.replace(/\\/g, '/');
}

// Codex apply_patch grammar (codex-rs/apply-patch/src/parser.rs): "*** Add File: <path>",
// "*** Update File: <path>", "*** Delete File: <path>", and "*** Move to: <path>" for renames.
function patchedFiles(patch) {
  const files = [];
  for (const m of String(patch).matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm)) {
    files.push(m[1].trim());
  }
  return files;
}

// Claude Code returns the user's picks in AskUserQuestion as { questions, answers: { <question>: <answer> } }
// (shape read from a real transcript's toolUseResult). Those are user decisions, said through a tool.
// Idea from Hindsight (MIT), coding-agents #6421.
function recordAnswers(id, response, toolInput) {
  const answers = (response && response.answers) || toolInput.answers || {};
  const questions = (response && response.questions) || toolInput.questions || [];
  if (typeof answers !== 'object' || !Array.isArray(questions)) return;
  for (const [question, answer] of Object.entries(answers)) {
    const header = (questions.find((q) => q && q.question === question) || {}).header;
    recordEvent(id, { type: 'decision', text: clip(`Answered "${header || question}": ${answer}`) });
  }
}

// Wiki pages whose frontmatter `sources:` lists this file, so an edit that changes behaviour also
// updates the page that describes it. Idea from Link (MIT), mcp_package/link_core/tool_hooks.py.
// tails: reads every wiki page once per newly edited file; an index keyed by source if wikis grow large.
function pagesCiting(rel, root) {
  const wiki = path.join(root, 'wiki');
  if (!fs.existsSync(wiki)) return [];
  const { findWikiFiles } = require('../scripts/wiki-graph');
  const { frontmatter } = require('../scripts/context-lint');
  return findWikiFiles(wiki)
    .filter((f) => (frontmatter(fs.readFileSync(f, 'utf8')).sources || []).some((s) => s.split('#')[0] === rel))
    .map((f) => path.relative(root, f).replace(/\\/g, '/'))
    .slice(0, 3);
}

// Once per file: session memory says whether it was edited before, so with TAILS_MEMORY=0 it stays off.
function wikiPointer(id, rel, root, mode) {
  if (process.env.TAILS_RECALL === '0' || process.env.TAILS_MEMORY === '0') return;
  const seen = readEvents(id).some((e) => e.type === 'file' && e.path === rel);
  const pages = seen ? [] : pagesCiting(rel, root);
  if (!pages.length) return;
  writeHookOutput('PostToolUse', mode, `LLM_TAILS WIKI: ${pages.join(', ')} list ${rel} in sources:. ` +
    'If this edit changes what a page says, update the page and its updated: date (and source hash).');
}

function recordTasks(id, items) {
  recordEvent(id, {
    type: 'tasks',
    items: items.slice(0, 20).map((t) => ({ content: clip(t.content, 120), status: t.status || 'pending' })),
  });
}

const input = readHookInput();
const toolInput = input.tool_input || {};
const id = input.session_id;
const mode = readMode() || defaultMode();

if (id && mode !== 'off' && !isCodexMemoryAgent(input)) {
  try {
    if (input.hook_event_name === 'PostToolUseFailure') {
      const error = input.error || (input.tool_response && input.tool_response.error) || 'failed';
      recordEvent(id, { type: 'error', text: clip(`${input.tool_name}: ${error}`) });
    } else if (input.tool_name === 'AskUserQuestion') {
      recordAnswers(id, input.tool_response, toolInput);
    } else if (input.tool_name === 'TodoWrite' && Array.isArray(toolInput.todos)) {
      recordTasks(id, toolInput.todos.map((t) => ({ content: t.content || t.activeForm || '', status: t.status })));
    } else if (input.tool_name === 'update_plan' && Array.isArray(toolInput.plan)) {
      recordTasks(id, toolInput.plan.map((t) => ({ content: t.step || '', status: t.status })));
    } else if (input.tool_name === 'apply_patch') {
      // Patch paths are relative to the session's cwd, not to this hook process
      for (const file of patchedFiles(toolInput.command || toolInput.input || '')) {
        const abs = path.resolve(input.cwd || projectDir || process.cwd(), file);
        recordEvent(id, { type: 'file', path: relativeToProject(abs, input.cwd) });
      }
    } else {
      const file = toolInput.file_path || toolInput.notebook_path;
      if (file) {
        const rel = relativeToProject(String(file), input.cwd);
        wikiPointer(id, rel, projectDir || input.cwd || process.cwd(), mode); // before recording: first edit only
        recordEvent(id, { type: 'file', path: rel });
      }
    }
  } catch (_) {
    // Fail-open: memory is best effort, never break the tool flow
  }
}
