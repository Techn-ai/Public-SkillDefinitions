#!/usr/bin/env node
/**
 * apply-relationship.js — GitHub Actions bot script
 * Reads a relationship proposal from env vars, modifies the source skill JSON,
 * creates a branch + commit, opens a PR, and comments on the issue.
 *
 * Required env vars (set by the workflow):
 *   SOURCE_ID, SOURCE_NAME, TARGET_ID, TARGET_NAME, REL_TYPE,
 *   ISSUE_NUMBER, GH_TOKEN
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const {
  SOURCE_ID, SOURCE_NAME,
  TARGET_ID, TARGET_NAME,
  REL_TYPE,
  ISSUE_NUMBER,
} = process.env;

const SKILLS_DIR = path.join(__dirname, '..', 'quadim-public-skilldefinitions');
const VALID_TYPES = ['relatesTo', 'isCompositeOf', 'isExtensionOf'];

function gh(cmd) {
  return execSync(`gh ${cmd}`, { encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'] }).trim();
}

function comment(msg) {
  const tmp = `/tmp/comment-${Date.now()}.md`;
  fs.writeFileSync(tmp, msg);
  execSync(`gh issue comment ${ISSUE_NUMBER} --body-file "${tmp}"`, { stdio: 'inherit' });
  fs.unlinkSync(tmp);
}

// ─── Validate ────────────────────────────────────────────────────────────────
if (!SOURCE_ID || !TARGET_ID || !TARGET_NAME || !REL_TYPE) {
  comment('❌ Proposal is missing required fields. Please resubmit with source ID, target ID, target name, and relationship type.');
  process.exit(0);
}

if (!VALID_TYPES.includes(REL_TYPE)) {
  comment(`❌ Unknown relationship type \`${REL_TYPE}\`. Must be one of: ${VALID_TYPES.join(', ')}.`);
  process.exit(0);
}

// ─── Find source file ─────────────────────────────────────────────────────────
const files = fs.readdirSync(SKILLS_DIR);
const sourceFile = files.find(f => f.endsWith(`-${SOURCE_ID}.json`));

if (!sourceFile) {
  comment(`❌ Could not find skill file for ID \`${SOURCE_ID}\`. It may have been renamed or removed.`);
  process.exit(0);
}

const filepath = path.join(SKILLS_DIR, sourceFile);
const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

// ─── Check for duplicate ─────────────────────────────────────────────────────
const existing = data[REL_TYPE] || [];
if (existing.some(r => r.id === TARGET_ID)) {
  comment(`ℹ️ This relationship already exists in the skill definition — no changes needed.`);
  process.exit(0);
}

// ─── Apply change ─────────────────────────────────────────────────────────────
data[REL_TYPE] = existing;
data[REL_TYPE].push({ id: TARGET_ID, name: TARGET_NAME, description: null, description_en: null });

fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n');

// ─── Git: branch + commit + push ─────────────────────────────────────────────
const branch = `relationship/${SOURCE_ID.slice(0, 8)}-${TARGET_ID.slice(0, 8)}`;

execSync('git config user.name "github-actions[bot]"');
execSync('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"');
execSync(`git checkout -b "${branch}"`);
execSync(`git add "${filepath}"`);
execSync(`git commit -m "feat(graph): add ${REL_TYPE} from '${SOURCE_NAME}' to '${TARGET_NAME}' (#${ISSUE_NUMBER})"`);
execSync(`git push origin "${branch}"`);

// ─── Open PR ──────────────────────────────────────────────────────────────────
const relLabel = { relatesTo: 'relates to', isCompositeOf: 'is part of', isExtensionOf: 'extends' }[REL_TYPE];

const prBody = [
  `Closes #${ISSUE_NUMBER}`,
  ``,
  `## Change`,
  ``,
  `Adds \`${REL_TYPE}\` from **${SOURCE_NAME}** → **${TARGET_NAME}**.`,
  ``,
  `| Field | Value |`,
  `|-------|-------|`,
  `| Source | ${SOURCE_NAME} (\`${SOURCE_ID}\`) |`,
  `| Target | ${TARGET_NAME} (\`${TARGET_ID}\`) |`,
  `| Type   | ${relLabel} |`,
  ``,
  `_Proposed via the skill library site and created automatically by the relationship bot._`,
].join('\n');

const prBodyFile = `/tmp/pr-body-${Date.now()}.md`;
fs.writeFileSync(prBodyFile, prBody);
const prTitle = `Add relationship: ${SOURCE_NAME} → ${TARGET_NAME} (${relLabel})`;
const prUrl = gh(`pr create --title "${prTitle.replace(/"/g, '\\"')}" --body-file "${prBodyFile}" --head "${branch}" --base main`);
fs.unlinkSync(prBodyFile);

// ─── Comment on issue ─────────────────────────────────────────────────────────
comment(`✅ PR created: ${prUrl}\\n\\nA maintainer will review and merge the change. Once merged, the skill graph will update automatically.`);

// Add label (ignore if it doesn't exist yet)
try {
  execSync(`gh issue edit ${ISSUE_NUMBER} --add-label "relationship-proposal"`, { stdio: 'ignore' });
} catch (_) {}

console.log(`Done. PR: ${prUrl}`);
