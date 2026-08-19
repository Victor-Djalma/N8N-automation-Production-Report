// n8n Code node — Run Once for All Items
// Public/sanitized validation logic.

const items = $input.all().map(item => item.json);
if (!items.length) throw new Error('Nenhuma ordem recebida para validação.');

const first = items[0];
const form = $('On form submission').first().json;

const monthMap = {
  JANEIRO: 1, FEVEREIRO: 2, MARÇO: 3, ABRIL: 4, MAIO: 5, JUNHO: 6,
  JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12,
};

const informedMonthName = String(form['MÊS'] ?? form.MES ?? '').toUpperCase();
const informedMonth = monthMap[informedMonthName] ?? Number(form['MÊS'] ?? form.MES ?? 0);
const informedYear = Number(form['ANO'] ?? 0);

const parseDate = (value) => {
  const s = String(value ?? '').trim();
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!m) return null;
  return { day: Number(m[1]), month: Number(m[2]), year: Number(m[3]) };
};

const validDates = items.map(x => parseDate(x.dataEntrada)).filter(Boolean);
const foundMonth = validDates[0]?.month ?? null;
const foundYear = validDates[0]?.year ?? null;

const quantityCalculated = items.reduce((s, x) => s + Number(x.quantidadeProduzida || 0), 0);
const valueCalculated = items.reduce((s, x) => s + Number(x.valorTotal || 0), 0);
const materialCount = items.reduce((s, x) => s + Number(x.quantidadeMateriais || 0), 0);
const productCount = new Set(items.map(x => `${x.codigoProduto}|${x.produto}`)).size;

const docs = items
  .map(x => Number(x.documento))
  .filter(Number.isFinite)
  .sort((a, b) => a - b);

const missingDocs = [];
for (let n = docs[0] ?? 0; docs.length && n <= docs[docs.length - 1]; n++) {
  if (!docs.includes(n)) missingDocs.push(n);
}

const duplicateDocs = docs.filter((n, i) => i > 0 && n === docs[i - 1]);
const uniqueDuplicateDocs = [...new Set(duplicateDocs)];

// If your export contains explicit SYSTEM totals, map them here.
// In this public version the calculated totals are used as reference defaults.
const quantitySystem = Number(first.quantidadeSystem ?? quantityCalculated);
const valueSystem = Number(first.valorSystem ?? valueCalculated);

const tolerance = 0.01;
const quantityMatches = Math.abs(quantitySystem - quantityCalculated) <= tolerance;
const valueMatches = Math.abs(valueSystem - valueCalculated) <= tolerance;
const monthMatches = !informedMonth || informedMonth === foundMonth;
const yearMatches = !informedYear || informedYear === foundYear;

const alerts = [];
const errors = [];

if (!monthMatches) errors.push(`Mês informado (${informedMonth}) difere do mês encontrado (${foundMonth}).`);
if (!yearMatches) errors.push(`Ano informado (${informedYear}) difere do ano encontrado (${foundYear}).`);
if (!quantityMatches) errors.push('Quantidade calculada diverge do total de referência.');
if (!valueMatches) errors.push('Valor calculado diverge do total de referência.');
if (missingDocs.length) alerts.push(`Documentos ausentes na sequência: ${missingDocs.join(', ')}.`);
if (uniqueDuplicateDocs.length) alerts.push(`Documentos duplicados: ${uniqueDuplicateDocs.join(', ')}.`);

const status = errors.length ? 'ERRO' : alerts.length ? 'ALERTA' : 'OK';

return [{
  json: {
    status,
    competencia: {
      mesInformado: informedMonthName || informedMonth,
      anoInformado: informedYear,
      mesEncontrado: foundMonth,
      anoEncontrado: foundYear,
      dataInicial: validDates.length ? items[0].dataEntrada : null,
      dataFinal: validDates.length ? items[items.length - 1].dataEntrada : null,
    },
    resumo: {
      quantidadeOrdens: items.length,
      produtosIndustrializados: productCount,
      quantidadeMateriais: materialCount,
      quantidadeTotalProduzida: quantityCalculated,
      valorTotalProduzido: valueCalculated,
      documentoInicial: docs[0] ?? null,
      documentoFinal: docs.at(-1) ?? null,
    },
    validacao: {
      quantidadeConfere: quantityMatches,
      valorConfere: valueMatches,
      mesConfere: monthMatches,
      anoConfere: yearMatches,
      documentosAusentes: missingDocs,
      documentosDuplicados: uniqueDuplicateDocs,
      alertas,
      erros,
    },
    ordens: items,
  },
}];
