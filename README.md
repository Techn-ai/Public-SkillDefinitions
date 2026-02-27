# Quadim Public Skill Library

An open, interactive taxonomy of 1,227 professionally curated skill definitions — covering 19 domains from AI & Machine Learning to ESG & Sustainability.

**[View the live site →](https://techn-ai.github.io/Public-SkillDefinitions/)**

---

## What's in here

| Resource | Description |
|----------|-------------|
| `quadim-public-skilldefinitions/` | 1,227 individual skill JSON files (canonical source) |
| `docs/` | GitHub Pages static site |
| `scripts/build-index.js` | Build script — aggregates JSON files into optimised data files |
| `knowledge.yaml` | KCP manifest for structured knowledge discovery |
| `DESIGN-SPEC.md` | Full design and architecture specification |

## The site

A fully client-side SPA with hash-based routing. No server required.

**Six views:**
- `/` — Landing page with stats, classification grid, hub skills
- `#/explore` — Faceted browse with fuzzy search (Fuse.js)
- `#/skill/{id}` — Skill detail with relationships
- `#/graph` — D3.js force-directed relationship graph (401 nodes, 502 edges)
- `#/stats` — Chart.js distribution charts and contributor breakdown
- `#/about` — Data provenance and schema reference

**Tech stack:** Vanilla JS (ES2020) · D3.js · Fuse.js · Chart.js · CSS Custom Properties

## Run locally

```bash
# Build the data files (requires Node.js 18+)
node scripts/build-index.js

# Serve with any static server, e.g.:
npx serve docs
# or
python3 -m http.server 8000 --directory docs
```

Then open `http://localhost:8000` (or `http://localhost:3000`).

## Deploy

Push to `main` — the GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically runs the build script and deploys to GitHub Pages.

Enable Pages in repository Settings → Pages → Source: `gh-pages` branch.

## Schema

Each skill JSON has:
- `id` — UUID
- `name` — Skill name
- `description` — Detailed definition (avg 438 chars)
- `coversElement.classification` — Technical | Management_Leadership | Analytical | Communication | Relationship | Physical | Creative | NotSet
- `skillType.skillTypeClassification` — Transferable_and_Functional | Knowledge_Based | Personal_Trait_or_Attitude | NotSet
- `matchesArea[]` — Technical | Process | Organizational | Experience | Domain
- `relatesTo[]`, `isCompositeOf[]`, `isExtensionOf[]` — Relationship graph

## License

Apache 2.0 — see [LICENSE](LICENSE)

---

Built by [Quadim](https://www.quadim.ai) · Oslo, Norway
