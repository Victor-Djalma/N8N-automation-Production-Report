
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


function juntarDocumentos(documentos) {
  const docs = [...new Set((documentos || []).filter(Boolean).map(v => String(v).trim()))];

  if (!docs.length) return '-';
  if (docs.length === 1) return docs[0];
  if (docs.length === 2) return `${docs[0]} e ${docs[1]}`;

  return `${docs.slice(0, -1).join(', ')} e ${docs[docs.length - 1]}`;
}

function consolidarProducaoPorDiaProduto(ordens) {
  const mapa = new Map();

  for (const ordem of ordens || []) {
    const data = ordem.dataEntrada || 'SEM_DATA';
    const codigo = ordem.codigoProduto ?? '';
    const produto = ordem.produto || 'Produto não identificado';
    const chaveProduto = codigo !== '' ? String(codigo) : produto;
    const chave = `${data}|||${chaveProduto}`;

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        dataEntrada: data,
        codigoProduto: codigo,
        produto,
        documentos: [],
        totalOrdens: 0,
        totalUnidades: 0,
        valorTotal: 0,
      });
    }

    const grupo = mapa.get(chave);

    if (ordem.documento != null && String(ordem.documento).trim() !== '') {
      grupo.documentos.push(String(ordem.documento).trim());
    }

    grupo.totalOrdens += 1;
    grupo.totalUnidades += Number(ordem.quantidadeProduzida || 0);
    grupo.valorTotal += Number(ordem.valorTotal || 0);
  }

  return [...mapa.values()]
    .map(g => ({
      ...g,
      documentos: [...new Set(g.documentos)],
      documentosTexto: juntarDocumentos(g.documentos),
    }))
    .sort((a, b) => {
      const dataCmp = String(a.dataEntrada).localeCompare(String(b.dataEntrada));
      if (dataCmp !== 0) return dataCmp;
      return String(a.produto).localeCompare(String(b.produto), 'pt-BR');
    });
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
    margin: 14mm 12mm 16mm 12mm;
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    font-family: Arial, Tahoma, sans-serif;
    color: ${CORES.texto};
    background: #fff;
    font-size: 10.2pt;
    line-height: 1.35;
  }

  .letterhead-header {
    position: relative;
    width: 100%;
    min-height: 24mm;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    margin: 0 0 6mm 0;
    padding: 0 0 3.5mm 0;
    border-bottom: 1px solid #d7dfd9;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .letterhead-header img {
    width: 36mm;
    height: auto;
    max-height: 22mm;
    object-fit: contain;
    object-position: left center;
    display: block;
  }

  .letterhead-footer {
    position: relative;
    width: 100%;
    margin-top: 9mm;
    padding-top: 2.5mm;
    color: #416235;
    text-align: center;
    font-size: 8pt;
    line-height: 1.25;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .letterhead-footer .linha {
    border-top: .55pt solid #607b52;
    margin-bottom: 2.2mm;
  }

  .letterhead-footer .row + .row { margin-top: 1.2mm; }
  .letterhead-footer .sep { padding: 0 2.5mm; font-weight: 700; }

  main {
    width: 100%;
    display: block;
  }

  .report-head {
    border-bottom: 2.2pt solid ${CORES.verde};
    padding-bottom: 4mm;
    margin-bottom: 5mm;
  }

  .report-kicker {
    color: ${CORES.verde};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .8px;
    font-size: 8.5pt;
  }

  h1 {
    margin: 1mm 0 1.5mm;
    font-size: 20pt;
    line-height: 1.08;
    color: ${CORES.verdeEscuro};
  }

  .subtitle {
    color: ${CORES.cinza};
    font-size: 9.5pt;
  }

  .status {
    display: inline-block;
    margin-top: 2mm;
    padding: 1.1mm 2.7mm;
    border-radius: 999px;
    background: ${dados.status === 'ALERTA' ? '#fff4ce' : CORES.verdeClaro};
    color: ${dados.status === 'ALERTA' ? CORES.alerta : CORES.verdeEscuro};
    font-size: 8.2pt;
    font-weight: 700;
  }

  .alerta {
    margin: 0 0 5mm;
    padding: 3mm 4mm;
    border-left: 3pt solid #d49a00;
    background: #fff9e5;
    color: #6b5200;
    font-size: 9pt;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 3mm;
    margin-bottom: 5mm;
  }

  .cards.cinco { grid-template-columns: repeat(5, 1fr); }

  .card {
    border: 1px solid ${CORES.borda};
    border-top: 3px solid ${CORES.verde};
    border-radius: 5px;
    padding: 3.5mm;
    min-height: 21mm;
    background: #fff;
  }

  .card-label {
    color: ${CORES.cinza};
    text-transform: uppercase;
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: .3px;
  }

  .card-value {
    margin-top: 1.2mm;
    color: ${CORES.verdeEscuro};
    font-size: 16pt;
    font-weight: 800;
    line-height: 1.05;
  }

  .card-detail {
    margin-top: 1mm;
    color: ${CORES.cinza};
    font-size: 7.6pt;
  }

  .destaques {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3mm;
    margin-bottom: 6mm;
  }

  .destaque {
    border: 1px solid ${CORES.borda};
    background: ${CORES.fundo};
    padding: 3.4mm;
    border-radius: 5px;
  }

  .destaque-titulo {
    color: ${CORES.verde};
    text-transform: uppercase;
    font-size: 7.6pt;
    font-weight: 800;
  }

  .destaque-nome {
    margin-top: 1mm;
    font-weight: 700;
    color: ${CORES.texto};
  }

  .destaque-valor {
    margin-top: .8mm;
    color: ${CORES.cinza};
    font-size: 9pt;
  }

  h2 {
    color: ${CORES.verdeEscuro};
    font-size: 13pt;
    margin: 6mm 0 2.5mm;
    padding-bottom: 1.5mm;
    border-bottom: 1px solid ${CORES.borda};
    break-after: avoid;
  }

  h3 {
    color: ${CORES.verdeEscuro};
    font-size: 10.5pt;
    margin: 4.5mm 0 2mm;
    break-after: avoid;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4mm;
  }

  thead {
    display: table-header-group;
  }

  tfoot {
    display: table-row-group;
  }

  table {
    page-break-inside: auto;
    break-inside: auto;
  }

  tbody {
    page-break-inside: auto;
    break-inside: auto;
  }

  th {
    text-align: left;
    background: ${CORES.verde};
    color: white;
    padding: 2.2mm 2mm;
    font-size: 8pt;
    font-weight: 700;
  }

  td {
    padding: 2mm;
    border-bottom: 1px solid #e6ebe7;
    vertical-align: top;
    font-size: 8.4pt;
  }

  tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  tbody tr:nth-child(even) { background: #fafcfb; }

  .right { text-align: right; white-space: nowrap; }
  .center { text-align: center; }
  .muted { color: ${CORES.cinza}; }
  .strong { font-weight: 700; }

  .total-row td {
    background: ${CORES.amareloClaro};
    color: ${CORES.verdeEscuro};
    font-weight: 800;
    border-top: 1.2pt solid ${CORES.amarelo};
  }

  .product-block {
    margin-bottom: 6mm;
  }

  .product-title {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 5mm;
    padding: 2.5mm 3mm;
    background: ${CORES.verdeClaro};
    border-left: 3pt solid ${CORES.verde};
    break-after: avoid;
  }

  .product-title .name {
    font-weight: 800;
    color: ${CORES.verdeEscuro};
  }

  .product-title .code {
    color: ${CORES.cinza};
    font-size: 8pt;
  }

  .small-note {
    color: ${CORES.cinza};
    font-size: 8pt;
    margin-top: 2mm;
  }

  .chart-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5mm;
    margin-top: 4mm;
    margin-bottom: 5mm;
  }

  .chart-card {
    border: 1px solid ${CORES.borda};
    border-radius: 6px;
    padding: 4mm;
    background: #fff;
    break-inside: avoid;
  }

  .chart-title {
    color: ${CORES.verdeEscuro};
    font-size: 10.5pt;
    font-weight: 800;
    margin-bottom: 3mm;
  }

  .pie-wrap {
    display: grid;
    grid-template-columns: 40mm 1fr;
    gap: 5mm;
    align-items: center;
  }

  .pie {
    width: 38mm;
    height: 38mm;
    border-radius: 50%;
    border: 1px solid ${CORES.borda};
  }

  .legend-item {
    display: grid;
    grid-template-columns: 3mm 1fr auto;
    align-items: center;
    gap: 2mm;
    margin: 1.25mm 0;
    font-size: 7.8pt;
  }

  .legend-dot {
    width: 3mm;
    height: 3mm;
    border-radius: 1px;
  }

  .bar-row {
    display: grid;
    grid-template-columns: 34mm 1fr 23mm;
    gap: 2.2mm;
    align-items: center;
    margin: 2.2mm 0;
    font-size: 7.7pt;
  }

  .bar-label {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .bar-track {
    height: 4.2mm;
    background: #eef2ef;
    border-radius: 2mm;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: linear-gradient(90deg, ${CORES.verde}, #67a768);
    border-radius: 2mm;
  }

  .bar-value {
    text-align: right;
    white-space: nowrap;
    font-weight: 700;
    color: ${CORES.verdeEscuro};
  }

  .rank-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5mm;
  }

  .no-data {
    border: 1px dashed ${CORES.borda};
    background: ${CORES.fundo};
    color: ${CORES.cinza};
    padding: 5mm;
    text-align: center;
  }
</style>
</head>
<body>
  <div class="letterhead-header">
    <div style="font-weight:800;font-size:18px;color:#214c37;">ERP REPORT AUTOMATION HUB</div>
  </div>

  <main>
    <section class="report-head">
      <div class="report-kicker">ERP Report Automation Hub</div>
      <h1>${esc(titulo)}</h1>
      <div class="subtitle">${subtitulo}</div>
      <div class="status">STATUS: ${esc(dados.status || 'OK')}</div>
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

let conteudo = '';
let nomeArquivoPdf = '';
let nomeArquivoExcel = '';
let nomeArquivoZip = '';
let linhasExcel = [];

// =====================================================
// 1) PRODUÇÃO
// =====================================================
if (modulo === 'PRODUCAO') {
  const r = dados.resumo || {};
  const mais = r.maisProduzido || {};
  const menos = r.menosProduzido || {};
  const dias = [...(dados.producaoPorDia || [])].sort((a, b) => String(a.data).localeCompare(String(b.data)));
  const ordens = [...(dados.ordens || [])].sort((a, b) => String(a.dataEntrada || '').localeCompare(String(b.dataEntrada || '')));

  // Consolida ordens repetidas do MESMO PRODUTO no MESMO DIA.
  // Ex.: OP 700 (Product A - 1000 un.) + OP 702 (Product A - 1000 un.)
  // vira uma única linha: OPs 700 e 702 / Product A / 2000 un.
  const producaoAgrupada = consolidarProducaoPorDiaProduto(ordens);

  const gruposPorDia = producaoAgrupada.reduce((acc, grupo) => {
    const data = grupo.dataEntrada || 'SEM_DATA';
    if (!acc[data]) acc[data] = [];
    acc[data].push(grupo);
    return acc;
  }, {});

  conteudo += `
    <div class="cards">
      ${card('Unidades produzidas', num(r.totalUnidades), 'No período analisado')}
      ${card('Dias com produção', num(r.totalDiasProducao), 'Dias com entrada de produção')}
      ${card('Ordens', num(r.totalOrdens), 'Ordens de produção identificadas')}
      ${card('Produtos', num(r.totalProdutos), 'Produtos industrializados')}
    </div>

    <div class="destaques">
      ${destaque('Maior produção', mais.produto, mais.totalUnidades != null ? `${num(mais.totalUnidades)} unidades` : '')}
      ${destaque('Menor produção', menos.produto, menos.totalUnidades != null ? `${num(menos.totalUnidades)} unidades` : '')}
    </div>

    <h2>Produção por dia</h2>
    ${dias.length ? `
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th class="right">Ordens</th>
            <th class="right">Unidades produzidas</th>
            <th class="right">Valor total</th>
          </tr>
        </thead>
        <tbody>
          ${dias.map(d => `
            <tr>
              <td>${dataBR(d.data)}</td>
              <td class="right">${num(d.totalOrdens)}</td>
              <td class="right strong">${num(d.totalUnidades)}</td>
              <td class="right">${moeda(d.valorTotal)}</td>
            </tr>`).join('')}
        </tbody>
      </table>` : '<div class="no-data">Nenhuma produção por dia foi encontrada.</div>'}

    <h2>Produção consolidada por dia e produto</h2>
    <div class="small-note">Ordens do mesmo produto no mesmo dia são somadas e apresentadas em uma única linha.</div>

    ${Object.keys(gruposPorDia).length ? Object.entries(gruposPorDia).map(([data, grupos]) => {
      const totalDiaUnidades = grupos.reduce((s, g) => s + Number(g.totalUnidades || 0), 0);
      const totalDiaValor = grupos.reduce((s, g) => s + Number(g.valorTotal || 0), 0);
      const totalDiaOrdens = grupos.reduce((s, g) => s + Number(g.totalOrdens || 0), 0);

      return `
        <section class="product-block">
          <div class="product-title">
            <div>
              <div class="name">Dia ${dataBR(data)}</div>
              <div class="code">${num(totalDiaOrdens)} ordem(ns) de produção</div>
            </div>
            <div class="right">
              <div class="strong">${num(totalDiaUnidades)} unidades</div>
              <div class="muted">${moeda(totalDiaValor)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Ordem(ns)</th>
                <th>Produto</th>
                <th class="right">Qtd. OPs</th>
                <th class="right">Unidades produzidas</th>
                <th class="right">Valor total</th>
              </tr>
            </thead>
            <tbody>
              ${grupos.map(g => `
                <tr>
                  <td>${esc(g.documentosTexto)}</td>
                  <td><span class="muted">${esc(g.codigoProduto || '')}</span> ${esc(g.produto || '-')}</td>
                  <td class="right">${num(g.totalOrdens)}</td>
                  <td class="right strong">${num(g.totalUnidades)}</td>
                  <td class="right">${moeda(g.valorTotal)}</td>
                </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="2">TOTAL DO DIA</td>
                <td class="right">${num(totalDiaOrdens)}</td>
                <td class="right">${num(totalDiaUnidades)}</td>
                <td class="right">${moeda(totalDiaValor)}</td>
              </tr>
            </tfoot>
          </table>
        </section>`;
    }).join('') : '<div class="no-data">Nenhuma ordem de produção foi encontrada.</div>'}
  `;

  nomeArquivoPdf = `Relatorio_Bruto_Producao_${slug(form.MES || '')}_${slug(form.ANO || '')}.pdf`;
  nomeArquivoExcel = `Relatorio_Bruto_Producao_${slug(form.MES || '')}_${slug(form.ANO || '')}.xlsx`;
  nomeArquivoZip = `Relatorio_Bruto_Producao_${slug(form.MES || '')}_${slug(form.ANO || '')}.zip`;

  linhasExcel = producaoAgrupada.map(g => ({
    'Data': dataBR(g.dataEntrada),
    'Ordem(ns)': g.documentosTexto,
    'Código Produto': g.codigoProduto || '',
    'Produto': g.produto || '',
    'Qtd. Ordens': g.totalOrdens,
    'Unidades Produzidas': g.totalUnidades,
    'Valor Total': Number(g.valorTotal || 0),
  }));
}

// =====================================================
// 2) VENDAS
// =====================================================
else if (modulo === 'VENDAS') {
  const r = dados.resumo || {};
  const produtos = [...(dados.produtos || [])].sort((a, b) => String(a.produto || '').localeCompare(String(b.produto || ''), 'pt-BR'));
  const mais = r.maisVendidoUnidades || {};
  const menos = r.menosVendidoUnidades || {};

  conteudo += `
    <div class="cards">
      ${card('Valor vendido', moeda(r.totalValor), 'Total do período')}
      ${card('Unidades vendidas', num(r.totalUnidades), 'Soma de todas as saídas')}
      ${card('Produtos', num(r.totalProdutos), 'Produtos com venda')}
      ${card('Clientes', num(r.totalClientes), `${num(r.totalPedidos)} pedidos/documentos`)}
    </div>

    <div class="destaques">
      ${destaque('Maior volume vendido', mais.produto, mais.totalUnidades != null ? `${num(mais.totalUnidades)} unidades` : '')}
      ${destaque('Menor volume vendido', menos.produto, menos.totalUnidades != null ? `${num(menos.totalUnidades)} unidades` : '')}
    </div>

    <h2>Vendas organizadas por produto</h2>
    <div class="small-note">Cada produto é apresentado com as vendas por data e o total consolidado do período.</div>

    ${produtos.length ? produtos.map(p => {
      const vendas = [...(p.vendas || [])].sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')));
      return `
        <section class="product-block">
          <div class="product-title">
            <div>
              <div class="name">${esc(p.produto || '-')}</div>
              <div class="code">Código: ${esc(p.codigoProduto || '-')}</div>
            </div>
            <div class="right">
              <div class="strong">${num(p.totalUnidades)} unidades</div>
              <div class="muted">${moeda(p.totalValor)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Documento</th>
                <th>Cliente</th>
                <th class="right">Quantidade</th>
                <th class="right">Vlr. unitário</th>
                <th class="right">Valor total</th>
              </tr>
            </thead>
            <tbody>
              ${vendas.map(v => `
                <tr>
                  <td>${dataBR(v.data || v.dataOriginal)}</td>
                  <td>${esc(v.documento || '-')}</td>
                  <td>${esc(v.cliente || '-')}</td>
                  <td class="right strong">${num(v.quantidade)}</td>
                  <td class="right">${moeda(v.valorUnitario)}</td>
                  <td class="right">${moeda(v.valorTotal)}</td>
                </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3">TOTAL DO PRODUTO</td>
                <td class="right">${num(p.totalUnidades)}</td>
                <td></td>
                <td class="right">${moeda(p.totalValor)}</td>
              </tr>
            </tfoot>
          </table>
        </section>`;
    }).join('') : '<div class="no-data">Nenhum produto com vendas foi encontrado.</div>'}
  `;

  nomeArquivoPdf = `Relatorio_Bruto_Vendas_${slug(form.MES || '')}_${slug(form.ANO || '')}.pdf`;
  nomeArquivoExcel = `Relatorio_Bruto_Vendas_${slug(form.MES || '')}_${slug(form.ANO || '')}.xlsx`;
  nomeArquivoZip = `Relatorio_Bruto_Vendas_${slug(form.MES || '')}_${slug(form.ANO || '')}.zip`;

  linhasExcel = produtos.flatMap(p => (p.vendas || []).map(v => ({
    'Data': dataBR(v.data || v.dataOriginal),
    'Código Produto': p.codigoProduto || v.codigoProduto || '',
    'Produto': p.produto || v.produto || '',
    'Documento': v.documento || '',
    'Código Cliente': v.codigoCliente || '',
    'Cliente': v.cliente || '',
    'Quantidade': Number(v.quantidade || 0),
    'Unidade': v.unidade || '',
    'Valor Unitário': Number(v.valorUnitario || 0),
    'Valor Total': Number(v.valorTotal || 0),
  })));
}

// =====================================================
// 3) COMPRAS
// =====================================================
else if (modulo === 'COMPRAS') {
  const r = dados.resumo || {};
  const compras = dados.compras || [];
  const ranking = dados.rankingFornecedores || dados.fornecedores || [];
  const maiorFornecedor = r.maiorFornecedor || {};
  const menorFornecedor = r.menorFornecedor || {};

  conteudo += `
    <div class="cards">
      ${card('Total gasto', moeda(r.totalGasto), 'Compras e despesas')}
      ${card('Lançamentos', num(r.totalLancamentos), 'Registros encontrados')}
      ${card('Fornecedores', num(r.totalFornecedores), 'Fornecedores distintos')}
      ${card('Média por lançamento', moeda(r.totalLancamentos ? r.totalGasto / r.totalLancamentos : 0), 'Valor médio')}
    </div>

    <div class="destaques">
      ${destaque('Maior gasto por fornecedor', maiorFornecedor.fornecedor, maiorFornecedor.valorTotal != null ? moeda(maiorFornecedor.valorTotal) : '')}
      ${destaque('Menor gasto por fornecedor', menorFornecedor.fornecedor, menorFornecedor.valorTotal != null ? moeda(menorFornecedor.valorTotal) : '')}
    </div>

    <h2>Compras e despesas</h2>
    ${compras.length ? `
      <table>
        <thead>
          <tr>
            <th>Documento / Despesa</th>
            <th>Fornecedor</th>
            <th class="right">Valor líquido</th>
            <th class="right">%</th>
          </tr>
        </thead>
        <tbody>
          ${compras.map(c => `
            <tr>
              <td>${esc(c.documento || '-')}</td>
              <td><span class="muted">${esc(c.codigoFornecedor || '')}</span> ${esc(c.fornecedor || '-')}</td>
              <td class="right strong">${moeda(c.valorLiquido)}</td>
              <td class="right">${num(c.percentual, 2)}%</td>
            </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="2">TOTAL DE COMPRAS / DESPESAS</td>
            <td class="right">${moeda(r.totalGasto)}</td>
            <td class="right">100,00%</td>
          </tr>
        </tfoot>
      </table>` : '<div class="no-data">Nenhum lançamento de compra/despesa foi encontrado.</div>'}

    <h2>Consolidado por fornecedor</h2>
    ${ranking.length ? `
      <table>
        <thead>
          <tr>
            <th>Fornecedor</th>
            <th class="right">Lançamentos</th>
            <th class="right">Valor acumulado</th>
          </tr>
        </thead>
        <tbody>
          ${ranking.map(f => `
            <tr>
              <td>${esc(f.fornecedor || '-')}</td>
              <td class="right">${num(f.quantidadeCompras)}</td>
              <td class="right strong">${moeda(f.valorTotal)}</td>
            </tr>`).join('')}
        </tbody>
      </table>` : ''}
  `;

  nomeArquivoPdf = `Relatorio_Bruto_Compras_${slug(form.MES || '')}_${slug(form.ANO || '')}.pdf`;
  nomeArquivoExcel = `Relatorio_Bruto_Compras_${slug(form.MES || '')}_${slug(form.ANO || '')}.xlsx`;
  nomeArquivoZip = `Relatorio_Bruto_Compras_${slug(form.MES || '')}_${slug(form.ANO || '')}.zip`;

  linhasExcel = compras.map(c => ({
    'Documento / Despesa': c.documento || '',
    'Código Fornecedor': c.codigoFornecedor || '',
    'Fornecedor': c.fornecedor || '',
    'Valor Líquido': Number(c.valorLiquido || 0),
    'Percentual': Number(c.percentual || 0),
  }));
}

else {
  throw new Error(`Módulo não suportado pelo gerador BRUTO: ${modulo}`);
}

const titulo = `Relatório Bruto de ${textoModulo()}`;
const subtitulo = periodoRelatorio();
const html = documentoHtml(titulo, subtitulo, conteudo);

return [{
  json: {
    ...dados,
    tipoRelatorioGerado: 'BRUTO',
    nomeArquivoPdf,
    nomeArquivoExcel,
    nomeArquivoZip,
    linhasExcel,
    html,
  }
}];
