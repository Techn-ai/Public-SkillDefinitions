#!/usr/bin/env node
/**
 * build-index.js — Quadim Public Skill Library
 * Aggregates 1,227 individual skill JSON files into optimized static data files.
 *
 * Usage: node scripts/build-index.js
 * Output: docs/data/skills-index.json, docs/data/skills-full.json, docs/data/graph-edges.json
 *         docs/llms.txt, docs/llms-full.txt
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'quadim-public-skilldefinitions');
const OUT_DIR = path.join(__dirname, '..', 'docs', 'data');

// ---------------------------------------------------------------------------
// Domain classifier (inline for build script independence)
// ---------------------------------------------------------------------------
const DOMAIN_RULES = [
  { domain: 'AI & Machine Learning', keywords: ['ai ', 'artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'nlp', 'natural language', 'llm', 'large language', 'generative ai', 'computer vision', 'transformer', 'rag ', 'retrieval augmented', 'prompt engineering', 'reinforcement learning', 'ai agent', 'mlops', 'ai ethics', 'foundation model', 'openai', 'chatgpt', 'claude', 'embedding', 'vector'] },
  { domain: 'Data & Analytics', keywords: ['data science', 'data analysis', 'analytics', 'business intelligence', 'data warehouse', 'etl', 'data pipeline', 'data modeling', 'sql', 'nosql', 'data engineer', 'data quality', 'data governance', 'data strategy', 'visualization', 'tableau', 'power bi', 'databricks', 'spark', 'hadoop', 'kafka', 'dbt', 'airflow', 'statistics', 'data lake', 'bi '] },
  { domain: 'Software Development', keywords: ['java', 'python', 'javascript', 'typescript', 'kotlin', 'golang', 'rust', 'c++', 'c#', '.net', 'spring', 'react', 'angular', 'vue', 'node.js', 'api design', 'rest', 'graphql', 'microservice', 'software engineer', 'programming', 'coding', 'development', 'backend', 'frontend', 'fullstack', 'git', 'agile', 'scrum', 'testing', 'tdd', 'junit', 'maven', 'gradle'] },
  { domain: 'Cloud & Infrastructure', keywords: ['aws', 'azure', 'gcp', 'google cloud', 'cloud native', 'kubernetes', 'docker', 'container', 'terraform', 'infrastructure as code', 'serverless', 'lambda', 'cloud architect', 'cloud migration', 'saas', 'paas', 'iaas', 'cloud security', 'load balancing', 'cdn', 'cloud computing'] },
  { domain: 'DevOps & Platform Engineering', keywords: ['devops', 'ci/cd', 'github actions', 'jenkins', 'pipeline', 'deployment', 'monitoring', 'observability', 'logging', 'alerting', 'site reliability', 'sre', 'platform engineering', 'helm', 'gitops', 'ansible', 'puppet', 'chef', 'configuration management'] },
  { domain: 'Security & Cybersecurity', keywords: ['security', 'cybersecurity', 'gdpr', 'compliance', 'vulnerability', 'penetration testing', 'encryption', 'authentication', 'authorization', 'zero trust', 'nis2', 'iso 27001', 'soc2', 'identity', 'access management', 'iam', 'siem', 'threat', 'incident response', 'risk management', 'cyber', 'devsecops', 'ai security', 'privacy'] },
  { domain: 'Networking & IoT', keywords: ['network', 'tcp/ip', 'dns', 'http', 'vpn', 'firewall', 'iot', 'internet of things', 'mqtt', 'edge computing', 'wireless', 'bluetooth', 'zigbee', 'protocol', 'bandwidth', 'routing', 'switching', '5g', 'embedded', 'firmware'] },
  { domain: 'Architecture & Design', keywords: ['architecture', 'system design', 'distributed system', 'event-driven', 'domain-driven', 'ddd', 'cqrs', 'event sourcing', 'design pattern', 'solid principles', 'clean architecture', 'hexagonal', 'software architect', 'enterprise architect', 'solution architect', 'integration', 'middleware', 'message queue'] },
  { domain: 'Leadership & Executive', keywords: ['leadership', 'management', 'cto', 'ceo', 'executive', 'strategy', 'vision', 'stakeholder', 'board', 'governance', 'organizational change', 'transformation', 'decision making', 'team lead', 'coaching', 'mentoring', 'people management', 'performance management', 'culture', 'organizational design'] },
  { domain: 'Project & Product Management', keywords: ['project management', 'product management', 'product owner', 'roadmap', 'sprint', 'backlog', 'agile', 'kanban', 'jira', 'confluence', 'requirements', 'user story', 'mvp', 'product strategy', 'okr', 'kpi', 'delivery', 'timeline', 'risk', 'stakeholder management'] },
  { domain: 'Finance & Accounting', keywords: ['finance', 'accounting', 'budget', 'financial analysis', 'investment', 'valuation', 'roi', 'p&l', 'revenue', 'cost', 'audit', 'tax', 'ifrs', 'gaap', 'treasury', 'capital', 'equity', 'venture capital', 'fundraising', 'raise capital', 'financial model', 'saas metrics', 'arr', 'mrr'] },
  { domain: 'ESG & Sustainability', keywords: ['sustainability', 'esg', 'carbon', 'climate', 'renewable energy', 'circular economy', 'green', 'environmental', 'social impact', 'reporting', 'csrd', 'tcfd', 'scope 1', 'scope 2', 'scope 3', 'net zero', 'decarbonization', 'biodiversity'] },
  { domain: 'Blockchain & Web3', keywords: ['blockchain', 'web3', 'cryptocurrency', 'bitcoin', 'ethereum', 'smart contract', 'defi', 'nft', 'token', 'dao', 'solidity', 'web3.js', 'dapp', 'consensus', 'distributed ledger'] },
  { domain: 'Governance & Compliance', keywords: ['governance', 'regulatory', 'compliance', 'audit', 'risk', 'policy', 'legal', 'contract', 'gdpr', 'nis2', 'eu ai act', 'sox', 'iso', 'regulation', 'framework', 'standard'] },
  { domain: 'Testing & Quality', keywords: ['testing', 'quality assurance', 'qa', 'test automation', 'unit test', 'integration test', 'e2e', 'selenium', 'cypress', 'jest', 'performance test', 'load test', 'quality management', 'code review'] },
  { domain: 'Design & UX', keywords: ['ux', 'ui design', 'user experience', 'user interface', 'figma', 'design thinking', 'prototyping', 'wireframe', 'accessibility', 'usability', 'human-computer', 'interaction design', 'service design', 'design system'] },
  { domain: 'HR & People', keywords: ['hr', 'human resources', 'recruitment', 'talent', 'onboarding', 'learning and development', 'employee', 'workforce', 'compensation', 'benefits', 'competence management', 'skill gap', 'training', 'performance review'] },
  { domain: 'Communication & Soft Skills', keywords: ['communication', 'presentation', 'public speaking', 'writing', 'negotiation', 'conflict resolution', 'collaboration', 'teamwork', 'emotional intelligence', 'empathy', 'facilitation', 'storytelling', 'influence'] },
];

function classifyDomain(name, description) {
  const text = `${name} ${description || ''}`.toLowerCase();
  for (const rule of DOMAIN_RULES) {
    for (const kw of rule.keywords) {
      if (text.includes(kw)) return rule.domain;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main build
// ---------------------------------------------------------------------------
function formatDate(createdAt) {
  if (!Array.isArray(createdAt) || createdAt.length < 3) return null;
  const [y, m, d] = createdAt;
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function countConnections(skill) {
  return (skill.relatesTo?.length || 0) +
         (skill.isCompositeOf?.length || 0) +
         (skill.isExtensionOf?.length || 0);
}

console.log('Reading skill files from:', SRC_DIR);
const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.json'));
console.log(`Found ${files.length} JSON files`);

const skillsById = new Map();
let parseErrors = 0;

for (const file of files) {
  try {
    const raw = fs.readFileSync(path.join(SRC_DIR, file), 'utf8');
    const skill = JSON.parse(raw);
    if (!skill.id || !skill.name) continue;

    // Deduplicate: keep highest version
    const existing = skillsById.get(skill.id);
    if (!existing || (skill.currentVersion || 0) > (existing.currentVersion || 0)) {
      skillsById.set(skill.id, skill);
    }
  } catch (e) {
    parseErrors++;
    console.warn(`  Parse error: ${file}: ${e.message}`);
  }
}

const skills = Array.from(skillsById.values());
console.log(`Loaded ${skills.length} unique skills (${parseErrors} parse errors)`);

// ---------------------------------------------------------------------------
// Build lean index
// ---------------------------------------------------------------------------
const index = skills.map(s => {
  const connections = countConnections(s);
  const domain = classifyDomain(s.name, s.description);
  const desc = (s.description || '').trim();

  return {
    id: s.id,
    name: s.name,
    name_en: s.name_en || null,
    desc: desc.length > 500 ? desc.slice(0, 500) + '…' : desc,
    ce: s.coversElement?.classification || 'NotSet',
    st: s.skillType?.skillTypeClassification || 'NotSet',
    ma: (s.matchesArea || []).map(a => a.skillAreaClassification).filter(Boolean),
    domain: domain,
    connections: connections,
    rt: (s.relatesTo || []).map(r => r.name).filter(Boolean),
    ic: (s.isCompositeOf || []).map(r => r.name).filter(Boolean),
    ie: (s.isExtensionOf || []).map(r => r.name).filter(Boolean),
    owner: s.skillOwnerUsername || null,
    created: formatDate(s.createdAt),
    tags: (s.taggedWith || []).map(t => t.tagName).filter(t => t && t.startsWith('http')),
    hide: s.hide || false,
  };
});

// Filter out hidden skills
const publicIndex = index.filter(s => !s.hide);
console.log(`Public skills: ${publicIndex.length}`);

// ---------------------------------------------------------------------------
// Build full data (for detail pages) — strip resolved skill objects (huge)
// ---------------------------------------------------------------------------
const fullData = {};
for (const s of skills) {
  if (s.hide) continue;
  fullData[s.id] = {
    id: s.id,
    name: s.name,
    name_en: s.name_en,
    description: s.description || '',
    description_en: s.description_en,
    ce: s.coversElement?.classification || 'NotSet',
    st: s.skillType?.skillTypeClassification || 'NotSet',
    ma: (s.matchesArea || []).map(a => a.skillAreaClassification).filter(Boolean),
    relatesTo: (s.relatesTo || []).map(r => ({ id: r.id, name: r.name })),
    isCompositeOf: (s.isCompositeOf || []).map(r => ({ id: r.id, name: r.name })),
    isExtensionOf: (s.isExtensionOf || []).map(r => ({ id: r.id, name: r.name })),
    tags: (s.taggedWith || []).map(t => t.tagName).filter(t => t && t.startsWith('http')),
    owner: s.skillOwnerUsername,
    editedBy: s.editedByUsername,
    version: s.currentVersion,
    created: formatDate(s.createdAt),
    lastEdited: formatDate(s.lastEdited),
    domain: classifyDomain(s.name, s.description),
  };
}

// ---------------------------------------------------------------------------
// Build graph edges (only connected skills)
// ---------------------------------------------------------------------------
const connectedIds = new Set();
const edges = [];

for (const s of skills) {
  if (s.hide) continue;
  const srcConnections = countConnections(s);
  if (srcConnections === 0) continue;
  connectedIds.add(s.id);

  for (const r of (s.relatesTo || [])) {
    edges.push({ source: s.id, target: r.id, type: 'relatesTo' });
    connectedIds.add(r.id);
  }
  for (const r of (s.isCompositeOf || [])) {
    edges.push({ source: s.id, target: r.id, type: 'isCompositeOf' });
    connectedIds.add(r.id);
  }
  for (const r of (s.isExtensionOf || [])) {
    edges.push({ source: s.id, target: r.id, type: 'isExtensionOf' });
    connectedIds.add(r.id);
  }
}

// Deduplicate edges (same source+target+type)
const edgeSet = new Set();
const uniqueEdges = edges.filter(e => {
  const key = `${e.source}|${e.target}|${e.type}`;
  if (edgeSet.has(key)) return false;
  edgeSet.add(key);
  return true;
});

// Build node list for graph (all connected skills)
const skillMap = new Map(skills.map(s => [s.id, s]));
const graphNodes = Array.from(connectedIds).map(id => {
  const s = skillMap.get(id);
  const idxEntry = publicIndex.find(i => i.id === id);
  return {
    id,
    name: s ? s.name : (idxEntry?.name || id),
    ce: s ? (s.coversElement?.classification || 'NotSet') : 'NotSet',
    connections: idxEntry?.connections || 0,
  };
}).filter(n => n.name);

const graphData = { nodes: graphNodes, edges: uniqueEdges };

// ---------------------------------------------------------------------------
// Write output files
// ---------------------------------------------------------------------------
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const indexPath = path.join(OUT_DIR, 'skills-index.json');
const fullPath  = path.join(OUT_DIR, 'skills-full.json');
const graphPath = path.join(OUT_DIR, 'graph-edges.json');

fs.writeFileSync(indexPath, JSON.stringify(publicIndex));
fs.writeFileSync(fullPath,  JSON.stringify(fullData));
fs.writeFileSync(graphPath, JSON.stringify(graphData));

// ---------------------------------------------------------------------------
// Generate llms.txt and llms-full.txt
// ---------------------------------------------------------------------------
const today = new Date().toISOString().slice(0, 10);

// Counts for llms.txt header
const ceCountsForLlms = {};
const domainCountsForLlms = {};
for (const s of publicIndex) {
  ceCountsForLlms[s.ce] = (ceCountsForLlms[s.ce] || 0) + 1;
  if (s.domain) domainCountsForLlms[s.domain] = (domainCountsForLlms[s.domain] || 0) + 1;
}

const ceLines = Object.entries(ceCountsForLlms)
  .sort((a,b) => b[1]-a[1])
  .map(([k,v]) => {
    const label = {
      Technical: 'Technical', Management_Leadership: 'Management & Leadership',
      Analytical: 'Analytical', Communication: 'Communication',
      Relationship: 'Relationship', Physical: 'Physical',
      Creative: 'Creative', NotSet: 'Unclassified',
    }[k] || k;
    return `- ${label} (${v} skills)`;
  }).join('\n');

const domainLines = Object.keys(domainCountsForLlms)
  .sort((a,b) => domainCountsForLlms[b] - domainCountsForLlms[a])
  .join(', ');

const BASE_URL = 'https://techn-ai.github.io/Public-SkillDefinitions';

const llmsTxt = `# Quadim Public Skill Library

> ${publicIndex.length} professionally curated skill definitions for competence mapping, talent management, and workforce planning. Open taxonomy covering Technical, Management & Leadership, Analytical, Communication, Relationship, Physical, and Creative skills across 19 domains. Apache 2.0 License.

## Key Resources

- [Interactive site](${BASE_URL}/): Browse, search, and explore all skills
- [Skill index (JSON)](${BASE_URL}/data/skills-index.json): Lean index of all ${publicIndex.length} skills with metadata
- [Full skill data (JSON)](${BASE_URL}/data/skills-full.json): Complete definitions with relationship graph
- [Graph data (JSON)](${BASE_URL}/data/graph-edges.json): Relationship graph (${graphNodes.length} nodes, ${uniqueEdges.length} edges)
- [All skills (plain text)](${BASE_URL}/llms-full.txt): Complete skill library for LLM consumption
- [GitHub repository](https://github.com/Techn-ai/Public-SkillDefinitions): Source data and site code

## Schema

Each skill has: id (UUID), name, description, coversElement (classification), skillType, matchesArea (multi), relatesTo / isCompositeOf / isExtensionOf (relationship graph), skillOwnerUsername, createdAt.

## Classification

${ceLines}

## Domains

${domainLines}

## Data provenance

Skills were authored by human curators (Selina Quadim, Thor Henning Hetland, and team) and Frøya — Quadim's AI co-worker agent. Date range: May 2022 – April 2025.

## License

Apache 2.0 — https://github.com/Techn-ai/Public-SkillDefinitions/blob/main/LICENSE
`;

// llms-full.txt — all skills grouped by classification, full descriptions
const CE_ORDER = ['Technical','Management_Leadership','Analytical','Communication','Relationship','Physical','Creative','NotSet'];
const CE_DISPLAY = {
  Technical: 'Technical', Management_Leadership: 'Management & Leadership',
  Analytical: 'Analytical', Communication: 'Communication',
  Relationship: 'Relationship', Physical: 'Physical',
  Creative: 'Creative', NotSet: 'Unclassified',
};
const ST_DISPLAY = {
  Transferable_and_Functional: 'Transferable & Functional',
  Knowledge_Based: 'Knowledge-Based',
  Personal_Trait_or_Attitude: 'Personal Trait or Attitude',
  NotSet: null,
};
const MA_DISPLAY = {
  Technical: 'Technical', Process: 'Process',
  Organizational: 'Organizational', Experience: 'Experience',
  Domain: 'Domain', NotSet: null,
};

let llmsFullLines = [
  `# Quadim Public Skill Library — Complete Skill Definitions`,
  ``,
  `${publicIndex.length} professionally curated skill definitions.`,
  `Source: ${BASE_URL}/ | License: Apache 2.0 | Generated: ${today}`,
  ``,
  `---`,
  ``,
];

// Group by classification
const grouped = {};
for (const s of publicIndex) {
  (grouped[s.ce] = grouped[s.ce] || []).push(s);
}

for (const ce of CE_ORDER) {
  const group = grouped[ce];
  if (!group || group.length === 0) continue;

  const sortedGroup = group.slice().sort((a,b) => a.name.localeCompare(b.name));
  llmsFullLines.push(`## ${CE_DISPLAY[ce]} (${group.length} skills)`);
  llmsFullLines.push('');

  for (const s of sortedGroup) {
    const full = fullData[s.id];
    const description = (full?.description || s.desc || '').trim();
    const stLabel = ST_DISPLAY[s.st];
    const maLabels = (s.ma || []).map(a => MA_DISPLAY[a]).filter(Boolean);

    llmsFullLines.push(`### ${s.name.trim()}`);

    const meta = [];
    if (stLabel) meta.push(`**Type:** ${stLabel}`);
    if (maLabels.length) meta.push(`**Areas:** ${maLabels.join(', ')}`);
    if (s.domain) meta.push(`**Domain:** ${s.domain}`);
    if (meta.length) llmsFullLines.push(meta.join(' | '));

    if (description) llmsFullLines.push('', description);

    const relLines = [];
    if (s.rt?.length) relLines.push(`**Relates to:** ${s.rt.join(', ')}`);
    if (s.ic?.length) relLines.push(`**Part of:** ${s.ic.join(', ')}`);
    if (s.ie?.length) relLines.push(`**Extends:** ${s.ie.join(', ')}`);
    if (relLines.length) llmsFullLines.push('', ...relLines);

    llmsFullLines.push('');
  }
}

const llmsPath     = path.join(__dirname, '..', 'docs', 'llms.txt');
const llmsFullPath = path.join(__dirname, '..', 'docs', 'llms-full.txt');

fs.writeFileSync(llmsPath,     llmsTxt);
fs.writeFileSync(llmsFullPath, llmsFullLines.join('\n'));

// ---------------------------------------------------------------------------
// Stats summary
// ---------------------------------------------------------------------------
const byClassification = {};
const byDomain = {};
const byOwner = {};

for (const s of publicIndex) {
  byClassification[s.ce] = (byClassification[s.ce] || 0) + 1;
  if (s.domain) byDomain[s.domain] = (byDomain[s.domain] || 0) + 1;
  if (s.owner) byOwner[s.owner] = (byOwner[s.owner] || 0) + 1;
}

console.log('\n=== Build Complete ===');
console.log(`skills-index.json : ${(fs.statSync(indexPath).size / 1024).toFixed(0)} KB`);
console.log(`skills-full.json  : ${(fs.statSync(fullPath).size / 1024).toFixed(0)} KB`);
console.log(`graph-edges.json  : ${(fs.statSync(graphPath).size / 1024).toFixed(0)} KB`);
console.log(`llms.txt          : ${(fs.statSync(llmsPath).size / 1024).toFixed(0)} KB`);
console.log(`llms-full.txt     : ${(fs.statSync(llmsFullPath).size / 1024).toFixed(0)} KB`);
console.log(`\nGraph: ${graphNodes.length} nodes, ${uniqueEdges.length} edges`);
console.log(`\nClassification breakdown:`);
Object.entries(byClassification).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
console.log(`\nTop domains:`);
Object.entries(byDomain).sort((a,b) => b[1]-a[1]).slice(0,10).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
console.log(`\nTop contributors:`);
Object.entries(byOwner).sort((a,b) => b[1]-a[1]).slice(0,5).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
