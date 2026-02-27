# Quadim Public Skill Library -- GitHub Pages Design Specification

**Version:** 1.0
**Date:** 2026-02-27
**Status:** Ready for implementation

---

## 1. Data Analysis Summary

### 1.1 Dataset Overview

| Metric | Value |
|--------|-------|
| Total individual skill JSON files | 1,227 |
| Unique skill names | 1,209 |
| Duplicate names (different IDs) | 18 pairs |
| Entries in `All_data.json` (legacy subset) | 624 |
| Date range of skill creation | May 2022 -- April 2025 |
| Individual files total size | 3.1 MB |
| `All_data.json` size | 1.5 MB |
| Estimated lean index size | ~660 KB |

**Key decision:** The individual files (1,227) are the canonical source, not `All_data.json` (which only covers 624 earlier skills). A build step must aggregate the individual files into a single optimized JSON index for the site.

### 1.2 Schema (per skill)

```
{
  "name": string,                    // Display name (always present)
  "name_en": string | null,          // English name (often null or same as name)
  "id": uuid,                        // Unique identifier
  "description": string,             // Rich text, 1-5234 chars (avg 438)
  "description_en": string | null,   // English description (often just the name)

  "coversElement": {                 // PRIMARY CLASSIFICATION
    "classification": enum           // Technical | Management_Leadership | Analytical |
  },                                 // Communication | Relationship | Physical | Creative | NotSet

  "skillType": {                     // SKILL TYPE
    "skillTypeClassification": enum  // Transferable_and_Functional | Knowledge_Based |
  },                                 // Personal_Trait_or_Attitude | NotSet

  "matchesArea": [                   // SKILL AREAS (multi-select, 0-5 items)
    { "skillAreaClassification": enum }  // Technical | Process | Organizational |
  ],                                     // Experience | Domain | NotSet

  "taggedWith": [                    // External reference links (74 skills have these)
    { "tagName": url, "tagValue": "true" }
  ],

  // === RELATIONSHIP GRAPH ===
  "relatesTo": [ { id, name } ],         // Reference pointers (lightweight)
  "relatesToSkill": [ { full skill } ],   // Resolved related skills (full objects)
  "isCompositeOf": [ { id, name } ],      // "Part of" references
  "isCompositeOfSkill": [ { full } ],     // Resolved composite parents
  "isExtensionOf": [ { id, name } ],      // "Extends" references
  "isExtensionOfSkill": [ { full } ],     // Resolved extension parents

  // === METADATA ===
  "skillOwner": uuid,
  "skillOwnerUsername": string,       // Human, AI, or org name
  "editedBy": uuid,
  "editedByUsername": string,
  "currentVersion": int,
  "createdAt": [y, m, d, h, min, s, ns],  // Array format timestamp
  "lastEdited": [y, m, d, h, min, s, ns],
  "public": boolean,
  "hide": boolean,
  "networkReference": uuid | null,
  "skillDomains": [],                 // Always empty (future field)
  "skillAreaCategories": []           // Always empty (future field)
}
```

### 1.3 Classification Distributions

**coversElement (primary classification):**
| Classification | Count | Percentage |
|---------------|-------|------------|
| Technical | 605 | 49.3% |
| Management_Leadership | 244 | 19.9% |
| NotSet | 166 | 13.5% |
| Analytical | 105 | 8.6% |
| Communication | 44 | 3.6% |
| Relationship | 34 | 2.8% |
| Physical | 15 | 1.2% |
| Creative | 14 | 1.1% |

**skillType:**
| Type | Count | Percentage |
|------|-------|------------|
| Transferable_and_Functional | 745 | 60.7% |
| Knowledge_Based | 235 | 19.1% |
| NotSet | 166 | 13.5% |
| Personal_Trait_or_Attitude | 81 | 6.6% |

**matchesArea (multi-select, total assignments):**
| Area | Assignments |
|------|------------|
| Technical | 957 |
| Process | 522 |
| Organizational | 287 |
| Experience | 186 |
| Domain | 157 |

### 1.4 Relationship Graph Statistics

| Metric | Value |
|--------|-------|
| Skills with any graph connection | 187 (15.2%) |
| Skills with zero connections | 1,040 (84.8%) |
| Total relatesTo edges | 354 |
| Total isExtensionOf edges | 246 |
| Total graph edges | 600 |
| Most connected skill | "Scaling businesses" (18 edges) |
| Top hub skills | Raise Capital, Teamwork, SaaS Founder, Java development |

### 1.5 Domain Coverage (derived from name + description analysis)

| Domain | Count | % of Total |
|--------|-------|------------|
| Data & Analytics | 177 | 14.4% |
| Software Development | 157 | 12.8% |
| Networking & IoT | 125 | 10.2% |
| AI & Machine Learning | 118 | 9.6% |
| Cloud & Infrastructure | 91 | 7.4% |
| Leadership & Executive | 89 | 7.3% |
| ESG & Sustainability | 86 | 7.0% |
| Architecture & Design | 74 | 6.0% |
| Finance & Accounting | 74 | 6.0% |
| Communication & Soft Skills | 68 | 5.5% |
| Security & Cybersecurity | 63 | 5.1% |
| DevOps & Platform Engineering | 63 | 5.1% |
| Blockchain & Web3 | 56 | 4.6% |
| Governance & Compliance | 55 | 4.5% |
| Testing & Quality | 60 | 4.9% |
| Project & Product Management | 49 | 4.0% |
| Design & UX | 30 | 2.4% |
| HR & People | 30 | 2.4% |

Note: Many skills belong to multiple domains. 26.3% were not matched by the heuristic classifier and will need the site's UI to surface their `coversElement` and `matchesArea` metadata directly.

### 1.6 Interesting Patterns

1. **Dual authorship model:** 323 skills by human curators (Thor Henning Hetland, Selina Quadim, etc.) and 275 by "Froya co-worker" (AI agent). Froya-generated skills tend to have longer descriptions with embedded metadata footers.

2. **Three relationship types form a directed graph:** `relatesTo` (peer/sibling), `isCompositeOf` (parent/category), `isExtensionOf` (specialization/extension). This creates a navigable ontology.

3. **Tags are Wikipedia/reference links:** 74 skills have external reference URLs stored as tags, predominantly Wikipedia links.

4. **Sparse graph:** Only 15% of skills are connected. The graph visualization should emphasize clusters rather than trying to show the full disconnected graph.

5. **Description quality varies dramatically:** From 1 character to 5,234 characters. Average is 438. Management/Leadership skills have the richest descriptions (avg 1,506 chars).

---

## 2. Site Architecture

### 2.1 Pages / Views

The site uses hash-based routing (`#/path`) for GitHub Pages compatibility. All content renders in a single `index.html` shell.

| Route | View | Purpose |
|-------|------|---------|
| `#/` | Landing | Hero, stats, featured skills, quick search |
| `#/explore` | Browse/Explore | Filterable grid with facets, tag cloud, category navigation |
| `#/explore?q=...&type=...&area=...` | Filtered browse | URL-encoded filter state for shareability |
| `#/skill/{id}` | Skill Detail | Full skill card with description, metadata, relationships |
| `#/graph` | Relationship Graph | Force-directed graph of connected skills |
| `#/graph?focus={id}` | Focused Graph | Graph centered on a specific skill's neighborhood |
| `#/stats` | Dataset Stats | Visual overview of the taxonomy (charts, distributions) |
| `#/about` | About | Quadim context, data provenance, API information |

### 2.2 Data Loading Strategy

**Build step (pre-deployment):**
A Node.js script (`build-index.js`) reads all 1,227 individual JSON files and produces two optimized static files:

1. **`data/skills-index.json`** (~250 KB gzipped) -- Lean index for search/browse:
   ```json
   [{
     "id": "uuid",
     "name": "...",
     "desc": "first 500 chars...",
     "ce": "Technical",
     "st": "Transferable_and_Functional",
     "ma": ["Technical", "Process"],
     "domain": "AI & Machine Learning",
     "rt": ["skill-name-1", "skill-name-2"],
     "ic": ["parent-category"],
     "ie": ["extension-name"],
     "owner": "Thor Henning Hetland",
     "created": "2024-04-06",
     "tags": ["https://en.wikipedia.org/..."]
   }]
   ```

2. **`data/skills-full.json`** (~1.5 MB gzipped) -- Full data for skill detail pages, loaded on demand or lazily after initial render.

3. **`data/graph-edges.json`** (~30 KB) -- Pre-computed edge list for the graph visualization:
   ```json
   {
     "nodes": [{"id": "uuid", "name": "...", "ce": "Technical", "connections": 5}],
     "edges": [{"source": "uuid1", "target": "uuid2", "type": "relatesTo"}]
   }
   ```

**Runtime loading sequence:**
1. Page shell renders immediately (static HTML/CSS)
2. `skills-index.json` loads (search becomes functional within ~200ms)
3. Fuse.js search index builds in a Web Worker
4. `graph-edges.json` loads lazily when user navigates to graph view
5. Full skill data loads on-demand per skill detail page (or eagerly after initial paint)

### 2.3 Routing Implementation

```javascript
// Hash router - minimal, no dependencies
window.addEventListener('hashchange', route);
function route() {
  const hash = location.hash.slice(1) || '/';
  const [path, query] = hash.split('?');
  // Match routes and render views
}
```

---

## 3. Visual Design System

### 3.1 Design Philosophy

**Scandinavian Minimalism meets Data Density.** The site should feel like a well-curated reference tool -- clean surfaces, generous whitespace, precise typography, and information-dense where it matters. Think: Stripe documentation meets a Bloomberg terminal's clarity. Not playful, not corporate-generic. Professional, authoritative, trustworthy.

The skill taxonomy is fundamentally about *structure and relationships*. The design should make structure visible: clear hierarchy, consistent classification colors, obvious navigation paths.

### 3.2 Color System

**Base palette:**
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#FAFBFC` | Page background |
| `--bg-secondary` | `#FFFFFF` | Card/panel background |
| `--bg-tertiary` | `#F3F4F6` | Subtle section backgrounds, hover states |
| `--text-primary` | `#111827` | Headings, primary text |
| `--text-secondary` | `#4B5563` | Body text, descriptions |
| `--text-tertiary` | `#9CA3AF` | Captions, metadata, placeholders |
| `--border-default` | `#E5E7EB` | Card borders, dividers |
| `--border-subtle` | `#F3F4F6` | Inner dividers |

**Accent / Brand:**
| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-primary` | `#2563EB` | Links, primary buttons, active states (Quadim blue) |
| `--accent-primary-hover` | `#1D4ED8` | Hover state for primary accent |
| `--accent-primary-light` | `#EFF6FF` | Light background tint for accent areas |
| `--accent-secondary` | `#7C3AED` | Graph edges, secondary emphasis |

**Classification Colors (the most important palette -- used for badges, graph nodes, filters):**
| Classification | Hex | Background | Usage |
|---------------|-----|------------|-------|
| Technical | `#2563EB` | `#EFF6FF` | Blue -- largest group, anchoring color |
| Management_Leadership | `#7C3AED` | `#F5F3FF` | Purple -- authority, strategy |
| Analytical | `#0891B2` | `#ECFEFF` | Cyan/teal -- analysis, data |
| Communication | `#EA580C` | `#FFF7ED` | Orange -- warmth, human connection |
| Relationship | `#DB2777` | `#FDF2F8` | Pink -- interpersonal |
| Physical | `#059669` | `#ECFDF5` | Green -- tangible, grounded |
| Creative | `#D97706` | `#FFFBEB` | Amber -- energy, originality |
| NotSet | `#6B7280` | `#F9FAFB` | Gray -- unclassified |

**Skill Type Colors (secondary badges):**
| Type | Hex | Label |
|------|-----|-------|
| Transferable_and_Functional | `#2563EB` | Transferable |
| Knowledge_Based | `#7C3AED` | Knowledge |
| Personal_Trait_or_Attitude | `#DB2777` | Personal Trait |
| NotSet | `#6B7280` | -- |

**Dark mode (toggle in header):**
| Token | Light | Dark |
|-------|-------|------|
| `--bg-primary` | `#FAFBFC` | `#0F172A` |
| `--bg-secondary` | `#FFFFFF` | `#1E293B` |
| `--bg-tertiary` | `#F3F4F6` | `#334155` |
| `--text-primary` | `#111827` | `#F1F5F9` |
| `--text-secondary` | `#4B5563` | `#CBD5E1` |
| `--text-tertiary` | `#9CA3AF` | `#64748B` |
| `--border-default` | `#E5E7EB` | `#334155` |

Classification colors remain the same in both modes (they already have sufficient contrast). Badge backgrounds become 15% opacity overlays in dark mode.

### 3.3 Typography

**Font stack:**
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
```

Load Inter from Google Fonts (variable weight, 400-700). JetBrains Mono only if code snippets appear.

**Type scale:**
| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `--text-hero` | 48px / 3rem | 700 | 1.1 | Landing page hero |
| `--text-h1` | 32px / 2rem | 700 | 1.2 | Page titles |
| `--text-h2` | 24px / 1.5rem | 600 | 1.3 | Section headings |
| `--text-h3` | 18px / 1.125rem | 600 | 1.4 | Card titles, skill names |
| `--text-body` | 16px / 1rem | 400 | 1.6 | Body text |
| `--text-small` | 14px / 0.875rem | 400 | 1.5 | Metadata, captions |
| `--text-xs` | 12px / 0.75rem | 500 | 1.4 | Badges, tags, counters |

### 3.4 Spacing & Layout

**Spacing scale (8px base):**
`4px | 8px | 12px | 16px | 24px | 32px | 48px | 64px | 96px`

**Layout:**
- Max content width: `1280px`
- Side padding: `24px` (mobile), `48px` (tablet), `64px` (desktop)
- Card grid: CSS Grid with `auto-fill, minmax(320px, 1fr)` -- responsive without breakpoints
- Card gap: `24px`
- Card padding: `24px`
- Card border-radius: `12px`
- Card shadow: `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)`
- Card hover shadow: `0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)`

**Responsive breakpoints:**
- Mobile: < 640px
- Tablet: 640px -- 1024px
- Desktop: > 1024px

Desktop-first with responsive adjustments. The primary audience (HR professionals, talent managers) is overwhelmingly desktop, but the site must be fully functional on mobile.

### 3.5 Component Library

**Badge:**
```
[Technical]  -- pill shape, classification color bg + text
```
- Height: 24px
- Padding: 4px 10px
- Border-radius: 12px (full pill)
- Font: `--text-xs`, weight 500
- Background: classification tint color
- Text: classification dark color

**Skill Card (browse grid):**
```
+------------------------------------------+
|  [Technical]  [Transferable]             |
|                                          |
|  Java development                        |
|                                          |
|  Java is an object-oriented programming  |
|  language that produces software for...  |
|                                          |
|  Technical  Process                      |
|  ----                                    |
|  5 related  |  4 composite  |  5 extends |
+------------------------------------------+
```
- Width: fills grid column (min 320px)
- Top: classification badges (left-aligned)
- Title: `--text-h3`, truncated to 2 lines
- Description: `--text-body`, `--text-secondary`, truncated to 3 lines
- Bottom row: skill areas as small text tags, relationship counts
- Entire card is a link to `#/skill/{id}`
- Hover: lift shadow, slight scale (1.01)

**Search Input:**
```
+---[magnifying glass icon]---Search 1,227 skills...---+
```
- Full-width on landing, constrained width in header
- Height: 48px (landing) / 40px (header)
- Border-radius: 12px
- Border: 2px solid `--border-default`, focus: `--accent-primary`
- Icon: 20px, `--text-tertiary`
- Placeholder text: "Search 1,227 skills..."
- Debounced input (200ms) triggers Fuse.js search

**Filter Sidebar (explore view):**
```
Filters                      [Clear all]

CLASSIFICATION
  [x] Technical (605)
  [ ] Management & Leadership (244)
  [ ] Analytical (105)
  ...

SKILL TYPE
  [x] Transferable (745)
  [ ] Knowledge-Based (235)
  ...

SKILL AREA
  [ ] Technical (957)
  [ ] Process (522)
  ...

HAS RELATIONSHIPS
  [ ] Connected skills only (187)
```
- Left sidebar on desktop (280px wide), bottom sheet on mobile
- Checkbox filters with count badges
- Filter changes update URL hash and results instantly (client-side)

**Stat Counter (landing page):**
```
    1,227           600          19
    Skills        Connections    Domains
```
- Large number: `--text-hero` weight 700
- Label: `--text-small`, `--text-tertiary`, uppercase tracking
- Animated count-up on scroll into view

**Navigation Header:**
```
+--[Quadim logo]--Skills--Graph--Stats--About--[search]--[dark/light]--+
```
- Sticky, height 64px
- Background: `--bg-secondary` with subtle bottom border
- Logo: Quadim wordmark or "Q" mark + "Skill Library"
- Active route: underline accent, font-weight 600
- Mobile: hamburger menu

---

## 4. Detailed Wireframes

### 4.1 Landing Page (`#/`)

```
+=========================================================================+
|  [Q] Quadim Skill Library    Skills  Graph  Stats  About    [search] [D]|
+=========================================================================+
|                                                                         |
|                                                                         |
|         The Open Skill Taxonomy                                         |
|         1,227 professionally curated skill definitions                  |
|         for competence mapping, talent management,                      |
|         and workforce planning.                                         |
|                                                                         |
|         +--[icon]--Search skills...---------------------------------+   |
|         |                                                           |   |
|         +-----------------------------------------------------------+   |
|         Try: "Machine Learning"  "Leadership"  "Kubernetes"  "ESG"      |
|                                                                         |
+-------------------------------------------------------------------------+
|                                                                         |
|    1,227           8             600           3 years                   |
|    Skills      Classifications  Connections    of curation              |
|                                                                         |
+-------------------------------------------------------------------------+
|                                                                         |
|    Browse by Classification                                             |
|                                                                         |
|    +------------+  +-------------------+  +------------+  +-----------+ |
|    | [blue]     |  | [purple]          |  | [cyan]     |  | [orange]  | |
|    | Technical  |  | Management &      |  | Analytical |  | Communi-  | |
|    | 605 skills |  | Leadership        |  | 105 skills |  | cation    | |
|    |            |  | 244 skills        |  |            |  | 44 skills | |
|    +------------+  +-------------------+  +------------+  +-----------+ |
|    +------------+  +-------------------+  +------------+  +-----------+ |
|    | [pink]     |  | [green]           |  | [amber]    |  | [gray]    | |
|    | Relation-  |  | Physical          |  | Creative   |  | Unclas-   | |
|    | ship       |  | 15 skills         |  | 14 skills  |  | sified    | |
|    | 34 skills  |  |                   |  |            |  | 166       | |
|    +------------+  +-------------------+  +------------+  +-----------+ |
|                                                                         |
+-------------------------------------------------------------------------+
|                                                                         |
|    Most Connected Skills               Recently Added                   |
|                                                                         |
|    Scaling businesses (18)             Machine Learning for              |
|    Raise Capital (18)                    Cybersecurity Ops               |
|    Teamwork (18)                       AI Agent Development              |
|    SaaS Founder (15)                   AI Act                            |
|    Java development (15)               Retrieval Augmented               |
|    J2EE (12)                             Generation (RAG)               |
|    > View relationship graph           > Browse all skills              |
|                                                                         |
+-------------------------------------------------------------------------+
|                                                                         |
|    Skill Domains                                                        |
|                                                                         |
|    [interactive bubble/treemap chart showing domain distribution]        |
|    Data & Analytics 177 | Software Development 157 | Networking 125     |
|    AI & ML 118 | Cloud 91 | Leadership 89 | ESG 86 | ...               |
|                                                                         |
|    Each bubble is clickable, navigating to filtered explore view        |
|                                                                         |
+-------------------------------------------------------------------------+
|                                                                         |
|    Powered by Quadim -- The Competence Management Platform              |
|    Apache 2.0 License  |  GitHub  |  quadim.ai                         |
|                                                                         |
+=========================================================================+
```

**Annotations:**
- Hero section: No image, just typography. The "Open Skill Taxonomy" headline communicates authority and accessibility.
- Quick-search suggestions are clickable chips that pre-fill search.
- Classification cards are clickable, linking to `#/explore?ce=Technical` etc.
- The domain bubble chart uses D3.js circle packing or treemap. Each bubble's size = skill count, color = dominant classification. Clicking navigates to filtered view.
- "Most Connected" list links to `#/graph?focus={id}`.
- Stats counter animates on scroll with `IntersectionObserver`.

### 4.2 Browse/Explore Page (`#/explore`)

```
+=========================================================================+
|  [Q] Quadim Skill Library    Skills  Graph  Stats  About    [search] [D]|
+=========================================================================+
|                                                                         |
|  +--- Filters (280px) ---+  +--- Results (flex-grow) ----------------+ |
|  |                        |  |                                        | |
|  | Search                 |  |  1,227 skills          [Grid] [List]  | |
|  | +--[Search...]------+  |  |  Sorted by: Name | Connections | Date | |
|  |                        |  |                                        | |
|  | CLASSIFICATION         |  |  +----------------+ +----------------+| |
|  | [x] All               |  |  | [Technical]    | | [Mgt/Lead]     || |
|  |  [x] Technical  (605) |  |  | [Transferable] | | [Knowledge]    || |
|  |  [x] Mgt/Lead  (244)  |  |  |                | |                || |
|  |  [x] Analytical (105) |  |  | Docker         | | Financial      || |
|  |  [x] Communi.. (44)   |  |  |                | | leadership     || |
|  |  [x] Relations. (34)  |  |  | Docker is an   | |                || |
|  |  [x] Physical   (15)  |  |  | open platform  | | Financial      || |
|  |  [x] Creative   (14)  |  |  | for developing | | leaders are    || |
|  |  [x] NotSet    (166)  |  |  | shipping...    | | visionaries... || |
|  |                        |  |  |                | |                || |
|  | SKILL TYPE             |  |  | Technical      | | Experience     || |
|  |  [x] Transferable(745)|  |  | 3 related      | |                || |
|  |  [x] Knowledge  (235) |  |  +----------------+ +----------------+| |
|  |  [x] Personal    (81) |  |  +----------------+ +----------------+| |
|  |  [x] NotSet    (166)  |  |  | [Technical]    | | [Technical]    || |
|  |                        |  |  |                | | [Transferable] || |
|  | SKILL AREA             |  |  | AI Ethics      | |                || |
|  |  [ ] Technical  (957) |  |  |                | | Java           || |
|  |  [ ] Process    (522) |  |  | AI ethics is a | | development    || |
|  |  [ ] Organizat. (287) |  |  | system of      | |                || |
|  |  [ ] Experience (186) |  |  | moral...       | | Java is an     || |
|  |  [ ] Domain     (157) |  |  |                | | object-orient- || |
|  |                        |  |  | Technical      | | ed programming || |
|  | CONNECTIONS            |  |  | Organizational | | language...    || |
|  |  [ ] Has connections   |  |  | Domain         | |                || |
|  |     only (187)         |  |  | Experience     | | Technical      || |
|  |                        |  |  | Process        | | 5 related      || |
|  | CREATED                |  |  +----------------+ | 4 composite    || |
|  |  2022 [====|====] 2025|  |                      | 5 extends      || |
|  |                        |  |                      +----------------+| |
|  | [Clear all filters]    |  |                                        | |
|  +------------------------+  |  [Load more]  Showing 48 of 1,227     | |
|                               +---------------------------------------+ |
|                                                                         |
+=========================================================================+
```

**Annotations:**
- Filter sidebar collapses to a horizontal filter bar on mobile (or slide-in drawer).
- Results default to grid view. List view shows skills in a dense table format (name, classification, type, areas, connection count).
- Pagination: "Load more" button adds 48 more cards (virtual scrolling considered but overkill for ~1,200 items at 48-per-page).
- Sort options: Name (A-Z, Z-A), Connection Count (desc), Date Created (newest first, oldest first).
- Filter counts update in real-time as filters are toggled (client-side filtering is instant).
- All filter state is reflected in the URL hash for shareability.
- The date range slider is a simple dual-handle range input filtering by creation year.

### 4.3 Skill Detail Page (`#/skill/{id}`)

```
+=========================================================================+
|  [Q] Quadim Skill Library    Skills  Graph  Stats  About    [search] [D]|
+=========================================================================+
|                                                                         |
|  < Back to Skills                                                       |
|                                                                         |
|  +--------------------------------------------------------------------+ |
|  |                                                                    | |
|  |  [Technical]  [Transferable & Functional]                          | |
|  |                                                                    | |
|  |  Java development                                                  | |
|  |                                                                    | |
|  |  Java is an object-oriented programming language that produces     | |
|  |  software for multiple platforms. When a programmer writes a Java  | |
|  |  application, the compiled code (known as bytecode) runs on most   | |
|  |  operating systems (OS), including Windows, Linux and Mac OS.      | |
|  |  Java derives much of its syntax from the C and C++ programming   | |
|  |  languages.                                                        | |
|  |                                                                    | |
|  +--------------------------------------------------------------------+ |
|                                                                         |
|  +--- Metadata --------------------+  +--- Skill Areas ---------------+ |
|  |                                 |  |                                | |
|  |  Owner:    Regine Severinsen    |  |  [Technical]                   | |
|  |  Created:  February 7, 2023     |  |                                | |
|  |  Version:  0                    |  |                                | |
|  |  ID:       df5cbf46...          |  |                                | |
|  |                                 |  |                                | |
|  +---------------------------------+  +--------------------------------+ |
|                                                                         |
|  +--- Relationships (24 connections) --------------------------------+ |
|  |                                                                    | |
|  |  RELATES TO (5)                                                    | |
|  |  +----------+ +----------+ +----------+ +----------+ +----------+ | |
|  |  | J2EE     | | Java EE  | | java     | | java     | | java-    | | |
|  |  |          | |          | | servlet  | | agent    | | spaces   | | |
|  |  +----------+ +----------+ +----------+ +----------+ +----------+ | |
|  |                                                                    | |
|  |  PART OF (4)                                                       | |
|  |  +-------------+ +------------------+ +--------+ +-------------+  | |
|  |  | Systems     | | Functional       | | design | | Service     |  | |
|  |  | development | | Architecture     | |        | | design      |  | |
|  |  +-------------+ +------------------+ +--------+ +-------------+  | |
|  |                                                                    | |
|  |  EXTENDS (5)                                                       | |
|  |  +----------+ +----------+ +----------+ +----------+ +----------+ | |
|  |  | Spring   | | struts   | | REST     | | SOAP     | | maven    | | |
|  |  | MVC      | |          | |          | |          | |          | | |
|  |  +----------+ +----------+ +----------+ +----------+ +----------+ | |
|  |                                                                    | |
|  |  [View in relationship graph]                                      | |
|  +--------------------------------------------------------------------+ |
|                                                                         |
|  +--- External References ------------------------------------------+ |
|  |  (none for this skill)                                            | |
|  +--------------------------------------------------------------------+ |
|                                                                         |
+=========================================================================+
```

**Annotations:**
- Back link returns to previous explore state (preserving filters).
- Related skill chips are clickable, navigating to that skill's detail page.
- "View in relationship graph" navigates to `#/graph?focus={id}`.
- External references (tags) render as clickable links with favicons where available.
- On mobile, metadata and skill areas stack vertically.
- The relationships section groups by type with clear headers.
- Each related skill chip shows the skill name and a subtle classification color indicator.

### 4.4 Relationship Graph Page (`#/graph`)

```
+=========================================================================+
|  [Q] Quadim Skill Library    Skills  Graph  Stats  About    [search] [D]|
+=========================================================================+
|                                                                         |
|  Skill Relationship Graph                                               |
|  187 connected skills, 600 edges                                        |
|                                                                         |
|  +--- Controls (left) ---+  +--- Graph Canvas (full remaining) -----+ |
|  |                        |  |                                        | |
|  | Focus on skill:        |  |          o--o                          | |
|  | +--[Search...]------+  |  |         / \    o                       | |
|  |                        |  |     o--O    \  |                       | |
|  | EDGE TYPE              |  |    /   |  o--o-o                       | |
|  |  [x] relatesTo         |  |   o    |    \                          | |
|  |  [x] isExtensionOf     |  |        o     o--o                     | |
|  |  [x] isCompositeOf     |  |               |  \                    | |
|  |                        |  |           o---O---o                    | |
|  | NODE COLOR             |  |          /    |                        | |
|  |  = Classification      |  |     o---o     o                       | |
|  |                        |  |      \       / \                      | |
|  | NODE SIZE              |  |       o--o--o   o                     | |
|  |  = Connection count    |  |                                        | |
|  |                        |  |     [Zoom +] [Zoom -] [Reset]          | |
|  | [Show labels]          |  |                                        | |
|  | [Show only focused     |  |                                        | |
|  |  neighborhood]         |  |                                        | |
|  +------------------------+  +----------------------------------------+ |
|                                                                         |
|  Hover: "Java development" -- Technical, 15 connections                 |
|  Click a node to see its detail page.                                   |
|                                                                         |
+=========================================================================+
```

**Annotations:**
- D3.js force-directed graph. Only the 187 connected skills are shown (no disconnected floaters).
- Node size scales with connection count. Node color = classification color.
- Edge style: `relatesTo` = solid line, `isExtensionOf` = dashed, `isCompositeOf` = dotted.
- Hover a node: tooltip with name, classification, connection count. Node and its edges highlight.
- Click a node: navigate to skill detail page.
- Focus search: typing a skill name centers the graph on that node and highlights its neighborhood (depth-1 connections). Non-neighbors fade to 10% opacity.
- `#/graph?focus={id}` opens the graph pre-focused on that skill.
- Zoom/pan via mouse wheel and drag. Touch-friendly on tablet.
- "Show labels" toggle adds skill names as labels on nodes (off by default to reduce clutter).
- Performance: 187 nodes + 600 edges is very comfortable for D3 force simulation.

### 4.5 Stats Page (`#/stats`)

```
+=========================================================================+
|  [Q] Quadim Skill Library    Skills  Graph  Stats  About    [search] [D]|
+=========================================================================+
|                                                                         |
|  Dataset Overview                                                       |
|                                                                         |
|  +--- Donut Chart --------+  +--- Bar Chart -------------------------+ |
|  |                         |  |                                       | |
|  |  Classification         |  |  Skills by Domain                     | |
|  |  Distribution           |  |                                       | |
|  |      ____               |  |  Data & Analytics    ======== 177     | |
|  |    /  T   \             |  |  Software Dev        ======= 157      | |
|  |   | 605   |             |  |  Networking & IoT    ====== 125       | |
|  |   | M:244 |             |  |  AI & ML             ===== 118        | |
|  |    \  A   /             |  |  Cloud & Infra       ==== 91          | |
|  |      ----               |  |  Leadership          ==== 89          | |
|  |                         |  |  ESG & Sustainability=== 86           | |
|  +-------------------------+  |  ...                                  | |
|                               +---------------------------------------+ |
|                                                                         |
|  +--- Timeline ---------------------------------------------------+   |
|  |                                                                 |   |
|  |  Skills Created Over Time                                       |   |
|  |                                                                 |   |
|  |  200|                        ____                               |   |
|  |     |                  _____|    |____                           |   |
|  |  100|            _____|               |____                     |   |
|  |     |      _____|                          |________            |   |
|  |    0|_____|                                         |           |   |
|  |     2022    Q3     2023    Q3     2024    Q3   2025             |   |
|  |                                                                 |   |
|  +------- Hover for details per quarter --------------------------+   |
|                                                                         |
|  +--- Skill Type Pie ---+  +--- Skill Area Radar -------+              |
|  |                       |  |                             |              |
|  |  Transferable: 60.7%  |  |  Technical ----\            |              |
|  |  Knowledge:    19.1%  |  |  Process -------+           |              |
|  |  Personal:      6.6%  |  |  Organizational -+          |              |
|  |  NotSet:       13.5%  |  |  Experience ------+         |              |
|  |                       |  |  Domain -----------+        |              |
|  +-----------------------+  +-----------------------------+              |
|                                                                         |
|  +--- Contributors -------------------------------------------------+  |
|  |  Thor Henning Hetland: 323  |  Selina Quadim: 222               |  |
|  |  Froya co-worker: 275       |  Jan Helge Maurtvedt: 22         |  |
|  |  Regine Severinsen: 14      |  Rachel Wilson Rugelsj.: 10      |  |
|  +--------------------------------------------------------------+   |
|                                                                         |
+=========================================================================+
```

**Annotations:**
- Charts built with Chart.js (lighter than D3 for standard charts, ~60KB).
- All charts use the classification color palette for consistency.
- Charts are interactive: clicking a classification segment in the donut filters the browse view.
- Timeline shows skill creation frequency by quarter.
- Contributors section shows a horizontal bar chart or simple ranked list.

---

## 5. Technology Stack

### 5.1 Core

| Technology | Version | Purpose | Size (gzip) |
|-----------|---------|---------|-------------|
| Vanilla JS (ES2020+) | -- | Application logic, routing, state | 0 KB (no framework) |
| CSS Custom Properties | -- | Theming, dark mode | 0 KB |
| HTML5 | -- | Semantic markup | -- |

**Rationale:** No framework. 1,227 skills is a small enough dataset that vanilla JS handles it effortlessly. Avoiding React/Vue/Alpine eliminates build complexity, keeps the bundle tiny, and makes the site load in under 1 second. The routing is trivial (hash-based, ~30 lines). State management is a single JS object.

### 5.2 Libraries (CDN-loaded)

| Library | Version | Purpose | Size (gzip) |
|---------|---------|---------|-------------|
| **D3.js** (d3-force, d3-selection, d3-zoom) | 7.x | Relationship graph visualization | ~30 KB (tree-shaken modules only) |
| **Fuse.js** | 7.x | Client-side fuzzy search | ~6 KB |
| **Chart.js** | 4.x | Stats page charts (donut, bar, line) | ~60 KB |
| **Inter** (Google Fonts) | variable | Primary typeface | ~30 KB |

**Total additional JS:** ~96 KB gzipped
**Total page weight (estimated):** ~450 KB (HTML + CSS + JS + fonts + lean data index)

**Rationale for each:**
- **D3.js:** The only serious option for force-directed graph layouts in the browser. We only import the force simulation, selection, and zoom modules -- not the entire D3 bundle.
- **Fuse.js:** Best-in-class client-side fuzzy search. Handles typos, partial matches, weighted field search. The 1,227-item index builds in <50ms.
- **Chart.js:** Simpler API than D3 for standard charts (pie, bar, line). Canvas-based, performant, responsive out of the box. Used only on the Stats page (lazy-loaded).
- **No Alpine.js / Lit / Petite Vue:** The interactivity requirements (filter toggles, search, routing) are simple enough that vanilla event handlers are cleaner than adding a reactive framework. Keeps the mental model simple.

### 5.3 Build Tools

| Tool | Purpose |
|------|---------|
| **Node.js** (18+) | Build script runtime |
| `build-index.js` | Aggregates 1,227 JSON files into optimized index files |
| (optional) `esbuild` | Bundle/minify if JS grows beyond one file |
| GitHub Actions | CI/CD: run build script, deploy to GitHub Pages |

The build step is minimal: one Node.js script that reads the `quadim-public-skilldefinitions/` directory and writes three JSON files to `docs/data/`. The rest of the site is pure static files.

### 5.4 File Structure

```
Public-SkillDefinitions/
  quadim-public-skilldefinitions/   # 1,227 source JSON files (not deployed)
  All_data.json                     # Legacy aggregate (not used by site)

  docs/                             # GitHub Pages root
    index.html                      # Single page application shell
    css/
      main.css                      # All styles (~15 KB)
    js/
      app.js                        # Router, state, main logic (~8 KB)
      search.js                     # Fuse.js integration, search worker (~3 KB)
      graph.js                      # D3 graph visualization (~5 KB)
      charts.js                     # Chart.js stats page (~3 KB)
      domain-classifier.js          # Client-side domain classification (~2 KB)
    data/
      skills-index.json             # Lean search/browse index (~250 KB gzip)
      skills-full.json              # Full skill data for detail pages (~500 KB gzip)
      graph-edges.json              # Pre-computed graph data (~10 KB)
    assets/
      quadim-logo.svg               # Quadim branding
      og-image.png                  # Open Graph social sharing image (1200x630)
      favicon.svg                   # SVG favicon

  scripts/
    build-index.js                  # Build script

  knowledge.yaml                    # KCP manifest
  DESIGN-SPEC.md                    # This document
```

---

## 6. Implementation Plan

### Phase 1: Foundation (Day 1) -- Ship a working site

1. **Build script** (`scripts/build-index.js`)
   - Read all individual JSON files
   - Deduplicate by ID (keep latest version for duplicate names)
   - Generate `skills-index.json`, `skills-full.json`, `graph-edges.json`
   - Run domain classifier and embed domain field in index
   - Output stats summary to console

2. **HTML shell** (`docs/index.html`)
   - Semantic HTML5 structure with route containers
   - Meta tags (Open Graph, Twitter Card, description)
   - Font loading (Inter via Google Fonts)
   - CSS and JS includes

3. **CSS** (`docs/css/main.css`)
   - Full design system: custom properties, typography, spacing
   - Light and dark mode via `[data-theme]` attribute
   - Component styles: cards, badges, filters, header, footer
   - Responsive breakpoints
   - Transitions and hover states

4. **Core JS** (`docs/js/app.js`)
   - Hash router
   - Data loading (fetch + JSON parse)
   - Landing page render
   - Browse page with grid render
   - Skill detail page render
   - Dark mode toggle (persisted to localStorage)

5. **Search** (`docs/js/search.js`)
   - Fuse.js index on `name` (weight 2), `description` (weight 1), `domain` (weight 1)
   - Search input with debounce
   - Result rendering in browse grid

### Phase 2: Interactivity (Day 2) -- Make it impressive

6. **Filters** (extend `app.js`)
   - Classification, skill type, skill area checkboxes
   - Real-time count updates
   - URL hash synchronization
   - Clear all button
   - Date range slider

7. **Graph visualization** (`docs/js/graph.js`)
   - D3 force simulation with the 187 connected skills
   - Node coloring by classification
   - Node sizing by connection count
   - Edge styling by relationship type
   - Hover tooltips
   - Click-to-navigate
   - Focus/search functionality
   - Zoom/pan controls

8. **Stats page** (`docs/js/charts.js`)
   - Classification donut chart
   - Domain bar chart
   - Timeline area chart
   - Skill type distribution
   - Contributors list
   - Click-to-filter interactivity

### Phase 3: Polish (Day 3) -- Make it delightful

9. **Animations and transitions**
   - Stat counter count-up animation
   - Card entrance animations (stagger)
   - Page transition fades
   - Graph node hover pulse
   - Smooth scroll behavior

10. **Domain bubble visualization** (landing page)
    - D3 circle packing or treemap for domain distribution
    - Interactive hover/click

11. **Performance optimization**
    - Lazy load Chart.js and D3 (only when needed)
    - Image optimization for OG image
    - Preconnect to fonts.googleapis.com
    - Cache headers via `.nojekyll` + GitHub Pages config

12. **SEO and sharing**
    - Dynamic `<title>` and `<meta description>` per route
    - Open Graph tags
    - Structured data (JSON-LD for Dataset schema)
    - `sitemap.xml` if needed

### Optional Enhancements (backlog)

- **Keyboard navigation:** Arrow keys in grid, Escape to close, `/` to focus search
- **Export functionality:** Download filtered skills as JSON or CSV
- **Skill comparison:** Side-by-side view of 2-3 skills
- **Similar skills:** Use Fuse.js scoring to suggest "Skills similar to X"
- **Embedding:** `<iframe>` embed snippet for each skill card
- **API-like URL scheme:** `?skill=Java+development` as a direct link format

---

## 7. The "Wow Factor"

### What makes someone share this site:

1. **The relationship graph.** A force-directed graph of professional skills, color-coded by classification, where you can see how Java development connects to J2EE connects to Enterprise Architecture -- that is immediately visually striking and intellectually interesting. It invites exploration. The "focus on a skill and watch its neighborhood light up" interaction is the signature moment.

2. **The domain bubble chart on landing.** A rich, colorful treemap or circle-packing visualization of 19 skill domains instantly communicates the breadth and depth of the taxonomy. It says "this is a serious, comprehensive dataset" without words.

3. **The search speed.** Type a character and see results filter in real-time across 1,227 skills. Fuzzy matching means typos still find results. The instantaneousness feels magical for what appears to be a static site.

4. **The data density of the browse grid.** Each card packs classification badge + type badge + title + description excerpt + skill areas + relationship count into a clean, scannable format. You can quickly scan 12-16 skills per viewport and immediately understand the taxonomy structure.

5. **The dual authorship story.** The stats page reveals that 275 skills were generated by "Froya co-worker" (an AI agent) alongside 500+ human-curated skills. This is a genuinely interesting story about human-AI collaboration in knowledge curation.

### What makes it genuinely useful:

- **For HR professionals:** Browse by classification to find skills relevant to job descriptions. Filter by "Management_Leadership" + "Knowledge_Based" to find leadership competencies. Copy skill names and descriptions into competence frameworks.

- **For developers:** Search for a technology, see what it relates to, discover adjacent skills. The relationship graph reveals technology ecosystem connections.

- **For talent managers:** Use the domain distribution to understand coverage gaps. The stats page shows which areas are most densely defined.

- **For AI practitioners:** The 118 AI/ML skills form a comprehensive sub-taxonomy: from AI Ethics to RAG to MLOps to AI Agent Development.

---

## 8. knowledge.yaml Design (KCP Manifest)

```yaml
name: quadim-public-skill-library
version: 1.0.0
description: >
  Interactive visualization of Quadim's public skill definitions library.
  1,227 professionally curated skill definitions covering 19 domains,
  with relationship graph, faceted search, and statistical overview.

units:
  - id: site-shell
    path: docs/index.html
    description: >
      Single-page application shell. Contains all route containers,
      meta tags, font loading, and script includes. The <main> element
      holds route-specific content rendered by app.js.
    tags: [html, spa, entry-point]

  - id: design-system
    path: docs/css/main.css
    description: >
      Complete design system: CSS custom properties for colors, typography,
      spacing. Light and dark mode themes. Component styles for cards,
      badges, filters, header, footer. Responsive breakpoints at 640px
      and 1024px. No preprocessor -- pure CSS with custom properties.
    tags: [css, design-system, theming]

  - id: app-core
    path: docs/js/app.js
    description: >
      Application core: hash-based router, state management, data loading,
      view rendering for landing, browse, skill detail, and about pages.
      Manages filter state, pagination, sort order, and dark mode toggle.
      No framework dependencies -- vanilla ES2020 JS.
    tags: [javascript, router, state-management]
    depends_on: [design-system, data-index]

  - id: search-engine
    path: docs/js/search.js
    description: >
      Client-side fuzzy search powered by Fuse.js. Builds search index
      from skills-index.json with weighted fields (name: 2, description: 1,
      domain: 1). Debounced input handler (200ms). Exports search function
      consumed by app.js.
    tags: [javascript, search, fuse-js]
    depends_on: [data-index]

  - id: graph-visualization
    path: docs/js/graph.js
    description: >
      D3.js force-directed graph of the 187 connected skills and 600 edges.
      Nodes colored by coversElement classification, sized by connection count.
      Edges styled by relationship type (solid/dashed/dotted). Supports
      focus mode, zoom/pan, hover tooltips, and click-to-navigate.
    tags: [javascript, d3, visualization, graph]
    depends_on: [data-graph]

  - id: stats-charts
    path: docs/js/charts.js
    description: >
      Chart.js visualizations for the stats page: classification donut,
      domain horizontal bar, creation timeline, skill type distribution,
      and contributor ranking. Interactive -- chart segments link to
      filtered browse views.
    tags: [javascript, chart-js, visualization, stats]
    depends_on: [data-index]

  - id: domain-classifier
    path: docs/js/domain-classifier.js
    description: >
      Keyword-based domain classification logic. Assigns each skill to
      one of 19 domain categories based on name and description analysis.
      Used by the build script and optionally at runtime for unclassified
      skills. Categories: AI & ML, Data & Analytics, Software Development,
      Cloud & Infrastructure, etc.
    tags: [javascript, classification, nlp]

  - id: data-index
    path: docs/data/skills-index.json
    description: >
      Lean search/browse index. 1,227 entries with id, name, truncated
      description (500 chars), coversElement, skillType, matchesArea,
      domain classification, relationship names, owner, and creation date.
      ~250 KB gzipped. Generated by build-index.js.
    tags: [data, json, generated]

  - id: data-full
    path: docs/data/skills-full.json
    description: >
      Complete skill data for detail pages. Full descriptions, resolved
      relationship objects, tags, all metadata. ~500 KB gzipped.
      Loaded on-demand when user navigates to a skill detail page.
    tags: [data, json, generated]

  - id: data-graph
    path: docs/data/graph-edges.json
    description: >
      Pre-computed graph structure: 187 connected node objects and 600
      edge objects with source/target IDs and relationship type. Used
      exclusively by graph.js. ~10 KB.
    tags: [data, json, generated, graph]

  - id: build-script
    path: scripts/build-index.js
    description: >
      Node.js build script. Reads 1,227 individual JSON files from
      quadim-public-skilldefinitions/, deduplicates, runs domain classifier,
      extracts graph edges, and outputs three optimized JSON files to
      docs/data/. Run as: node scripts/build-index.js
    tags: [build, node-js, data-pipeline]
    depends_on: [domain-classifier]

  - id: source-data
    path: quadim-public-skilldefinitions/
    description: >
      Source directory containing 1,227 individual skill definition JSON
      files. Each file is named "{skill-name}-{uuid}.json". This is the
      canonical data source. Files span May 2022 to April 2025 and were
      created by human curators and the Froya AI co-worker agent.
    tags: [data, source, json]
```

---

## Appendix A: Interaction Details

### Search behavior
- **Threshold:** Fuse.js `threshold: 0.3` (fairly strict, but allows typos)
- **Keys with weights:** `name` (weight 2.0), `description` (weight 0.5), `domain` (weight 1.0)
- **Minimum characters:** 1 (start searching immediately)
- **Debounce:** 200ms after last keystroke
- **Max results:** 100 (paginated at 48 per page in grid)
- **Empty search:** Shows all skills (browse mode)

### Card hover state
- Transform: `translateY(-2px)` over 200ms ease
- Box-shadow: transitions from default to hover shadow over 200ms
- Cursor: pointer
- No color changes (keep it subtle)

### Dark mode toggle
- Icon: Sun (light mode active) / Moon (dark mode active)
- Transition: 300ms on all color properties
- Persisted: `localStorage.setItem('theme', 'dark'|'light')`
- Default: Respect `prefers-color-scheme` media query, then localStorage override

### Graph interactions
- **Hover node:**
  - Node scales to 1.3x
  - Connected edges become 2px and classification-colored
  - Unconnected nodes/edges fade to 20% opacity
  - Tooltip appears with: name, classification, connection count
- **Click node:** Navigate to `#/skill/{id}`
- **Drag node:** Reposition in force simulation (node becomes "fixed")
- **Double-click node:** Focus mode -- center on this node, show only depth-1 neighborhood
- **Scroll:** Zoom (0.5x to 4x range)
- **Drag canvas:** Pan

### Filter behavior
- Filters are AND across categories (classification AND skill type AND skill area)
- Filters are OR within a category (Technical OR Analytical)
- URL format: `#/explore?ce=Technical,Analytical&st=Knowledge_Based&q=machine`
- Filter changes are instantaneous (client-side, no re-fetch)

---

## Appendix B: Accessibility

- All interactive elements are keyboard-focusable
- Color is never the sole differentiator (badges have text labels alongside color)
- Graph nodes have aria-labels
- Search input has proper label association
- Skip-to-main-content link
- Focus ring: 2px solid `--accent-primary`, 2px offset
- Contrast ratios: all text meets WCAG AA (4.5:1 for body, 3:1 for large text)
- Reduced motion: `@media (prefers-reduced-motion)` disables animations

---

## Appendix C: Open Graph / Social

```html
<meta property="og:title" content="Quadim Public Skill Library" />
<meta property="og:description" content="Explore 1,227 professionally curated skill definitions. Open taxonomy for competence mapping and talent management." />
<meta property="og:image" content="https://quadim.github.io/Public-SkillDefinitions/assets/og-image.png" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://quadim.github.io/Public-SkillDefinitions/" />
<meta name="twitter:card" content="summary_large_image" />
```

The OG image should show: the domain bubble chart visualization rendered as a static PNG, with "Quadim Skill Library" text overlay and "1,227 skills / 19 domains / Open Source" subtitle.
