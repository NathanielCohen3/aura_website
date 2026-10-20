/* Crisp, responsive SVG charts for the AURA page (vanilla JS, no dependency).
   - Figure 4: quality vs. speed bubble chart (FVD / JEDi averaged over HALLO3 + CelebV-HQ test sets)
   - Figure 5: user-study Bayesian Elo per axis with 95% CIs
   EDIT the data blocks below; everything else is layout. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const COLORS = { ours: '#4f46e5', teacher: '#eb6834', baseline: '#9aa3ad', hallo3: '#1baf7a' };
  const INK = '#14151a', MUTED = '#6b6f76', GRID = '#eceef1', SURFACE = '#ffffff';

  /* ---------------- data ---------------- */
  // FVD / JEDi = mean of the @0/@101/@109 windows (v3 metrics); H = HALLO3 Test, C = CelebV-HQ Test.
  // time = end-to-end seconds to generate 10 s of video on 1x H100; params in billions.
  const BUBBLES = [
    { name: 'Hallo3', role: 'baseline', params: 14.5, time: 1116, H: { FVD: 183.4, JEDi: 0.180 }, C: { FVD: 202.5, JEDi: 0.243 } },
    { name: 'Wan-S2V', role: 'baseline', params: 14, time: 2077, H: { FVD: 196.4, JEDi: 0.257 }, C: { FVD: 289.6, JEDi: 0.577 } },
    { name: 'TalkVerse (teacher)', role: 'teacher', params: 5, time: 429, H: { FVD: 210.8, JEDi: 0.398 }, C: { FVD: 255.9, JEDi: 0.582 } },
    { name: 'Live Avatar', role: 'baseline', params: 14, time: 84, H: { FVD: 181.1, JEDi: 0.442 }, C: { FVD: 267.5, JEDi: 1.010 } },
    { name: 'AURA 5B (ours)', role: 'ours', params: 5, time: 25.8, H: { FVD: 195.5, JEDi: 0.313 }, C: { FVD: 208.1, JEDi: 0.320 } },
  ];
  // Mabyduck bayesian_elo: [value, lower 95%, upper 95%].
  const ELO_AXES = ['Quality', 'Naturalness', 'Lip sync', 'Ref. fidelity'];
  const ELO = [
    { name: 'AURA (ours)', color: COLORS.ours, v: [[2022.0, 1988.8, 2052.3], [2044.0, 2011.8, 2073.5], [2022.1, 1987.7, 2053.4], [2054.4, 2022.0, 2084.1]] },
    { name: 'TalkVerse (teacher)', color: COLORS.teacher, v: [[2066.9, 2037.4, 2094.0], [2039.9, 2009.2, 2068.0], [2030.3, 1998.2, 2059.7], [1955.2, 1917.7, 1989.0]] },
    { name: 'Hallo3', color: COLORS.hallo3, v: [[1796.1, 1738.1, 1845.7], [1815.1, 1760.3, 1862.3], [1907.1, 1864.0, 1945.4], [1944.6, 1906.5, 1978.9]] },
  ];

  /* ---------------- helpers ---------------- */
  function el(tag, attrs, parent, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgRoot(host, w, h, label) {
    host.innerHTML = '';
    const s = el('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, role: 'img', 'aria-label': label,
      style: 'display:block;max-width:100%;height:auto;font-family:var(--sans);overflow:visible' }, host);
    return s;
  }
  const tip = document.createElement('div');
  tip.className = 'viz-tip';
  document.body.appendChild(tip);
  function showTip(evt, html) {
    tip.innerHTML = html; tip.style.display = 'block';
    const pad = 14, r = tip.getBoundingClientRect();
    let x = evt.clientX + pad, y = evt.clientY + pad;
    if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 8) y = evt.clientY - r.height - pad;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { tip.style.display = 'none'; }
  function bindTip(node, html) {
    node.addEventListener('mousemove', e => showTip(e, html));
    node.addEventListener('mouseleave', hideTip);
    node.addEventListener('touchstart', e => showTip(e.touches[0], html), { passive: true });
  }
  function niceTicks(lo, hi, n) {
    const raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
    const t = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) t.push(+v.toFixed(10));
    return t;
  }

  /* ---------------- Figure 4: bubble chart ---------------- */
  function bubblePanel(svg, x0, y0, w, h, metric, title, compact) {
    const m = { l: 52, r: 14, t: 30, b: 46 };
    const pw = w - m.l - m.r, ph = h - m.t - m.b;
    const avg = d => (d.H[metric] + d.C[metric]) / 2;
    const vals = BUBBLES.map(avg);
    let lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.16;
    lo -= pad; hi += pad;
    const xLo = Math.log10(15), xHi = Math.log10(3600);
    const X = t => x0 + m.l + (Math.log10(t) - xLo) / (xHi - xLo) * pw;
    const Y = v => y0 + m.t + (1 - (v - lo) / (hi - lo)) * ph;
    const g = el('g', {}, svg);
    el('text', { x: x0 + m.l, y: y0 + 14, 'font-size': 13, 'font-weight': 600, fill: INK }, g, title);
    // grid + y ticks
    niceTicks(lo, hi, 5).forEach(v => {
      el('line', { x1: x0 + m.l, x2: x0 + m.l + pw, y1: Y(v), y2: Y(v), stroke: GRID, 'stroke-width': 1 }, g);
      el('text', { x: x0 + m.l - 8, y: Y(v) + 4, 'font-size': 11, fill: MUTED, 'text-anchor': 'end',
        style: 'font-variant-numeric:tabular-nums' }, g, metric === 'JEDi' ? v.toFixed(2) : v);
    });
    // x ticks (log)
    [20, 50, 100, 200, 500, 1000, 2000].forEach(t => {
      el('line', { x1: X(t), x2: X(t), y1: y0 + m.t, y2: y0 + m.t + ph, stroke: GRID, 'stroke-width': 1 }, g);
      el('text', { x: X(t), y: y0 + m.t + ph + 17, 'font-size': 11, fill: MUTED, 'text-anchor': 'middle' }, g,
        t >= 1000 ? (t / 1000) + 'k' : t);
    });
    el('line', { x1: x0 + m.l, x2: x0 + m.l + pw, y1: y0 + m.t + ph, y2: y0 + m.t + ph, stroke: '#c9cdd3', 'stroke-width': 1 }, g);
    el('text', { x: x0 + m.l + pw / 2, y: y0 + h - 8, 'font-size': 11.5, fill: MUTED, 'text-anchor': 'middle' }, g,
      compact ? 'Seconds per 10 s of video (log)' : 'Seconds to generate 10 s of video (log scale) — lower is faster');
    // bubbles: largest first so small ones stay on top
    [...BUBBLES].sort((a, b) => b.params - a.params).forEach(d => {
      const cx = X(d.time), cy = Y(avg(d)), r = (compact ? 5.5 : 7) * Math.sqrt(d.params);
      const c = el('circle', { cx, cy, r, fill: COLORS[d.role], 'fill-opacity': d.role === 'baseline' ? 0.8 : 0.95,
        stroke: SURFACE, 'stroke-width': 2, style: 'cursor:default' }, g);
      // label on the right unless it would overflow the panel (rough text-width estimate)
      const right = cx + r + 8 + d.name.length * 7 < x0 + w;
      el('text', { x: right ? cx + r + 6 : cx - r - 6, y: cy + 4, 'font-size': 12, fill: INK,
        'font-weight': d.role === 'ours' ? 700 : 400, 'text-anchor': right ? 'start' : 'end' }, g, d.name);
      const f = metric === 'JEDi' ? (v => v.toFixed(3)) : (v => v.toFixed(1));
      bindTip(c, `<b>${d.name}</b><br>${d.params}B params · ${d.time} s per 10 s<br>` +
        `${metric} avg <b>${f(avg(d))}</b><br><span>HALLO3 ${f(d.H[metric])} · CelebV-HQ ${f(d.C[metric])}</span>`);
    });
  }
  function drawBubbles() {
    const host = document.getElementById('viz-bubble');
    if (!host) return;
    const W = host.clientWidth || 760, stacked = W < 640;
    const pw = stacked ? W : W / 2, ph = stacked ? 300 : 340;
    const svg = svgRoot(host, W, stacked ? ph * 2 : ph,
      'Quality versus speed: FVD and JEDi averaged over two test sets against generation time; AURA is the fastest.');
    bubblePanel(svg, 0, 0, pw, ph, 'FVD', 'FVD ↓ (avg. HALLO3 + CelebV-HQ)', stacked);
    bubblePanel(svg, stacked ? 0 : pw, stacked ? ph : 0, pw, ph, 'JEDi', 'JEDi ↓ (avg. HALLO3 + CelebV-HQ)', stacked);
  }

  /* ---------------- Figure 5: Elo grouped bars + 95% CI ---------------- */
  // Rounded-top bar path growing from the baseline y0 up to y (r = corner radius).
  function barPath(x, w, y, y0, r) {
    r = Math.min(r, w / 2, (y0 - y) / 2);
    return `M${x},${y0}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y0}Z`;
  }
  function drawElo() {
    const host = document.getElementById('viz-elo');
    if (!host) return;
    const W = Math.min(host.clientWidth || 520, 640), H = 320;
    const m = { l: 50, r: 10, t: 34, b: 34 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    const lo = 1700, hi = 2125, y0 = m.t + ph;
    const Y = v => m.t + (1 - (v - lo) / (hi - lo)) * ph;
    const band = pw / ELO_AXES.length, gap = 2;
    const bw = Math.min(24, (band * 0.72 - gap * (ELO.length - 1)) / ELO.length);
    const svg = svgRoot(host, W, H, 'Bayesian Elo with 95% intervals for AURA, TalkVerse and Hallo3 on four axes.');
    for (let v = 1700; v <= 2100; v += 100) {
      el('line', { x1: m.l, x2: m.l + pw, y1: Y(v), y2: Y(v), stroke: GRID, 'stroke-width': 1 }, svg);
      el('text', { x: m.l - 8, y: Y(v) + 4, 'font-size': 11, fill: MUTED, 'text-anchor': 'end',
        style: 'font-variant-numeric:tabular-nums' }, svg, v);
    }
    el('text', { x: 2, y: 16, 'font-size': 15, 'font-weight': 700, fill: INK, 'text-anchor': 'start' }, svg, 'Elo ↑');
    ELO_AXES.forEach((ax, i) => {
      const cx = m.l + band * (i + 0.5), gw = ELO.length * bw + (ELO.length - 1) * gap;
      el('text', { x: cx, y: H - 10, 'font-size': 12, fill: INK, 'text-anchor': 'middle' }, svg, ax);
      ELO.forEach((s, j) => {
        const x = cx - gw / 2 + j * (bw + gap), xc = x + bw / 2, [v, a, b] = s.v[i];
        const g = el('g', {}, svg);
        el('path', { d: barPath(x, bw, Y(v), y0, 4), fill: s.color }, g);
        // 95% CI whisker with short caps
        el('path', { d: `M${xc},${Y(a)}V${Y(b)}M${xc - 3},${Y(a)}H${xc + 3}M${xc - 3},${Y(b)}H${xc + 3}`,
          stroke: '#3a3d45', 'stroke-width': 1.25, fill: 'none' }, g);
        // invisible hit target covering the bar and its whisker
        const hit = el('rect', { x: x - gap / 2, y: Y(b) - 6, width: bw + gap, height: y0 - Y(b) + 6, fill: 'transparent' }, g);
        bindTip(hit, `<b>${s.name}</b> · ${ax}<br>Elo <b>${v.toFixed(0)}</b><br><span>95% CI [${a.toFixed(0)}, ${b.toFixed(0)}]</span>`);
      });
    });
    el('line', { x1: m.l, x2: m.l + pw, y1: y0, y2: y0, stroke: '#c9cdd3', 'stroke-width': 1 }, svg);
  }

  function drawAll() { hideTip(); drawBubbles(); drawElo(); }
  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawAll, 120); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', drawAll); else drawAll();
  (document.fonts && document.fonts.ready || Promise.resolve()).then(drawAll);
})();
