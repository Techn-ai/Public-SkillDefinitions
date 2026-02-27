#!/usr/bin/env node
/**
 * apply-edit.js — GitHub Actions bot script
 * Reads a skill edit proposal from env vars, modifies the skill JSON,
 * creates a branch + commit, opens a PR, and comments on the issue.
 *
 * Required env vars (set by the workflow):
 *   SKILL_ID, NAME, DESCRIPTION, CLASSIFICATION, SKILL_TYPE, MATCHES_AREA,
 *   ISSUE_NUMBER, GH_TOKEN
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const {
  SKILL_ID,
  NAME,
  DESCRIPTION,
  CLASSIFICATION,
  SKILL_TYPE,
  MATCHES_AREA,   // JSON array string e.g. '["Technical","Domain"]'
  ISSUE_NUMBER,
} = process.env;

const SKILLS_DIR = path.join(__dirname, '..', 'quadim-public-skilldefinitions');

const VALID_CE = ['Technical','Management_Leadership','Analytical','Communication','Relationship','Physical','Creative','NotSet'];
const VALID_ST = ['Knowledge_Based','Transferable_and_Functional','Personal_Trait_or_Attitude','NotSet'];
const VALID_MA = ['Technical','Organizational','Domain','Experience','Process','NotSet'];

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
if (!SKILL_ID || !NAME || !DESCRIPTION || !CLASSIFICATION || !SKILL_TYPE) {
  comment('❌ Proposal is missing required fields. Please resubmit via the skill library site.');
  process.exit(0);
}

if (!VALID_CE.includes(CLASSIFICATION)) {
  comment(`❌ Unknown classification \`${CLASSIFICATION}\`. Must be one of: ${VALID_CE.join(', ')}.`);
  process.exit(0);
}

if (!VALID_ST.includes(SKILL_TYPE)) {
  comment(`❌ Unknown skill type \`${SKILL_TYPE}\`. Must be one of: ${VALID_ST.join(', ')}.`);
  process.exit(0);
}

let matchesArea = [];
try {
  matchesArea = JSON.parse(MATCHES_AREA || '[]');
  if (!Array.isArray(matchesArea) || matchesArea.some(v => !VALID_MA.includes(v))) throw new Error();
} catch {
  comment(`❌ Invalid skill areas value. Must be a JSON array of: ${VALID_MA.join(', ')}.`);
  process.exit(0);
}

// ─── Find source file ─────────────────────────────────────────────────────────
const files = fs.readdirSync(SKILLS_DIR);
const sourceFile = files.find(f => f.endsWith(`-${SKILL_ID}.json`));

if (!sourceFile) {
  comment(`❌ Could not find skill file for ID \`${SKILL_ID}\`. It may have been renamed or removed.`);
  process.exit(0);
}

const filepath = path.join(SKILLS_DIR, sourceFile);
const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

// ─── Apply changes ────────────────────────────────────────────────────────────
data.name            = NAME;
data.description     = DESCRIPTION;
data.coversElement   = { classification: CLASSIFICATION };
data.skillType       = { skillTypeClassification: SKILL_TYPE };
data.matchesArea     = matchesArea.map(v => ({ skillAreaClassification: v }));

// Bump version and update lastEdited
data.currentVersion  = (data.currentVersion || 0) + 1;
const now = new Date();
data.lastEdited = [
  now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(),
  now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), 0,
];

fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n');

// ─── Git: branch + commit + push ─────────────────────────────────────────────
const branch = `edit/${SKILL_ID.slice(0, 8)}-${ISSUE_NUMBER}`;

execSync('git config user.name "github-actions[bot]"');
execSync('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"');
execSync(`git checkout -b "${branch}"`);
execSync(`git add "${filepath}"`);
execSync(`git commit -m "feat(skills): update '${NAME}' (#${ISSUE_NUMBER})"`);
execSync(`git push origin "${branch}"`);

// ─── Open PR ──────────────────────────────────────────────────────────────────
const prBody = [
  `Closes #${ISSUE_NUMBER}`,
  ``,
  `## Change`,
  ``,
  `Updates skill **${NAME}** (\`${SKILL_ID}\`).`,
  ``,
  `| Field | Value |`,
  `|-------|-------|`,
  `| Name | ${NAME} |`,
  `| Classification | ${CLASSIFICATION} |`,
  `| Skill type | ${SKILL_TYPE} |`,
  `| Skill areas | ${matchesArea.join(', ') || '—'} |`,
  ``,
  `**Description**`,
  `> ${DESCRIPTION}`,
  ``,
  `_Proposed via the skill library site and created automatically by the edit bot._`,
].join('\n');

const prBodyFile = `/tmp/pr-body-${Date.now()}.md`;
fs.writeFileSync(prBodyFile, prBody);
const prTitle = `Edit skill: ${NAME}`;
const prUrl = gh(`pr create --title "${prTitle.replace(/"/g, '\\"')}" --body-file "${prBodyFile}" --head "${branch}" --base main`);
fs.unlinkSync(prBodyFile);

// ─── Comment on issue ─────────────────────────────────────────────────────────
comment(`✅ PR created: ${prUrl}\n\nA maintainer will review and merge the change. Once merged, the skill library will update automatically.`);

// Add label (ignore if it doesn't exist yet)
try {
  execSync(`gh issue edit ${ISSUE_NUMBER} --add-label "skill-edit"`, { stdio: 'ignore' });
} catch (_) {}

console.log(`Done. PR: ${prUrl}`);
