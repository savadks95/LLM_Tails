// LLM_Tails: the same task with AGENTS.md (the rules rule-file agents load) as the system prompt.
const fs = require('fs');
const path = require('path');

const RULES = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'AGENTS.md'), 'utf8');

module.exports = async function ({ vars }) {
  return JSON.stringify([
    { role: 'system', content: RULES },
    { role: 'user', content: vars.request },
  ]);
};
