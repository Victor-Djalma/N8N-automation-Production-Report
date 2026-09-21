
const dados = $input.first().json;
const form = $('Envio de Relatório ERP').first().json;

if (!dados || !dados.modulo) {
  throw new Error('O gerador recebeu dados sem o campo "modulo".');
}

if (String(dados.status || '').toUpperCase() === 'ERRO') {
  throw new Error('O gerador de relatório não deve receber itens com status ERRO.');
}

const modulo = String(dados.modulo).trim().toUpperCase();
const LOGO_SRC = ''; // Public version intentionally omits private company branding.

const CORES = {
  verde: '#0b6b3a',
  verdeEscuro: '#214d31',
  verdeClaro: '#eaf4ed',
  amarelo: '#d8df66',
  amareloClaro: '#f7f7cf',
  texto: '#26332b',
  cinza: '#66736b',
  borda: '#d7dfd9',
  fundo: '#f6f8f6',
  branco: '#ffffff',
  vermelho: '#a83232',
  alerta: '#8a6500',
};

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function num(v, casas = 0) {
  const n = Number(v || 0);
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function moeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function dataBR(valor) {
  if (!valor) return '-';
  const s = String(valor);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[1]}/${br[2]}/${br[3]}`;
  return s;
}

function textoModulo() {
  if (modulo === 'PRODUCAO') return 'Produção';
  if (modulo === 'VENDAS') return 'Vendas';
  if (modulo === 'COMPRAS') return 'Compras';
  return modulo;
}

function slug(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function periodoRelatorio() {
  if (modulo === 'PRODUCAO') {
    const ini = dados.competencia?.primeiraProducao;
    const fim = dados.competencia?.ultimaProducao;
    if (ini && fim) return `Período analisado: ${dataBR(ini)} a ${dataBR(fim)}`;
  }

  if (modulo === 'VENDAS') {
    const ini = dados.competencia?.dataInicial;
    const fim = dados.competencia?.dataFinal;
    if (ini && fim) return `Período analisado: ${dataBR(ini)} a ${dataBR(fim)}`;
  }

  if (modulo === 'COMPRAS') {
    const mes = form.MES || dados.competencia?.mes;
    const ano = form.ANO || dados.competencia?.ano;
    if (mes || ano) return `Competência informada: ${esc(mes || '')}${mes && ano ? ' / ' : ''}${esc(ano || '')}`;
  }

  const mes = form.MES || dados.competencia?.mes;
  const ano = form.ANO || dados.competencia?.ano;
  return mes || ano ? `Competência: ${esc(mes || '')} ${esc(ano || '')}` : '';
}

function blocoAlertas() {
  const alertas = dados.validacao?.alertas || [];
  if (!alertas.length) return '';
  return `
    <div class="alerta">
      <strong>Atenção:</strong>
      ${alertas.map(a => `<div>• ${esc(a)}</div>`).join('')}
    </div>`;
}

function card(label, valor, detalhe = '') {
  return `
    <div class="card">
      <div class="card-label">${esc(label)}</div>
      <div class="card-value">${valor}</div>
      ${detalhe ? `<div class="card-detail">${esc(detalhe)}</div>` : ''}
    </div>`;
}

function destaque(titulo, nome, valor = '') {
  return `
    <div class="destaque">
      <div class="destaque-titulo">${esc(titulo)}</div>
      <div class="destaque-nome">${esc(nome || '-')}</div>
      ${valor ? `<div class="destaque-valor">${valor}</div>` : ''}
    </div>`;
}

function documentoHtml(titulo, subtitulo, conteudo) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<style>
  @page {
    size: A4;
    margin: 12mm 12mm 14mm 12mm;
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    font-family: Arial, Tahoma, sans-serif;
    color: ${CORES.texto};
    background: #fff;
    font-size: 9.6pt;
    line-height: 1.32;
  }

  main {
    width: 100%;
    display: block;
  }

  .report-head {
    margin: 0 0 5mm;
    padding: 0 0 4mm;
    border-bottom: 2.2pt solid ${CORES.verde};
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .brand-row {
    display: flex;
    align-items: center;
    gap: 5mm;
    margin-bottom: 3.5mm;
  }

  .brand-logo {
    width: 35mm;
    max-height: 21mm;
    height: auto;
    object-fit: contain;
    object-position: left center;
    flex: 0 0 auto;
    display: block;
  }

  .brand-copy {
    min-width: 0;
    flex: 1;
  }

  .report-kicker {
    color: ${CORES.verde};
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .7px;
    font-size: 7.8pt;
    margin-bottom: .8mm;
  }

  h1 {
    margin: 0 0 1.2mm;
    font-size: 19pt;
    line-height: 1.06;
    color: ${CORES.verdeEscuro};
  }

  .subtitle {
    color: ${CORES.cinza};
    font-size: 9pt;
  }

  .status {
    display: inline-block;
    margin-top: 1.8mm;
    padding: 1mm 2.5mm;
    border-radius: 999px;
    background: ${dados.status === 'ALERTA' ? '#fff4ce' : CORES.verdeClaro};
    color: ${dados.status === 'ALERTA' ? CORES.alerta : CORES.verdeEscuro};
    font-size: 7.7pt;
    font-weight: 800;
  }

  .alerta {
    margin: 0 0 4mm;
    padding: 3mm 4mm;
    border-left: 3pt solid #d49a00;
    background: #fff9e5;
    color: #6b5200;
    font-size: 8.5pt;
    break-inside: avoid;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2.6mm;
    margin-bottom: 4mm;
  }

  .cards.cinco {
    grid-template-columns: repeat(5, 1fr);
  }

  .card {
    border: 1px solid ${CORES.borda};
    border-top: 2.5px solid ${CORES.verde};
    border-radius: 5px;
    padding: 3mm;
    min-height: 19mm;
    background: #fff;
    break-inside: avoid;
  }

  .card-label {
    color: ${CORES.cinza};
    text-transform: uppercase;
    font-size: 6.8pt;
    font-weight: 800;
    letter-spacing: .25px;
  }

  .card-value {
    margin-top: 1mm;
    color: ${CORES.verdeEscuro};
    font-size: 13.5pt;
    font-weight: 800;
    line-height: 1.05;
    overflow-wrap: anywhere;
  }

  .card-detail {
    margin-top: .9mm;
    color: ${CORES.cinza};
    font-size: 6.8pt;
  }

  .destaques {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2.8mm;
    margin-bottom: 4.5mm;
  }

  .destaque {
    border: 1px solid ${CORES.borda};
    background: ${CORES.fundo};
    padding: 3mm;
    border-radius: 5px;
    min-height: 20mm;
    break-inside: avoid;
  }

  .destaque-titulo {
    color: ${CORES.verde};
    text-transform: uppercase;
    font-size: 6.9pt;
    font-weight: 800;
  }

  .destaque-nome {
    margin-top: 1mm;
    font-weight: 800;
    color: ${CORES.texto};
    font-size: 8.5pt;
    line-height: 1.25;
  }

  .destaque-valor {
    margin-top: .8mm;
    color: ${CORES.cinza};
    font-size: 8pt;
  }

  h2 {
    color: ${CORES.verdeEscuro};
    font-size: 11.5pt;
    margin: 5mm 0 2.2mm;
    padding-bottom: 1.3mm;
    border-bottom: 1px solid ${CORES.borda};
    break-after: avoid;
    page-break-after: avoid;
  }

  .chart-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3.5mm;
    margin: 3.5mm 0 4.5mm;
    align-items: stretch;
  }

  /* Produção: mais espaço para os nomes dos produtos no gráfico da direita */
  .production-grid {
    grid-template-columns: 0.90fr 1.10fr;
  }

  .sales-grid {
    grid-template-columns: 1.08fr 0.92fr;
  }

  .purchase-grid {
    grid-template-columns: 1.06fr 0.94fr;
  }

  .chart-card {
    border: 1px solid ${CORES.borda};
    border-radius: 6px;
    padding: 3.8mm;
    background: #fff;
    min-height: 80mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .chart-card.full {
    grid-column: 1 / -1;
    min-height: auto;
  }

  .chart-title {
    color: ${CORES.verdeEscuro};
    font-size: 9.4pt;
    font-weight: 800;
    margin-bottom: 2.6mm;
  }

  .chart-subtitle {
    color: ${CORES.cinza};
    font-size: 7.2pt;
    margin-top: -1.5mm;
    margin-bottom: 2.5mm;
  }

  /* PRODUÇÃO - Linha */
  .line-chart {
    width: 100%;
    height: 52mm;
    display: block;
  }

  .svg-grid {
    stroke: #e4ebe6;
    stroke-width: 1;
  }

  .svg-axis {
    stroke: #9eaaa2;
    stroke-width: 1;
  }

  .svg-line {
    fill: none;
    stroke: ${CORES.verde};
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .svg-area {
    fill: #eaf4ed;
    opacity: .75;
  }

  .svg-point {
    fill: ${CORES.verde};
    stroke: white;
    stroke-width: 2;
  }

  .svg-label {
    font-family: Arial, Tahoma, sans-serif;
    font-size: 14px;
    font-weight: 600;
    fill: #536158;
  }

  /* Barras horizontais */
  .bar-row {
    display: grid;
    grid-template-columns: 50mm 1fr 24mm;
    gap: 2mm;
    align-items: center;
    margin: 2.5mm 0;
    font-size: 7.4pt;
  }

  .bar-label {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
    line-height: 1.15;
    max-height: 2.3em;
  }

  .bar-track {
    height: 4mm;
    background: #eef2ef;
    border-radius: 2mm;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: linear-gradient(90deg, ${CORES.verde}, #72aa75);
    border-radius: 2mm;
  }

  .bar-value {
    text-align: right;
    white-space: nowrap;
    font-weight: 800;
    color: ${CORES.verdeEscuro};
  }

  /* VENDAS - Donut */
  .donut-wrap {
    display: grid;
    grid-template-columns: 42mm 1fr;
    gap: 4mm;
    align-items: center;
  }

  .donut-shell {
    width: 40mm;
    height: 40mm;
    position: relative;
  }

  .donut {
    position: absolute;
    inset: 0;
    border-radius: 50%;
  }

  .donut-hole {
    position: absolute;
    inset: 9mm;
    background: #fff;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: ${CORES.verdeEscuro};
    font-size: 6.2pt;
    font-weight: 700;
    line-height: 1.15;
  }

  .donut-hole strong {
    display: block;
    font-size: 7.7pt;
    margin-top: .5mm;
  }

  .legend-item {
    display: grid;
    grid-template-columns: 3mm 1fr auto;
    align-items: center;
    gap: 1.7mm;
    margin: 1.1mm 0;
    font-size: 6.9pt;
  }

  .legend-dot {
    width: 3mm;
    height: 3mm;
    border-radius: 1px;
  }

  /* Colunas verticais - Vendas/Compras */
  .column-chart {
    height: 58mm;
    display: flex;
    align-items: flex-end;
    gap: 2.2mm;
    padding: 4mm 1mm 0;
    border-bottom: 1px solid #aab5ad;
  }

  .column-item {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: stretch;
  }

  .column-value {
    text-align: center;
    color: ${CORES.verdeEscuro};
    font-size: 7.2pt;
    font-weight: 800;
    margin-bottom: 1mm;
    white-space: nowrap;
  }

  .column-bar-zone {
    flex: 1;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .column-bar {
    width: 72%;
    min-height: 2mm;
    background: ${CORES.verde};
    border-radius: 2px 2px 0 0;
  }

  .column-label {
    height: 8mm;
    padding-top: 1.4mm;
    text-align: center;
    color: ${CORES.verdeEscuro};
    font-size: 7.6pt;
    line-height: 1.1;
    font-weight: 800;
  }

  .column-legend {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.8mm 4mm;
    margin-top: 4mm;
    padding-top: 3mm;
    border-top: 1px solid #e1e7e2;
  }

  .column-key {
    display: grid;
    grid-template-columns: 7mm 1fr auto;
    gap: 2mm;
    align-items: start;
    font-size: 7.2pt;
    line-height: 1.2;
  }

  .key-index {
    width: 6mm;
    height: 6mm;
    border: 1px solid ${CORES.verdeEscuro};
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${CORES.verdeEscuro};
    font-weight: 800;
    background: #fff;
  }

  .key-name {
    color: ${CORES.texto};
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .key-value {
    color: ${CORES.verdeEscuro};
    font-weight: 800;
    white-space: nowrap;
  }

  /* COMPRAS - concentração */
  .share-stack {
    width: 100%;
    height: 9mm;
    display: flex;
    overflow: hidden;
    border-radius: 5px;
    border: 1px solid ${CORES.borda};
    margin: 4mm 0 3mm;
    background: #eef2ef;
  }

  .share-piece {
    height: 100%;
    min-width: 1px;
    border-right: 1px solid rgba(255,255,255,.9);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 6.8pt;
    font-weight: 800;
    text-shadow: 0 1px 1px rgba(0,0,0,.35);
  }

  .share-legend {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2mm;
    margin-top: 3mm;
  }

  .share-item {
    display: grid;
    grid-template-columns: 7mm 1fr auto;
    gap: 2mm;
    align-items: start;
    font-size: 7.2pt;
    line-height: 1.2;
  }

  .share-index {
    width: 6mm;
    height: 6mm;
    border: 1px solid ${CORES.verdeEscuro};
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${CORES.verdeEscuro};
    font-weight: 800;
    background: #fff;
  }

  .metric-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2.5mm;
    margin-top: 4mm;
  }

  .metric-mini {
    padding: 2.6mm;
    border-radius: 5px;
    background: ${CORES.fundo};
    border: 1px solid ${CORES.borda};
    text-align: center;
  }

  .metric-mini .v {
    font-size: 12pt;
    color: ${CORES.verdeEscuro};
    font-weight: 800;
  }

  .metric-mini .l {
    margin-top: .7mm;
    color: ${CORES.cinza};
    font-size: 6.7pt;
  }

  .rank-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4mm;
    align-items: start;
  }

  .rank-box {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 3mm;
    page-break-inside: auto;
    break-inside: auto;
  }

  thead {
    display: table-header-group;
  }

  th {
    text-align: left;
    background: ${CORES.verde};
    color: #fff;
    padding: 1.8mm 1.7mm;
    font-size: 7.1pt;
    font-weight: 800;
  }

  td {
    padding: 1.7mm;
    border-bottom: 1px solid #e6ebe7;
    vertical-align: top;
    font-size: 7.2pt;
  }

  tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  tbody tr:nth-child(even) {
    background: #fafcfb;
  }

  .right { text-align: right; white-space: nowrap; }
  .center { text-align: center; }
  .muted { color: ${CORES.cinza}; }
  .strong { font-weight: 800; }

  .no-data {
    border: 1px dashed ${CORES.borda};
    background: ${CORES.fundo};
    color: ${CORES.cinza};
    padding: 5mm;
    text-align: center;
  }

  .letterhead-footer {
    position: relative;
    clear: both;
    width: 100%;
    margin-top: 9mm;
    padding-top: 2.5mm;
    color: #416235;
    text-align: center;
    font-size: 7.4pt;
    line-height: 1.25;
    background: #fff;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .letterhead-footer .linha {
    border-top: .55pt solid #607b52;
    margin-bottom: 2.2mm;
  }

  .letterhead-footer .row + .row { margin-top: 1.1mm; }
  .letterhead-footer .sep { padding: 0 2.2mm; font-weight: 700; }
</style>
</head>
<body>
  <main>
    <section class="report-head">
      <div class="brand-row">
        <div class="brand-logo" style="width:auto;max-height:none;font-weight:800;color:#214c37;">ERP REPORT AUTOMATION HUB</div>
        <div class="brand-copy">
          <div class="report-kicker">ERP Report Automation Hub</div>
          <h1>${esc(titulo)}</h1>
          <div class="subtitle">${subtitulo}</div>
          <div class="status">STATUS: ${esc(dados.status || 'OK')}</div>
        </div>
      </div>
    </section>

    ${blocoAlertas()}
    ${conteudo}
  </main>

  <div class="letterhead-footer">
    <div class="linha"></div>
    <div class="row">Public portfolio version <span class="sep">▪</span> Synthetic examples only</div>
    <div class="row">Public workflow <span class="sep">▪</span> No company contact information included</div>
  </div>
</body>
</html>`;
}

const CHART_COLORS = [
  '#0b6b3a', '#6aa86d', '#d8df66', '#3f7c4e', '#9abf78', '#e6b94b', '#50745b', '#8fb39a'
];

function topComOutros(lista, valueKey, maxItens = 6) {
  const arr = [...(lista || [])]
    .filter(x => Number(x?.[valueKey] || 0) > 0)
    .sort((a, b) => Number(b[valueKey] || 0) - Number(a[valueKey] || 0));

  if (arr.length <= maxItens) return arr;

  const top = arr.slice(0, maxItens - 1);
  const resto = arr.slice(maxItens - 1).reduce((s, x) => s + Number(x[valueKey] || 0), 0);
  top.push({ __outros: true, [valueKey]: resto, produto: 'Outros', fornecedor: 'Outros' });
  return top;
}

function donutChart(lista, labelFn, valueKey, valueFormatter, centroLabel = 'Total') {
  const arr = topComOutros(lista, valueKey, 7);
  const total = arr.reduce((s, x) => s + Number(x[valueKey] || 0), 0);

  if (!arr.length || total <= 0) {
    return '<div class="no-data">Sem dados suficientes para o gráfico.</div>';
  }

  let acumulado = 0;

  const partes = arr.map((x, i) => {
    const pct = (Number(x[valueKey] || 0) / total) * 100;
    const inicio = acumulado;
    acumulado += pct;
    return `${CHART_COLORS[i % CHART_COLORS.length]} ${inicio.toFixed(4)}% ${acumulado.toFixed(4)}%`;
  });

  const legenda = arr.map((x, i) => {
    const valor = Number(x[valueKey] || 0);
    const pct = (valor / total) * 100;

    return `
      <div class="legend-item">
        <span class="legend-dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></span>
        <span>${esc(labelFn(x))}</span>
        <span class="right">${esc(valueFormatter(valor))} • ${num(pct, 1)}%</span>
      </div>`;
  }).join('');

  return `
    <div class="donut-wrap">
      <div class="donut-shell">
        <div class="donut" style="background:conic-gradient(${partes.join(',')})"></div>
        <div class="donut-hole">${esc(centroLabel)}<strong>${num(total)}</strong></div>
      </div>
      <div>${legenda}</div>
    </div>`;
}

function barChart(lista, labelFn, valueKey, valueFormatter, maxItens = 8) {
  const arr = [...(lista || [])]
    .filter(x => Number(x?.[valueKey] || 0) > 0)
    .sort((a, b) => Number(b[valueKey] || 0) - Number(a[valueKey] || 0))
    .slice(0, maxItens);

  if (!arr.length) {
    return '<div class="no-data">Sem dados suficientes para o gráfico.</div>';
  }

  const max = Number(arr[0][valueKey] || 1);

  return arr.map(x => {
    const value = Number(x[valueKey] || 0);
    const pct = Math.max(1.5, (value / max) * 100);

    return `
      <div class="bar-row">
        <div class="bar-label">${esc(labelFn(x))}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct.toFixed(2)}%"></div>
        </div>
        <div class="bar-value">${esc(valueFormatter(value))}</div>
      </div>`;
  }).join('');
}

function columnChart(lista, labelFn, valueKey, valueFormatter, maxItens = 6) {
  const arr = [...(lista || [])]
    .filter(x => Number(x?.[valueKey] || 0) > 0)
    .sort((a, b) => Number(b[valueKey] || 0) - Number(a[valueKey] || 0))
    .slice(0, maxItens);

  if (!arr.length) {
    return '<div class="no-data">Sem dados suficientes para o gráfico.</div>';
  }

  const max = Number(arr[0][valueKey] || 1);

  const barras = arr.map((x, i) => {
    const value = Number(x[valueKey] || 0);
    const pct = Math.max(4, (value / max) * 100);

    return `
      <div class="column-item">
        <div class="column-value">${esc(valueFormatter(value))}</div>
        <div class="column-bar-zone">
          <div class="column-bar" style="height:${pct.toFixed(2)}%;background:${CHART_COLORS[i % CHART_COLORS.length]}"></div>
        </div>
        <div class="column-label">#${i + 1}</div>
      </div>`;
  }).join('');

  const legenda = arr.map((x, i) => `
    <div class="column-key">
      <span class="key-index">${i + 1}</span>
      <span class="key-name">${esc(labelFn(x) || '-')}</span>
      <span class="key-value">${esc(valueFormatter(Number(x[valueKey] || 0)))}</span>
    </div>`
  ).join('');

  return `
    <div class="column-chart">${barras}</div>
    <div class="column-legend">${legenda}</div>`;
}

function lineChart(lista, valueKey, valueFormatter) {
  const arr = [...(lista || [])]
    .filter(x => x?.data && Number(x?.[valueKey] || 0) >= 0)
    .sort((a, b) => String(a.data).localeCompare(String(b.data)));

  if (!arr.length) {
    return '<div class="no-data">Sem dados suficientes para o gráfico.</div>';
  }

  const W = 700;
  const H = 230;
  const left = 54;
  const right = 16;
  const top = 18;
  const bottom = 42;
  const chartW = W - left - right;
  const chartH = H - top - bottom;

  const valores = arr.map(x => Number(x[valueKey] || 0));
  const max = Math.max(...valores, 1);

  const pts = arr.map((x, i) => {
    const px = arr.length === 1
      ? left + chartW / 2
      : left + (i * chartW / (arr.length - 1));

    const py = top + chartH - ((Number(x[valueKey] || 0) / max) * chartH);

    return { x: px, y: py, item: x };
  });

  const linha = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${left},${top + chartH} ${linha} ${left + chartW},${top + chartH}`;

  const labelIdx = new Set([
    0,
    Math.floor((arr.length - 1) * .25),
    Math.floor((arr.length - 1) * .5),
    Math.floor((arr.length - 1) * .75),
    arr.length - 1,
  ]);

  const labelsX = pts.map((p, i) => {
    if (!labelIdx.has(i)) return '';
    return `<text class="svg-label" x="${p.x}" y="${H - 12}" text-anchor="middle">${esc(dataBR(p.item.data).slice(0, 5))}</text>`;
  }).join('');

  const circles = pts.map(p =>
    `<circle class="svg-point" cx="${p.x}" cy="${p.y}" r="4"><title>${esc(dataBR(p.item.data))}: ${esc(valueFormatter(Number(p.item[valueKey] || 0)))}</title></circle>`
  ).join('');

  return `
    <svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img">
      <line class="svg-grid" x1="${left}" y1="${top}" x2="${left + chartW}" y2="${top}" />
      <line class="svg-grid" x1="${left}" y1="${top + chartH / 2}" x2="${left + chartW}" y2="${top + chartH / 2}" />
      <line class="svg-axis" x1="${left}" y1="${top + chartH}" x2="${left + chartW}" y2="${top + chartH}" />

      <text class="svg-label" x="${left - 8}" y="${top + 4}" text-anchor="end">${esc(valueFormatter(max))}</text>
      <text class="svg-label" x="${left - 8}" y="${top + chartH / 2 + 4}" text-anchor="end">${esc(valueFormatter(max / 2))}</text>
      <text class="svg-label" x="${left - 8}" y="${top + chartH + 4}" text-anchor="end">0</text>

      <polygon class="svg-area" points="${area}" />
      <polyline class="svg-line" points="${linha}" />
      ${circles}
      ${labelsX}
    </svg>`;
}

function concentrationChart(lista, labelFn, valueKey) {
  const arr = [...(lista || [])]
    .filter(x => Number(x?.[valueKey] || 0) > 0)
    .sort((a, b) => Number(b[valueKey] || 0) - Number(a[valueKey] || 0));

  const total = arr.reduce((s, x) => s + Number(x[valueKey] || 0), 0);

  if (!arr.length || total <= 0) {
    return '<div class="no-data">Sem dados suficientes para o gráfico.</div>';
  }

  const top = arr.slice(0, 4);
  const outros = arr.slice(4).reduce((s, x) => s + Number(x[valueKey] || 0), 0);

  const itens = top.map(x => ({
    label: labelFn(x),
    valor: Number(x[valueKey] || 0),
  }));

  if (outros > 0) {
    itens.push({ label: 'Outros fornecedores', valor: outros });
  }

  const stacked = itens.map((x, i) => {
    const pct = (x.valor / total) * 100;
    const numero = pct >= 7 ? `${i + 1}` : '';
    return `<div class="share-piece" style="width:${pct.toFixed(3)}%;background:${CHART_COLORS[i % CHART_COLORS.length]}">${numero}</div>`;
  }).join('');

  const legend = itens.map((x, i) => {
    const pct = (x.valor / total) * 100;
    return `
      <div class="share-item">
        <span class="share-index">${i + 1}</span>
        <span class="key-name">${esc(x.label)}</span>
        <span class="right strong">${num(pct, 1)}% • ${moeda(x.valor)}</span>
      </div>`;
  }).join('');

  const top1 = arr[0] ? (Number(arr[0][valueKey]) / total) * 100 : 0;
  const top3 = (arr.slice(0, 3).reduce((s, x) => s + Number(x[valueKey] || 0), 0) / total) * 100;
  const top5 = (arr.slice(0, 5).reduce((s, x) => s + Number(x[valueKey] || 0), 0) / total) * 100;

  return `
    <div class="share-stack">${stacked}</div>
    <div class="share-legend">${legend}</div>

    <div class="metric-strip">
      <div class="metric-mini"><div class="v">${num(top1, 1)}%</div><div class="l">Maior fornecedor</div></div>
      <div class="metric-mini"><div class="v">${num(top3, 1)}%</div><div class="l">Concentração Top 3</div></div>
      <div class="metric-mini"><div class="v">${num(top5, 1)}%</div><div class="l">Concentração Top 5</div></div>
    </div>`;
}

function rankingTable(lista, labelFn, valueKey, valueFormatter, maxItens = 5) {
  const arr = [...(lista || [])]
    .filter(x => Number(x?.[valueKey] || 0) > 0)
    .sort((a, b) => Number(b[valueKey] || 0) - Number(a[valueKey] || 0))
    .slice(0, maxItens);

  if (!arr.length) return '<div class="no-data">Sem dados.</div>';

  return `
    <table>
      <thead>
        <tr>
          <th style="width:8mm">#</th>
          <th>Descrição</th>
          <th class="right">Resultado</th>
        </tr>
      </thead>
      <tbody>
        ${arr.map((x, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${esc(labelFn(x))}</td>
            <td class="right strong">${esc(valueFormatter(Number(x[valueKey] || 0)))}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

let conteudo = '';
let nomeArquivoPdf = '';

// =====================================================
// 1) PRODUÇÃO
// Gráficos: evolução diária + ranking horizontal
// =====================================================
if (modulo === 'PRODUCAO') {
  const r = dados.resumo || {};
  const ranking = dados.rankingProdutos || dados.produtos || [];
  const dias = dados.producaoPorDia || [];
  const mais = r.maisProduzido || ranking[0] || {};
  const menos = r.menosProduzido || (ranking.length ? ranking[ranking.length - 1] : {});

  conteudo += `
    <div class="cards cinco">
      ${card('Unidades produzidas', num(r.totalUnidades), 'Total no período')}
      ${card('Ordens', num(r.totalOrdens), 'Ordens de produção')}
      ${card('Produtos', num(r.totalProdutos), 'Produtos industrializados')}
      ${card('Dias ativos', num(r.totalDiasProducao), 'Dias com produção')}
      ${card('Média / ordem', num(r.mediaPorOrdem), 'Unidades por OP')}
    </div>

    <div class="destaques">
      ${destaque('Mais produzido', mais.produto, mais.totalUnidades != null ? `${num(mais.totalUnidades)} unidades` : '')}
      ${destaque('Menos produzido', menos.produto, menos.totalUnidades != null ? `${num(menos.totalUnidades)} unidades` : '')}
    </div>

    <div class="chart-grid production-grid">
      <div class="chart-card">
        <div class="chart-title">Evolução da produção por dia</div>
        <div class="chart-subtitle">Quantidade total produzida em cada dia com movimentação.</div>
        ${lineChart(dias, 'totalUnidades', v => num(v))}
      </div>

      <div class="chart-card">
        <div class="chart-title">Produtos com maior volume produzido</div>
        <div class="chart-subtitle">Comparativo das maiores quantidades do período.</div>
        ${barChart(ranking, x => x.produto || '-', 'totalUnidades', v => num(v), 7)}
      </div>
    </div>

    <h2>Top produtos do período</h2>
    ${rankingTable(ranking, x => x.produto || '-', 'totalUnidades', v => `${num(v)} unidades`, 7)}
  `;

  nomeArquivoPdf = `Relatorio_Executivo_Producao_${slug(form.MES || '')}_${slug(form.ANO || '')}.pdf`;
}

// =====================================================
// 2) VENDAS
// Gráficos: donut de faturamento + colunas por unidades
// =====================================================
else if (modulo === 'VENDAS') {
  const r = dados.resumo || {};
  const porUnidades = dados.rankingUnidades || dados.produtos || [];
  const porValor = dados.rankingValor || dados.produtos || [];
  const maisUn = r.maisVendidoUnidades || porUnidades[0] || {};
  const maisValor = r.maiorFaturamento || porValor[0] || {};

  conteudo += `
    <div class="cards cinco">
      ${card('Valor vendido', moeda(r.totalValor), 'Total do período')}
      ${card('Unidades', num(r.totalUnidades), 'Unidades vendidas')}
      ${card('Pedidos', num(r.totalPedidos), 'Documentos identificados')}
      ${card('Clientes', num(r.totalClientes), 'Clientes distintos')}
      ${card('Ticket médio', moeda(r.ticketMedio), 'Valor por pedido')}
    </div>

    <div class="destaques">
      ${destaque('Maior volume em unidades', maisUn.produto, maisUn.totalUnidades != null ? `${num(maisUn.totalUnidades)} unidades` : '')}
      ${destaque('Maior valor vendido', maisValor.produto, maisValor.totalValor != null ? moeda(maisValor.totalValor) : '')}
    </div>

    <div class="chart-grid sales-grid">
      <div class="chart-card">
        <div class="chart-title">Produtos com maior faturamento</div>
        <div class="chart-subtitle">Ranking por valor vendido — legível também em impressão preto e branco.</div>
        ${barChart(porValor, x => x.produto || '-', 'totalValor', v => moeda(v), 7)}
      </div>

      <div class="chart-card">
        <div class="chart-title">Top produtos em unidades</div>
        <div class="chart-subtitle">Comparação visual do volume vendido.</div>
        ${columnChart(porUnidades, x => x.produto || '-', 'totalUnidades', v => num(v), 6)}
      </div>
    </div>

    <div class="rank-grid">
      <div class="rank-box">
        <h2>Top 5 por unidades</h2>
        ${rankingTable(porUnidades, x => x.produto || '-', 'totalUnidades', v => `${num(v)} un.`, 5)}
      </div>

      <div class="rank-box">
        <h2>Top 5 por valor</h2>
        ${rankingTable(porValor, x => x.produto || '-', 'totalValor', v => moeda(v), 5)}
      </div>
    </div>
  `;

  nomeArquivoPdf = `Relatorio_Executivo_Vendas_${slug(form.MES || '')}_${slug(form.ANO || '')}.pdf`;
}

// =====================================================
// 3) COMPRAS
// Gráficos: colunas de gasto + concentração de fornecedores
// =====================================================
else if (modulo === 'COMPRAS') {
  const r = dados.resumo || {};
  const ranking = dados.rankingFornecedores || dados.fornecedores || [];
  const maior = r.maiorFornecedor || ranking[0] || {};
  const menor = r.menorFornecedor || (ranking.length ? ranking[ranking.length - 1] : {});
  const media = r.totalLancamentos ? Number(r.totalGasto || 0) / Number(r.totalLancamentos) : 0;

  conteudo += `
    <div class="cards">
      ${card('Total gasto', moeda(r.totalGasto), 'Compras e despesas')}
      ${card('Lançamentos', num(r.totalLancamentos), 'Registros processados')}
      ${card('Fornecedores', num(r.totalFornecedores), 'Fornecedores distintos')}
      ${card('Média / lançamento', moeda(media), 'Valor médio')}
    </div>

    <div class="destaques">
      ${destaque('Maior gasto por fornecedor', maior.fornecedor, maior.valorTotal != null ? moeda(maior.valorTotal) : '')}
      ${destaque('Menor gasto por fornecedor', menor.fornecedor, menor.valorTotal != null ? moeda(menor.valorTotal) : '')}
    </div>

    <div class="chart-grid purchase-grid">
      <div class="chart-card">
        <div class="chart-title">Maiores gastos por fornecedor</div>
        <div class="chart-subtitle">Top fornecedores classificados pelo valor acumulado.</div>
        ${columnChart(ranking, x => x.fornecedor || '-', 'valorTotal', v => moeda(v), 6)}
      </div>

      <div class="chart-card">
        <div class="chart-title">Concentração dos gastos</div>
        <div class="chart-subtitle">Quanto os maiores fornecedores representam do gasto total.</div>
        ${concentrationChart(ranking, x => x.fornecedor || '-', 'valorTotal')}
      </div>
    </div>

    <h2>Top fornecedores do período</h2>
    ${rankingTable(ranking, x => x.fornecedor || '-', 'valorTotal', v => moeda(v), 7)}
  `;

  nomeArquivoPdf = `Relatorio_Executivo_Compras_${slug(form.MES || '')}_${slug(form.ANO || '')}.pdf`;
}

else {
  throw new Error(`Módulo não suportado pelo gerador EXECUTIVO: ${modulo}`);
}

const titulo = `Relatório Executivo de ${textoModulo()}`;
const subtitulo = periodoRelatorio();
const html = documentoHtml(titulo, subtitulo, conteudo);

return [{
  json: {
    ...dados,
    tipoRelatorioGerado: 'EXECUTIVO',
    nomeArquivoPdf,
    html,
  }
}];
