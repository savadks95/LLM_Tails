// Baseline: the task alone, no rules.
module.exports = async function ({ vars }) {
  return JSON.stringify([{ role: 'user', content: vars.request }]);
};
