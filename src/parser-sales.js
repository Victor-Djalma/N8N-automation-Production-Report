const items = $input.all();
const form = $('Envio de Relatório ERP').first().json;

// =====================================================
// FUNÇÕES
// =====================================================

function numeroBR(valor) {
  if (typeof valor === 'number') return valor;

  if (valor === null || valor === undefined || valor === '') {
    return 0;
  }

  return Number(
    String(valor)
      .replace(/\./g, '')
      .replace(',', '.')
  );
}

function dataISO(dataBR) {
  const [dia, mes, ano] = dataBR.split('/');
  return `${ano}-${mes}-${dia}`;
}

function competenciaData(dataBR) {
  const [, mes, ano] = dataBR.split('/');

  return {
    mes: Number(mes),
    ano: Number(ano)
  };
}

const meses = {
  JANEIRO: 1,
  FEVEREIRO: 2,
  MARÇO: 3,
  ABRIL: 4,
  MAIO: 5,
  JUNHO: 6,
  JULHO: 7,
  AGOSTO: 8,
  SETEMBRO: 9,
  OUTUBRO: 10,
  NOVEMBRO: 11,
  DEZEMBRO: 12
};

// =====================================================
// DADOS DO FORMULÁRIO
// =====================================================

const mesFormularioTexto = String(form.MES || '')
  .trim()
  .toUpperCase();

const mesFormulario = meses[mesFormularioTexto];

const anoFormularioTexto = String(form.ANO || '').trim();
const anoFormulario = Number(anoFormularioTexto);

// =====================================================
// TRANSFORMA XLS EM LINHAS
// =====================================================

const linhas = [];

for (const item of items) {

  const valores = Object.values(item.json || {})
    .filter(valor =>
      valor !== null &&
      valor !== undefined &&
      String(valor).trim() !== ''
    );

  if (valores.length === 0) continue;

  linhas.push(
    valores.map(v => String(v)).join(' ').trim()
  );
}

// =====================================================
// IDENTIFICA O RELATÓRIO
// =====================================================

const ehRelatorioVendas = linhas.some(linha => {

  const texto = linha.toUpperCase();

  return (
    texto.includes('RELATÓRIO DE VENDAS') ||
    texto.includes('RELATORIO DE VENDAS')
  );
});

// =====================================================
// PERÍODO INFORMADO PELO ERP
// =====================================================

let dataInicial = null;
let dataFinal = null;

for (const linha of linhas) {

  const match = linha.match(
    /Relat[oó]rio de Vendas de\s+(\d{2}\/\d{2}\/\d{4})\s+[àa]\s+(\d{2}\/\d{2}\/\d{4})/i
  );

  if (match) {
    dataInicial = match[1];
    dataFinal = match[2];
    break;
  }
}

// =====================================================
// REGEX
// =====================================================

const numeroRegex = '-?[\\d.]+,\\d{2,4}';

const regexVenda = new RegExp(
  '^\\s*' +
  '(\\d{2}\\/\\d{2}\\/\\d{4})\\s+' + // Data
  '(\\d+)\\s+' +                     // Empresa
  '(\\S+)\\s+' +                     // Documento
  '(.+?)\\s+' +                      // Cliente
  `(${numeroRegex})\\s+` +           // Quantidade
  '([A-Za-z]+)\\s+' +                // Unidade
  `(${numeroRegex})\\s+` +           // Valor Unitário
  `(${numeroRegex})\\s+` +           // Desconto Comercial
  `(${numeroRegex})\\s+` +           // Desc/Acréscimo Financeiro
  `(${numeroRegex})\\s+` +           // Líquido
  `(${numeroRegex})\\s+` +           // ICMS
  `(${numeroRegex})\\s+` +           // IPI
  `(${numeroRegex})\\s+` +           // Outros
  `(${numeroRegex})` +               // TOTAL
  '\\s*\\+?\\s*$'
);

const regexProduto =
  /^\s*(\d+)\s+-\s+(.+?)\s*$/;

// =====================================================
// PARSER
// =====================================================

const produtosMap = {};
const vendas = [];

let produtoAtual = null;

for (const linha of linhas) {

  // ---------------------------------------------------
  // CABEÇALHO DO PRODUTO
  // Ex:
  // 1001 - PRODUCT A
  // ---------------------------------------------------

  const produtoMatch = linha.match(regexProduto);

  if (
    produtoMatch &&
    !linha.match(/^\d{2}\/\d{2}\/\d{4}/)
  ) {

    const codigoProduto = produtoMatch[1];
    const produto = produtoMatch[2].trim();

    if (!produtosMap[codigoProduto]) {
      produtosMap[codigoProduto] = {
        codigoProduto,
        produto,
        vendas: []
      };
    }

    produtoAtual = produtosMap[codigoProduto];

    continue;
  }

  // ---------------------------------------------------
  // LINHA DE VENDA
  // ---------------------------------------------------

  const vendaMatch = linha.match(regexVenda);

  if (!vendaMatch) continue;

  if (!produtoAtual) continue;

  const [
    _,
    data,
    empresa,
    documento,
    clienteCompleto,
    quantidade,
    unidade,
    valorUnitario,
    descontoComercial,
    ajusteFinanceiro,
    valorLiquido,
    icms,
    ipi,
    outrosValores,
    valorTotal
  ] = vendaMatch;

  // Cliente vem como:
  // 2001 - CUSTOMER EXAMPLE

  let codigoCliente = null;
  let cliente = clienteCompleto.trim();

  const clienteMatch =
    cliente.match(/^(\d+)\s*-\s*(.+)$/);

  if (clienteMatch) {
    codigoCliente = clienteMatch[1];
    cliente = clienteMatch[2].trim();
  }

  const venda = {
    data: dataISO(data),
    dataOriginal: data,

    empresa,
    documento,

    codigoCliente,
    cliente,

    codigoProduto: produtoAtual.codigoProduto,
    produto: produtoAtual.produto,

    quantidade: numeroBR(quantidade),
    unidade: unidade.trim(),

    valorUnitario: numeroBR(valorUnitario),

    descontoComercial:
      numeroBR(descontoComercial),

    ajusteFinanceiro:
      numeroBR(ajusteFinanceiro),

    valorLiquido:
      numeroBR(valorLiquido),

    icms:
      numeroBR(icms),

    ipi:
      numeroBR(ipi),

    outrosValores:
      numeroBR(outrosValores),

    valorTotal:
      numeroBR(valorTotal)
  };

  produtoAtual.vendas.push(venda);
  vendas.push(venda);
}

// =====================================================
// REMOVE PRODUTOS SEM VENDA
// =====================================================

const produtos = Object.values(produtosMap)
  .filter(produto => produto.vendas.length > 0);

// =====================================================
// TOTALIZA PRODUTOS
// =====================================================

for (const produto of produtos) {

  produto.totalUnidades =
    produto.vendas.reduce(
      (total, venda) =>
        total + venda.quantidade,
      0
    );

  produto.totalValor =
    produto.vendas.reduce(
      (total, venda) =>
        total + venda.valorTotal,
      0
    );

  produto.totalLiquido =
    produto.vendas.reduce(
      (total, venda) =>
        total + venda.valorLiquido,
      0
    );

  produto.quantidadeVendas =
    produto.vendas.length;
}

// =====================================================
// TOTAL GERAL CALCULADO
// =====================================================

const totalUnidades = vendas.reduce(
  (total, venda) => total + venda.quantidade,
  0
);

const totalValor = vendas.reduce(
  (total, venda) => total + venda.valorTotal,
  0
);

const totalLiquido = vendas.reduce(
  (total, venda) => total + venda.valorLiquido,
  0
);

// =====================================================
// TOTAL GERAL INFORMADO PELO ERP
// =====================================================

let totalInformadoERP = null;

for (const linha of linhas) {

  if (!/^\s*Vendas:/i.test(linha)) {
    continue;
  }

  const numeros =
    linha.match(/-?[\d.]+,\d{2,4}/g);

  // Linha final possui:
  // Bruto
  // Desconto Comercial
  // Desconto Financeiro
  // Líquido
  // ICMS
  // IPI
  // Outros
  // TOTAL
  // Preço Médio

  if (numeros && numeros.length >= 8) {
    totalInformadoERP =
      numeroBR(numeros[7]);
  }
}

// =====================================================
// CLIENTES
// =====================================================

const clientesUnicos = new Set();

for (const venda of vendas) {

  clientesUnicos.add(
    venda.codigoCliente ||
    venda.cliente
  );
}

// =====================================================
// PEDIDOS
// =====================================================

const pedidosMap = {};

for (const venda of vendas) {

  if (!pedidosMap[venda.documento]) {

    pedidosMap[venda.documento] = {
      documento: venda.documento,
      valorTotal: 0,
      quantidade: 0
    };
  }

  pedidosMap[venda.documento].valorTotal +=
    venda.valorTotal;

  pedidosMap[venda.documento].quantidade +=
    venda.quantidade;
}

const pedidos =
  Object.values(pedidosMap);

// =====================================================
// RANKINGS
// =====================================================

const rankingUnidades = [...produtos]
  .sort(
    (a, b) =>
      b.totalUnidades - a.totalUnidades
  );

const rankingValor = [...produtos]
  .sort(
    (a, b) =>
      b.totalValor - a.totalValor
  );

const maisVendidoUnidades =
  rankingUnidades[0] || null;

const menosVendidoUnidades =
  rankingUnidades.length
    ? rankingUnidades[rankingUnidades.length - 1]
    : null;

const maiorFaturamento =
  rankingValor[0] || null;

const menorFaturamento =
  rankingValor.length
    ? rankingValor[rankingValor.length - 1]
    : null;

// =====================================================
// VENDAS POR DIA
// =====================================================

const diasMap = {};

for (const venda of vendas) {

  if (!diasMap[venda.data]) {

    diasMap[venda.data] = {
      data: venda.data,
      quantidadeVendas: 0,
      totalUnidades: 0,
      totalValor: 0
    };
  }

  diasMap[venda.data].quantidadeVendas++;

  diasMap[venda.data].totalUnidades +=
    venda.quantidade;

  diasMap[venda.data].totalValor +=
    venda.valorTotal;
}

const vendasPorDia =
  Object.values(diasMap)
    .sort(
      (a, b) =>
        a.data.localeCompare(b.data)
    );

// =====================================================
// VALIDAÇÕES
// =====================================================

const erros = [];
const alertas = [];

if (!ehRelatorioVendas) {

  erros.push(
    'O arquivo enviado não foi identificado como Relatório de Vendas.'
  );
}

if (vendas.length === 0) {

  erros.push(
    'Nenhuma venda válida foi encontrada no arquivo.'
  );
}

if (!mesFormulario) {

  erros.push(
    `Mês informado no formulário é inválido: ${form.MES}`
  );
}

if (!/^\d{4}$/.test(anoFormularioTexto)) {

  erros.push(
    `Ano informado no formulário é inválido: ${form.ANO}`
  );
}

// =====================================================
// VALIDA TODAS AS DATAS DAS VENDAS
// =====================================================

if (
  mesFormulario &&
  /^\d{4}$/.test(anoFormularioTexto)
) {

  const competenciasDiferentes =
    new Set();

  for (const venda of vendas) {

    const competencia =
      competenciaData(venda.dataOriginal);

    if (
      competencia.mes !== mesFormulario ||
      competencia.ano !== anoFormulario
    ) {

      competenciasDiferentes.add(
        `${competencia.mes}/${competencia.ano}`
      );
    }
  }

  if (competenciasDiferentes.size > 0) {

    erros.push(
      `A competência informada (${form.MES}/${form.ANO}) não corresponde às datas encontradas no relatório.`
    );
  }
}

// =====================================================
// CONFERE TOTAL COM ERP
// =====================================================

if (totalInformadoERP !== null) {

  const diferenca =
    Math.abs(
      totalValor - totalInformadoERP
    );

  if (diferenca > 0.05) {

    alertas.push(
      `O total calculado pelo parser (${totalValor.toFixed(2)}) não corresponde ao total informado pelo ERP (${totalInformadoERP.toFixed(2)}).`
    );
  }

} else if (ehRelatorioVendas) {

  alertas.push(
    'Não foi possível localizar o Total Geral informado pelo ERP.'
  );
}

// =====================================================
// STATUS FINAL
// =====================================================

let status = 'OK';

if (erros.length > 0) {
  status = 'ERRO';
} else if (alertas.length > 0) {
  status = 'ALERTA';
}

const parserOk =
  status !== 'ERRO';

// =====================================================
// SAÍDA
// =====================================================

return [{
  json: {

    parserOk,
    status,

    modulo: 'VENDAS',

    competencia: {
      mes: mesFormularioTexto,
      numeroMes: mesFormulario,
      ano: anoFormulario,

      dataInicial,
      dataFinal
    },

    validacao: {
      totalLinhasLidas: linhas.length,
      totalVendasEncontradas: vendas.length,

      totalInformadoERP,
      totalCalculado: totalValor,

      diferencaTotal:
        totalInformadoERP !== null
          ? Math.abs(
              totalValor - totalInformadoERP
            )
          : null,

      alertas,
      erros
    },

    resumo: {
      totalProdutos: produtos.length,
      totalVendas: vendas.length,
      totalPedidos: pedidos.length,
      totalClientes: clientesUnicos.size,

      totalUnidades,
      totalLiquido,
      totalValor,

      ticketMedio:
        pedidos.length > 0
          ? totalValor / pedidos.length
          : 0,

      maisVendidoUnidades,
      menosVendidoUnidades,

      maiorFaturamento,
      menorFaturamento
    },

    produtos,
    vendas,
    vendasPorDia,

    rankingUnidades,
    rankingValor
  }
}];