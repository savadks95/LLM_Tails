// LOC counter: measures code compactness, diff brevity, and bloat.
// Strips comments and blank lines for functional LOC comparison.

function countLoc(code) {
  if (!code) return 0;
  return code
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('//') && !line.startsWith('#') && !line.startsWith('/*') && !line.startsWith('*'))
    .length;
}

function extractCodeBlocks(text) {
  const matches = [];
  const regex = /```(?:\w+)?\r?\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(text || '')) !== null) {
    matches.push(match[1]);
  }
  return matches.join('\n');
}

function evaluateLoc(output) {
  const code = extractCodeBlocks(output) || output;
  const rawLines = (output || '').split(/\r?\n/).length;
  const codeLoc = countLoc(code);
  return {
    rawLines,
    codeLoc,
  };
}

module.exports = { countLoc, extractCodeBlocks, evaluateLoc };
