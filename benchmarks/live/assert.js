// promptfoo assertions that reuse the offline benchmark's checks, so live and sample scores match.
const { evaluateCorrectness } = require('../correctness.js');
const { evaluateLoc } = require('../loc.js');
const { evaluatePillars } = require('../pillars.js');

// Runs the code in a VM sandbox against real behaviour checks. The only pass/fail gate.
module.exports.correctness = async (output, context) => {
  const r = await evaluateCorrectness(context.vars.task, output);
  return { pass: r.pass, score: r.pass ? 1 : 0, reason: r.reason };
};

// Informational: four-pillar compliance (0-1), compared across the two prompts.
module.exports.pillars = (output) => {
  const p = evaluatePillars(output);
  const failed = ['pillar1', 'pillar2', 'pillar3', 'pillar4'].filter((k) => !p[k].pass).map((k) => p[k].detail);
  return { pass: true, score: p.compositeScore, reason: failed.length ? failed.join('; ') : 'all four pillars' };
};

// Informational: code size (fewer lines scores higher; 30 lines ≈ 0.5).
module.exports.size = (output) => {
  const { codeLoc } = evaluateLoc(output);
  return { pass: true, score: 30 / (30 + codeLoc), reason: `${codeLoc} lines of code` };
};
