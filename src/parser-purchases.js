const items = $input.all();

// =====================================================
// FUNÇÕES
// =====================================================

function numeroBR(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;

  return Number(
    String(valor)
      .replace(/\./g, '')
      .replace(',', '.')
  );
}

// =====================================================
// TRANSFORMA TUDO QUE VEIO DO XLS EM LINHAS DE TEXTO
// =====================================================

const linhas = [];

for (const item of items) {
  for (const valor of Object.values(item.json || {})) {
    if (valor === null || valor === undefined) continue;

    const texto = String(valor).trim();

    if (texto) {
      linhas.push(texto);
    }
  }
}

// =====================================================
// IDENTIFICA O RELATÓRIO
// =====================================================

const ehRelatorioCompras = linhas.some(linha =>
  linha.toUpperCase().includes('RELATÓRIO DE COMPRAS SINTÉTICO') ||
  linha.toUpperCase().includes('RELATORIO DE COMPRAS SINTETICO')
);

// =====================================================
// DATA DE GERAÇÃO DO RELATÓRIO
// =====================================================

let dataGeracao = null;

for (const linha of linhas) {
  const match = linha.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})/i);

  if (match) {
    dataGeracao = match[1];
    break;
  }
}

// =====================================================
// REGEX DAS COMPRAS
// =====================================================

const regexCompra =
  /^\s*(\S+)\s+-\s+(\d+)\s+(.+?)\s+([\d.]+,\d{2})\s+([\d.,]+)\s*$/;

const compras = [];

// =====================================================
// LÊ AS LINHAS
// =====================================================

for (const linha of linhas) {

  const match = linha.match(regexCompra);

  if (!match) continue;

  const [
    _,
    documento,
    codigoFornecedor,
    fornecedor,
    valorLiquido,
    percentual
  ] = match;

  compras.push({
    documento: documento.trim(),
    codigoFornecedor: codigoFornecedor.trim(),
    fornecedor: fornecedor.trim(),
    valorLiquido: numeroBR(valorLiquido),
    percentual: numeroBR(percentual)
  });
}

// =====================================================
// TOTAL INFORMADO PELO ERP
// =====================================================

let totalInformadoERP = null;

for (const linha of linhas) {

  const match = linha.match(
    /Total Compras\/Despesas\s+([\d.]+,\d{2})/i
  );

  if (match) {
    totalInformadoERP = numeroBR(match[1]);
    break;
  }
}

// =====================================================
// TOTAL CALCULADO
// =====================================================

const totalCalculado = compras.reduce(
  (total, compra) => total + compra.valorLiquido,
  0
);

// =====================================================
// AGRUPAMENTO POR FORNECEDOR
// =====================================================

const mapaFornecedores = {};

for (const compra of compras) {

  const chave = `${compra.codigoFornecedor}-${compra.fornecedor}`;

  if (!mapaFornecedores[chave]) {

    mapaFornecedores[chave] = {
      codigoFornecedor: compra.codigoFornecedor,
      fornecedor: compra.fornecedor,
      quantidadeCompras: 0,
      valorTotal: 0
    };
  }

  mapaFornecedores[chave].quantidadeCompras++;
  mapaFornecedores[chave].valorTotal += compra.valorLiquido;
}

const fornecedores = Object.values(mapaFornecedores)
  .sort((a, b) => b.valorTotal - a.valorTotal);

// =====================================================
// RANKINGS
// =====================================================

const comprasOrdenadas = [...compras]
  .sort((a, b) => b.valorLiquido - a.valorLiquido);

const maiorCompra =
  comprasOrdenadas.length > 0
    ? comprasOrdenadas[0]
    : null;

const menorCompra =
  comprasOrdenadas.length > 0
    ? comprasOrdenadas[comprasOrdenadas.length - 1]
    : null;

const maiorFornecedor =
  fornecedores.length > 0
    ? fornecedores[0]
    : null;

const menorFornecedor =
  fornecedores.length > 0
    ? fornecedores[fornecedores.length - 1]
    : null;

// =====================================================
// VALIDAÇÃO DO PARSER
// =====================================================

let status = 'OK';
let parserOk = true;
const alertas = [];
const erros = [];

if (!ehRelatorioCompras) {

  parserOk = false;
  status = 'ERRO';

  erros.push(
    'O arquivo enviado não foi identificado como Relatório de Compras Sintético.'
  );
}

if (compras.length === 0) {

  parserOk = false;
  status = 'ERRO';

  erros.push(
    'Nenhuma compra/despesa válida foi encontrada no arquivo.'
  );
}

// Confere se nossa soma bate com o ERP
if (
  parserOk &&
  totalInformadoERP !== null
) {

  const diferenca =
    Math.abs(totalCalculado - totalInformadoERP);

  if (diferenca > 0.02) {

    status = 'ALERTA';

    alertas.push(
      `O total calculado (${totalCalculado.toFixed(2)}) não corresponde ao total informado pelo ERP (${totalInformadoERP.toFixed(2)}).`
    );
  }
}

// =====================================================
// SAÍDA PADRONIZADA
// =====================================================

return [{
  json: {

    parserOk,
    status,

    modulo: 'COMPRAS',

    dataGeracao,

    validacao: {
      totalLinhasLidas: linhas.length,
      totalLancamentosEncontrados: compras.length,
      totalInformadoERP,
      totalCalculado,
      diferencaTotal:
        totalInformadoERP !== null
          ? Math.abs(totalCalculado - totalInformadoERP)
          : null,
      alertas,
      erros
    },

    resumo: {
      totalLancamentos: compras.length,
      totalFornecedores: fornecedores.length,
      totalGasto: totalCalculado,

      maiorCompra,
      menorCompra,

      maiorFornecedor,
      menorFornecedor
    },

    compras,

    fornecedores,

    rankingFornecedores: fornecedores.slice(0, 10)
  }
}];