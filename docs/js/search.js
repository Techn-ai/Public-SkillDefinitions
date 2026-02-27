/**
 * search.js — Fuse.js fuzzy search integration
 * Builds a search index from skills-index.json and exposes a search function.
 */

window.SkillSearch = (function () {
  let fuse = null;
  let allSkills = [];

  const FUSE_OPTIONS = {
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 1,
    keys: [
      { name: 'name',   weight: 2.0 },
      { name: 'domain', weight: 1.0 },
      { name: 'desc',   weight: 0.4 },
    ],
    includeScore: true,
  };

  function init(skills) {
    allSkills = skills;
    fuse = new Fuse(skills, FUSE_OPTIONS);
  }

  /**
   * Search skills by query string.
   * @param {string} query
   * @param {number} limit max results
   * @returns {Array} skill index entries
   */
  function search(query, limit = 200) {
    if (!fuse) return [];
    if (!query || !query.trim()) return allSkills;

    const results = fuse.search(query.trim(), { limit });
    return results.map(r => r.item);
  }

  /**
   * Filter skills by facet criteria (client-side, no search query).
   */
  function filter(skills, { ce, st, ma, hasConnections, domain, q }) {
    let result = skills;

    if (q && q.trim() && fuse) {
      result = search(q.trim());
    }

    if (ce && ce.length > 0) {
      result = result.filter(s => ce.includes(s.ce));
    }

    if (st && st.length > 0) {
      result = result.filter(s => st.includes(s.st));
    }

    if (ma && ma.length > 0) {
      result = result.filter(s => s.ma && s.ma.some(a => ma.includes(a)));
    }

    if (hasConnections) {
      result = result.filter(s => (s.connections || 0) > 0);
    }

    if (domain) {
      result = result.filter(s => s.domain === domain);
    }

    return result;
  }

  return { init, search, filter };
})();
