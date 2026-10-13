#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chunkMarkdown, search, tokenize } = require('../scripts/wiki-search');

// 1. Tokenizer: identifiers split into parts, stopwords dropped, light plural stem
assert.deepStrictEqual(tokenize('changePassword'), ['changepassword', 'change', 'password']);
assert.deepStrictEqual(tokenize('the users'), ['user']);
assert.ok(tokenize('hash_token').includes('hash') && tokenize('hash_token').includes('token'));

// 2. Chunking: split by heading, headings inside code fences ignored, frontmatter stripped
const chunks = chunkMarkdown('---\ntags: [a]\n---\n# Auth\nintro\n## Login\n```\n# not a heading\n```\n', 'x.md');
assert.deepStrictEqual(chunks.map((c) => c.heading), ['Auth', 'Login']);
assert.ok(chunks[1].text.includes('# not a heading'));

// 3. Ranking: the section about the query wins, unrelated pages score nothing
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tails-wiki-search-test-'));
const wiki = path.join(tmp, 'wiki');
try {
  fs.mkdirSync(path.join(wiki, 'entities'), { recursive: true });
  fs.writeFileSync(path.join(wiki, 'index.md'), '# Index\n- [[entities/auth]]\n- [[entities/billing]]\n');
  fs.writeFileSync(path.join(wiki, 'entities', 'auth.md'),
    '# Auth\nSessions and tokens.\n## Password changes\n`changePassword()` hashes with `hashPassword()` before saving.\n');
  fs.writeFileSync(path.join(wiki, 'entities', 'billing.md'), '# Billing\nInvoices are sent monthly via Stripe.\n');

  const results = search(wiki, 'password hashing');
  assert.ok(results.length >= 1, 'Should find a match');
  assert.strictEqual(results[0].file, 'wiki/entities/auth.md');
  assert.strictEqual(results[0].heading, 'Password changes');
  assert.ok(!results.some((r) => r.file.endsWith('billing.md')), 'Unrelated page must not match');
  assert.deepStrictEqual(search(wiki, 'kubernetes'), []);

  console.log('✓ tests/wiki-search.test.js passed');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
