/**
 * charts.js — Chart.js visualizations for the stats page
 * Lazy-loads Chart.js from CDN on first use.
 */

window.SkillCharts = (function () {
  let chartjsLoaded = false;
  const chartInstances = [];

  function loadChartJs() {
    if (chartjsLoaded || window.Chart) { return Promise.resolve(); }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';
      script.onload = () => { chartjsLoaded = true; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function destroyAll() {
    chartInstances.forEach(c => { try { c.destroy(); } catch(e) {} });
    chartInstances.length = 0;
  }

  function getThemeColors() {
    const computed = getComputedStyle(document.documentElement);
    return {
      text:   computed.getPropertyValue('--text-secondary').trim() || '#4B5563',
      border: computed.getPropertyValue('--border-default').trim() || '#E5E7EB',
      bg:     computed.getPropertyValue('--bg-secondary').trim()   || '#FFFFFF',
    };
  }

  function makeChart(id, config) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const chart = new Chart(ctx, config);
    chartInstances.push(chart);
    return chart;
  }

  async function render({ ceCounts, stCounts, domainCounts, monthCounts, CE_LABELS, ST_LABELS, CE_BG_COLORS }) {
    destroyAll();
    await loadChartJs();

    const theme = getThemeColors();

    const chartDefaults = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: theme.text, font: { family: 'Inter, sans-serif', size: 12 } },
        },
        tooltip: {
          backgroundColor: '#1E293B',
          titleColor: '#F1F5F9',
          bodyColor: '#CBD5E1',
          borderColor: '#334155',
          borderWidth: 1,
          cornerRadius: 8,
        },
      },
    };

    // ── Classification donut ─────────────────────────────────
    const ceLabels = Object.keys(CE_LABELS).filter(k => (ceCounts[k] || 0) > 0);
    const ceValues = ceLabels.map(k => ceCounts[k] || 0);
    const ceColors = ceLabels.map(k => CE_BG_COLORS[k] || '#6B7280');

    makeChart('chart-ce', {
      type: 'doughnut',
      data: {
        labels: ceLabels.map(k => CE_LABELS[k] || k),
        datasets: [{
          data: ceValues,
          backgroundColor: ceColors,
          borderColor: theme.bg,
          borderWidth: 3,
          hoverOffset: 8,
        }],
      },
      options: {
        ...chartDefaults,
        cutout: '60%',
        plugins: {
          ...chartDefaults.plugins,
          legend: {
            position: 'bottom',
            labels: { color: theme.text, font: { family: 'Inter, sans-serif', size: 11 }, boxWidth: 12, padding: 10 },
          },
        },
      },
    });

    // ── Skill type donut ─────────────────────────────────────
    const stOrder = ['Transferable_and_Functional', 'Knowledge_Based', 'Personal_Trait_or_Attitude', 'NotSet'];
    const stColors = ['#2563EB', '#7C3AED', '#DB2777', '#6B7280'];
    const stValues = stOrder.map(k => stCounts[k] || 0);

    makeChart('chart-st', {
      type: 'doughnut',
      data: {
        labels: stOrder.map(k => ST_LABELS[k] || k),
        datasets: [{
          data: stValues,
          backgroundColor: stColors,
          borderColor: theme.bg,
          borderWidth: 3,
          hoverOffset: 8,
        }],
      },
      options: {
        ...chartDefaults,
        cutout: '60%',
        plugins: {
          ...chartDefaults.plugins,
          legend: {
            position: 'bottom',
            labels: { color: theme.text, font: { family: 'Inter, sans-serif', size: 11 }, boxWidth: 12, padding: 10 },
          },
        },
      },
    });

    // ── Domain horizontal bar ────────────────────────────────
    const domainEntries = Object.entries(domainCounts).sort((a,b) => b[1]-a[1]);
    const domainLabels = domainEntries.map(([k]) => k);
    const domainValues = domainEntries.map(([,v]) => v);

    makeChart('chart-domain', {
      type: 'bar',
      data: {
        labels: domainLabels,
        datasets: [{
          label: 'Skills',
          data: domainValues,
          backgroundColor: '#2563EB',
          hoverBackgroundColor: '#1D4ED8',
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        ...chartDefaults,
        indexAxis: 'y',
        plugins: {
          ...chartDefaults.plugins,
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { color: theme.border },
            ticks: { color: theme.text, font: { family: 'Inter, sans-serif', size: 11 } },
          },
          y: {
            grid: { display: false },
            ticks: { color: theme.text, font: { family: 'Inter, sans-serif', size: 11 } },
          },
        },
      },
    });

    // ── Creation timeline ────────────────────────────────────
    const sortedMonths = Object.keys(monthCounts).sort();
    const timelineValues = sortedMonths.map(m => monthCounts[m]);

    makeChart('chart-timeline', {
      type: 'line',
      data: {
        labels: sortedMonths,
        datasets: [{
          label: 'Skills created',
          data: timelineValues,
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37,99,235,0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#2563EB',
          pointRadius: 3,
          pointHoverRadius: 5,
        }],
      },
      options: {
        ...chartDefaults,
        plugins: {
          ...chartDefaults.plugins,
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { color: theme.border },
            ticks: { color: theme.text, font: { family: 'Inter, sans-serif', size: 10 }, maxRotation: 45 },
          },
          y: {
            beginAtZero: true,
            grid: { color: theme.border },
            ticks: { color: theme.text, font: { family: 'Inter, sans-serif', size: 11 } },
          },
        },
      },
    });
  }

  return { render };
})();
