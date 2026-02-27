/**
 * app.js — Quadim Public Skill Library
 * Hash-based SPA router, data loading, view rendering.
 * No framework dependencies — vanilla ES2020.
 */

(function () {
  'use strict';

  // ─── State ──────────────────────────────────────────────────────────────────
  const state = {
    skills: [],        // lean index array
    fullData: null,    // map id→full skill (lazy loaded)
    graphData: null,   // {nodes, edges} (lazy loaded)
    loaded: false,
    filters: {
      q: '',
      ce: [],          // classification filter
      st: [],          // skill type filter
      ma: [],          // skill area filter
      hasConnections: false,
      domain: null,
    },
    exploreOffset: 0,
    sort: 'name',      // 'name' | 'connections' | 'created'
    prevHash: null,
    prevExploreState: null,
  };

  const PAGE_SIZE = 48;

  // ─── Classification labels ───────────────────────────────────────────────────
  const CE_LABELS = {
    Technical:             'Technical',
    Management_Leadership: 'Management & Leadership',
    Analytical:            'Analytical',
    Communication:         'Communication',
    Relationship:          'Relationship',
    Physical:              'Physical',
    Creative:              'Creative',
    NotSet:                'Unclassified',
  };

  const ST_LABELS = {
    Transferable_and_Functional:   'Transferable',
    Knowledge_Based:               'Knowledge-Based',
    Personal_Trait_or_Attitude:    'Personal Trait',
    NotSet:                        '—',
  };

  const MA_LABELS = {
    Technical:     'Technical',
    Process:       'Process',
    Organizational:'Organizational',
    Experience:    'Experience',
    Domain:        'Domain',
    NotSet:        '—',
  };

  const CE_ICONS = {
    Technical:             '⚙️',
    Management_Leadership: '🏆',
    Analytical:            '📊',
    Communication:         '💬',
    Relationship:          '🤝',
    Physical:              '💪',
    Creative:              '✨',
    NotSet:                '○',
  };

  const CE_BG_COLORS = {
    Technical:             '#2563EB',
    Management_Leadership: '#7C3AED',
    Analytical:            '#0891B2',
    Communication:         '#EA580C',
    Relationship:          '#DB2777',
    Physical:              '#059669',
    Creative:              '#D97706',
    NotSet:                '#6B7280',
  };

  // ─── Data loading ────────────────────────────────────────────────────────────
  async function loadData() {
    showView('loading');
    try {
      const base = getBasePath();
      const resp = await fetch(`${base}data/skills-index.json`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      state.skills = data;
      SkillSearch.init(data);
      state.loaded = true;
    } catch (e) {
      console.error('Failed to load skills-index.json:', e);
      document.getElementById('view-loading').innerHTML =
        `<div class="loading-spinner"><p style="color:var(--text-secondary)">Failed to load skill data. Please reload.</p></div>`;
      return;
    }
    route();
  }

  async function ensureFullData() {
    if (state.fullData) return;
    const base = getBasePath();
    const resp = await fetch(`${base}data/skills-full.json`);
    state.fullData = await resp.json();
  }

  async function ensureGraphData() {
    if (state.graphData) return;
    const base = getBasePath();
    const resp = await fetch(`${base}data/graph-edges.json`);
    state.graphData = await resp.json();
  }

  function getBasePath() {
    // Works for both local file:// and GitHub Pages subdirectory
    const scripts = document.querySelectorAll('script[src]');
    for (const s of scripts) {
      if (s.src.includes('app.js')) {
        return s.src.replace('js/app.js', '');
      }
    }
    return './';
  }

  // ─── Router ──────────────────────────────────────────────────────────────────
  function route() {
    if (!state.loaded) { loadData(); return; }

    const hash = location.hash.slice(1) || '/';
    const [path, qs] = hash.split('?');
    const params = qs ? Object.fromEntries(new URLSearchParams(qs)) : {};

    // Highlight active nav link
    document.querySelectorAll('.nav-link').forEach(a => {
      const route = a.dataset.route;
      a.classList.toggle('active', path.startsWith('/' + route));
    });

    if (path === '/' || path === '') {
      renderLanding();
    } else if (path === '/explore') {
      parseExploreParams(params);
      renderExplore();
    } else if (path.startsWith('/skill/')) {
      const id = path.slice('/skill/'.length);
      renderSkillDetail(id);
    } else if (path === '/graph') {
      renderGraph(params.focus || null);
    } else if (path === '/stats') {
      renderStats();
    } else if (path === '/about') {
      renderAbout();
    } else {
      renderLanding();
    }
  }

  function parseExploreParams(params) {
    state.filters.q  = params.q  || '';
    state.filters.ce = params.ce ? params.ce.split(',') : [];
    state.filters.st = params.st ? params.st.split(',') : [];
    state.filters.ma = params.ma ? params.ma.split(',') : [];
    state.filters.domain = params.domain || null;
    state.filters.hasConnections = params.hc === '1';
    state.sort = params.sort || 'name';
    state.exploreOffset = 0;
  }

  function buildExploreUrl(extra = {}) {
    const f = { ...state.filters, ...extra };
    const p = new URLSearchParams();
    if (f.q)  p.set('q', f.q);
    if (f.ce && f.ce.length) p.set('ce', f.ce.join(','));
    if (f.st && f.st.length) p.set('st', f.st.join(','));
    if (f.ma && f.ma.length) p.set('ma', f.ma.join(','));
    if (f.domain) p.set('domain', f.domain);
    if (f.hasConnections) p.set('hc', '1');
    if (state.sort !== 'name') p.set('sort', state.sort);
    const qs = p.toString();
    return `#/explore${qs ? '?' + qs : ''}`;
  }

  // ─── View switching ──────────────────────────────────────────────────────────
  function showView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById(`view-${name}`);
    if (el) el.classList.add('active');
  }

  // ─── Utility ─────────────────────────────────────────────────────────────────
  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function badge(ce) {
    const label = CE_LABELS[ce] || ce;
    return `<span class="badge badge-${esc(ce)}">${esc(label)}</span>`;
  }

  function badgeType(st) {
    const label = ST_LABELS[st] || st;
    if (st === 'NotSet') return '';
    return `<span class="badge badge-type">${esc(label)}</span>`;
  }

  function badgeArea(ma) {
    return `<span class="badge badge-area">${esc(MA_LABELS[ma] || ma)}</span>`;
  }

  function relCount(s) {
    return (s.rt?.length || 0) + (s.ic?.length || 0) + (s.ie?.length || 0);
  }

  function countsByField(skills, field) {
    const counts = {};
    for (const s of state.skills) {
      const val = s[field];
      counts[val] = (counts[val] || 0) + 1;
    }
    return counts;
  }

  function getFilteredSkills() {
    let result = SkillSearch.filter(state.skills, state.filters);

    // Sort
    if (state.sort === 'connections') {
      result = result.slice().sort((a, b) => (b.connections || 0) - (a.connections || 0));
    } else if (state.sort === 'created') {
      result = result.slice().sort((a, b) => (b.created || '').localeCompare(a.created || ''));
    } else {
      result = result.slice().sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }

  // ─── Landing Page ────────────────────────────────────────────────────────────
  function renderLanding() {
    showView('landing');

    const totalConnections = state.skills.reduce((n, s) => n + (s.connections || 0), 0);
    const uniqueDomains = new Set(state.skills.map(s => s.domain).filter(Boolean)).size;

    // Classification counts
    const ceCounts = {};
    for (const s of state.skills) {
      ceCounts[s.ce] = (ceCounts[s.ce] || 0) + 1;
    }

    // Hub skills (most connections)
    const hubs = state.skills
      .filter(s => (s.connections || 0) > 0)
      .sort((a, b) => (b.connections || 0) - (a.connections || 0))
      .slice(0, 6);

    // Recently added
    const recent = state.skills
      .filter(s => s.created)
      .sort((a, b) => b.created.localeCompare(a.created))
      .slice(0, 6);

    const classCards = Object.entries(CE_LABELS).map(([key, label]) => {
      const count = ceCounts[key] || 0;
      if (!count) return '';
      const icon = CE_ICONS[key] || '○';
      const color = CE_BG_COLORS[key] || '#6B7280';
      return `
        <a href="#/explore?ce=${encodeURIComponent(key)}" class="classification-card">
          <div class="classification-card-icon" style="background:${color}20">
            <span style="font-size:1.25rem">${icon}</span>
          </div>
          <div class="classification-card-name">${esc(label)}</div>
          <div class="classification-card-count">${count.toLocaleString()} skills</div>
        </a>`;
    }).join('');

    const hubItems = hubs.map(s => `
      <a href="#/skill/${esc(s.id)}" class="hub-item">
        <span class="hub-item-name">${esc(s.name)}</span>
        <span class="hub-item-count">${s.connections} connections</span>
      </a>`).join('');

    const recentItems = recent.map(s => `
      <a href="#/skill/${esc(s.id)}" class="hub-item">
        <span class="hub-item-name">${esc(s.name)}</span>
        <span class="hub-item-count">${s.created || ''}</span>
      </a>`).join('');

    const suggestions = ['Machine Learning', 'Leadership', 'Kubernetes', 'ESG', 'Java', 'Cybersecurity'];

    document.getElementById('view-landing').innerHTML = `
      <!-- Hero -->
      <section class="hero">
        <div class="hero-inner">
          <p class="hero-eyebrow">Open Skill Taxonomy</p>
          <h1 class="hero-title">The Quadim Skill Library</h1>
          <p class="hero-subtitle">
            ${state.skills.length.toLocaleString()} professionally curated skill definitions
            for competence mapping, talent management, and workforce planning.
          </p>

          <div class="hero-search-wrap">
            <svg class="hero-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="search"
              id="landing-search"
              class="hero-search"
              placeholder="Search ${state.skills.length.toLocaleString()} skills…"
              aria-label="Search skills"
              autocomplete="off"
            />
          </div>

          <div class="hero-suggestions">
            <span>Try:</span>
            ${suggestions.map(s => `<button class="suggestion-chip" data-q="${esc(s)}">${esc(s)}</button>`).join('')}
          </div>
        </div>
      </section>

      <!-- Stats strip -->
      <section class="stats-strip" aria-label="Dataset statistics">
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-number" data-target="${state.skills.length}">${state.skills.length.toLocaleString()}</span>
            <span class="stat-label">Skills</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">8</span>
            <span class="stat-label">Classifications</span>
          </div>
          <div class="stat-item">
            <span class="stat-number" data-target="${totalConnections}">${totalConnections.toLocaleString()}</span>
            <span class="stat-label">Connections</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${uniqueDomains}</span>
            <span class="stat-label">Domains</span>
          </div>
        </div>
      </section>

      <!-- Classification grid -->
      <section class="classification-section">
        <div class="section-inner">
          <h2 class="section-heading">Browse by Classification</h2>
          <div class="classification-grid">
            ${classCards}
          </div>
        </div>
      </section>

      <!-- Hub skills + recently added -->
      <section class="two-col-section">
        <div class="two-col-inner">
          <div>
            <h2 class="section-heading">Most Connected Skills</h2>
            <div class="hub-list">${hubItems}</div>
            <a href="#/graph" class="view-more-link">→ View relationship graph</a>
          </div>
          <div>
            <h2 class="section-heading">Recently Added</h2>
            <div class="hub-list">${recentItems}</div>
            <a href="#/explore?sort=created" class="view-more-link">→ Browse all skills</a>
          </div>
        </div>
      </section>
    `;

    // Bind landing search
    const landingSearch = document.getElementById('landing-search');
    if (landingSearch) {
      let debounce;
      landingSearch.addEventListener('input', (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          const q = e.target.value.trim();
          if (q) {
            location.hash = `#/explore?q=${encodeURIComponent(q)}`;
          }
        }, 300);
      });
      landingSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const q = e.target.value.trim();
          if (q) location.hash = `#/explore?q=${encodeURIComponent(q)}`;
        }
      });
    }

    // Suggestion chips
    document.querySelectorAll('.suggestion-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = btn.dataset.q;
        location.hash = `#/explore?q=${encodeURIComponent(q)}`;
      });
    });
  }

  // ─── Explore Page ────────────────────────────────────────────────────────────
  function renderExplore() {
    showView('explore');

    const filtered = getFilteredSkills();
    const visible = filtered.slice(0, state.exploreOffset + PAGE_SIZE);
    const hasMore = filtered.length > visible.length;

    // Count breakdowns for filter UI
    const ceCounts = {};
    const stCounts = {};
    const maCounts = {};
    for (const s of state.skills) {
      ceCounts[s.ce] = (ceCounts[s.ce] || 0) + 1;
      stCounts[s.st] = (stCounts[s.st] || 0) + 1;
      for (const a of (s.ma || [])) {
        maCounts[a] = (maCounts[a] || 0) + 1;
      }
    }

    const filterCE = Object.entries(CE_LABELS).map(([key, label]) => {
      const count = ceCounts[key] || 0;
      const checked = state.filters.ce.includes(key);
      return `
        <label class="filter-item">
          <input type="checkbox" data-filter="ce" data-value="${esc(key)}" ${checked ? 'checked' : ''} />
          <span class="filter-item-label">${esc(label)}</span>
          <span class="filter-item-count">${count}</span>
        </label>`;
    }).join('');

    const filterST = Object.entries(ST_LABELS).filter(([k]) => k !== 'NotSet').map(([key, label]) => {
      const count = stCounts[key] || 0;
      const checked = state.filters.st.includes(key);
      return `
        <label class="filter-item">
          <input type="checkbox" data-filter="st" data-value="${esc(key)}" ${checked ? 'checked' : ''} />
          <span class="filter-item-label">${esc(label)}</span>
          <span class="filter-item-count">${count}</span>
        </label>`;
    }).join('');

    const filterMA = Object.entries(MA_LABELS).filter(([k]) => k !== 'NotSet').map(([key, label]) => {
      const count = maCounts[key] || 0;
      const checked = state.filters.ma.includes(key);
      return `
        <label class="filter-item">
          <input type="checkbox" data-filter="ma" data-value="${esc(key)}" ${checked ? 'checked' : ''} />
          <span class="filter-item-label">${esc(label)}</span>
          <span class="filter-item-count">${count}</span>
        </label>`;
    }).join('');

    const cards = visible.map(renderSkillCard).join('');

    const emptyState = filtered.length === 0
      ? `<div class="empty-state">
           <h3>No skills found</h3>
           <p>Try adjusting your search or filters.</p>
         </div>`
      : '';

    document.getElementById('view-explore').innerHTML = `
      <div class="explore-layout">
        <!-- Filter sidebar -->
        <aside class="filter-sidebar" aria-label="Filters">
          <div class="filter-header">
            <span class="filter-title">Filters</span>
            <button class="filter-clear" id="filter-clear">Clear all</button>
          </div>

          <div class="explore-search-wrap">
            <input
              type="search"
              id="explore-search"
              class="explore-search"
              placeholder="Search skills…"
              value="${esc(state.filters.q)}"
              aria-label="Search skills"
            />
          </div>

          <div class="filter-group">
            <span class="filter-group-label">Classification</span>
            ${filterCE}
          </div>

          <div class="filter-group">
            <span class="filter-group-label">Skill Type</span>
            ${filterST}
          </div>

          <div class="filter-group">
            <span class="filter-group-label">Skill Area</span>
            ${filterMA}
          </div>

          <div class="filter-group">
            <span class="filter-group-label">Connections</span>
            <label class="filter-item">
              <input type="checkbox" id="filter-hc" ${state.filters.hasConnections ? 'checked' : ''} />
              <span class="filter-item-label">Has connections only</span>
            </label>
          </div>
        </aside>

        <!-- Results -->
        <div class="results-area">
          <div class="results-header">
            <span class="results-count">${filtered.length.toLocaleString()} skills</span>
            <div class="results-sort">
              <label for="sort-select" style="font-size:var(--text-small);color:var(--text-tertiary)">Sort:</label>
              <select id="sort-select" class="sort-select" aria-label="Sort by">
                <option value="name" ${state.sort === 'name' ? 'selected' : ''}>Name A–Z</option>
                <option value="connections" ${state.sort === 'connections' ? 'selected' : ''}>Most Connected</option>
                <option value="created" ${state.sort === 'created' ? 'selected' : ''}>Newest First</option>
              </select>
            </div>
          </div>

          ${emptyState}
          <div class="card-grid" id="explore-grid">${cards}</div>

          ${hasMore ? `
            <div class="load-more-wrap">
              <button class="btn-load-more" id="load-more">
                Load more (${filtered.length - visible.length} remaining)
              </button>
            </div>` : ''}
        </div>
      </div>
    `;

    // Bind filter events
    bindExploreEvents();
  }

  function renderSkillCard(s) {
    const rc = relCount(s);
    const relInfo = rc > 0
      ? `<span class="card-rel-count">⟷ ${rc}</span>`
      : '';
    const areasBadges = (s.ma || []).slice(0, 3).map(a => badgeArea(a)).join('');

    return `
      <a href="#/skill/${esc(s.id)}" class="skill-card card-animate" title="${esc(s.name)}">
        <div class="card-badges">
          ${badge(s.ce)}
          ${badgeType(s.st)}
        </div>
        <div class="card-name">${esc(s.name)}</div>
        <div class="card-desc">${esc(s.desc)}</div>
        <div class="card-areas">${areasBadges}</div>
        <div class="card-footer">
          ${relInfo}
          ${s.domain ? `<span style="color:var(--text-tertiary);font-size:var(--text-xs)">${esc(s.domain)}</span>` : ''}
        </div>
      </a>`;
  }

  function bindExploreEvents() {
    // Search input with debounce
    const searchEl = document.getElementById('explore-search');
    if (searchEl) {
      let debounceTm;
      searchEl.addEventListener('input', (e) => {
        clearTimeout(debounceTm);
        debounceTm = setTimeout(() => {
          state.filters.q = e.target.value;
          state.exploreOffset = 0;
          history.replaceState(null, '', buildExploreUrl());
          renderExplore();
        }, 200);
      });
    }

    // Checkbox filters
    document.querySelectorAll('input[data-filter]').forEach(cb => {
      cb.addEventListener('change', () => {
        const field = cb.dataset.filter;
        const val = cb.dataset.value;
        if (cb.checked) {
          if (!state.filters[field].includes(val)) state.filters[field].push(val);
        } else {
          state.filters[field] = state.filters[field].filter(v => v !== val);
        }
        state.exploreOffset = 0;
        history.replaceState(null, '', buildExploreUrl());
        renderExplore();
      });
    });

    // Has connections
    const hcEl = document.getElementById('filter-hc');
    if (hcEl) {
      hcEl.addEventListener('change', () => {
        state.filters.hasConnections = hcEl.checked;
        state.exploreOffset = 0;
        history.replaceState(null, '', buildExploreUrl());
        renderExplore();
      });
    }

    // Sort
    const sortEl = document.getElementById('sort-select');
    if (sortEl) {
      sortEl.addEventListener('change', () => {
        state.sort = sortEl.value;
        state.exploreOffset = 0;
        history.replaceState(null, '', buildExploreUrl());
        renderExplore();
      });
    }

    // Clear all
    const clearEl = document.getElementById('filter-clear');
    if (clearEl) {
      clearEl.addEventListener('click', () => {
        state.filters = { q: '', ce: [], st: [], ma: [], hasConnections: false, domain: null };
        state.exploreOffset = 0;
        history.replaceState(null, '', '#/explore');
        renderExplore();
      });
    }

    // Load more
    const loadMoreEl = document.getElementById('load-more');
    if (loadMoreEl) {
      loadMoreEl.addEventListener('click', () => {
        state.exploreOffset += PAGE_SIZE;
        renderExplore();
        // Smooth scroll to new cards
        const grid = document.getElementById('explore-grid');
        if (grid) {
          const newCards = grid.querySelectorAll('.skill-card');
          const target = newCards[newCards.length - PAGE_SIZE];
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }

  // ─── Skill Detail ────────────────────────────────────────────────────────────
  async function renderSkillDetail(id) {
    showView('loading');
    await ensureFullData();

    const full = state.fullData[id];
    const lean = state.skills.find(s => s.id === id);

    if (!full && !lean) {
      showView('skill');
      document.getElementById('view-skill').innerHTML = `
        <div class="skill-detail">
          <div class="breadcrumb">
            <a href="#/explore">Skills</a>
            <span class="breadcrumb-sep">/</span>
            <span>Not found</span>
          </div>
          <p style="color:var(--text-secondary)">Skill not found.</p>
        </div>`;
      return;
    }

    const skill = full || lean;
    const rc = (skill.relatesTo?.length || 0) + (skill.isCompositeOf?.length || 0) + (skill.isExtensionOf?.length || 0);
    const hasGraph = rc > 0;

    const relatesChips = (skill.relatesTo || []).map(r =>
      `<a href="#/skill/${esc(r.id)}" class="rel-chip">${esc(r.name)}</a>`).join('');
    const compositeChips = (skill.isCompositeOf || []).map(r =>
      `<a href="#/skill/${esc(r.id)}" class="rel-chip">${esc(r.name)}</a>`).join('');
    const extensionChips = (skill.isExtensionOf || []).map(r =>
      `<a href="#/skill/${esc(r.id)}" class="rel-chip">${esc(r.name)}</a>`).join('');

    const relSection = rc > 0 ? `
      <div class="relationships-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-3)">
          <h2 style="font-size:var(--text-h3);font-weight:600">Relationships (${rc})</h2>
          ${hasGraph ? `<a href="#/graph?focus=${esc(id)}" class="graph-link-btn">View in graph</a>` : ''}
        </div>
        ${skill.relatesTo?.length ? `
          <div class="rel-type-heading">Relates To (${skill.relatesTo.length})</div>
          <div class="rel-chips">${relatesChips}</div>` : ''}
        ${skill.isCompositeOf?.length ? `
          <div class="rel-type-heading">Part Of (${skill.isCompositeOf.length})</div>
          <div class="rel-chips">${compositeChips}</div>` : ''}
        ${skill.isExtensionOf?.length ? `
          <div class="rel-type-heading">Extends (${skill.isExtensionOf.length})</div>
          <div class="rel-chips">${extensionChips}</div>` : ''}
      </div>` : '';

    const tagsSection = skill.tags?.length ? `
      <div class="relationships-card">
        <h2 style="font-size:var(--text-h3);font-weight:600;margin-bottom:var(--sp-3)">External References</h2>
        <div class="rel-chips">
          ${skill.tags.map(t => `<a href="${esc(t)}" target="_blank" rel="noopener noreferrer" class="rel-chip">🔗 ${esc(t.replace('https://en.wikipedia.org/wiki/', 'Wikipedia: '))}</a>`).join('')}
        </div>
      </div>` : '';

    const areasHtml = (skill.ma || lean?.ma || []).map(a => badgeArea(a)).join('');

    // Construct GitHub view source URL from skill name + id
    const sourceFilename = `${skill.name}-${skill.id}.json`;
    const ghBase = 'https://github.com/Techn-ai/Public-SkillDefinitions';
    const viewUrl = `${ghBase}/blob/main/quadim-public-skilldefinitions/${encodeURIComponent(sourceFilename)}`;

    // Pre-build edit form values
    const editCe  = skill.ce  || lean?.ce  || 'NotSet';
    const editSt  = skill.st  || lean?.st  || 'NotSet';
    const editMa  = skill.ma  || lean?.ma  || [];
    const MA_ALL  = ['Technical','Organizational','Domain','Experience','Process','NotSet'];
    const maCheckboxes = MA_ALL.map(v => `
      <label class="edit-area-option">
        <input type="checkbox" name="edit-ma" value="${v}" ${editMa.includes(v) ? 'checked' : ''}/>
        <span>${v.replace(/_/g,' ')}</span>
      </label>`).join('');
    const ceOptions = Object.entries(CE_LABELS).map(([v,l]) =>
      `<option value="${v}" ${v === editCe ? 'selected' : ''}>${l}</option>`).join('');
    const stOptions = Object.entries(ST_LABELS).map(([v,l]) =>
      `<option value="${v}" ${v === editSt ? 'selected' : ''}>${l}</option>`).join('');

    showView('skill');
    document.getElementById('view-skill').innerHTML = `
      <div class="skill-detail">
        <div class="breadcrumb">
          <a href="#/explore">Skills</a>
          <span class="breadcrumb-sep">/</span>
          <span>${esc(skill.name)}</span>
        </div>

        <div class="skill-main-card">
          <div class="card-badges">
            ${badge(skill.ce || lean?.ce)}
            ${badgeType(skill.st || lean?.st)}
          </div>
          <h1 class="skill-title">${esc(skill.name)}</h1>
          <p class="skill-description">${esc(skill.description || lean?.desc || '')}</p>

          <div class="skill-actions">
            <button id="btn-edit-skill" class="btn-edit-skill">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086ZM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.25.25 0 0 0 .108-.064l6.286-6.286Z"/></svg>
              Edit this skill
            </button>
            <a href="${viewUrl}" target="_blank" rel="noopener noreferrer" class="btn-view-source">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.245a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.507a2.25 2.25 0 0 0-1.591.659l-.622.621a.75.75 0 0 1-1.06 0l-.622-.621A2.25 2.25 0 0 0 5.258 13H.75a.75.75 0 0 1-.75-.75Zm7.251 10.324.004-5.073-.002-2.253A2.25 2.25 0 0 0 5.003 2.5H1.5v9h3.757a3.75 3.75 0 0 1 1.994.574ZM8.755 4.75l-.004 7.322a3.752 3.752 0 0 1 1.992-.572H14.5v-9h-3.495a2.25 2.25 0 0 0-2.25 2.25Z"/></svg>
              View source
            </a>
          </div>
        </div>

        <div class="detail-grid">
          <div class="meta-card">
            <div class="meta-title">Metadata</div>
            ${skill.owner ? `<div class="meta-row"><span class="meta-key">Owner</span><span class="meta-value">${esc(skill.owner)}</span></div>` : ''}
            ${skill.created ? `<div class="meta-row"><span class="meta-key">Created</span><span class="meta-value">${esc(skill.created)}</span></div>` : ''}
            ${skill.version != null ? `<div class="meta-row"><span class="meta-key">Version</span><span class="meta-value">${skill.version}</span></div>` : ''}
            ${skill.domain ? `<div class="meta-row"><span class="meta-key">Domain</span><span class="meta-value">${esc(skill.domain)}</span></div>` : ''}
            <div class="meta-row">
              <span class="meta-key">ID</span>
              <span class="meta-value" style="font-family:var(--font-mono);font-size:0.75em;color:var(--text-tertiary)">${esc(skill.id.slice(0, 12))}…</span>
            </div>
          </div>

          <div class="meta-card">
            <div class="meta-title">Skill Areas</div>
            <div class="areas-list">${areasHtml || '<span style="color:var(--text-tertiary);font-size:var(--text-small)">None specified</span>'}</div>
          </div>
        </div>

        ${relSection}
        ${tagsSection}

        <!-- Edit skill section -->
        <div class="propose-rel-card" id="edit-skill-card">
          <button class="propose-rel-toggle" id="edit-skill-toggle" aria-expanded="false">
            <span>Edit this skill</span>
            <svg class="propose-chevron" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M4.427 7.427l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427z"/>
            </svg>
          </button>
          <div class="propose-rel-body" id="edit-skill-body" hidden>
            <p class="propose-hint-text">
              Suggest a correction or improvement to <strong>${esc(skill.name)}</strong>. Your changes will open a pre-filled GitHub issue and a maintainer will review and merge the PR.
            </p>
            <div class="edit-field-group">
              <label class="edit-label" for="edit-name">Name</label>
              <input type="text" id="edit-name" class="edit-input" value="${esc(skill.name)}" autocomplete="off" />
            </div>
            <div class="edit-field-group">
              <label class="edit-label" for="edit-description">Description</label>
              <textarea id="edit-description" class="edit-textarea" rows="4">${esc(skill.description || lean?.desc || '')}</textarea>
            </div>
            <div class="edit-field-group">
              <label class="edit-label" for="edit-classification">Classification</label>
              <select id="edit-classification" class="edit-select">${ceOptions}</select>
            </div>
            <div class="edit-field-group">
              <label class="edit-label" for="edit-skilltype">Skill type</label>
              <select id="edit-skilltype" class="edit-select">${stOptions}</select>
            </div>
            <div class="edit-field-group">
              <span class="edit-label">Skill areas</span>
              <div class="edit-areas-grid">${maCheckboxes}</div>
            </div>
            <button id="edit-submit" class="btn-propose-submit">
              Propose edit on GitHub →
            </button>
          </div>
        </div>

        <!-- Propose relationship section -->
        <div class="propose-rel-card" id="propose-rel-card">
          <button class="propose-rel-toggle" id="propose-rel-toggle" aria-expanded="false">
            <span>Propose new relationship</span>
            <svg class="propose-chevron" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M4.427 7.427l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427z"/>
            </svg>
          </button>
          <div class="propose-rel-body" id="propose-rel-body" hidden>
            <p class="propose-hint-text">
              Search for a skill to link to <strong>${esc(skill.name)}</strong>, choose the relationship type, then propose it — a pre-filled GitHub issue will open for review.
            </p>
            <div class="propose-search-wrap">
              <input type="search" id="propose-skill-search" class="propose-search" placeholder="Search skills…" autocomplete="off" aria-label="Search for target skill" aria-controls="propose-results" />
              <ul id="propose-results" class="propose-results" role="listbox" hidden></ul>
            </div>
            <div id="propose-selected-wrap" class="propose-selected-wrap" hidden>
              <span class="propose-selected-label">Target:</span>
              <span id="propose-selected-name" class="propose-selected-name"></span>
              <button id="propose-clear" class="propose-clear-btn" aria-label="Clear selection">×</button>
            </div>
            <fieldset class="propose-type-fieldset">
              <legend class="propose-type-legend">Relationship type</legend>
              <label class="propose-type-option">
                <input type="radio" name="rel-type" value="relatesTo" checked />
                <span class="propose-type-name">relates to</span>
                <span class="propose-type-desc">Peer / sibling skill</span>
              </label>
              <label class="propose-type-option">
                <input type="radio" name="rel-type" value="isCompositeOf" />
                <span class="propose-type-name">is part of</span>
                <span class="propose-type-desc">This skill belongs to the target as a parent category</span>
              </label>
              <label class="propose-type-option">
                <input type="radio" name="rel-type" value="isExtensionOf" />
                <span class="propose-type-name">extends</span>
                <span class="propose-type-desc">This skill is a specialisation of the target</span>
              </label>
            </fieldset>
            <button id="propose-submit" class="btn-propose-submit" disabled>
              Propose on GitHub →
            </button>
          </div>
        </div>
      </div>
    `;

    // Wire "Edit this skill" button in card header to expand the edit card
    document.getElementById('btn-edit-skill')?.addEventListener('click', () => {
      const card   = document.getElementById('edit-skill-card');
      const toggle = document.getElementById('edit-skill-toggle');
      const body   = document.getElementById('edit-skill-body');
      if (!card) return;
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toggle.setAttribute('aria-expanded', 'true');
      body.hidden = false;
    });

    bindEditSkill(skill);
    bindRelationshipProposal(skill);
  }

  function bindEditSkill(skill) {
    const toggle = document.getElementById('edit-skill-toggle');
    const body   = document.getElementById('edit-skill-body');
    const submit = document.getElementById('edit-submit');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', !expanded);
      body.hidden = expanded;
    });

    submit.addEventListener('click', () => {
      const name        = document.getElementById('edit-name').value.trim();
      const description = document.getElementById('edit-description').value.trim();
      const ce          = document.getElementById('edit-classification').value;
      const st          = document.getElementById('edit-skilltype').value;
      const ma          = [...document.querySelectorAll('input[name="edit-ma"]:checked')].map(el => el.value);

      const editData = JSON.stringify({
        skill_id:    skill.id,
        name,
        description,
        classification:  ce,
        skill_type:      st,
        matches_area:    ma,
      });

      const title = `Edit skill: ${name || skill.name}`;
      const body  = [
        `**Proposed edit for [${skill.name}](https://techn-ai.github.io/Public-SkillDefinitions/#/skill/${skill.id})**`,
        ``,
        `| Field | Value |`,
        `|-------|-------|`,
        `| **Name** | ${name} |`,
        `| **Classification** | ${ce} |`,
        `| **Skill type** | ${st} |`,
        `| **Skill areas** | ${ma.join(', ') || '—'} |`,
        ``,
        `**Description**`,
        `> ${description}`,
        ``,
        `**Why is this change needed?**`,
        `<!-- Please describe your reasoning -->`,
        ``,
        `---`,
        `<!-- edit-data: ${editData} -->`,
      ].join('\n');

      const url = new URL('https://github.com/Techn-ai/Public-SkillDefinitions/issues/new');
      url.searchParams.set('title',  title);
      url.searchParams.set('body',   body);
      url.searchParams.set('labels', 'skill-edit');
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    });
  }

  function bindRelationshipProposal(skill) {
    const toggle   = document.getElementById('propose-rel-toggle');
    const body     = document.getElementById('propose-rel-body');
    const searchEl = document.getElementById('propose-skill-search');
    const results  = document.getElementById('propose-results');
    const selWrap  = document.getElementById('propose-selected-wrap');
    const selName  = document.getElementById('propose-selected-name');
    const clearBtn = document.getElementById('propose-clear');
    const submit   = document.getElementById('propose-submit');
    if (!toggle) return;

    let selectedSkill = null;

    // Expand/collapse
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', !expanded);
      body.hidden = expanded;
    });

    // Search with debounce
    let debTm;
    searchEl.addEventListener('input', () => {
      clearTimeout(debTm);
      debTm = setTimeout(() => {
        const q = searchEl.value.trim();
        if (!q) { results.hidden = true; results.innerHTML = ''; return; }

        const hits = SkillSearch.search(q, 8).filter(s => s.id !== skill.id);
        if (!hits.length) { results.hidden = true; return; }

        results.innerHTML = hits.map(s => `
          <li role="option" class="propose-result-item" data-id="${esc(s.id)}" data-name="${esc(s.name)}">
            ${badge(s.ce)}<span class="propose-result-name">${esc(s.name)}</span>
          </li>`).join('');
        results.hidden = false;
      }, 150);
    });

    // Select a result
    results.addEventListener('click', (e) => {
      const item = e.target.closest('.propose-result-item');
      if (!item) return;
      selectedSkill = { id: item.dataset.id, name: item.dataset.name };
      selName.textContent = selectedSkill.name;
      selWrap.hidden = false;
      results.hidden = true;
      searchEl.value = '';
      submit.disabled = false;
    });

    // Clear selection
    clearBtn.addEventListener('click', () => {
      selectedSkill = null;
      selWrap.hidden = true;
      submit.disabled = true;
      searchEl.value = '';
      searchEl.focus();
    });

    // Close results on outside click
    document.addEventListener('click', (e) => {
      if (!document.getElementById('propose-rel-card')?.contains(e.target)) {
        results.hidden = true;
      }
    }, { capture: true, once: false });

    // Submit — open pre-filled GitHub issue
    submit.addEventListener('click', () => {
      if (!selectedSkill) return;
      const relType = document.querySelector('input[name="rel-type"]:checked')?.value || 'relatesTo';
      const relLabel = { relatesTo: 'relates to', isCompositeOf: 'is part of', isExtensionOf: 'extends' }[relType];

      const proposalData = JSON.stringify({
        source_id:   skill.id,
        source_name: skill.name,
        target_id:   selectedSkill.id,
        target_name: selectedSkill.name,
        type:        relType,
      });

      const title = `Add relationship: ${skill.name} → ${selectedSkill.name} (${relLabel})`;
      const body  = [
        `**Proposed relationship**`,
        ``,
        `| | Skill |`,
        `|---|---|`,
        `| **Source** | ${skill.name} (\`${skill.id}\`) |`,
        `| **Target** | ${selectedSkill.name} (\`${selectedSkill.id}\`) |`,
        `| **Type** | ${relLabel} |`,
        ``,
        `**Why is this relationship appropriate?**`,
        `<!-- Please describe your reasoning -->`,
        ``,
        `---`,
        `<!-- proposal-data: ${proposalData} -->`,
      ].join('\n');

      const url = new URL('https://github.com/Techn-ai/Public-SkillDefinitions/issues/new');
      url.searchParams.set('title',  title);
      url.searchParams.set('body',   body);
      url.searchParams.set('labels', 'relationship-proposal');
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    });
  }

  // ─── Graph Page ──────────────────────────────────────────────────────────────
  async function renderGraph(focusId) {
    showView('loading');
    await ensureGraphData();
    showView('graph');

    const { nodes, edges } = state.graphData;

    document.getElementById('view-graph').innerHTML = `
      <div class="graph-page">
        <h1 class="page-title">Skill Relationship Graph</h1>
        <p class="page-subtitle" style="margin-bottom:var(--sp-4)">${nodes.length} connected skills · ${edges.length} edges</p>

        <div class="graph-layout">
          <div class="graph-controls">
            <div class="control-group">
              <span class="control-group-label">Focus on skill</span>
              <input type="search" id="graph-focus-search" class="graph-search" placeholder="Search skill…" value="${focusId ? esc(nodes.find(n => n.id === focusId)?.name || '') : ''}" />
            </div>

            <div class="control-group">
              <span class="control-group-label">Edge Type</span>
              <label class="toggle-row">
                <input type="checkbox" id="edge-relates" checked /> relatesTo
              </label>
              <label class="toggle-row">
                <input type="checkbox" id="edge-extends" checked /> isExtensionOf
              </label>
              <label class="toggle-row">
                <input type="checkbox" id="edge-composite" checked /> isCompositeOf
              </label>
            </div>

            <div class="control-group">
              <span class="control-group-label">Display</span>
              <label class="toggle-row">
                <input type="checkbox" id="show-labels" /> Show labels
              </label>
              <label class="toggle-row">
                <input type="checkbox" id="neighborhood-only" /> Neighborhood only
              </label>
            </div>

            <div class="control-group">
              <span class="control-group-label">Legend</span>
              <div class="graph-legend">
                ${Object.entries(CE_LABELS).map(([k, v]) =>
                  `<div class="legend-item">
                    <div class="legend-dot" style="background:${CE_BG_COLORS[k]}"></div>
                    <span>${esc(v)}</span>
                  </div>`).join('')}
              </div>
            </div>
          </div>

          <div class="graph-canvas-wrap" id="graph-canvas-wrap">
            <svg id="graph-canvas"></svg>
            <div class="graph-tooltip" id="graph-tooltip"></div>
            <div class="graph-controls-bar">
              <button class="graph-btn" id="zoom-in" title="Zoom in">+</button>
              <button class="graph-btn" id="zoom-out" title="Zoom out">−</button>
              <button class="graph-btn" id="zoom-reset" title="Reset" style="font-size:12px">⌂</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Initialize D3 graph
    if (typeof SkillGraph !== 'undefined') {
      SkillGraph.init({
        nodes,
        edges,
        focusId,
        colorMap: CE_BG_COLORS,
        onNodeClick: (id) => { location.hash = `#/skill/${id}`; },
      });
    }
  }

  // ─── Stats Page ──────────────────────────────────────────────────────────────
  function renderStats() {
    showView('stats');

    // Compute stats
    const ceCounts = {};
    const stCounts = {};
    const domainCounts = {};
    const ownerCounts = {};
    const monthCounts = {};

    for (const s of state.skills) {
      ceCounts[s.ce] = (ceCounts[s.ce] || 0) + 1;
      stCounts[s.st] = (stCounts[s.st] || 0) + 1;
      if (s.domain) domainCounts[s.domain] = (domainCounts[s.domain] || 0) + 1;
      if (s.owner) ownerCounts[s.owner] = (ownerCounts[s.owner] || 0) + 1;
      if (s.created) {
        const month = s.created.slice(0, 7); // YYYY-MM
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      }
    }

    const topDomains = Object.entries(domainCounts).sort((a,b) => b[1]-a[1]).slice(0, 12);
    const topOwners = Object.entries(ownerCounts).sort((a,b) => b[1]-a[1]).slice(0, 8);

    const contributors = topOwners.map(([name, count]) => `
      <div class="contributor-item">
        <span class="contributor-name">${esc(name)}</span>
        <span class="contributor-count">${count}</span>
      </div>`).join('');

    document.getElementById('view-stats').innerHTML = `
      <div class="stats-page">
        <h1 class="page-title">Dataset Overview</h1>
        <p class="page-subtitle">Distribution, trends, and authorship of the Quadim skill library</p>

        <div class="charts-grid">
          <div class="chart-card">
            <h2 class="chart-card-title">Classification Distribution</h2>
            <canvas id="chart-ce" height="280"></canvas>
          </div>
          <div class="chart-card">
            <h2 class="chart-card-title">Skill Type Distribution</h2>
            <canvas id="chart-st" height="280"></canvas>
          </div>
          <div class="chart-card wide">
            <h2 class="chart-card-title">Skills by Domain</h2>
            <canvas id="chart-domain" height="300"></canvas>
          </div>
          <div class="chart-card wide">
            <h2 class="chart-card-title">Skills Created Over Time</h2>
            <canvas id="chart-timeline" height="200"></canvas>
          </div>
        </div>

        <div class="chart-card" style="margin-bottom:var(--sp-5)">
          <h2 class="chart-card-title">Contributors</h2>
          <div class="contributors-list">${contributors}</div>
        </div>
      </div>
    `;

    // Render charts
    if (typeof SkillCharts !== 'undefined') {
      SkillCharts.render({
        ceCounts,
        stCounts,
        domainCounts: Object.fromEntries(topDomains),
        monthCounts,
        CE_LABELS,
        ST_LABELS,
        CE_BG_COLORS,
      });
    }
  }

  // ─── About Page ──────────────────────────────────────────────────────────────
  function renderAbout() {
    showView('about');
    document.getElementById('view-about').innerHTML = `
      <div class="about-page">
        <h1 class="page-title">About</h1>
        <p class="page-subtitle">The Quadim Public Skill Library</p>

        <div class="about-section">
          <h2>What this is</h2>
          <p>
            This is an open, publicly accessible taxonomy of professional skills curated by
            <a href="https://www.quadim.ai" target="_blank" rel="noopener">Quadim</a> — a
            competence management SaaS platform based in Oslo, Norway.
          </p>
          <p>
            The library contains ${state.skills.length.toLocaleString()} skill definitions
            spanning technical, leadership, analytical, and interpersonal domains.
            Skills were authored both by human curators and by <em>Frøya</em>, Quadim's
            AI co-worker agent.
          </p>
        </div>

        <div class="about-section">
          <h2>Data provenance</h2>
          <p>
            Skills span May 2022 through April 2025. Each skill has a unique UUID,
            a primary classification, optional skill areas, and a relationship graph
            connecting related, composite, and extension skills.
          </p>
          <p>
            The source data is available in the
            <a href="https://github.com/Techn-ai/Public-SkillDefinitions" target="_blank" rel="noopener">
              GitHub repository
            </a>
            under the Apache 2.0 License.
          </p>
        </div>

        <div class="about-section">
          <h2>Schema</h2>
          <table class="schema-table">
            <thead>
              <tr><th>Field</th><th>Description</th><th>Values</th></tr>
            </thead>
            <tbody>
              <tr><td><code>id</code></td><td>UUID identifier</td><td>UUID v4</td></tr>
              <tr><td><code>name</code></td><td>Skill name</td><td>String</td></tr>
              <tr><td><code>description</code></td><td>Detailed definition</td><td>1–5,234 chars</td></tr>
              <tr><td><code>coversElement</code></td><td>Primary classification</td><td>Technical · Management_Leadership · Analytical · Communication · Relationship · Physical · Creative · NotSet</td></tr>
              <tr><td><code>skillType</code></td><td>Skill type</td><td>Transferable_and_Functional · Knowledge_Based · Personal_Trait_or_Attitude · NotSet</td></tr>
              <tr><td><code>matchesArea</code></td><td>Skill areas (multi)</td><td>Technical · Process · Organizational · Experience · Domain</td></tr>
              <tr><td><code>relatesTo</code></td><td>Related skills (peer)</td><td>Array of {id, name}</td></tr>
              <tr><td><code>isCompositeOf</code></td><td>Parent category skills</td><td>Array of {id, name}</td></tr>
              <tr><td><code>isExtensionOf</code></td><td>Specialization of</td><td>Array of {id, name}</td></tr>
            </tbody>
          </table>
        </div>

        <div class="about-section">
          <h2>Quadim</h2>
          <p>
            <a href="https://www.quadim.ai" target="_blank" rel="noopener">Quadim</a>
            is a competence management platform that helps organisations map skill profiles,
            identify gaps, and build personalised learning paths — with AI integration
            throughout. Frøya, Quadim's AI co-worker, helps build and curate domain-specific
            competence libraries.
          </p>
          <p>
            Built with ♥ in Oslo, Norway.
          </p>
        </div>
      </div>
    `;
  }

  // ─── Header search ───────────────────────────────────────────────────────────
  function initHeaderSearch() {
    const headerSearch = document.getElementById('header-search');
    if (!headerSearch) return;
    let debounceTm;
    headerSearch.addEventListener('input', (e) => {
      clearTimeout(debounceTm);
      debounceTm = setTimeout(() => {
        const q = e.target.value.trim();
        if (q) {
          state.filters.q = q;
          state.filters.ce = [];
          state.filters.st = [];
          state.filters.ma = [];
          state.filters.domain = null;
          state.filters.hasConnections = false;
          state.exploreOffset = 0;
          location.hash = `#/explore?q=${encodeURIComponent(q)}`;
        }
      }, 300);
    });
    headerSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = e.target.value.trim();
        if (q) location.hash = `#/explore?q=${encodeURIComponent(q)}`;
      }
    });
  }

  // ─── Dark mode ───────────────────────────────────────────────────────────────
  function initTheme() {
    const stored = localStorage.getItem('theme');
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = stored || preferred;
    document.documentElement.setAttribute('data-theme', theme);

    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
      });
    }
  }

  // ─── Mobile menu ─────────────────────────────────────────────────────────────
  function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (!btn || !navLinks) return;
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !expanded);
      navLinks.style.display = expanded ? '' : 'flex';
      navLinks.style.flexDirection = 'column';
      navLinks.style.position = 'absolute';
      navLinks.style.top = 'var(--header-height)';
      navLinks.style.left = '0';
      navLinks.style.right = '0';
      navLinks.style.background = 'var(--bg-secondary)';
      navLinks.style.padding = 'var(--sp-4)';
      navLinks.style.borderBottom = '1px solid var(--border-default)';
      navLinks.style.zIndex = '99';
    });
  }

  // ─── Boot ────────────────────────────────────────────────────────────────────
  function init() {
    initTheme();
    initHeaderSearch();
    initMobileMenu();
    window.addEventListener('hashchange', route);
    loadData();
  }

  // Keyboard shortcut: / to focus search
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      const search = document.getElementById('header-search') || document.getElementById('explore-search') || document.getElementById('landing-search');
      if (search) search.focus();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
