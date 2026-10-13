#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildGraph, generateMermaid, parseWikiLinks } = require('../scripts/wiki-graph');

// 1. Link syntax: plain, .md, section anchors, aliases
assert.deepStrictEqual(
  parseWikiLinks('[[auth]] [[entities/db.md]] [[auth#login]] [[billing|Payments]]').sort(),
  ['auth', 'billing', 'entities/db']
);

// 2. Resolution by basename: [[auth]] from index reaches entities/auth, so it is not an orphan
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tails-wiki-graph-test-'));
try {
  fs.mkdirSync(path.join(tmp, 'entities'));
  fs.writeFileSync(path.join(tmp, 'index.md'), '# Index\n[[auth]] [[ghost]]\n');
  fs.writeFileSync(path.join(tmp, 'entities', 'auth.md'), '# Auth\n[[index]]\n');
  fs.writeFileSync(path.join(tmp, 'entities', 'lonely.md'), '# Lonely\n');

  const graph = buildGraph(tmp);
  assert.strictEqual(graph.nodes.get('entities/auth').inDegree, 1, 'Basename link resolved');
  assert.strictEqual(graph.nodes.get('entities/lonely').inDegree, 0, 'Real orphan still detected');

  const mermaid = generateMermaid(graph);
  assert.ok(mermaid.includes('ghost (missing)'), 'Links to missing pages are shown as missing');
  assert.ok(mermaid.includes('index --> entities_auth'));

  console.log('✓ tests/wiki-graph.test.js passed');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
