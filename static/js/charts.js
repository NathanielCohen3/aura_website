/* Crisp, responsive SVG charts for the AURA page (vanilla JS, no dependency).
   - Figure 4: quality vs. speed bubble chart (FVD / JEDi averaged over HALLO3 + CelebV-HQ test sets)
   - Figure 5: user-study Bayesian Elo per axis with 95% CIs (arXiv v2 study: AURA 5B, AURA 1.3B, TalkVerse, Hallo3)
   EDIT the data blocks below; everything else is layout. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  // Palette is read from the page's CSS custom properties (single source of truth: :root in index.html).
  const css = getComputedStyle(document.documentElement);
  const v = (name, fallback) => (css.getPropertyValue(name) || '').trim() || fallback;
  const COLORS = { ours: v('--c-ours', '#39f2ae'), ours13: v('--c-ours13', '#1c9e70'), teacher: v('--c-teacher', '#f5ab4a'),
    baseline: v('--c-baseline', '#7c7c7c'), hallo3: v('--c-hallo3', '#a57de8') };
  const INK = v('--ink', '#ffffff'), MUTED = v('--muted', '#9d9d9d'), GRID = v('--grid', '#232323'),
    SURFACE = v('--surface', '#191919'), AXIS = v('--axis', '#404040'), WHISKER = v('--text', '#b5bcc5');

  /* ---------------- data ---------------- */
  // FVD / JEDi = mean of the @0/@101/@109 windows (v3 metrics); H = HALLO3 Test, C = CelebV-HQ Test.
  // time = end-to-end seconds to generate 10 s of video on 1x H100; params in billions.
  const BUBBLES = [
    { name: 'Hallo3', role: 'baseline', params: 14.5, time: 1116, H: { FVD: 183.4, JEDi: 0.180 }, C: { FVD: 202.5, JEDi: 0.243 } },
    { name: 'Wan-S2V', role: 'baseline', params: 14, time: 2077, H: { FVD: 196.4, JEDi: 0.257 }, C: { FVD: 289.6, JEDi: 0.577 } },
    { name: 'TalkVerse (teacher)', role: 'teacher', params: 5, time: 429, H: { FVD: 210.8, JEDi: 0.398 }, C: { FVD: 255.9, JEDi: 0.582 } },
    { name: 'Live Avatar', role: 'baseline', params: 14, time: 84, H: { FVD: 181.1, JEDi: 0.442 }, C: { FVD: 267.5, JEDi: 1.010 } },
    { name: 'AURA 5B (ours)', role: 'ours', params: 5, time: 25.8, H: { FVD: 195.5, JEDi: 0.313 }, C: { FVD: 208.1, JEDi: 0.320 } },
    // 1.3B: 10 s at 16 Hz = 160 frames / 20.7 fps end-to-end.
    { name: 'AURA 1.3B (ours)', role: 'ours13', params: 1.3, time: +(160 / 20.7).toFixed(1), H: { FVD: 177.1, JEDi: 0.403 }, C: { FVD: 248.8, JEDi: 0.574 },
      dy: { JEDi: 18 } },  // JEDi avg ~= TalkVerse's: push the label below the bubble
  ];
  const REALTIME_S = 10;  // generating 10 s of video in <= 10 s = real time
  // Mabyduck bayesian_elo (study x1ikkvn, 400 comparisons, 27 raters): [value, lower 95%, upper 95%].
  // Values = Mabyduck's own SVG exports (TalkVerse/evaluation/results (1-4).svg), as in the arXiv v2 figure;
  // CI bounds recovered from the SVG error-bar geometry.
  const ELO_AXES = ['Quality', 'Naturalness', 'Lip sync', 'Ref. fidelity'];
  const ELO = [
    { name: 'AURA 5B (ours)', color: COLORS.ours, v: [[2087.4, 2058.2, 2114.3], [2073.0, 2042.8, 2100.7], [2044.5, 2012.5, 2073.8], [2076.4, 2045.8, 2104.5]] },
    { name: 'AURA 1.3B (ours)', color: COLORS.ours13, v: [[1906.1, 1865.6, 1942.2], [1941.0, 1902.5, 1975.7], [1971.5, 1934.3, 2005.1], [2031.8, 1998.9, 2061.9]] },
    { name: 'TalkVerse (teacher)', color: COLORS.teacher, v: [[2073.6, 2043.9, 2100.8], [2052.3, 2021.4, 2080.7], [2048.7, 2016.9, 2077.8], [1950.2, 1912.2, 1984.4]] },
    { name: 'Hallo3', color: COLORS.hallo3, v: [[1779.7, 1722.4, 1828.8], [1841.1, 1791.1, 1884.7], [1906.8, 1863.3, 1945.3], [1900.5, 1857.2, 1938.9]] },
  ];

  // Long-form streaming (Figure 6 = paper supp Fig. long / Tab. long_eval_supp): 60 s, metrics per 10 s segment.
  const LONG_SEGS = ['0–10', '10–20', '20–30', '30–40', '40–50', '50–60'];
  const LONG_METRICS = [['FVD', 'FVD ↓', v => v.toFixed(1)], ['CSIM', 'CSIM ↑', v => v.toFixed(3)], ['Sync', 'Sync-C ↑', v => v.toFixed(2)]];
  const LONG = [
    { name: 'AURA 5B (ours)', color: COLORS.ours, FVD: [182.1, 206.0, 202.8, 198.3, 202.2, 195.2],
      CSIM: [0.764, 0.735, 0.720, 0.710, 0.657, 0.689], Sync: [5.00, 5.22, 5.00, 4.85, 4.74, 4.79] },
    { name: 'AURA 1.3B (ours)', color: COLORS.ours13, FVD: [179.2, 183.2, 180.0, 179.2, 180.2, 186.3],
      CSIM: [0.826, 0.796, 0.798, 0.798, 0.789, 0.783], Sync: [4.81, 4.77, 4.81, 4.74, 4.81, 4.73] },
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
    const xLo = Math.log10(5), xHi = Math.log10(3600);
    const X = t => x0 + m.l + (Math.log10(t) - xLo) / (xHi - xLo) * pw;
    const Y = v => y0 + m.t + (1 - (v - lo) / (hi - lo)) * ph;
    const g = el('g', {}, svg);
    el('text', { x: x0 + m.l, y: y0 + 14, 'font-size': 13, 'font-weight': 600, fill: INK }, g, title);
    // real-time band: <= 10 s of compute per 10 s of video
    el('rect', { x: x0 + m.l, y: y0 + m.t, width: X(REALTIME_S) - x0 - m.l, height: ph, fill: COLORS.ours, 'fill-opacity': 0.07 }, g);
    el('text', { x: x0 + m.l + 4, y: y0 + m.t + 12, 'font-size': 10, fill: COLORS.ours, 'font-family': 'var(--mono)' }, g, 'real time');
    // grid + y ticks
    niceTicks(lo, hi, 5).forEach(v => {
      el('line', { x1: x0 + m.l, x2: x0 + m.l + pw, y1: Y(v), y2: Y(v), stroke: GRID, 'stroke-width': 1 }, g);
      el('text', { x: x0 + m.l - 8, y: Y(v) + 4, 'font-size': 11, fill: MUTED, 'text-anchor': 'end',
        style: 'font-variant-numeric:tabular-nums' }, g, metric === 'JEDi' ? v.toFixed(2) : v);
    });
    // x ticks (log)
    [5, 10, 20, 50, 100, 200, 500, 1000, 2000].forEach(t => {
      el('line', { x1: X(t), x2: X(t), y1: y0 + m.t, y2: y0 + m.t + ph, stroke: GRID, 'stroke-width': 1 }, g);
      el('text', { x: X(t), y: y0 + m.t + ph + 17, 'font-size': 11, fill: MUTED, 'text-anchor': 'middle' }, g,
        t >= 1000 ? (t / 1000) + 'k' : t);
    });
    el('line', { x1: x0 + m.l, x2: x0 + m.l + pw, y1: y0 + m.t + ph, y2: y0 + m.t + ph, stroke: AXIS, 'stroke-width': 1 }, g);
    el('text', { x: x0 + m.l + pw / 2, y: y0 + h - 8, 'font-size': 11.5, fill: MUTED, 'text-anchor': 'middle' }, g,
      compact || w < 460 ? 'Seconds per 10 s of video (log)' : 'Seconds to generate 10 s of video (log scale) — lower is faster');
    // bubbles: largest first so small ones stay on top
    [...BUBBLES].sort((a, b) => b.params - a.params).forEach(d => {
      const cx = X(d.time), cy = Y(avg(d)), r = (compact ? 5.5 : 7) * Math.sqrt(d.params);
      const c = el('circle', { cx, cy, r: Math.max(r, 6), fill: COLORS[d.role], 'fill-opacity': d.role === 'baseline' ? 0.8 : 0.95,
        stroke: SURFACE, 'stroke-width': 2, style: 'cursor:default' }, g);
      // label on the right unless it would overflow the panel (rough text-width estimate)
      const right = cx + r + 8 + d.name.length * 7 < x0 + w;
      const dy = (d.dy && d.dy[metric]) || 0;
      el('text', { x: right ? cx + r + 6 : cx - r - 6, y: cy + 4 + dy, 'font-size': 12, fill: INK,
        'font-weight': d.role.startsWith('ours') ? 700 : 400, 'text-anchor': right ? 'start' : 'end' }, g, d.name);
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
    const lo = 1700, hi = 2150, y0 = m.t + ph;
    const Y = v => m.t + (1 - (v - lo) / (hi - lo)) * ph;
    const band = pw / ELO_AXES.length, gap = 2;
    const bw = Math.min(24, (band * 0.72 - gap * (ELO.length - 1)) / ELO.length);
    const svg = svgRoot(host, W, H, 'Bayesian Elo with 95% intervals for AURA 5B, AURA 1.3B, TalkVerse and Hallo3 on four axes.');
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
          stroke: WHISKER, 'stroke-width': 1.25, fill: 'none' }, g);
        // invisible hit target covering the bar and its whisker
        const hit = el('rect', { x: x - gap / 2, y: Y(b) - 6, width: bw + gap, height: y0 - Y(b) + 6, fill: 'transparent' }, g);
        bindTip(hit, `<b>${s.name}</b> · ${ax}<br>Elo <b>${v.toFixed(0)}</b><br><span>95% CI [${a.toFixed(0)}, ${b.toFixed(0)}]</span>`);
      });
    });
    el('line', { x1: m.l, x2: m.l + pw, y1: y0, y2: y0, stroke: AXIS, 'stroke-width': 1 }, svg);
  }

  /* ---------------- Figure 6: long-form metrics per 10 s segment ---------------- */
  function longPanel(svg, x0, y0, w, h, key, title, fmt) {
    const m = { l: 46, r: 10, t: 28, b: 30 }, pw = w - m.l - m.r, ph = h - m.t - m.b;
    const vals = LONG.flatMap(s => s[key]);
    let lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
    const X = i => x0 + m.l + (i + 0.5) / LONG_SEGS.length * pw;
    const Y = v => y0 + m.t + (1 - (v - lo) / (hi - lo)) * ph;
    const g = el('g', {}, svg);
    el('text', { x: x0 + m.l, y: y0 + 14, 'font-size': 13, 'font-weight': 600, fill: INK }, g, title);
    niceTicks(lo, hi, 5).forEach(v => {
      el('line', { x1: x0 + m.l, x2: x0 + m.l + pw, y1: Y(v), y2: Y(v), stroke: GRID, 'stroke-width': 1 }, g);
      el('text', { x: x0 + m.l - 6, y: Y(v) + 4, 'font-size': 10.5, fill: MUTED, 'text-anchor': 'end',
        style: 'font-variant-numeric:tabular-nums' }, g, key === 'CSIM' ? v.toFixed(2) : (key === 'Sync' ? v.toFixed(1) : v));
    });
    el('line', { x1: x0 + m.l, x2: x0 + m.l + pw, y1: y0 + m.t + ph, y2: y0 + m.t + ph, stroke: AXIS, 'stroke-width': 1 }, g);
    LONG_SEGS.forEach((lab, i) => el('text', { x: X(i), y: y0 + m.t + ph + 16, 'font-size': 10, fill: MUTED,
      'text-anchor': 'middle' }, g, lab));
    LONG.forEach(s => {
      el('path', { d: s[key].map((v, i) => (i ? 'L' : 'M') + X(i) + ',' + Y(v)).join(''), fill: 'none',
        stroke: s.color, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, g);
      s[key].forEach((v, i) => {
        const c = el('circle', { cx: X(i), cy: Y(v), r: 4, fill: s.color, stroke: SURFACE, 'stroke-width': 1.5 }, g);
        const hit = el('circle', { cx: X(i), cy: Y(v), r: 10, fill: 'transparent' }, g);
        bindTip(hit, `<b>${s.name}</b><br>${LONG_SEGS[i]} s · ${title.split(' ')[0]} <b>${fmt(v)}</b>`);
      });
    });
  }
  function drawLong() {
    const host = document.getElementById('viz-long');
    if (!host) return;
    const W = host.clientWidth || 900, stacked = W < 640;
    const pw = stacked ? W : W / 3, ph = stacked ? 210 : 240;
    const svg = svgRoot(host, W, stacked ? ph * 3 : ph,
      'FVD, CSIM and Sync-C per 10 s segment over 60 s of streaming, for AURA 5B and AURA 1.3B.');
    LONG_METRICS.forEach(([key, title, fmt], k) =>
      longPanel(svg, stacked ? 0 : k * pw, stacked ? k * ph : 0, pw, ph, key, title, fmt));
  }

  function drawAll() { hideTip(); drawBubbles(); drawElo(); drawLong(); }
  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawAll, 120); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', drawAll); else drawAll();
  (document.fonts && document.fonts.ready || Promise.resolve()).then(drawAll);
})();
