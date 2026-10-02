/* ARRB Dynatest · Gestão de Contrato — window.DT
   Formatação pt-BR, ícones Lucide (ISC · lucide-static 0.469.0), hexágono, selos de status
   e gráficos SVG com tooltip e tabela de dados. Sem dependências e sem rede. */
(function () {
  'use strict';
  var DT = (window.DT = window.DT || {});
  DT.version = '1.0.0';
  var NBSP = ' ';
  var MINUS = '−';

  /* ---------- Formatação (padrão brasileiro) ---------- */
  var nfCache = {};
  function nf(d) {
    return nfCache[d] || (nfCache[d] = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
  }
  function sgn(v, s) { return v < 0 ? MINUS + s : s; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toDate(x) {
    if (x instanceof Date) return x;
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(x));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(x);
  }
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var fmt = {
    num: function (v, d) { return sgn(v, nf(d == null ? 0 : d).format(Math.abs(v))); },
    brl: function (v, opt) {
      var a = Math.abs(v), s;
      if (opt && opt.compact) {
        if (a >= 1e6) s = nf(2).format(a / 1e6) + NBSP + 'mi';
        else if (a >= 1e3) s = nf(1).format(a / 1e3) + NBSP + 'mil';
        else s = nf(2).format(a);
        if (opt.trim) s = s.replace(/,0+(?=\D|$)/, '');
      } else {
        s = nf(2).format(a);
      }
      return sgn(v, 'R$' + NBSP + s);
    },
    pct: function (v, d) { return sgn(v, nf(d == null ? 2 : d).format(Math.abs(v) * 100) + '%'); },
    date: function (x) { var d = toDate(x); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); },
    month: function (x) { var d = toDate(x); return MESES[d.getMonth()] + '/' + String(d.getFullYear()).slice(2); }
  };
  DT.fmt = fmt;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  DT.esc = esc;
  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /* ---------- Ícones (Lucide, traço 2px, currentColor) ---------- */
  var ICONS = {"arrow-up-right":"<path d=\"M7 7h10v10\"/><path d=\"M7 17 17 7\"/>","calendar":"<path d=\"M8 2v4\"/><path d=\"M16 2v4\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"/><path d=\"M3 10h18\"/>","check":"<path d=\"M20 6 9 17l-5-5\"/>","chevron-down":"<path d=\"m6 9 6 6 6-6\"/>","circle-alert":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\"/><line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\"/>","circle-check":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m9 12 2 2 4-4\"/>","clock":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12 6 12 12 16 14\"/>","download":"<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" x2=\"12\" y1=\"15\" y2=\"3\"/>","file-spreadsheet":"<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\"/><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"/><path d=\"M8 13h2\"/><path d=\"M14 13h2\"/><path d=\"M8 17h2\"/><path d=\"M14 17h2\"/>","file-text":"<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\"/><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"/><path d=\"M10 9H8\"/><path d=\"M16 13H8\"/><path d=\"M16 17H8\"/>","folder-open":"<path d=\"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2\"/>","git-compare":"<circle cx=\"18\" cy=\"18\" r=\"3\"/><circle cx=\"6\" cy=\"6\" r=\"3\"/><path d=\"M13 6h3a2 2 0 0 1 2 2v7\"/><path d=\"M11 18H8a2 2 0 0 1-2-2V9\"/>","hand-coins":"<path d=\"M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17\"/><path d=\"m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9\"/><path d=\"m2 16 6 6\"/><circle cx=\"16\" cy=\"9\" r=\"2.9\"/><circle cx=\"6\" cy=\"5\" r=\"3\"/>","hourglass":"<path d=\"M5 22h14\"/><path d=\"M5 2h14\"/><path d=\"M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22\"/><path d=\"M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2\"/>","landmark":"<line x1=\"3\" x2=\"21\" y1=\"22\" y2=\"22\"/><line x1=\"6\" x2=\"6\" y1=\"18\" y2=\"11\"/><line x1=\"10\" x2=\"10\" y1=\"18\" y2=\"11\"/><line x1=\"14\" x2=\"14\" y1=\"18\" y2=\"11\"/><line x1=\"18\" x2=\"18\" y1=\"18\" y2=\"11\"/><polygon points=\"12 2 20 7 4 7\"/>","mail":"<rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\"/><path d=\"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7\"/>","receipt":"<path d=\"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z\"/><path d=\"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8\"/><path d=\"M12 17.5v-11\"/>","refresh-cw":"<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\"/><path d=\"M21 3v5h-5\"/><path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\"/><path d=\"M8 16H3v5\"/>","route":"<circle cx=\"6\" cy=\"19\" r=\"3\"/><path d=\"M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15\"/><circle cx=\"18\" cy=\"5\" r=\"3\"/>","search":"<circle cx=\"11\" cy=\"11\" r=\"8\"/><path d=\"m21 21-4.3-4.3\"/>","shield-check":"<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/><path d=\"m9 12 2 2 4-4\"/>","triangle-alert":"<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"/><path d=\"M12 9v4\"/><path d=\"M12 17h.01\"/>","truck":"<path d=\"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2\"/><path d=\"M15 18H9\"/><path d=\"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14\"/><circle cx=\"17\" cy=\"18\" r=\"2\"/><circle cx=\"7\" cy=\"18\" r=\"2\"/>","users":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M22 21v-2a4 4 0 0 0-3-3.87\"/><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"/>","wallet":"<path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\"/><path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\"/>","x":"<path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/>"};
  DT.icons = Object.keys(ICONS);
  DT.icon = function (name, opt) {
    opt = opt || {};
    var p = ICONS[name];
    if (!p) return '';
    return '<svg class="dt-ico' + (opt.cls ? ' ' + opt.cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
      (opt.stroke || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + p + '</svg>';
  };

  /* ---------- Hexágono (motivo da marca) ---------- */
  DT.hex = function (icon, opt) {
    opt = opt || {};
    var cls = 'dt-hex' + (opt.size ? ' dt-hex--' + opt.size : '') + (opt.tone ? ' dt-hex--' + opt.tone : '');
    return '<span class="' + cls + '" aria-hidden="true">' + DT.icon(icon) + '</span>';
  };

  /* ---------- Selo de status: ícone + rótulo, nunca só cor ---------- */
  var STATUS = {
    conciliado: ['ok', 'circle-check', 'Conciliado'],
    pago: ['ok', 'circle-check', 'Pago'],
    repassado: ['ok', 'hand-coins', 'Repassado'],
    recebido: ['info', 'mail', 'Recebido'],
    processando: ['info', 'refresh-cw', 'Em processamento'],
    pendente: ['warn', 'clock', 'Pendente'],
    aguardando: ['warn', 'hourglass', 'Aguardando'],
    divergente: ['critical', 'git-compare', 'Divergente'],
    erro: ['critical', 'circle-alert', 'Erro'],
    rascunho: ['neutral', 'file-text', 'Rascunho']
  };
  DT.STATUS = STATUS;
  DT.badge = function (status, label) {
    var s = STATUS[status] || STATUS.rascunho;
    return '<span class="dt-badge dt-badge--' + s[0] + '">' + DT.icon(s[1]) + '<span>' + esc(label || s[2]) + '</span></span>';
  };

  /* ---------- Tooltip compartilhado ---------- */
  var tipEl = null;
  function tip() {
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.className = 'dt-tip';
      tipEl.setAttribute('role', 'status');
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }
  function showTip(html, cx, cy) {
    var t = tip();
    t.innerHTML = html;
    t.classList.add('is-on');
    var r = t.getBoundingClientRect();
    var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    var left = cx + 14, top = cy + 14;
    if (left + r.width > vw - 8) left = cx - r.width - 14;
    if (top + r.height > vh - 8) top = cy - r.height - 14;
    t.style.left = Math.max(8, left) + 'px';
    t.style.top = Math.max(8, top) + 'px';
  }
  function hideTip() { if (tipEl) tipEl.classList.remove('is-on'); }
  function tipRow(sw, label, value) {
    return '<div class="dt-tip-row"><span>' + (sw ? '<i class="dt-tip-sw dt-tip-sw--' + sw + '"></i>' : '') + esc(label) + '</span><b>' + esc(value) + '</b></div>';
  }
  DT.tooltip = { show: showTip, hide: hideTip, row: tipRow };

  /* ---------- SVG ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function text(parent, x, y, s, cls, anchor) {
    var t = el('text', { x: x, y: y, 'class': cls, 'text-anchor': anchor || 'start' }, parent);
    t.textContent = s;
    return t;
  }
  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), m = raw / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }
  function scale(max, n) {
    if (!(max > 0)) max = 1;
    var step = niceStep(max / n);
    return { step: step, top: Math.ceil(max / step - 1e-9) * step };
  }
  function linePath(vals, x, y) {
    var d = '', started = false;
    for (var i = 0; i < vals.length; i++) {
      if (!isNum(vals[i])) continue;
      d += (started ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(vals[i]).toFixed(1);
      started = true;
    }
    return d;
  }
  function legend(items) {
    return '<ul class="dt-legend">' + items.map(function (it) {
      return '<li><i class="dt-sw dt-sw--' + it.k + '"></i>' + esc(it.t) + '</li>';
    }).join('') + '</ul>';
  }
  function dataTable(head, rows) {
    return '<details class="dt-data"><summary>Ver dados do gráfico</summary><div class="dt-table-wrap"><table class="dt-table"><thead><tr>' +
      head.map(function (c, i) { return '<th' + (i ? ' class="num"' : '') + '>' + esc(c) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function (r) {
        return '<tr>' + r.map(function (c, i) { return '<td' + (i ? ' class="num"' : '') + '>' + esc(c) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div></details>';
  }
  function wrapWords(s, maxChars) {
    var words = String(s).split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      if (cur && (cur + ' ' + w).length > maxChars) { lines.push(cur); cur = w; }
      else cur = cur ? cur + ' ' + w : w;
    });
    if (cur) lines.push(cur);
    return lines.slice(0, 2);
  }
  function mount(host, draw) {
    var lastW = -1;
    function render() {
      var w = Math.max(280, Math.floor(host.clientWidth || 640));
      if (w === lastW) return;
      lastW = w;
      host.innerHTML = '';
      hideTip();
      draw(host, w);
    }
    render();
    if (window.ResizeObserver) new ResizeObserver(function () { render(); }).observe(host);
  }

  var charts = (DT.charts = {});

  /* Curva S: acumulado planejado (tracejado, chart-plan) × medido (linha + área, chart-actual). */
  charts.curvaS = function (host, cfg) {
    var planLabel = cfg.planLabel || 'Planejado', actualLabel = cfg.actualLabel || 'Medido';
    mount(host, function (root, W) {
      var H = cfg.height || 260, m = { t: 14, r: 112, b: 28, l: 72 };
      var labels = cfg.labels, plan = cfg.plan, act = cfg.actual || [], n = labels.length;
      var vals = plan.concat(act.filter(isNum)).concat(cfg.total ? [cfg.total] : []);
      var sc = scale(Math.max.apply(null, vals), 4);
      var iw = W - m.l - m.r, ih = H - m.t - m.b;
      var x = function (i) { return m.l + (n < 2 ? iw / 2 : i * iw / (n - 1)); };
      var y = function (v) { return m.t + ih - (v / sc.top) * ih; };
      root.insertAdjacentHTML('beforeend', legend([{ k: 'dash', t: planLabel }, { k: 'line', t: actualLabel }]));
      var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': cfg.title || ('Curva S: ' + actualLabel + ' × ' + planLabel) }, root);
      for (var t = 0; t <= sc.top + 1e-9; t += sc.step) {
        var yy = y(t);
        el('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy, 'class': t === 0 ? 'dt-c-axis' : 'dt-c-grid' }, svg);
        text(svg, m.l - 8, yy + 4, fmt.brl(t, { compact: true, trim: true }), 'dt-c-tick', 'end');
      }
      var every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 56))));
      labels.forEach(function (lb, i) { if (i % every === 0) text(svg, x(i), H - 8, lb, 'dt-c-tick', 'middle'); });
      el('path', { d: linePath(plan, x, y), 'class': 'dt-c-plan-line' }, svg);
      var last = -1;
      for (var i = 0; i < act.length; i++) if (isNum(act[i])) last = i;
      if (last >= 0) {
        var first = 0;
        while (!isNum(act[first])) first++;
        el('path', { d: linePath(act, x, y) + 'L' + x(last).toFixed(1) + ',' + y(0) + 'L' + x(first).toFixed(1) + ',' + y(0) + 'Z', 'class': 'dt-c-area' }, svg);
        el('path', { d: linePath(act, x, y), 'class': 'dt-c-actual-line' }, svg);
        el('circle', { cx: x(last), cy: y(act[last]), r: 4, 'class': 'dt-c-dot' }, svg);
        var lx = x(last) + 8, anchor = 'start';
        if (lx > W - m.r - 90) { lx = x(last) - 8; anchor = 'end'; }
        text(svg, lx, y(act[last]) - 10, fmt.brl(act[last], { compact: true }), 'dt-c-lbl', anchor);
      }
      text(svg, W - m.r + 10, y(plan[n - 1]) + 4, planLabel, 'dt-c-lbl-muted');
      text(svg, W - m.r + 10, y(plan[n - 1]) + 18, fmt.brl(plan[n - 1], { compact: true }), 'dt-c-lbl');
      var cross = el('line', { y1: m.t, y2: m.t + ih, 'class': 'dt-c-cross', visibility: 'hidden' }, svg);
      var dotP = el('circle', { r: 4, 'class': 'dt-c-dot-plan', visibility: 'hidden' }, svg);
      var dotA = el('circle', { r: 4, 'class': 'dt-c-dot', visibility: 'hidden' }, svg);
      var hit = el('rect', { x: m.l - 8, y: m.t, width: iw + 16, height: ih, 'class': 'dt-c-hit' }, svg);
      function idx(e) {
        var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * (W / r.width);
        return Math.max(0, Math.min(n - 1, Math.round((px - m.l) / (iw / Math.max(1, n - 1)))));
      }
      hit.addEventListener('pointermove', function (e) {
        var k = idx(e), xx = x(k);
        cross.setAttribute('x1', xx); cross.setAttribute('x2', xx); cross.setAttribute('visibility', 'visible');
        dotP.setAttribute('cx', xx); dotP.setAttribute('cy', y(plan[k])); dotP.setAttribute('visibility', 'visible');
        var has = isNum(act[k]);
        if (has) { dotA.setAttribute('cx', xx); dotA.setAttribute('cy', y(act[k])); }
        dotA.setAttribute('visibility', has ? 'visible' : 'hidden');
        var html = '<div class="dt-tip-title">' + esc(labels[k]) + '</div>' + tipRow('plan', planLabel, fmt.brl(plan[k], { compact: true })) +
          tipRow('actual', actualLabel, has ? fmt.brl(act[k], { compact: true }) : 'sem dado');
        if (has && plan[k] > 0) html += tipRow('', 'Medido ÷ planejado', fmt.pct(act[k] / plan[k], 1));
        showTip(html, e.clientX, e.clientY);
      });
      hit.addEventListener('pointerleave', function () {
        hideTip();
        [cross, dotP, dotA].forEach(function (o) { o.setAttribute('visibility', 'hidden'); });
      });
      root.insertAdjacentHTML('beforeend', dataTable(['Mês', planLabel, actualLabel], labels.map(function (lb, k) {
        return [lb, fmt.brl(plan[k]), isNum(act[k]) ? fmt.brl(act[k]) : '—'];
      })));
    });
  };

  /* Barras mensais: uma série (chart-actual) e linha de referência opcional (chart-plan). */
  charts.barras = function (host, cfg) {
    var valueLabel = cfg.valueLabel || 'Medido';
    mount(host, function (root, W) {
      var H = cfg.height || 220, m = { t: 22, r: cfg.refLabel ? 96 : 12, b: 28, l: 72 };
      var labels = cfg.labels, vals = cfg.values, n = labels.length;
      var sc = scale(Math.max.apply(null, vals.filter(isNum).concat(cfg.ref ? [cfg.ref] : [])), 4);
      var iw = W - m.l - m.r, ih = H - m.t - m.b, band = iw / n, bw = Math.max(4, Math.min(28, band - 4));
      var y = function (v) { return m.t + ih - (v / sc.top) * ih; };
      var items = [{ k: 'actual', t: valueLabel }];
      if (cfg.ref) items.push({ k: 'dash', t: cfg.refLabel || 'Referência' });
      root.insertAdjacentHTML('beforeend', legend(items));
      var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': cfg.title || valueLabel + ' por mês' }, root);
      for (var t = 0; t <= sc.top + 1e-9; t += sc.step) {
        el('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), 'class': t === 0 ? 'dt-c-axis' : 'dt-c-grid' }, svg);
        text(svg, m.l - 8, y(t) + 4, fmt.brl(t, { compact: true, trim: true }), 'dt-c-tick', 'end');
      }
      var every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 48))));
      var maxI = 0;
      vals.forEach(function (v, i) { if (isNum(v) && v > (vals[maxI] || 0)) maxI = i; });
      var lastI = -1;
      vals.forEach(function (v, i) { if (isNum(v)) lastI = i; });
      vals.forEach(function (v, i) {
        var cx = m.l + band * i + band / 2;
        if (i % every === 0) text(svg, cx, H - 8, labels[i], 'dt-c-tick', 'middle');
        if (!isNum(v)) return;
        var top = y(Math.max(v, 0)), h = Math.max(1, y(0) - top);
        el('rect', { x: cx - bw / 2, y: top, width: bw, height: h, rx: 2, 'class': 'dt-c-actual' }, svg);
        if (i === maxI || i === lastI || i === cfg.highlight) text(svg, cx, top - 6, fmt.brl(v, { compact: true }), 'dt-c-lbl', 'middle');
        var hit = el('rect', { x: m.l + band * i, y: m.t, width: band, height: ih, 'class': 'dt-c-bar-hit' }, svg);
        hit.addEventListener('pointermove', function (e) {
          var html = '<div class="dt-tip-title">' + esc(labels[i]) + '</div>' + tipRow('actual', valueLabel, fmt.brl(v));
          if (cfg.ref) html += tipRow('plan', cfg.refLabel || 'Referência', fmt.brl(cfg.ref)) + tipRow('', 'Medido ÷ referência', fmt.pct(v / cfg.ref, 1));
          showTip(html, e.clientX, e.clientY);
        });
        hit.addEventListener('pointerleave', hideTip);
      });
      if (cfg.ref) {
        el('line', { x1: m.l, x2: W - m.r, y1: y(cfg.ref), y2: y(cfg.ref), 'class': 'dt-c-ref' }, svg);
        text(svg, W - m.r + 8, y(cfg.ref) + 4, cfg.refLabel || 'Referência', 'dt-c-lbl-muted');
        text(svg, W - m.r + 8, y(cfg.ref) + 18, fmt.brl(cfg.ref, { compact: true }), 'dt-c-lbl');
      }
      root.insertAdjacentHTML('beforeend', dataTable(['Mês', valueLabel], labels.map(function (lb, k) {
        return [lb, isNum(vals[k]) ? fmt.brl(vals[k]) : '—'];
      })));
    });
  };

  /* Cascata do acerto: total → deduções → resultado. tipos: total | delta | subtotal | result. */
  charts.cascata = function (host, cfg) {
    mount(host, function (root, W) {
      var H = cfg.height || 280, m = { t: 26, r: 8, b: 44, l: 72 }, steps = cfg.steps, n = steps.length;
      var run = 0, bars = [], maxV = 0;
      steps.forEach(function (s) {
        var a, b;
        if (s.type === 'delta') { a = run; b = run + s.value; run = b; }
        else { a = 0; b = s.type === 'total' ? s.value : (isNum(s.value) ? s.value : run); run = b; }
        bars.push({ s: s, lo: Math.min(a, b), hi: Math.max(a, b), end: b });
        maxV = Math.max(maxV, a, b);
      });
      var sc = scale(maxV, 4), iw = W - m.l - m.r, ih = H - m.t - m.b, band = iw / n, bw = Math.max(10, Math.min(56, band - 12));
      var y = function (v) { return m.t + ih - (v / sc.top) * ih; };
      var base = steps[0] && steps[0].type === 'total' ? steps[0].value : 0;
      root.insertAdjacentHTML('beforeend', legend([{ k: 'plan', t: cfg.totalLabel || 'Receita' }, { k: 'ctx', t: cfg.deltaLabel || 'Deduções' }, { k: 'actual', t: cfg.resultLabel || 'Resultado' }]));
      var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': cfg.title || 'Cascata do acerto' }, root);
      for (var t = 0; t <= sc.top + 1e-9; t += sc.step) {
        el('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), 'class': t === 0 ? 'dt-c-axis' : 'dt-c-grid' }, svg);
        text(svg, m.l - 8, y(t) + 4, fmt.brl(t, { compact: true, trim: true }), 'dt-c-tick', 'end');
      }
      var maxChars = Math.max(8, Math.floor(band / 6));
      bars.forEach(function (b, i) {
        var cx = m.l + band * i + band / 2, cls = b.s.type === 'delta' ? 'dt-c-ctx' : b.s.type === 'result' ? 'dt-c-actual' : 'dt-c-plan';
        var top = y(b.hi), h = Math.max(1, y(b.lo) - top);
        el('rect', { x: cx - bw / 2, y: top, width: bw, height: h, rx: 2, 'class': cls }, svg);
        if (i < n - 1) el('line', { x1: cx + bw / 2, x2: cx + band - bw / 2, y1: y(b.end), y2: y(b.end), 'class': 'dt-c-conn' }, svg);
        text(svg, cx, top - 7, fmt.brl(b.s.type === 'delta' ? b.s.value : b.end, { compact: true }), 'dt-c-lbl', 'middle');
        wrapWords(b.s.label, maxChars).forEach(function (ln, k) { text(svg, cx, H - 26 + k * 13, ln, 'dt-c-tick', 'middle'); });
        var hit = el('rect', { x: m.l + band * i, y: m.t, width: band, height: ih, 'class': 'dt-c-bar-hit' }, svg);
        hit.addEventListener('pointermove', function (e) {
          var v = b.s.type === 'delta' ? b.s.value : b.end;
          var html = '<div class="dt-tip-title">' + esc(b.s.label) + '</div>' + tipRow(b.s.type === 'delta' ? 'ctx' : b.s.type === 'result' ? 'actual' : 'plan', 'Valor', fmt.brl(v));
          if (base) html += tipRow('', '% da receita', fmt.pct(Math.abs(v) / base, 1));
          showTip(html, e.clientX, e.clientY);
        });
        hit.addEventListener('pointerleave', hideTip);
      });
      root.insertAdjacentHTML('beforeend', dataTable(['Etapa', 'Valor'], steps.map(function (s, k) {
        return [s.label, fmt.brl(s.type === 'delta' ? s.value : bars[k].end)];
      })));
    });
  };

  /* Rateio: barras horizontais rotuladas; a parte em foco em chart-actual, as demais em chart-context. */
  charts.rateio = function (host, cfg) {
    var rows = cfg.rows, total = cfg.total || rows.reduce(function (a, r) { return a + r.value; }, 0);
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }));
    host.innerHTML = '<div class="dt-rl" role="list">' + rows.map(function (r, i) {
      var share = total ? r.value / total : 0;
      return '<div class="dt-rl-row" role="listitem" data-i="' + i + '"><div class="dt-rl-label">' + esc(r.label) + (r.note ? '<small>' + esc(r.note) + '</small>' : '') +
        '</div><div class="dt-rl-track"><div class="dt-rl-fill dt-rl-fill--' + (r.highlight ? 'actual' : 'ctx') + '" style="width:' + (max ? (r.value / max * 100).toFixed(2) : 0) +
        '%"></div></div><div class="dt-rl-value">' + esc(fmt.brl(r.value, { compact: cfg.compact !== false })) + '<small>' + esc(fmt.pct(share, 1)) + '</small></div></div>';
    }).join('') + '</div>';
    Array.prototype.forEach.call(host.querySelectorAll('.dt-rl-row'), function (row) {
      var r = rows[+row.getAttribute('data-i')];
      row.addEventListener('pointermove', function (e) {
        showTip('<div class="dt-tip-title">' + esc(r.label) + '</div>' + tipRow(r.highlight ? 'actual' : 'ctx', 'Valor', fmt.brl(r.value)) +
          tipRow('', 'Participação', fmt.pct(total ? r.value / total : 0, 2)), e.clientX, e.clientY);
      });
      row.addEventListener('pointerleave', hideTip);
    });
  };
})();
