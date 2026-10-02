/* Painel DN25001 · Consórcio ARRB Dynatest
   Lê os dados do Supabase (login por e-mail e senha, perfis gestor/leitor) ou, sem configuração,
   do arquivo de prévia local demo/dados.json. Visual e gráficos: design system em assets/ds. */
(function () {
  'use strict';
  var CFG = window.PAINEL_CONFIG || {};
  var f = DT.fmt, esc = DT.esc;
  function $(id) { return document.getElementById(id); }

  // Selos de status próprios do painel (somam-se aos do design system)
  DT.STATUS.medido = ['info', 'route', 'Medido'];
  DT.STATUS.faturado = ['info', 'receipt', 'Faturado'];
  DT.STATUS.recebido_pg = ['ok', 'wallet', 'Recebido'];
  DT.STATUS.calculado = ['info', 'file-spreadsheet', 'Calculado'];
  DT.STATUS.aprovado = ['ok', 'check', 'Aprovado'];
  DT.STATUS.aberta = ['warn', 'circle-alert', 'Aberta'];
  DT.STATUS.em_analise = ['info', 'search', 'Em análise'];
  DT.STATUS.resolvida = ['ok', 'circle-check', 'Resolvida'];

  var TABELAS = ['contrato', 'produtos', 'acoes', 'medicoes', 'medicao_itens', 'acertos', 'acerto_linhas', 'equipe',
    'aportes', 'rateio_planejado', 'parametros', 'documentos', 'pendencias'];
  var ABAS = ['visao', 'medicoes', 'custos', 'acertos', 'documentos', 'pendencias'];
  var TIPOS_DOC = {
    boletim: ['file-spreadsheet', 'Boletim de medição'], nf_emitida: ['receipt', 'NF emitida ao DNIT'],
    nf_fornecedor: ['receipt', 'NF de fornecedor'], folha: ['users', 'Folha e equipe'], comprovante: ['wallet', 'Comprovante'],
    aporte: ['hand-coins', 'Aporte de sócia'], acerto: ['file-spreadsheet', 'Acerto do consórcio'], contrato: ['landmark', 'Contrato'],
    outro: ['file-text', 'Outro']
  };
  var ORIGENS = { outlook: 'E-mail (Outlook)', pasta: 'Pasta do contrato', manual: 'Lançamento manual' };
  var STATUS_DOC = { recebido: 'Recebido', processando: 'Em processamento', conciliado: 'Conciliado', pendente: 'Pendente', aguardando: 'Aguardando', divergente: 'Divergente', erro: 'Erro' };
  var SEV = { critical: ['circle-alert', 'Crítica'], warn: ['triangle-alert', 'Atenção'], info: ['file-text', 'Informação'] };

  var S = { modo: null, sb: null, user: null, perfil: null, d: null, med: null, acerto: null, aba: 'visao',
    filtroDoc: { tipo: '', status: '', q: '' }, filtroPend: 'abertas', editando: null, msgLogin: '', montagens: [] };

  /* ---------- utilidades ---------- */
  function soma(arr, fn) { return arr.reduce(function (a, x) { return a + (+fn(x) || 0); }, 0); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function nomeMed(n) { return 'Med ' + pad2(n); }
  function idxMes(s) { var p = String(s).split('-'); return (+p[0]) * 12 + (+p[1] - 1); }
  function dataHora(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return '—';
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' às ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  function dataCurta(s) { return s ? f.date(String(s).slice(0, 10)) : '—'; }
  function gestor() { return S.perfil && S.perfil.papel === 'gestor'; }
  function brl(v) { return v == null ? '—' : f.brl(+v); }
  function brlc(v) { return v == null ? '—' : f.brl(+v, { compact: true }); }
  function icon(n) { return DT.icon(n); }
  // texto vindo da base: escapa e impede quebra de linha entre "R$" e o número
  function txt(s) { return esc(String(s == null ? '' : s).replace(/R\$ /g, 'R$ ')); }

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.h);
    toast.h = setTimeout(function () { t.hidden = true; }, 3200);
  }

  /* ---------- tema ---------- */
  var TEMAS = { sistema: 'Tema: sistema', claro: 'Tema: claro', escuro: 'Tema: escuro' };
  function lerTema() { try { return localStorage.getItem('painel-dn25001-tema') || 'sistema'; } catch (e) { return 'sistema'; } }
  function aplicarTema(t) {
    var r = document.documentElement;
    if (t === 'claro') r.setAttribute('data-theme', 'light');
    else if (t === 'escuro') r.setAttribute('data-theme', 'dark');
    else r.removeAttribute('data-theme');
    $('btn-tema').textContent = TEMAS[t] || TEMAS.sistema;
    try { localStorage.setItem('painel-dn25001-tema', t); } catch (e) { /* sem armazenamento local */ }
  }

  /* ---------- dados ---------- */
  function normalizar(d) {
    var porOrdem = function (a, b) { return (a.ordem || 0) - (b.ordem || 0); };
    d.produtos.sort(porOrdem);
    d.acoes.sort(porOrdem);
    d.medicoes.sort(function (a, b) { return a.numero - b.numero; });
    d.acertos.sort(function (a, b) { return a.numero - b.numero; });
    d.acerto_linhas.sort(function (a, b) { return a.acerto - b.acerto || a.ordem - b.ordem; });
    d.rateio_planejado.sort(porOrdem);
    // recebidos primeiro (mais recentes no topo); os esperados, sem data, depois
    d.documentos.sort(function (a, b) {
      if (!a.recebido_em !== !b.recebido_em) return a.recebido_em ? -1 : 1;
      return String(b.recebido_em || '').localeCompare(String(a.recebido_em || '')) || a.id - b.id;
    });
    var ordemSev = { critical: 0, warn: 1, info: 2 };
    d.pendencias.sort(function (a, b) { return ordemSev[a.severidade] - ordemSev[b.severidade] || a.id - b.id; });
    return d;
  }
  function carregarDemo() {
    return fetch(CFG.demoUrl || '../demo/dados.json', { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('arquivo de prévia não encontrado');
      return r.json();
    }).then(normalizar);
  }
  function carregarSupabase() {
    return Promise.all(TABELAS.map(function (t) { return S.sb.from(t).select('*'); })).then(function (rs) {
      var d = {};
      rs.forEach(function (r, i) { if (r.error) throw r.error; d[TABELAS[i]] = r.data || []; });
      d.contrato = d.contrato[0] || null;
      if (!d.contrato) throw new Error('nenhum contrato cadastrado na base');
      return normalizar(d);
    });
  }
  function recarregar(silencioso) {
    var p = S.modo === 'demo' ? Promise.resolve(S.d) : carregarSupabase();
    return p.then(function (d) {
      S.d = d;
      montarCabecalho();
      render();
      if (!silencioso) toast('Dados atualizados.');
    }).catch(function (e) { toast('Não consegui atualizar: ' + (e.message || e)); });
  }
  function salvar(tabela, filtro, patch) {
    if (S.modo === 'demo') {
      S.d[tabela].forEach(function (row) {
        var ok = Object.keys(filtro).every(function (k) { return row[k] === filtro[k]; });
        if (ok) Object.assign(row, patch);
      });
      render();
      montarCabecalho();
      toast('Prévia local: a alteração aparece aqui, mas não é gravada.');
      return Promise.resolve();
    }
    var q = S.sb.from(tabela).update(patch);
    Object.keys(filtro).forEach(function (k) { q = q.eq(k, filtro[k]); });
    return q.select().then(function (r) {
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw new Error('sem permissão para alterar este registro');
      toast('Alteração salva.');
      return recarregar(true);
    }).catch(function (e) { toast('Não foi possível salvar: ' + (e.message || e)); });
  }

  /* ---------- cálculos ---------- */
  function medSel() { return S.d.medicoes.filter(function (m) { return m.numero === S.med; })[0] || null; }
  function acertoSel() { return S.d.acertos.filter(function (a) { return a.numero === S.acerto; })[0] || null; }
  function calc(medN) {
    var d = S.d, por = {};
    d.acoes.forEach(function (a) { por[a.codigo] = { antQ: 0, antV: 0, mesQ: 0, mesV: 0 }; });
    d.medicao_itens.forEach(function (i) {
      var o = por[i.acao];
      if (!o) return;
      if (i.medicao < medN) { o.antQ += +i.quantidade; o.antV += +i.valor; }
      else if (i.medicao === medN) { o.mesQ += +i.quantidade; o.mesV += +i.valor; }
    });
    var linhas = d.acoes.map(function (a) {
      var o = por[a.codigo], acum = o.antV + o.mesV;
      return { a: a, antV: o.antV, mesQ: o.mesQ, mesV: o.mesV, acumQ: o.antQ + o.mesQ, acumV: acum,
        pct: a.valor_contratado ? acum / a.valor_contratado : 0, saldo: a.valor_contratado - acum };
    });
    var total = +d.contrato.valor_total;
    var acum = soma(linhas, function (l) { return l.acumV; });
    return { linhas: linhas, total: total, mes: soma(linhas, function (l) { return l.mesV; }),
      ant: soma(linhas, function (l) { return l.antV; }), acum: acum, saldo: total - acum };
  }
  function serieCurva(medN) {
    var c = S.d.contrato, i0 = idxMes(c.vigencia_inicio), n = +c.meses, labels = [], plan = [], act = [];
    for (var i = 0; i <= n; i++) {
      var m = i0 + i;
      labels.push(f.month(new Date(Math.floor(m / 12), m % 12, 1)));
      plan.push(+c.valor_total * i / n);
      act.push(null);
    }
    act[0] = 0;
    var acum = 0, ultimo = 0;
    S.d.medicoes.filter(function (m) { return m.numero <= medN; }).forEach(function (m) {
      acum += +m.valor;
      var k = Math.max(0, Math.min(n, idxMes(m.periodo_fim) - i0));
      for (var j = ultimo + 1; j < k; j++) act[j] = act[ultimo];
      act[k] = acum;
      ultimo = Math.max(ultimo, k);
    });
    return { labels: labels, plan: plan, actual: act };
  }
  function linhasAcerto(n) { return S.d.acerto_linhas.filter(function (l) { return l.acerto === n; }); }
  function grupoScp(L, g, campo) { return soma(L.filter(function (l) { return l.grupo === g; }), function (l) { return l[campo || 'valor_scp']; }); }
  function passosCascata(ac) {
    var L = linhasAcerto(ac.numero);
    var passos = [
      { label: 'Receita SCP (' + f.pct(+ac.participacao_scp, 0) + ')', value: grupoScp(L, 'receita'), type: 'total' },
      { label: 'Impostos', value: -grupoScp(L, 'impostos'), type: 'delta' },
      { label: 'Equipe alocada', value: -grupoScp(L, 'equipe'), type: 'delta' },
      { label: 'Equipe Dyna', value: -grupoScp(L, 'equipe_dyna'), type: 'delta' },
      { label: 'Custos adicionais', value: -grupoScp(L, 'custos_adicionais'), type: 'delta' },
      { label: 'Processamento P1', value: -grupoScp(L, 'processamento'), type: 'delta' },
      { label: 'Resultado SCP', type: 'subtotal' },
      { label: 'Sócia ostensiva', value: -(+ac.resultado_ostensiva), type: 'delta' }
    ];
    if (+ac.ajuste_aportes) passos.push({ label: 'Acerto de aportes', value: +ac.ajuste_aportes, type: 'delta' });
    passos.push({ label: 'Repasse participante', type: 'result' });
    return passos.filter(function (p) { return p.type !== 'delta' || Math.abs(p.value) > 0.004; });
  }

  /* ---------- pedaços de interface ---------- */
  function secao(kicker, titulo, sub, aside) {
    return '<div class="dt-section"><div><p class="dt-kicker">' + esc(kicker) + '</p><h1 class="dt-title">' + titulo + '</h1>' +
      (sub ? '<p class="dt-sub">' + sub + '</p>' : '') + '</div>' + (aside ? '<div class="dt-section-aside">' + aside + '</div>' : '') + '</div>';
  }
  function card(col, titulo, sub, corpo, extraHead) {
    return '<section class="dt-card ' + col + '"><div class="dt-card-head"><div><h2 class="dt-h3">' + titulo + '</h2>' +
      (sub ? '<p class="dt-sub">' + sub + '</p>' : '') + '</div>' + (extraHead || '') + '</div>' + corpo + '</section>';
  }
  function kpi(col, ico, label, valor, sub, pct) {
    return '<section class="dt-card ' + col + '"><div class="dt-kpi"><div class="dt-kpi-top"><span class="dt-kpi-label">' + esc(label) + '</span>' + DT.hex(ico) + '</div>' +
      '<div class="dt-kpi-value">' + esc(valor) + '</div><div class="dt-kpi-sub">' + sub + '</div>' +
      (pct != null ? barra(pct) : '') + '</div></section>';
  }
  function barra(pct, largura) {
    var w = Math.max(0, Math.min(1, pct)) * 100;
    return '<div class="dt-progress"><div class="dt-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + w.toFixed(2) + '"' +
      (largura ? ' style="width:' + largura + 'px"' : '') + '>' + (pct > 0 ? '<div class="dt-progress-fill" style="width:' + w + '%"></div>' : '') + '</div></div>';
  }
  function exec(pct) {
    var w = Math.max(0, Math.min(1, pct)) * 100;
    return '<span class="app-exec"><span class="dt-progress-track" role="presentation">' + (pct > 0 ? '<span class="dt-progress-fill" style="display:block;width:' + w + '%"></span>' : '') + '</span>' + f.pct(pct) + '</span>';
  }
  function badgeMed(st) { return DT.badge(st === 'recebido' ? 'recebido_pg' : st); }
  function botao(acao, texto, cls, extra) {
    return '<button type="button" class="dt-btn ' + (cls || '') + '" data-acao="' + acao + '"' + (extra || '') + '>' + texto + '</button>';
  }
  function vazio(msg) { return '<div class="app-empty">' + msg + '</div>'; }
  function montar(fn) { S.montagens.push(fn); }

  function docItem(d) {
    var t = TIPOS_DOC[d.tipo] || TIPOS_DOC.outro;
    var meta = [t[1], ORIGENS[d.origem] || d.origem, d.recebido_em ? dataCurta(d.recebido_em) : 'ainda não recebido'];
    if (d.competencia) meta.push(d.competencia);
    return '<li class="dt-doc"><span class="dt-doc-ico">' + icon(t[0]) + '</span><div style="min-width:0"><div class="dt-doc-name">' + esc(d.nome) + '</div>' +
      '<div class="dt-doc-meta">' + txt(meta.join(' · ')) + '</div>' + (d.resumo ? '<div class="dt-doc-meta">' + txt(d.resumo) + '</div>' : '') + '</div>' +
      '<span class="dt-doc-value">' + (d.valor != null ? brl(d.valor) : '—') + '</span>' + DT.badge(d.status) + '</li>';
  }
  function pendItem(p, completo) {
    var sv = SEV[p.severidade] || SEV.info;
    var h = '<div class="dt-alert dt-alert--' + p.severidade + '"><span class="dt-alert-ico">' + icon(sv[0]) + '</span><div>' +
      '<div class="app-alert-head"><div class="dt-alert-title">' + esc(p.titulo) + '</div>' + DT.badge(p.status) + '</div>' +
      '<div class="dt-alert-text">' + txt(p.descricao) + '</div>';
    if (completo) {
      h += '<div class="app-meta">' + esc(sv[1]) + (p.referencia ? ' · <span class="dt-code">' + esc(p.referencia) + '</span>' : '') +
        ' · aberta em ' + dataCurta(p.criada_em) + (p.resolvida_em ? ' · resolvida em ' + dataCurta(p.resolvida_em) : '') + '</div>';
      if (p.resolucao) h += '<div class="dt-alert-text"><b>Resolução:</b> ' + txt(p.resolucao) + '</div>';
      if (gestor()) {
        if (S.editando === p.id) {
          h += '<div class="app-actions" style="display:grid"><label class="app-field" for="resolucao-' + p.id + '"><span class="dt-field-label">Como foi resolvida</span>' +
            '<textarea class="app-input" id="resolucao-' + p.id + '" rows="3">' + esc(p.resolucao || '') + '</textarea></label>' +
            '<div class="app-actions" style="margin-top:0">' + botao('pend-salvar', 'Salvar como resolvida', 'dt-btn--primary', ' data-id="' + p.id + '"') +
            botao('pend-cancelar', 'Cancelar', '') + '</div></div>';
        } else if (p.status !== 'resolvida') {
          h += '<div class="app-actions">' + (p.status === 'aberta' ? botao('pend-status', 'Marcar em análise', '', ' data-id="' + p.id + '" data-status="em_analise"') : '') +
            botao('pend-resolver', 'Resolver', 'dt-btn--ghost', ' data-id="' + p.id + '"') + '</div>';
        } else {
          h += '<div class="app-actions">' + botao('pend-status', 'Reabrir', 'dt-btn--ghost', ' data-id="' + p.id + '" data-status="aberta"') + '</div>';
        }
      }
    }
    return h + '</div></div>';
  }

  /* ---------- abas ---------- */
  function renderVisao() {
    var d = S.d, c = d.contrato, k = calc(S.med), m = medSel(), ac = acertoSel();
    var ref = d.medicoes.some(function (x) { return x.numero <= S.med && x.oficial === false; });
    var h = secao('Visão geral – ' + nomeMed(S.med), 'Execução do <em>contrato</em>',
      'Situação até a ' + nomeMed(S.med) + (m ? ' (' + dataCurta(m.periodo_inicio) + ' a ' + dataCurta(m.periodo_fim) + ')' : '') +
      (ref ? ' · valores de referência, aguardando o boletim oficial' : ''),
      botao('atualizar', icon('refresh-cw') + 'Atualizar', '') + botao('ir', icon('file-spreadsheet') + 'Ver medição', 'dt-btn--primary', ' data-aba="medicoes"'));
    h += '<div class="dt-grid">' +
      kpi('dt-col-3', 'landmark', 'Valor do contrato', brlc(k.total), 'Vigência ' + dataCurta(c.vigencia_inicio) + ' a ' + dataCurta(c.vigencia_fim) + ' · P0 ' + esc(c.data_base)) +
      kpi('dt-col-3', 'route', 'Medido acumulado', brlc(k.acum), '<b>' + f.pct(k.acum / k.total) + '</b> do contrato · até a ' + nomeMed(S.med) + (ref ? ' · referência' : ''), k.acum / k.total) +
      kpi('dt-col-3', 'wallet', 'Saldo contratual', brlc(k.saldo), f.pct(k.saldo / k.total) + ' a medir') +
      (ac ? kpi('dt-col-3', 'hand-coins', 'Resultado da SCP · Acerto ' + ac.numero, brlc(ac.resultado_scp),
        'Receita ' + brlc(grupoScp(linhasAcerto(ac.numero), 'receita')) + ' · repasse ' + brlc(ac.repasse)) :
        kpi('dt-col-3', 'hand-coins', 'Resultado da SCP', '—', 'Nenhum acerto lançado')) + '</div>';
    h += '<div class="dt-grid">' +
      card('dt-col-8', 'Curva S do contrato', 'Planejado linear em ' + c.meses + ' meses (sem cronograma oficial) · medido até a ' + nomeMed(S.med), '<div class="dt-chart" id="g-curva"></div>') +
      card('dt-col-4', 'Rateio planejado', 'Custos por consorciada e margem · RESUMO CONTRATO', '<div id="g-rateio"></div><p class="app-note">Margem dividida 30% Dynatest · 70% ARRB. O total do resumo não inclui a Ação 6.2 (ver pendências).</p>') +
      '</div>';
    if (ac) {
      h += '<div class="dt-grid">' +
        card('dt-col-8', 'Acerto ' + ac.numero + ' · visão da SCP', 'Da receita da SCP ao repasse da sócia participante', '<div class="dt-chart" id="g-cascata"></div>') +
        '<div class="dt-col-4 app-stack-tight">' +
        '<div class="dt-callout"><p class="dt-kicker">Repasse ' + ac.numero + ' – Sócia participante</p><div class="dt-callout-value">' + brl(ac.repasse) + '</div>' +
        '<div class="dt-callout-sub">Resultado da participante ' + brl(ac.resultado_participante) + (+ac.ajuste_aportes ? ' · acerto de aportes ' + brl(ac.ajuste_aportes) : '') + '</div></div>' +
        card('', 'Divisão do resultado da SCP', 'Resultado ' + brl(ac.resultado_scp), '<div id="g-scp"></div><p class="app-note">Regra do resumo: 1/3 ostensiva · 2/3 participante.</p>') +
        '</div></div>';
    }
    var abertas = d.pendencias.filter(function (p) { return p.status !== 'resolvida'; });
    h += '<div class="dt-grid">' +
      card('dt-col-6', 'Pendências abertas', abertas.length + ' ' + (abertas.length === 1 ? 'item' : 'itens'),
        abertas.length ? '<div class="dt-alerts">' + abertas.slice(0, 4).map(function (p) { return pendItem(p, false); }).join('') + '</div>' : vazio('Nenhuma pendência aberta.'),
        botao('ir', 'Ver todas', 'dt-btn--ghost', ' data-aba="pendencias"')) +
      card('dt-col-6', 'Documentos', 'Últimos recebidos e os que faltam',
        d.documentos.length ? '<ul class="dt-docs">' + d.documentos.slice(0, 5).map(docItem).join('') + '</ul>' : vazio('Nenhum documento ainda.'),
        botao('ir', 'Ver todos', 'dt-btn--ghost', ' data-aba="documentos"')) + '</div>';
    montar(function () {
      var s = serieCurva(S.med);
      DT.charts.curvaS($('g-curva'), { labels: s.labels, plan: s.plan, actual: s.actual, planLabel: 'Planejado (linear)', actualLabel: 'Medido', height: 250 });
      DT.charts.rateio($('g-rateio'), { rows: d.rateio_planejado.map(function (r) { return { label: r.parte, value: +r.valor, highlight: r.destaque }; }) });
      if (ac) {
        DT.charts.cascata($('g-cascata'), { steps: passosCascata(ac), height: 290, totalLabel: 'Receita e resultado', deltaLabel: 'Deduções', resultLabel: 'Repasse' });
        DT.charts.rateio($('g-scp'), { compact: false, rows: [
          { label: 'Sócia participante', value: +ac.resultado_participante, highlight: true },
          { label: 'Sócia ostensiva', value: +ac.resultado_ostensiva }] });
      }
    });
    return h;
  }

  function renderMedicoes() {
    var d = S.d, m = medSel();
    if (!m) return secao('Medições', 'Medições do <em>contrato</em>', '') + vazio('Nenhuma medição lançada ainda.');
    var k = calc(S.med), total = k.total;
    var h = secao('Medições – ' + nomeMed(m.numero), 'Medição <em>' + pad2(m.numero) + '</em>',
      'Período ' + dataCurta(m.periodo_inicio) + ' a ' + dataCurta(m.periodo_fim) + (m.obs ? ' · ' + txt(m.obs) : ''),
      m.oficial === false ? '<span class="dt-tag">Valores de referência</span>' : '');
    h += '<div class="dt-grid">' +
      kpi('dt-col-3', 'file-spreadsheet', 'Valor da medição', brlc(k.mes), f.pct(k.mes / total) + ' do contrato') +
      kpi('dt-col-3', 'route', 'Acumulado até a ' + nomeMed(m.numero), brlc(k.acum), '<b>' + f.pct(k.acum / total) + '</b> do contrato', k.acum / total) +
      kpi('dt-col-3', 'wallet', 'Saldo após a medição', brlc(k.saldo), f.pct(k.saldo / total) + ' a medir') +
      '<section class="dt-card dt-col-3"><div class="dt-kpi"><div class="dt-kpi-top"><span class="dt-kpi-label">Situação</span>' + DT.hex('clock') + '</div>' +
      '<div style="margin:6px 0 8px">' + badgeMed(m.status) + '</div><dl class="app-kv">' +
      '<dt>Aprovação</dt><dd>' + dataCurta(m.data_aprovacao) + '</dd><dt>Faturamento</dt><dd>' + dataCurta(m.data_faturamento) + '</dd>' +
      '<dt>Recebimento</dt><dd>' + dataCurta(m.data_recebimento) + '</dd><dt>NF</dt><dd>' + esc(m.nf_numero || '—') + '</dd></dl></div></section>' +
      '</div>';
    var corpo = '';
    d.produtos.forEach(function (p) {
      var ls = k.linhas.filter(function (l) { return l.a.produto === p.codigo; });
      if (!ls.length) return;
      var vc = soma(ls, function (l) { return l.a.valor_contratado; }), va = soma(ls, function (l) { return l.acumV; });
      corpo += '<tr class="dt-grp"><td colspan="3">' + esc(p.codigo + ' · ' + p.nome) + '</td><td class="num">' + brl(vc) + '</td><td class="num"></td><td class="num"></td><td class="num"></td>' +
        '<td class="num">' + brl(va) + '</td><td class="num">' + f.pct(vc ? va / vc : 0) + '</td><td class="num">' + brl(vc - va) + '</td></tr>';
      ls.forEach(function (l) {
        var km = /km/.test(l.a.unidade);
        corpo += '<tr' + (l.mesV ? ' class="is-selected"' : '') + '><td class="app-wrap"><b>Ação ' + esc(l.a.codigo) + '</b> - ' + esc(l.a.nome) + '</td>' +
          '<td class="muted">' + esc(l.a.unidade) + '</td><td class="num">' + f.num(+l.a.qtd_contratada, 0) + '</td><td class="num">' + brl(l.a.valor_contratado) + '</td>' +
          '<td class="num">' + brl(l.antV) + '</td><td class="num">' + (l.mesQ ? f.num(l.mesQ, km ? 3 : 0) : '—') + '</td><td class="num">' + brl(l.mesV) + '</td>' +
          '<td class="num">' + brl(l.acumV) + '</td><td class="num">' + exec(l.pct) + '</td><td class="num">' + brl(l.saldo) + '</td></tr>';
      });
    });
    h += '<section><div class="dt-table-wrap"><table class="dt-table"><thead><tr><th>Ação</th><th>Unidade</th><th class="num">Qtd. contrato</th>' +
      '<th class="num">Valor contratado</th><th class="num">Anterior</th><th class="num">Qtd. no mês</th><th class="num">No mês</th><th class="num">Acumulado</th>' +
      '<th class="num">Execução</th><th class="num">Saldo</th></tr></thead><tbody>' + corpo + '</tbody><tfoot><tr><td colspan="3">Total do contrato</td>' +
      '<td class="num">' + brl(total) + '</td><td class="num">' + brl(k.ant) + '</td><td></td><td class="num">' + brl(k.mes) + '</td><td class="num">' + brl(k.acum) + '</td>' +
      '<td class="num">' + f.pct(k.acum / total) + '</td><td class="num">' + brl(k.saldo) + '</td></tr></tfoot></table></div></section>';
    var prog = d.produtos.map(function (p) {
      var ls = k.linhas.filter(function (l) { return l.a.produto === p.codigo; });
      var vc = soma(ls, function (l) { return l.a.valor_contratado; }), va = soma(ls, function (l) { return l.acumV; }), pct = vc ? va / vc : 0;
      return '<div class="dt-progress"><div class="dt-progress-head"><span class="dt-progress-label">' + esc(p.codigo + ' · ' + p.nome) + '</span><span class="dt-progress-value">' + f.pct(pct) + '</span></div>' +
        '<div class="dt-progress-track">' + (pct > 0 ? '<div class="dt-progress-fill" style="width:' + (pct * 100) + '%"></div>' : '') + '</div></div>';
    }).join('');
    h += '<div class="dt-grid">' +
      card('dt-col-8', 'Valor por medição', 'Referência: valor do contrato dividido pelos ' + d.contrato.meses + ' meses', '<div class="dt-chart" id="g-barras"></div>') +
      card('dt-col-4', 'Execução por produto', 'Acumulado até a ' + nomeMed(m.numero) + ' ÷ valor contratado', '<div class="dt-progress-list">' + prog + '</div>') + '</div>';
    montar(function () {
      var ms = d.medicoes.filter(function (x) { return x.numero <= S.med; });
      DT.charts.barras($('g-barras'), { labels: ms.map(function (x) { return nomeMed(x.numero) + ' · ' + f.month(x.periodo_fim); }), values: ms.map(function (x) { return +x.valor; }),
        ref: total / d.contrato.meses, refLabel: 'Previsto/mês', valueLabel: 'Medido', height: 220 });
    });
    return h;
  }

  function renderCustos() {
    var d = S.d, ac = acertoSel();
    var h = secao('Custos e rateio', 'Rateio e <em>parâmetros</em>', 'Planejado no RESUMO CONTRATO e regras usadas nos acertos');
    var grupos = {};
    d.parametros.forEach(function (p) { (grupos[p.grupo] = grupos[p.grupo] || []).push(p); });
    var params = Object.keys(grupos).map(function (g) {
      return '<tr class="app-sub"><td colspan="2">' + esc(g) + '</td></tr>' + grupos[g].map(function (p) {
        var v = +p.valor, txt = v < 1 ? f.pct(v, v * 100 % 1 ? 2 : 0) : brl(v);
        if (p.chave === 'ostensiva') txt = '1/3'; if (p.chave === 'participante') txt = '2/3';
        return '<tr><td>' + esc(p.descricao) + '</td><td class="num">' + txt + '</td></tr>';
      }).join('');
    }).join('');
    var impostos = d.parametros.filter(function (p) { return p.grupo === 'Impostos'; });
    params += '<tr class="app-tot"><td>Total de impostos sobre o faturamento</td><td class="num">' + f.pct(soma(impostos, function (p) { return p.valor; })) + '</td></tr>';
    var esquerda = card('', 'Rateio planejado do contrato', 'Custos por consorciada e margem', '<div id="g-rateio2"></div><p class="app-note">Fonte: RESUMO CONTRATO (base abr/24). O total do resumo não inclui a Ação 6.2.</p>');
    if (ac) {
      var L = linhasAcerto(ac.numero), eq = d.equipe.filter(function (e) { return e.acerto === ac.numero; });
      var eqLinha = L.filter(function (l) { return l.grupo === 'equipe'; })[0];
      var outros = L.filter(function (l) { return l.grupo === 'custos_adicionais' || l.grupo === 'processamento' || l.grupo === 'equipe_dyna'; });
      esquerda += card('', 'Equipe alocada · Acerto ' + ac.numero, (eqLinha ? brl(eqLinha.valor_consorcio) + ' no consórcio · ' + brl(eqLinha.valor_scp) + ' para a SCP' : ''),
          '<dl class="app-kv">' + eq.map(function (e) { return '<dt>' + esc(e.categoria) + '</dt><dd>' + e.pessoas + (e.pessoas === 1 ? ' pessoa' : ' pessoas') + '</dd>'; }).join('') +
          '<dt><b>Total</b></dt><dd><b>' + soma(eq, function (e) { return e.pessoas; }) + ' pessoas</b></dd></dl><p class="app-note">Custo por pessoa não aparece no painel; os valores individuais ficam na planilha de origem.</p>') +
        card('', 'Outros custos · Acerto ' + ac.numero, 'Valor no consórcio e parte da SCP',
          '<dl class="app-kv">' + outros.map(function (l) { return '<dt>' + txt(l.descricao) + '</dt><dd>' + brl(l.valor_consorcio) + ' · SCP ' + brl(l.valor_scp) + '</dd>'; }).join('') + '</dl>');
    }
    h += '<div class="dt-grid" style="align-items:start"><div class="dt-col-6 app-stack-tight">' + esquerda + '</div>' +
      card('dt-col-6', 'Parâmetros dos acertos', 'Valores usados no cálculo da SCP', '<div class="dt-table-wrap"><table class="dt-table"><tbody>' + params + '</tbody></table></div>') +
      '</div>';
    var linhas = d.acoes.map(function (a) {
      var p = +a.preco_unitario, dy = +a.custo_unit_dynatest, ar = +a.custo_unit_arrb, mg = p - dy - ar;
      return '<tr><td class="app-wrap"><b>Ação ' + esc(a.codigo) + '</b> - ' + esc(a.nome) + '</td><td class="num">' + brl(p) + '</td><td class="num">' + brl(dy) + '</td>' +
        '<td class="num">' + brl(ar) + '</td><td class="num">' + brl(mg) + '</td><td class="num">' + f.pct(dy / p, 1) + ' · ' + f.pct(ar / p, 1) + ' · ' + f.pct(mg / p, 1) + '</td></tr>';
    }).join('');
    h += '<section><div class="dt-section" style="margin-bottom:16px"><div><p class="dt-kicker">Planejado – por ação</p><h2 class="dt-h2">Custo unitário por <em>consorciada</em></h2></div></div>' +
      '<div class="dt-table-wrap"><table class="dt-table"><thead><tr><th>Ação</th><th class="num">Preço DNIT (P0)</th><th class="num">Dynatest</th><th class="num">ARRB</th>' +
      '<th class="num">Margem do consórcio</th><th class="num">Dynatest · ARRB · margem</th></tr></thead><tbody>' + linhas + '</tbody></table></div></section>';
    montar(function () {
      DT.charts.rateio($('g-rateio2'), { rows: d.rateio_planejado.map(function (r) { return { label: r.parte, note: r.nota, value: +r.valor, highlight: r.destaque }; }) });
    });
    return h;
  }

  function renderAcertos() {
    var d = S.d, ac = acertoSel();
    if (!ac) return secao('Acertos e repasses', 'Acertos e <em>repasses</em>', '') + vazio('Nenhum acerto lançado ainda.');
    var sel = d.acertos.length > 1 ? '<label class="dt-field"><span class="dt-field-label">Acerto</span><span class="dt-select-wrap"><select class="dt-select" id="sel-acerto">' +
      d.acertos.map(function (a) { return '<option value="' + a.numero + '"' + (a.numero === ac.numero ? ' selected' : '') + '>Acerto ' + a.numero + ' · ' + esc(a.referencia || '') + '</option>'; }).join('') +
      '</select>' + icon('chevron-down') + '</span></label>' : '';
    var h = secao('Acertos – Acerto ' + ac.numero, 'Acerto e <em>repasse</em>', esc(ac.referencia || '') + ' · faturamento considerado ' + brl(ac.faturamento) + (ac.obs ? ' · ' + txt(ac.obs) : ''), sel);
    var acoes = '';
    if (gestor()) {
      if (ac.status === 'calculado') acoes = botao('acerto-status', icon('check') + 'Aprovar acerto', '', ' data-status="aprovado"');
      if (ac.status !== 'repassado') acoes += '<label class="app-field" for="data-repasse"><span class="dt-field-label">Data do repasse</span><input class="app-input" type="date" id="data-repasse"></label>' +
        botao('acerto-repassar', icon('hand-coins') + 'Registrar repasse', 'dt-btn--primary');
      else acoes = botao('acerto-status', 'Desfazer registro do repasse', 'dt-btn--ghost', ' data-status="aprovado"');
    }
    h += '<div class="dt-grid">' +
      card('dt-col-8', 'Do faturamento ao repasse', 'Valores da SCP · R$', '<div class="dt-chart" id="g-cascata2"></div>') +
      '<div class="dt-col-4 app-stack-tight"><div class="dt-callout"><p class="dt-kicker">Repasse ' + ac.numero + ' – Sócia participante</p><div class="dt-callout-value">' + brl(ac.repasse) + '</div>' +
      '<div class="dt-callout-sub">Resultado ' + brl(ac.resultado_participante) + (+ac.ajuste_aportes ? ' · acerto de aportes ' + brl(ac.ajuste_aportes) : '') + '</div></div>' +
      '<section class="dt-card"><div class="dt-card-head"><div><h2 class="dt-h3">Situação do acerto</h2></div>' + DT.badge(ac.status) + '</div>' +
      '<dl class="app-kv"><dt>Repasse registrado em</dt><dd>' + dataCurta(ac.data_repasse) + '</dd><dt>Regra de receita usada</dt><dd>' + f.pct(+ac.regra_ostensiva, 1) + ' · ' + f.pct(+ac.regra_participante, 1) + '</dd></dl>' +
      (acoes ? '<div class="app-actions" style="align-items:flex-end">' + acoes + '</div>' : '') + '</section></div></div>';
    var L = linhasAcerto(ac.numero), corpo = '';
    function linha(l) {
      var base = l.base == null ? '' : (l.grupo === 'impostos' ? f.pct(+l.base, 2) : (l.grupo === 'processamento' ? f.num(+l.base, 2) + ' km' : f.num(+l.base, 0)));
      return '<tr><td>' + esc(l.descricao) + '</td><td class="num">' + base + '</td><td class="num">' + brl(l.valor_consorcio) + '</td><td class="num">' + brl(l.valor_scp) + '</td>' +
        '<td class="num">' + brl(l.valor_ostensiva) + '</td><td class="num">' + brl(l.valor_participante) + '</td></tr>';
    }
    function sub(txt, ls, cls) {
      return '<tr class="' + (cls || 'app-sub') + '"><td>' + txt + '</td><td></td><td class="num">' + brl(soma(ls, function (l) { return l.valor_consorcio; })) + '</td>' +
        '<td class="num">' + brl(soma(ls, function (l) { return l.valor_scp; })) + '</td><td class="num">' + brl(soma(ls, function (l) { return l.valor_ostensiva; })) + '</td>' +
        '<td class="num">' + brl(soma(ls, function (l) { return l.valor_participante; })) + '</td></tr>';
    }
    var grupo = function (g) { return L.filter(function (l) { return l.grupo === g; }); };
    var custos = L.filter(function (l) { return l.grupo !== 'receita'; });
    corpo += grupo('receita').map(linha).join('');
    corpo += grupo('impostos').map(linha).join('') + sub('Impostos', grupo('impostos'));
    corpo += grupo('equipe').map(linha).join('') + grupo('equipe_dyna').map(linha).join('');
    corpo += grupo('custos_adicionais').map(linha).join('') + sub('Custos adicionais', grupo('custos_adicionais'));
    corpo += grupo('processamento').map(linha).join('');
    corpo += sub('Custos totais', custos, 'app-tot');
    var rec = grupo('receita')[0] || {};
    corpo += '<tr class="app-tot"><td>Resultado</td><td></td><td></td><td class="num">' + brl(+rec.valor_scp - soma(custos, function (l) { return l.valor_scp; })) + '</td>' +
      '<td class="num">' + brl(ac.resultado_ostensiva) + '</td><td class="num">' + brl(ac.resultado_participante) + '</td></tr>';
    h += '<section><div class="dt-section" style="margin-bottom:16px"><div><p class="dt-kicker">Demonstrativo – Acerto ' + ac.numero + '</p><h2 class="dt-h2">Receitas e custos da <em>SCP</em></h2></div></div>' +
      '<div class="dt-table-wrap"><table class="dt-table"><thead><tr><th>Item</th><th class="num">Base</th><th class="num">Consórcio</th><th class="num">SCP (' + f.pct(+ac.participacao_scp, 0) + ')</th>' +
      '<th class="num">Ostensiva</th><th class="num">Participante</th></tr></thead><tbody>' + corpo + '</tbody><tfoot>' +
      '<tr><td colspan="5">Acerto de aportes</td><td class="num">' + brl(ac.ajuste_aportes) + '</td></tr>' +
      '<tr><td colspan="5">Repasse à sócia participante</td><td class="num">' + brl(ac.repasse) + '</td></tr></tfoot></table></div></section>';
    var ap = d.aportes.filter(function (a) { return a.acerto === ac.numero || a.acerto == null; });
    h += card('', 'Aportes das sócias', 'Diferenças entram no acerto da medição',
      ap.length ? '<div class="dt-table-wrap"><table class="dt-table"><thead><tr><th>Data</th><th>Sócia</th><th class="num">Devido</th><th class="num">Aportado</th><th class="num">Diferença</th><th>Observação</th></tr></thead><tbody>' +
      ap.map(function (a) {
        return '<tr><td>' + dataCurta(a.data) + '</td><td>' + esc(a.socia) + '</td><td class="num">' + brl(a.valor_devido) + '</td><td class="num">' + brl(a.valor_aportado) + '</td>' +
          '<td class="num">' + (a.valor_devido != null ? brl(+a.valor_aportado - +a.valor_devido) : '—') + '</td><td>' + txt(a.obs || '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : vazio('Nenhum aporte registrado.'));
    montar(function () {
      DT.charts.cascata($('g-cascata2'), { steps: passosCascata(ac), height: 300, totalLabel: 'Receita e resultado', deltaLabel: 'Deduções', resultLabel: 'Repasse' });
    });
    return h;
  }

  function renderDocumentos() {
    var d = S.d, fd = S.filtroDoc;
    var cont = {};
    d.documentos.forEach(function (x) { cont[x.status] = (cont[x.status] || 0) + 1; });
    var lista = d.documentos.filter(function (x) {
      if (fd.tipo && x.tipo !== fd.tipo) return false;
      if (fd.status && x.status !== fd.status) return false;
      if (fd.q && (x.nome + ' ' + (x.resumo || '') + ' ' + (x.competencia || '')).toLowerCase().indexOf(fd.q.toLowerCase()) < 0) return false;
      return true;
    });
    var opt = function (obj, sel) {
      return Object.keys(obj).map(function (k) { var t = Array.isArray(obj[k]) ? obj[k][1] : obj[k]; return '<option value="' + k + '"' + (sel === k ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('');
    };
    var h = secao('Documentos', 'Documentos do <em>contrato</em>', 'O que já chegou e o que ainda falta, com o resultado da conferência');
    h += '<div class="app-chips">' + Object.keys(STATUS_DOC).filter(function (k) { return cont[k]; }).map(function (k) { return DT.badge(k, STATUS_DOC[k] + ' · ' + cont[k]); }).join('') + '</div>';
    h += '<div class="app-filters">' +
      '<label class="dt-field" for="f-tipo"><span class="dt-field-label">Tipo</span><span class="dt-select-wrap"><select class="dt-select" id="f-tipo"><option value="">Todos</option>' + opt(TIPOS_DOC, fd.tipo) + '</select>' + icon('chevron-down') + '</span></label>' +
      '<label class="dt-field" for="f-status"><span class="dt-field-label">Situação</span><span class="dt-select-wrap"><select class="dt-select" id="f-status"><option value="">Todas</option>' + opt(STATUS_DOC, fd.status) + '</select>' + icon('chevron-down') + '</span></label>' +
      '<label class="dt-field" for="f-busca"><span class="dt-field-label">Buscar</span><input class="app-input" id="f-busca" type="search" placeholder="Nome, competência…" value="' + esc(fd.q) + '"></label></div>';
    h += '<div class="dt-grid">' +
      card('dt-col-8', lista.length + (lista.length === 1 ? ' documento' : ' documentos'), 'Mais recentes primeiro; os esperados aparecem como Aguardando',
        lista.length ? '<ul class="dt-docs">' + lista.map(docItem).join('') + '</ul>' : vazio('Nenhum documento com esses filtros.')) +
      card('dt-col-4', 'Como os documentos entram', '',
        '<ol class="app-steps"><li>Os e-mails do contrato chegam no Outlook (boletins, notas fiscais, folha, comprovantes).</li>' +
        '<li>A leitura automática separa os anexos, extrai valores, datas e CNPJs e confere com o contrato e com o boletim.</li>' +
        '<li>Tudo o que bate entra no painel; o que não bate vira uma pendência para o gestor decidir.</li></ol>' +
        '<p class="app-note">Documentos esperados que ainda não chegaram aparecem com a situação Aguardando.</p>') + '</div>';
    return h;
  }

  function renderPendencias() {
    var d = S.d, fp = S.filtroPend;
    var abertas = d.pendencias.filter(function (p) { return p.status !== 'resolvida'; }), resolvidas = d.pendencias.filter(function (p) { return p.status === 'resolvida'; });
    var lista = fp === 'abertas' ? abertas : fp === 'resolvidas' ? resolvidas : d.pendencias;
    var seg = '<div class="dt-seg" role="group" aria-label="Filtrar pendências">' +
      [['abertas', 'Abertas · ' + abertas.length], ['resolvidas', 'Resolvidas · ' + resolvidas.length], ['todas', 'Todas']].map(function (o) {
        return '<button type="button" data-acao="filtro-pend" data-v="' + o[0] + '" aria-pressed="' + (fp === o[0]) + '">' + o[1] + '</button>';
      }).join('') + '</div>';
    var crit = abertas.filter(function (p) { return p.severidade === 'critical'; }).length;
    var h = secao('Pendências', 'O que precisa de <em>decisão</em>',
      crit ? crit + (crit === 1 ? ' pendência crítica aberta' : ' pendências críticas abertas') + ' · ' + abertas.length + ' no total' : abertas.length + ' abertas', seg);
    h += lista.length ? '<div class="dt-alerts">' + lista.map(function (p) { return pendItem(p, true); }).join('') + '</div>' : vazio('Nada aqui.');
    if (!gestor()) h += '<p class="app-note">Seu acesso é de leitura: só o gestor do contrato altera pendências.</p>';
    return h;
  }

  var RENDER = { visao: renderVisao, medicoes: renderMedicoes, custos: renderCustos, acertos: renderAcertos, documentos: renderDocumentos, pendencias: renderPendencias };
  function render() {
    S.montagens = [];
    DT.tooltip.hide();
    $('conteudo').innerHTML = RENDER[S.aba]();
    Array.prototype.forEach.call(document.querySelectorAll('#abas .dt-tab'), function (t) {
      var on = t.getAttribute('data-aba') === S.aba;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    S.montagens.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
  }
  function irPara(aba, focar) {
    if (ABAS.indexOf(aba) < 0) return;
    S.aba = aba;
    S.editando = null;
    try { history.replaceState(null, '', '#' + aba); } catch (e) { /* sem histórico */ }
    render();
    if (focar) $('conteudo').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function montarCabecalho() {
    var d = S.d;
    $('sel-medicao').innerHTML = d.medicoes.length ? d.medicoes.map(function (m) {
      return '<option value="' + m.numero + '"' + (m.numero === S.med ? ' selected' : '') + '>' + nomeMed(m.numero) + ' · ' + dataCurta(m.periodo_inicio) + ' a ' + dataCurta(m.periodo_fim) + (m.oficial === false ? ' (referência)' : '') + '</option>';
    }).join('') : '<option>Sem medições</option>';
    $('ico-sel').outerHTML = '<span id="ico-sel">' + icon('chevron-down') + '</span>';
    $('sync').innerHTML = icon('circle-check') + 'Dados de ' + esc(dataHora(d.contrato.atualizado_em));
    $('usuario').innerHTML = '<b>' + esc(S.perfil.nome) + '</b> · ' + (gestor() ? 'gestor' : 'leitura');
    $('btn-sair').hidden = S.modo !== 'supabase';
    $('cnt-docs').textContent = d.documentos.length;
    var ab = d.pendencias.filter(function (p) { return p.status !== 'resolvida'; }).length;
    $('cnt-pend').innerHTML = ab ? icon('triangle-alert') + ab : '0';
    $('rodape').textContent = 'DN25001 · Painel de gestão · ' + esc(dataHora(d.contrato.atualizado_em).split(' às ')[0]);
    var av = $('aviso');
    if (S.modo === 'demo') {
      av.innerHTML = icon('file-spreadsheet') + '<span>Prévia local com os dados das planilhas. Alterações feitas aqui não são gravadas.</span>';
      av.hidden = false;
    } else if (S.user && !(S.user.user_metadata || {}).senha_trocada) {
      av.innerHTML = icon('shield-check') + '<span>Primeiro acesso: troque a senha provisória por uma só sua.</span>' +
        '<button type="button" class="dt-btn dt-btn--ghost" data-acao="abrir-senha">Alterar senha</button>';
      av.hidden = false;
    } else av.hidden = true;
    $('btn-senha').hidden = S.modo !== 'supabase';
  }

  function abrirPainel(d) {
    S.d = d;
    if (S.med == null || !d.medicoes.some(function (m) { return m.numero === S.med; })) S.med = d.medicoes.length ? d.medicoes[d.medicoes.length - 1].numero : 0;
    if (S.acerto == null || !d.acertos.some(function (a) { return a.numero === S.acerto; })) S.acerto = d.acertos.length ? d.acertos[d.acertos.length - 1].numero : null;
    var h = (location.hash || '').replace('#', '');
    if (ABAS.indexOf(h) >= 0) S.aba = h;
    $('carregando').hidden = true;
    $('tela-login').hidden = true;
    $('tela-painel').hidden = false;
    montarCabecalho();
    render();
  }
  function erroFatal(msg) {
    $('tela-painel').hidden = true;
    $('tela-login').hidden = true;
    var c = $('carregando');
    c.hidden = false;
    c.textContent = msg;
  }

  /* ---------- login (Supabase) ---------- */
  function mostrarLogin(msg) {
    $('carregando').hidden = true;
    $('tela-painel').hidden = true;
    $('tela-login').hidden = false;
    var m = msg || S.msgLogin;
    S.msgLogin = '';
    erroLogin(m || '');
  }
  function erroLogin(msg) { var e = $('login-erro'); e.textContent = msg; e.hidden = !msg; }
  function entrar(user) {
    S.user = user;
    return S.sb.from('perfis').select('nome,papel').eq('user_id', user.id).maybeSingle().then(function (r) {
      if (r.error || !r.data) {
        S.msgLogin = 'Seu acesso ainda não foi liberado. Fale com o gestor do contrato.';
        return S.sb.auth.signOut();
      }
      S.perfil = r.data;
      return carregarSupabase().then(abrirPainel);
    }).catch(function (e) { erroFatal('Não consegui carregar os dados: ' + (e.message || e) + '. Atualize a página para tentar de novo.'); });
  }

  /* ---------- eventos ---------- */
  function ligarEventos() {
    $('btn-tema').addEventListener('click', function () {
      var ordem = ['sistema', 'claro', 'escuro'], atual = lerTema();
      aplicarTema(ordem[(ordem.indexOf(atual) + 1) % ordem.length]);
    });
    $('sel-medicao').addEventListener('change', function (e) { S.med = +e.target.value; render(); });
    $('btn-sair').addEventListener('click', function () { if (S.sb) S.sb.auth.signOut(); });
    function abrirSenha() { var fm = $('form-senha'); fm.hidden = false; $('senha-erro').hidden = true; $('senha-nova').focus(); }
    $('btn-senha').addEventListener('click', function () { if ($('form-senha').hidden) abrirSenha(); else $('form-senha').hidden = true; });
    $('aviso').addEventListener('click', function (e) { if (e.target.closest('[data-acao="abrir-senha"]')) abrirSenha(); });
    $('senha-cancelar').addEventListener('click', function () { $('form-senha').hidden = true; });
    $('form-senha').addEventListener('submit', function (e) {
      e.preventDefault();
      var a = $('senha-nova').value, b = $('senha-conf').value, err = $('senha-erro'), btn = $('senha-salvar');
      function erro(m) { err.textContent = m; err.hidden = !m; }
      if (a.length < 10) { erro('A senha precisa ter pelo menos 10 caracteres.'); return; }
      if (a !== b) { erro('As duas senhas não são iguais.'); return; }
      erro('');
      btn.disabled = true;
      S.sb.auth.updateUser({ password: a, data: { senha_trocada: true } }).then(function (r) {
        if (r.error) { erro('Não foi possível trocar a senha: ' + r.error.message); return; }
        S.user = r.data.user;
        $('senha-nova').value = '';
        $('senha-conf').value = '';
        $('form-senha').hidden = true;
        montarCabecalho();
        toast('Senha alterada.');
      }).finally(function () { btn.disabled = false; });
    });
    var abas = Array.prototype.slice.call(document.querySelectorAll('#abas .dt-tab'));
    abas.forEach(function (t, i) {
      t.addEventListener('click', function () { irPara(t.getAttribute('data-aba')); });
      t.addEventListener('keydown', function (e) {
        var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
        if (j == null) return;
        var alvo = abas[(j + abas.length) % abas.length];
        irPara(alvo.getAttribute('data-aba'));
        alvo.focus();
      });
    });
    var cont = $('conteudo');
    cont.addEventListener('click', function (e) {
      var b = e.target.closest('[data-acao]');
      if (!b) return;
      var acao = b.getAttribute('data-acao'), id = +b.getAttribute('data-id');
      if (acao === 'atualizar') recarregar();
      else if (acao === 'ir') irPara(b.getAttribute('data-aba'), true);
      else if (acao === 'filtro-pend') { S.filtroPend = b.getAttribute('data-v'); render(); }
      else if (acao === 'pend-resolver') { S.editando = id; render(); var t = $('resolucao-' + id); if (t) t.focus(); }
      else if (acao === 'pend-cancelar') { S.editando = null; render(); }
      else if (acao === 'pend-status') {
        var st = b.getAttribute('data-status');
        salvar('pendencias', { id: id }, { status: st, resolvida_em: null });
      } else if (acao === 'pend-salvar') {
        var txt = ($('resolucao-' + id) || {}).value || '';
        if (!txt.trim()) { toast('Descreva como a pendência foi resolvida.'); return; }
        S.editando = null;
        salvar('pendencias', { id: id }, { status: 'resolvida', resolucao: txt.trim(), resolvida_em: new Date().toISOString() });
      } else if (acao === 'acerto-status') {
        salvar('acertos', { numero: S.acerto }, { status: b.getAttribute('data-status'), data_repasse: null });
      } else if (acao === 'acerto-repassar') {
        var dt = ($('data-repasse') || {}).value;
        if (!dt) { toast('Informe a data do repasse.'); return; }
        salvar('acertos', { numero: S.acerto }, { status: 'repassado', data_repasse: dt });
      }
    });
    cont.addEventListener('change', function (e) {
      var id = e.target.id;
      if (id === 'f-tipo') { S.filtroDoc.tipo = e.target.value; render(); }
      else if (id === 'f-status') { S.filtroDoc.status = e.target.value; render(); }
      else if (id === 'sel-acerto') { S.acerto = +e.target.value; render(); }
    });
    var tBusca;
    cont.addEventListener('input', function (e) {
      if (e.target.id !== 'f-busca') return;
      clearTimeout(tBusca);
      var v = e.target.value;
      tBusca = setTimeout(function () {
        S.filtroDoc.q = v;
        render();
        var inp = $('f-busca');
        if (inp) { inp.focus(); inp.setSelectionRange(v.length, v.length); }
      }, 250);
    });
    $('form-login').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('login-email').value.trim(), senha = $('login-senha').value, btn = $('login-entrar');
      if (!email || !senha) { erroLogin('Informe e-mail e senha.'); return; }
      btn.disabled = true;
      btn.textContent = 'Entrando…';
      S.sb.auth.signInWithPassword({ email: email, password: senha }).then(function (r) {
        if (r.error) {
          erroLogin(/invalid/i.test(r.error.message) ? 'E-mail ou senha incorretos.' : 'Não foi possível entrar: ' + r.error.message);
          return;
        }
        $('login-senha').value = '';
        return entrar(r.data.user);
      }).finally(function () { btn.disabled = false; btn.textContent = 'Entrar'; });
    });
    window.addEventListener('hashchange', function () {
      var h = (location.hash || '').replace('#', '');
      if (S.d && ABAS.indexOf(h) >= 0 && h !== S.aba) irPara(h);
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && S.modo === 'supabase' && S.d && Date.now() - (S.ultimaLeitura || 0) > 5 * 60 * 1000) { S.ultimaLeitura = Date.now(); recarregar(true); }
    });
  }

  function iniciar() {
    var temaUrl = (location.search.match(/[?&]tema=(sistema|claro|escuro)/) || [])[1];
    aplicarTema(temaUrl || lerTema());
    ligarEventos();
    var forcarDemo = /[?&]demo(&|$)/.test(location.search);
    if (CFG.supabaseUrl && CFG.supabaseKey && !forcarDemo) {
      if (!window.supabase || !window.supabase.createClient) { erroFatal('Não consegui carregar a biblioteca de acesso aos dados. Verifique a conexão e atualize a página.'); return; }
      S.modo = 'supabase';
      S.sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey);
      S.sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') { S.d = null; S.perfil = null; mostrarLogin(); } });
      S.sb.auth.getSession().then(function (r) {
        var s = r.data && r.data.session;
        if (s) { S.ultimaLeitura = Date.now(); entrar(s.user); } else mostrarLogin();
      });
    } else {
      S.modo = 'demo';
      S.perfil = { nome: 'Prévia local', papel: 'gestor' };
      carregarDemo().then(abrirPainel, function () { erroFatal('Prévia local sem dados: abra o painel a partir da pasta painel-dn25001 (o arquivo demo/dados.json precisa estar ao lado de site/).'); });
    }
  }
  iniciar();
})();
