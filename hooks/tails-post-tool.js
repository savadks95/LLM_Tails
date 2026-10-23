#!/usr/bin/env node
// LLM_Tails — PostToolUse / PostToolUseFailure hook: records files changed, open tasks and tool
// errors into session memory (see tails-session.js). Silent: injects nothing into context.
// Codex sends apply_patch (paths in the patch headers) and update_plan instead of Edit/TodoWrite.
// Its shell tool_response is output text with no exit code, so Codex records no tool errors.

const path = require('path');
const { defaultMode } = require('./tails-config');
const { projectDir, readHookInput, readMode } = require('./tails-runtime');
const { clip, recordEvent } = require('./tails-session');

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

function recordTasks(id, items) {
  recordEvent(id, {
    type: 'tasks',
    items: items.slice(0, 20).map((t) => ({ content: clip(t.content, 120), status: t.status || 'pending' })),
  });
}

const input = readHookInput();
const toolInput = input.tool_input || {};
const id = input.session_id;

if (id && (readMode() || defaultMode()) !== 'off') {
  try {
    if (input.hook_event_name === 'PostToolUseFailure') {
      const error = input.error || (input.tool_response && input.tool_response.error) || 'failed';
      recordEvent(id, { type: 'error', text: clip(`${input.tool_name}: ${error}`) });
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
      if (file) recordEvent(id, { type: 'file', path: relativeToProject(String(file), input.cwd) });
    }
  } catch (_) {
    // Fail-open: memory is best effort, never break the tool flow
  }
}
