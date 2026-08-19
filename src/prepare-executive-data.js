// n8n Code node — Run Once for All Items
// Public/sanitized executive aggregation.

const dados = $input.first().json;
const ordens = Array.isArray(dados.ordens) ? dados.ordens : [];
if (!ordens.length) throw new Error('Nenhuma ordem encontrada em "ordens".');

const n = (v) => Number(v) || 0;
const fmtNumber = (v, digits = 0) => Number(v || 0).toLocaleString('pt-BR', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
});
const fmtPct = (v) => `${Number(v || 0).toFixed(1).replace('.', ',')}%`;

const totalOrders = ordens.length;
const totalProduced = ordens.reduce((acc, item) => acc + n(item.quantidadeProduzida), 0);

const products = new Map();
for (const order of ordens) {
  const key = `${order.codigoProduto}|${order.produto}|${order.unidade || 'UN'}`;
  if (!products.has(key)) {
    products.set(key, {
      codigoProduto: order.codigoProduto,
      produto: order.produto,
      unidade: order.unidade || 'UN',
      ordens: 0,
      quantidade: 0,
      valorTotal: 0,
    });
  }
  const current = products.get(key);
  current.ordens += 1;
  current.quantidade += n(order.quantidadeProduzida);
  current.valorTotal += n(order.valorTotal);
}

const ranking = [...products.values()]
  .map(item => ({
    ...item,
    percentual: totalProduced > 0 ? (item.quantidade / totalProduced) * 100 : 0,
    mediaPorOrdem: item.ordens > 0 ? item.quantidade / item.ordens : 0,
  }))
  .sort((a, b) => b.quantidade - a.quantidade);

const totalProducts = ranking.length;
const avgPerOrder = totalOrders > 0 ? totalProduced / totalOrders : 0;
const topProduct = ranking[0] ?? null;
const bottomProduct = ranking.at(-1) ?? null;

const barChart = ranking.slice(0, 10).map(item => ({
  produto: item.produto,
  quantidade: item.quantidade,
  quantidadeFmt: fmtNumber(item.quantidade),
  percentual: item.percentual,
  percentualFmt: fmtPct(item.percentual),
}));

const top5 = ranking.slice(0, 5);
const rest = ranking.slice(5).reduce((acc, item) => acc + item.quantidade, 0);
const pieChart = top5.map(item => ({
  produto: item.produto,
  quantidade: item.quantidade,
  quantidadeFmt: fmtNumber(item.quantidade),
  percentual: item.percentual,
  percentualFmt: fmtPct(item.percentual),
}));

if (rest > 0) {
  pieChart.push({
    produto: 'Outros',
    quantidade: rest,
    quantidadeFmt: fmtNumber(rest),
    percentual: totalProduced > 0 ? (rest / totalProduced) * 100 : 0,
    percentualFmt: fmtPct(totalProduced > 0 ? (rest / totalProduced) * 100 : 0),
  });
}

const missingDocs = Array.isArray(dados.validacao?.documentosAusentes)
  ? dados.validacao.documentosAusentes
  : [];

let executiveSummary = '';
if (topProduct) {
  executiveSummary += `O produto com maior produção foi ${topProduct.produto}, com ${fmtNumber(topProduct.quantidade)} ${topProduct.unidade}, representando ${fmtPct(topProduct.percentual)} do período. `;
}
if (bottomProduct) {
  executiveSummary += `O produto com menor produção foi ${bottomProduct.produto}, com ${fmtNumber(bottomProduct.quantidade)} ${bottomProduct.unidade}. `;
}
executiveSummary += `No total, foram consolidadas ${fmtNumber(totalProduced)} unidades em ${fmtNumber(totalOrders)} ordens e ${fmtNumber(totalProducts)} produtos.`;
if (missingDocs.length) executiveSummary += ` Foram identificadas ${missingDocs.length} lacunas na sequência documental.`;

return [{
  json: {
    status: dados.status,
    competencia: dados.competencia,
    indicadores: {
      totalProduzido: totalProduced,
      totalProduzidoFmt: fmtNumber(totalProduced),
      totalOrdens: totalOrders,
      totalProdutos: totalProducts,
      mediaPorOrdem: avgPerOrder,
      mediaPorOrdemFmt: fmtNumber(avgPerOrder, 2),
    },
    maisProduzido: topProduct ? {
      ...topProduct,
      quantidadeFmt: fmtNumber(topProduct.quantidade),
      percentualFmt: fmtPct(topProduct.percentual),
    } : null,
    menosProduzido: bottomProduct ? {
      ...bottomProduct,
      quantidadeFmt: fmtNumber(bottomProduct.quantidade),
      percentualFmt: fmtPct(bottomProduct.percentual),
    } : null,
    rankingProdutos: ranking.map(item => ({
      ...item,
      quantidadeFmt: fmtNumber(item.quantidade),
      percentualFmt: fmtPct(item.percentual),
      mediaPorOrdemFmt: fmtNumber(item.mediaPorOrdem, 2),
    })),
    graficoBarra: barChart,
    graficoPizza: pieChart,
    alertas: Array.isArray(dados.validacao?.alertas) ? dados.validacao.alertas : [],
    documentosAusentes: missingDocs,
    resumoExecutivo: executiveSummary,
  },
}];
