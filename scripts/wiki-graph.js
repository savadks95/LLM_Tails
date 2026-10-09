#!/usr/bin/env node
// Zero-dependency wiki relationship graph and architecture visualizer.
// Parses [[wikilinks]] across wiki/ and produces a Mermaid diagram + connectivity stats.

const fs = require('fs');
const path = require('path');

function findWikiFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findWikiFiles(fullPath, fileList);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function normalizeNodeName(name) {
  return name.replace(/\.md$/i, '').trim();
}

function parseWikiLinks(content) {
  const links = new Set();
  const regex = /\[\[([a-zA-Z0-9_\-\/\s]+)(?:\|[^\]]+)?\]\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const target = normalizeNodeName(match[1]);
    if (target) links.add(target);
  }
  return Array.from(links);
}

function parseCodeCitations(content) {
  const citations = new Set();
  const regex = /(?:src|lib|app|pkg|internal|cmd)\/[a-zA-Z0-9_\-\/\.]+(?::L\d+)?/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    citations.add(match[0]);
  }
  return Array.from(citations);
}

function buildGraph(wikiDir) {
  const files = findWikiFiles(wikiDir);
  const nodes = new Map();
  const edges = [];
  const codeRefs = new Map();

  for (const file of files) {
    const rel = path.relative(wikiDir, file).replace(/\\/g, '/');
    const nodeName = normalizeNodeName(rel);
    const content = fs.readFileSync(file, 'utf8');

    const outLinks = parseWikiLinks(content);
    const citations = parseCodeCitations(content);

    nodes.set(nodeName, {
      file: rel,
      outDegree: outLinks.length,
      inDegree: 0,
      citations: citations,
    });

    codeRefs.set(nodeName, citations);

    for (const target of outLinks) {
      edges.push({ from: nodeName, to: target });
    }
  }

  // Calculate in-degree
  for (const edge of edges) {
    if (nodes.has(edge.to)) {
      nodes.get(edge.to).inDegree += 1;
    }
  }

  return { nodes, edges, codeRefs };
}

function generateMermaid(graph, options = {}) {
  const lines = ['```mermaid', 'flowchart TD'];

  // Add styles
  lines.push('  classDef hub fill:#2563eb,stroke:#1d4ed8,color:#ffffff,stroke-width:2px;');
  lines.push('  classDef entity fill:#334155,stroke:#475569,color:#f8fafc;');
  lines.push('  classDef orphan fill:#ef4444,stroke:#b91c1c,color:#ffffff;');

  // Group by directory or type
  for (const [node, info] of graph.nodes.entries()) {
    const isHub = info.inDegree >= 3 || info.outDegree >= 3;
    const isOrphan = info.inDegree === 0 && node !== 'index';
    const cleanId = node.replace(/[^a-zA-Z0-9_]/g, '_');
    const label = path.basename(node);

    lines.push(`  ${cleanId}["${label}"]`);
    if (isHub) {
      lines.push(`  class ${cleanId} hub;`);
    } else if (isOrphan) {
      lines.push(`  class ${cleanId} orphan;`);
    } else {
      lines.push(`  class ${cleanId} entity;`);
    }
  }

  // Add edges
  for (const edge of graph.edges) {
    const fromId = edge.from.replace(/[^a-zA-Z0-9_]/g, '_');
    const toId = edge.to.replace(/[^a-zA-Z0-9_]/g, '_');
    lines.push(`  ${fromId} --> ${toId}`);
  }

  lines.push('```');
  return lines.join('\n');
}

function printStats(graph) {
  const totalNodes = graph.nodes.size;
  const totalEdges = graph.edges.length;
  const orphans = [];
  const hubs = [];

  for (const [node, info] of graph.nodes.entries()) {
    if (info.inDegree === 0 && node !== 'index') {
      orphans.push(node);
    }
    if (info.inDegree >= 2 || info.outDegree >= 3) {
      hubs.push({ node, total: info.inDegree + info.outDegree });
    }
  }

  hubs.sort((a, b) => b.total - a.total);

  console.log('\n--- Wiki Knowledge Graph Analysis ---');
  console.log(`Total Pages:  ${totalNodes}`);
  console.log(`Total Links:  ${totalEdges}`);
  console.log(`Hub Pages:    ${hubs.map(h => `${h.node} (${h.total})`).slice(0, 5).join(', ') || 'None'}`);
  console.log(`Orphan Pages: ${orphans.length > 0 ? orphans.join(', ') : 'None (clean connectivity)'}`);
}

function main() {
  const args = process.argv.slice(2);
  const targetDir = args[0] || path.join(process.cwd(), 'wiki');

  if (!fs.existsSync(targetDir)) {
    console.error(`Error: wiki directory not found at '${targetDir}'. Run /tails-wiki-init first.`);
    process.exit(1);
  }

  const graph = buildGraph(targetDir);
  const mermaid = generateMermaid(graph);

  if (args.includes('--mermaid-only')) {
    console.log(mermaid);
    return;
  }

  console.log(mermaid);
  printStats(graph);

  if (args.includes('--save')) {
    const archPath = path.join(targetDir, 'architecture.md');
    if (fs.existsSync(archPath)) {
      let content = fs.readFileSync(archPath, 'utf8');
      const diagramBlock = `\n## Architecture Graph\n\n${mermaid}\n`;
      if (content.includes('## Architecture Graph')) {
        content = content.replace(/## Architecture Graph[\s\S]*?(?=\n## |$)/, diagramBlock.trim());
      } else {
        content += diagramBlock;
      }
      fs.writeFileSync(archPath, content, 'utf8');
      console.log(`\nUpdated ${archPath} with latest Mermaid diagram.`);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { buildGraph, generateMermaid, parseWikiLinks };
