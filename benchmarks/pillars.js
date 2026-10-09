// Evaluates adherence to the 4 Pillars of LLM_Tails.

function evaluatePillars(text) {
  const content = String(text || '');

  // Pillar 1: Architecture Awareness / Source Citing
  const citesSource = /(?:per|see|in)\s+[`"']?[a-zA-Z0-9_\-\/\.]+\.(?:ts|js|py|go|md|rs)(?::L\d+)?[`"']?/i.test(content) ||
    /wiki\/[a-zA-Z0-9_\-\/]+/i.test(content);

  // Pillar 2: Laziness Ladder / YAGNI
  // Flags over-engineering: multiple classes for one util, unrequested design patterns
  const hasOverAbstraction = /class\s+\w+Factory\b|interface\s+I\w+Provider\b|abstract\s+class\b/i.test(content);
  const ladderCompliant = !hasOverAbstraction;

  // Pillar 3: Anti-Hallucination & Epistemic Honesty
  const hasConfidenceMarker = /\[(?:verified|likely|uncertain)(?::\s*[^\]]+)?\]/i.test(content);
  // Checks if model explicitly states uncertainty rather than bluffing
  const expressesHonesty = /I'm not sure|let me (?:verify|check)|not confirmed/i.test(content) || hasConfidenceMarker;

  // Pillar 4: Output Discipline (Code first, <= 3 lines explanation)
  const proseOnly = content.replace(/```[\s\S]*?```/g, '').trim();
  const proseLines = proseOnly.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const conciseOutput = proseLines.length <= 4; // Code first, at most 3-4 short explanation/skip lines

  return {
    pillar1: {
      pass: citesSource,
      score: citesSource ? 1 : 0,
      detail: citesSource ? 'Cites source code or wiki path' : 'No explicit source or caller reference',
    },
    pillar2: {
      pass: ladderCompliant,
      score: ladderCompliant ? 1 : 0,
      detail: ladderCompliant ? 'Adheres to minimal code ladder (YAGNI)' : 'Unrequested abstraction detected (Factory/Provider)',
    },
    pillar3: {
      pass: expressesHonesty,
      score: expressesHonesty ? 1 : 0,
      detail: expressesHonesty ? 'Used epistemic confidence markers or explicit verification' : 'No verification markers present',
    },
    pillar4: {
      pass: conciseOutput,
      score: conciseOutput ? 1 : 0,
      detail: conciseOutput ? 'Disciplined, concise output format' : `Verbose explanation (${nonCodeLines.length} non-code lines)`,
    },
    compositeScore: (
      (citesSource ? 1 : 0) +
      (ladderCompliant ? 1 : 0) +
      (expressesHonesty ? 1 : 0) +
      (conciseOutput ? 1 : 0)
    ) / 4,
  };
}

module.exports = { evaluatePillars };
