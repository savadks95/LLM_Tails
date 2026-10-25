#!/usr/bin/env node
// Shared LLM_Tails instruction builder for hooks.

const fs = require('fs');
const path = require('path');
const { DEFAULT_MODE, normalizeMode } = require('./tails-config');

const SKILL_PATH = path.join(__dirname, '..', 'skills', 'tails', 'SKILL.md');

function stripFrontmatter(text) {
  return String(text || '').replace(/^---[\s\S]*?---\s*/, '');
}

function filterSkillBodyForMode(body, mode) {
  const effectiveMode = normalizeMode(mode) || DEFAULT_MODE;
  const withoutFrontmatter = stripFrontmatter(body);

  return withoutFrontmatter
    .split(/\r?\n/)
    .filter((line) => {
      // Filter mode-specific table rows
      const tableLabel = line.match(/^\|\s*\*\*(.+?)\*\*\s*\|/);
      if (tableLabel) {
        const labelMode = normalizeMode(tableLabel[1].trim());
        if (labelMode) return labelMode === effectiveMode;
      }

      // Filter mode-specific worked examples (require quoted value)
      const exampleLabel = line.match(/^-\s*([^:]+):\s*"/);
      if (exampleLabel) {
        const labelMode = normalizeMode(exampleLabel[1].trim());
        if (labelMode) return labelMode === effectiveMode;
      }

      return true;
    })
    .join('\n');
}

function getFallbackInstructions(mode) {
  return 'LLM_TAILS MODE ACTIVE — level: ' + mode + '\n\n' +
    'You are a disciplined senior developer. Four pillars govern every response:\n\n' +
    '1. UNDERSTAND FIRST: Read the code a change touches, trace callers and callees, map conventions before editing.\n' +
    '2. MINIMAL CORRECT CODE: Stop at the first rung: YAGNI → codebase reuse → stdlib → native → installed dep → one-line → minimum.\n' +
    '3. NEVER HALLUCINATE: Verify APIs, paths, configs exist before using. [verified]/[likely]/[uncertain] markers. Don\'t agree to please: contradict wrong premises with evidence.\n' +
    '4. ENFORCE CONSISTENCY: Match naming, patterns, error handling, imports to existing project conventions.\n\n' +
    'Bug fix = root cause. No unrequested abstractions. Deletion over addition. Shortest working diff.\n' +
    'Mark simplifications: `tails: <ceiling>, <upgrade path>`.\n' +
    'Context discipline: never pull large raw output (logs, dumps, generated files) into context; filter at the source or script it.\n\n' +
    'Never simplify away: trust-boundary validation, data-loss handling, security, accessibility, explicitly requested behavior.\n' +
    'Non-trivial logic leaves ONE runnable check behind.';
}

function getTailsInstructions(mode) {
  const effectiveMode = normalizeMode(mode) || DEFAULT_MODE;

  if (effectiveMode === 'off') return '';

  try {
    return 'LLM_TAILS MODE ACTIVE — level: ' + effectiveMode + '\n\n' +
      filterSkillBodyForMode(fs.readFileSync(SKILL_PATH, 'utf8'), effectiveMode);
  } catch (e) {
    return getFallbackInstructions(effectiveMode);
  }
}

const AGENTS_PATH = path.join(__dirname, '..', 'AGENTS.md');
const LEVEL_NOTES = {
  lite: 'Advisory: name the better alternative in one line, let the user pick.',
  full: 'All four pillars enforced.',
  ultra: 'Maximum strictness: every claim needs a [verified] cite or an explicit [uncertain]; challenge requirements before building.',
};

// Subagents get the compact ruleset (AGENTS.md): the same pillars at about a third of the context of the full skill.
function getSubagentInstructions(mode) {
  const effectiveMode = normalizeMode(mode) || DEFAULT_MODE;
  if (effectiveMode === 'off') return '';
  try {
    const body = fs.readFileSync(AGENTS_PATH, 'utf8').replace(/\n\(Yes, this file applies[^\n]*\)\s*$/, '').trim();
    return `LLM_TAILS MODE ACTIVE — level: ${effectiveMode}. ${LEVEL_NOTES[effectiveMode]}\n\n${body}`;
  } catch (e) {
    return getTailsInstructions(effectiveMode);
  }
}

module.exports = {
  filterSkillBodyForMode,
  getFallbackInstructions,
  getSubagentInstructions,
  getTailsInstructions,
};
