#!/usr/bin/env node
// LLM_Tails — PostToolUse / PostToolUseFailure hook: records files changed, open tasks and tool
// errors into session memory (see tails-session.js). Silent: injects nothing into context.

const path = require('path');
const { defaultMode } = require('./tails-config');
const { projectDir, readHookInput, readMode } = require('./tails-runtime');
const { clip, recordEvent } = require('./tails-session');

function relativeToProject(file, cwd) {
  const rel = path.relative(projectDir || cwd || process.cwd(), file).replace(/\\/g, '/');
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : file.replace(/\\/g, '/');
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
      recordEvent(id, {
        type: 'tasks',
        items: toolInput.todos.slice(0, 20).map((t) => ({
          content: clip(t.content || t.activeForm || '', 120),
          status: t.status || 'pending',
        })),
      });
    } else {
      const file = toolInput.file_path || toolInput.notebook_path;
      if (file) recordEvent(id, { type: 'file', path: relativeToProject(String(file), input.cwd) });
    }
  } catch (_) {
    // Fail-open: memory is best effort, never break the tool flow
  }
}
