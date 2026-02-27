/**
 * graph.js — D3.js force-directed skill relationship graph
 * Renders 187 connected skills and 600 edges with interaction.
 */

window.SkillGraph = (function () {
  let simulation = null;
  let svg = null;
  let zoom = null;
  let currentOptions = null;
  let currentFocusId = null;
  let showLabels = false;
  let neighborhoodOnly = false;

  function init(options) {
    currentOptions = options;
    currentFocusId = options.focusId || null;

    renderGraph(options);
    bindControls(options);
  }

  function renderGraph({ nodes, edges, focusId, colorMap, onNodeClick }) {
    const container = document.getElementById('graph-canvas-wrap');
    const svgEl = document.getElementById('graph-canvas');
    if (!container || !svgEl) return;

    const width  = container.clientWidth  || 800;
    const height = container.clientHeight || 500;

    svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svgEl.setAttribute('width', width);
    svgEl.setAttribute('height', height);

    // Clear previous
    d3.select(svgEl).selectAll('*').remove();

    // Get active edge types
    const activeTypes = getActiveEdgeTypes();

    // Filter edges by active types (and optionally by neighborhood)
    let filteredEdges = edges.filter(e => activeTypes.includes(e.type));
    let filteredNodeIds = new Set(nodes.map(n => n.id));

    if (neighborhoodOnly && focusId) {
      const neighborIds = new Set([focusId]);
      filteredEdges.forEach(e => {
        if (e.source === focusId || e.target === focusId ||
            e.source?.id === focusId || e.target?.id === focusId) {
          neighborIds.add(typeof e.source === 'object' ? e.source.id : e.source);
          neighborIds.add(typeof e.target === 'object' ? e.target.id : e.target);
        }
      });
      filteredNodeIds = neighborIds;
      filteredEdges = filteredEdges.filter(e => {
        const src = typeof e.source === 'object' ? e.source.id : e.source;
        const tgt = typeof e.target === 'object' ? e.target.id : e.target;
        return neighborIds.has(src) && neighborIds.has(tgt);
      });
    }

    const filteredNodes = nodes.filter(n => filteredNodeIds.has(n.id));

    // Build node map
    const nodeMap = new Map(filteredNodes.map(n => [n.id, { ...n }]));

    // Edge data with node references
    const edgeData = filteredEdges.map(e => ({
      ...e,
      source: typeof e.source === 'object' ? e.source.id : e.source,
      target: typeof e.target === 'object' ? e.target.id : e.target,
    })).filter(e => nodeMap.has(e.source) && nodeMap.has(e.target));

    const nodeData = Array.from(nodeMap.values());

    // Sizing helpers
    const maxConnections = Math.max(...nodeData.map(n => n.connections || 0), 1);
    const nodeRadius = d => {
      const base = 4;
      const scale = (n) => base + Math.sqrt((n.connections || 0) / maxConnections) * 10;
      return scale(typeof d === 'object' ? d : { connections: 0 });
    };

    // SVG setup with zoom
    svg = d3.select(svgEl);
    const g = svg.append('g').attr('class', 'graph-g');

    zoom = d3.zoom()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoom);

    // Arrow markers for edge direction
    const defs = svg.append('defs');
    ['relatesTo', 'isExtensionOf', 'isCompositeOf'].forEach(type => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -3 8 6')
        .attr('refX', 12)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-3L8,0L0,3')
        .attr('fill', type === 'relatesTo' ? '#94A3B8' :
                       type === 'isExtensionOf' ? '#A78BFA' : '#6EE7B7')
        .attr('fill-opacity', 0.6);
    });

    // Force simulation
    simulation = d3.forceSimulation(nodeData)
      .force('link', d3.forceLink(edgeData).id(d => d.id).distance(60).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-120).distanceMax(250))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => nodeRadius(d) + 4));

    // Edge lines
    const edgeDash = { relatesTo: null, isExtensionOf: '4,3', isCompositeOf: '2,2' };

    const link = g.append('g').attr('class', 'links')
      .selectAll('line')
      .data(edgeData)
      .join('line')
        .attr('stroke', d =>
          d.type === 'relatesTo'    ? '#94A3B8' :
          d.type === 'isExtensionOf'? '#A78BFA' : '#6EE7B7')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.5)
        .attr('stroke-dasharray', d => edgeDash[d.type] || null)
        .attr('marker-end', d => `url(#arrow-${d.type})`);

    // Nodes
    const node = g.append('g').attr('class', 'nodes')
      .selectAll('g')
      .data(nodeData)
      .join('g')
        .attr('class', 'node')
        .attr('cursor', 'pointer')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended))
        .on('click', (event, d) => {
          event.stopPropagation();
          if (onNodeClick) onNodeClick(d.id);
        })
        .on('mouseover', (event, d) => showTooltip(event, d))
        .on('mousemove', (event) => moveTooltip(event))
        .on('mouseout', () => hideTooltip());

    node.append('circle')
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => colorMap[d.ce] || '#6B7280')
      .attr('fill-opacity', 0.85)
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5);

    // Labels (hidden by default)
    const labels = node.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', d => nodeRadius(d) + 12)
      .attr('font-size', '10px')
      .attr('fill', 'var(--text-secondary)')
      .attr('pointer-events', 'none')
      .text(d => d.name.length > 20 ? d.name.slice(0, 18) + '…' : d.name)
      .attr('display', showLabels ? 'block' : 'none');

    // Focus highlight
    if (focusId && nodeMap.has(focusId)) {
      node.attr('opacity', d => {
        if (!focusId) return 1;
        const neighbors = getNeighbors(focusId, edgeData);
        return d.id === focusId || neighbors.has(d.id) ? 1 : 0.2;
      });
      link.attr('stroke-opacity', d => {
        const src = typeof d.source === 'object' ? d.source.id : d.source;
        const tgt = typeof d.target === 'object' ? d.target.id : d.target;
        return src === focusId || tgt === focusId ? 0.8 : 0.1;
      });
    }

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Zoom to focus node after simulation settles
    if (focusId) {
      setTimeout(() => {
        const focusNode = nodeData.find(n => n.id === focusId);
        if (focusNode && focusNode.x) {
          const scale = 1.5;
          const tx = width / 2 - scale * focusNode.x;
          const ty = height / 2 - scale * focusNode.y;
          svg.transition().duration(600).call(
            zoom.transform,
            d3.zoomIdentity.translate(tx, ty).scale(scale)
          );
        }
      }, 800);
    }

    // Store references for controls
    window._graphRefs = { node, link, labels, zoom, svg, nodeData, edgeData, nodeRadius };
  }

  function getNeighbors(id, edges) {
    const n = new Set();
    for (const e of edges) {
      const src = typeof e.source === 'object' ? e.source.id : e.source;
      const tgt = typeof e.target === 'object' ? e.target.id : e.target;
      if (src === id) n.add(tgt);
      if (tgt === id) n.add(src);
    }
    return n;
  }

  function getActiveEdgeTypes() {
    const types = [];
    if (document.getElementById('edge-relates')?.checked)   types.push('relatesTo');
    if (document.getElementById('edge-extends')?.checked)   types.push('isExtensionOf');
    if (document.getElementById('edge-composite')?.checked) types.push('isCompositeOf');
    return types.length > 0 ? types : ['relatesTo', 'isExtensionOf', 'isCompositeOf'];
  }

  function showTooltip(event, d) {
    const tooltip = document.getElementById('graph-tooltip');
    if (!tooltip) return;
    tooltip.style.display = 'block';
    tooltip.innerHTML = `
      <strong style="display:block;margin-bottom:4px">${d.name}</strong>
      <span style="font-size:12px;color:var(--text-tertiary)">${d.ce || ''}</span><br/>
      <span style="font-size:12px;color:var(--text-tertiary)">${d.connections || 0} connections</span>
    `;
    moveTooltip(event);
  }

  function moveTooltip(event) {
    const tooltip = document.getElementById('graph-tooltip');
    if (!tooltip) return;
    const wrap = document.getElementById('graph-canvas-wrap');
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    let x = event.clientX - rect.left + 12;
    let y = event.clientY - rect.top + 12;
    if (x + 210 > rect.width) x -= 220;
    if (y + 80 > rect.height) y -= 80;
    tooltip.style.left = `${x}px`;
    tooltip.style.top  = `${y}px`;
  }

  function hideTooltip() {
    const tooltip = document.getElementById('graph-tooltip');
    if (tooltip) tooltip.style.display = 'none';
  }

  function dragstarted(event, d) {
    if (!event.active) simulation?.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation?.alphaTarget(0);
  }

  function bindControls(options) {
    // Zoom buttons
    document.getElementById('zoom-in')?.addEventListener('click', () => {
      svg?.transition().call(zoom.scaleBy, 1.4);
    });
    document.getElementById('zoom-out')?.addEventListener('click', () => {
      svg?.transition().call(zoom.scaleBy, 0.7);
    });
    document.getElementById('zoom-reset')?.addEventListener('click', () => {
      svg?.transition().call(zoom.transform, d3.zoomIdentity);
    });

    // Labels toggle
    document.getElementById('show-labels')?.addEventListener('change', (e) => {
      showLabels = e.target.checked;
      d3.selectAll('.node-label').attr('display', showLabels ? 'block' : 'none');
    });

    // Neighborhood only toggle
    document.getElementById('neighborhood-only')?.addEventListener('change', (e) => {
      neighborhoodOnly = e.target.checked;
      renderGraph({ ...options, focusId: currentFocusId });
    });

    // Edge type toggles — re-render on change
    ['edge-relates', 'edge-extends', 'edge-composite'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => {
        renderGraph({ ...options, focusId: currentFocusId });
      });
    });

    // Focus search
    const focusInput = document.getElementById('graph-focus-search');
    if (focusInput) {
      let debounceTm;
      focusInput.addEventListener('input', (e) => {
        clearTimeout(debounceTm);
        debounceTm = setTimeout(() => {
          const q = e.target.value.trim().toLowerCase();
          if (!q) {
            currentFocusId = null;
          } else {
            const found = options.nodes.find(n => n.name.toLowerCase().includes(q));
            currentFocusId = found ? found.id : null;
          }
          renderGraph({ ...options, focusId: currentFocusId });
        }, 300);
      });
    }
  }

  return { init };
})();
