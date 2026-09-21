const items = $input.all();
const form = $('Envio de Relatório ERP').first().json;

// =====================================================
// CONFIGURAÇÕES / FUNÇÕES
// =====================================================

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

function numero(valor) {
  if (typeof valor === 'number') return valor;

  if (valor === null || valor === undefined || valor === '') {
    return 0;
  }

  let texto = String(valor).trim();

  // Brasileiro: 669.859,0000
  if (texto.includes(',')) {
    texto = texto
      .replace(/\./g, '')
      .replace(',', '.');
  }

  const n = Number(texto);

  return Number.isFinite(n) ? n : 0;
}

function limparDescricao(valor) {
  return String(valor || '')
    .replace(/^\s*-\s*/, '')
    .trim();
}

function normalizarData(valor) {

  if (valor === null || valor === undefined) {
    return null;
  }

  // Excel serial date
  if (typeof valor === 'number' && valor > 20000) {

    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const data = new Date(
      excelEpoch.getTime() +
      valor * 86400000
    );

    const ano = data.getUTCFullYear();
    const mes = data.getUTCMonth() + 1;
    const dia = data.getUTCDate();

    return {
      iso:
        `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
      dia,
      mes,
      ano
    };
  }

  const texto = String(valor).trim();

  // 2026-08-03...
  let match = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (match) {

    const ano = Number(match[1]);
    const mes = Number(match[2]);
    const dia = Number(match[3]);

    return {
      iso: `${match[1]}-${match[2]}-${match[3]}`,
      dia,
      mes,
      ano
    };
  }

  // 03/08/2026
  match = texto.match(
    /^(\d{2})\/(\d{2})\/(\d{4})/
  );

  if (match) {

    const dia = Number(match[1]);
    const mes = Number(match[2]);
    const ano = Number(match[3]);

    return {
      iso:
        `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
      dia,
      mes,
      ano
    };
  }

  return null;
}

function valoresLinha(json) {

  return Object.values(json || {})
    .filter(valor =>
      valor !== null &&
      valor !== undefined &&
      String(valor).trim() !== ''
    );
}

// =====================================================
// DADOS DO FORM
// =====================================================

const mesFormularioTexto =
  String(form.MES || '')
    .trim()
    .toUpperCase();

const mesFormulario =
  meses[mesFormularioTexto];

const anoFormularioTexto =
  String(form.ANO || '').trim();

const anoFormulario =
  Number(anoFormularioTexto);

// =====================================================
// LINHAS EXTRAÍDAS DO XLS
// =====================================================

const linhas = items
  .map(item => valoresLinha(item.json))
  .filter(valores => valores.length > 0);

// =====================================================
// IDENTIFICA O RELATÓRIO
// =====================================================

const ehRelatorioProducao =
  linhas.some(valores => {

    const texto =
      valores.join(' ').toUpperCase();

    return (
      texto.includes(
        'RELATÓRIO DE ENTRADA DE PRODUÇÃO'
      ) ||
      texto.includes(
        'RELATORIO DE ENTRADA DE PRODUCAO'
      )
    );
  });

// =====================================================
// PARSER
// =====================================================

const ordens = [];

let produtoAtual = null;
let ordemAtual = null;

for (
  let indice = 0;
  indice < linhas.length;
  indice++
) {

  const valores = linhas[indice];

  const primeiro = valores[0];
  const segundo = valores[1];

  // ---------------------------------------------------
  // CABEÇALHO DO PRODUTO
  //
  // 1001 - PRODUCT A...
  // ---------------------------------------------------

  if (
    valores.length <= 2 &&
    primeiro !== undefined &&
    segundo !== undefined &&
    /^\d+$/.test(String(primeiro).replace('.0', '')) &&
    String(segundo).trim().startsWith('-')
  ) {

    const codigo =
      Number(primeiro);

    if (codigo !== 1) {

      produtoAtual = {
        codigoProduto: codigo,
        produto:
          limparDescricao(segundo)
      };

      continue;
    }
  }

  // ---------------------------------------------------
  // ORDEM DE PRODUÇÃO
  //
  // 1 - PRODUÇÃO DOC DATA QTD UN VLR VLR TOTAL
  // ---------------------------------------------------

  if (
    primeiro !== undefined &&
    Number(primeiro) === 1 &&
    segundo !== undefined &&
    String(segundo)
      .toUpperCase()
      .includes('PRODU')
  ) {

    if (!produtoAtual) {
      continue;
    }

    const data =
      normalizarData(valores[3]);

    ordemAtual = {

      numeroSequencial:
        ordens.length + 1,

      tipoRegistro:
        'ORDEM_PRODUCAO',

      linhaOrigem:
        indice + 1,

      codigoProduto:
        produtoAtual.codigoProduto,

      produto:
        produtoAtual.produto,

      documento:
        valores[2] !== undefined
          ? String(valores[2])
          : null,

      dataEntrada:
        data?.iso || null,

      quantidadeProduzida:
        numero(valores[4]),

      unidade:
        valores[5]
          ? String(valores[5]).trim()
          : null,

      valorUnitario:
        numero(valores[6]),

      valorTotal:
        numero(valores[7]),

      materiaisUtilizados: []
    };

    ordens.push(ordemAtual);

    continue;
  }

  // ---------------------------------------------------
  // MATERIAL CONSUMIDO
  //
  // 2001 - MATERIAL A... QTD UN VALOR VALOR TOTAL
  // ---------------------------------------------------

  if (
    ordemAtual &&
    valores.length >= 5 &&
    primeiro !== undefined &&
    segundo !== undefined &&
    Number(primeiro) !== 1 &&
    String(segundo).trim().startsWith('-')
  ) {

    const codigoMaterial =
      Number(primeiro);

    if (
      Number.isFinite(codigoMaterial)
    ) {

      ordemAtual.materiaisUtilizados.push({

        codigoMaterial,

        material:
          limparDescricao(segundo),

        quantidade:
          numero(valores[2]),

        unidade:
          valores[3]
            ? String(valores[3]).trim()
            : null,

        valorUnitario:
          numero(valores[4]),

        valorTotal:
          numero(valores[5])
      });
    }
  }
}

// =====================================================
// QUANTIDADE DE MATERIAIS POR OP
// =====================================================

for (const ordem of ordens) {

  ordem.quantidadeMateriais =
    ordem.materiaisUtilizados.length;
}

// =====================================================
// AGREGAÇÃO POR PRODUTO
// =====================================================

const produtosMap = {};

for (const ordem of ordens) {

  const chave =
    String(ordem.codigoProduto);

  if (!produtosMap[chave]) {

    produtosMap[chave] = {

      codigoProduto:
        ordem.codigoProduto,

      produto:
        ordem.produto,

      totalUnidades: 0,

      totalOrdens: 0,

      valorTotal: 0
    };
  }

  produtosMap[chave].totalUnidades +=
    ordem.quantidadeProduzida;

  produtosMap[chave].totalOrdens++;

  produtosMap[chave].valorTotal +=
    ordem.valorTotal;
}

const produtos =
  Object.values(produtosMap);

// =====================================================
// RANKING DE PRODUTOS
// =====================================================

const rankingProdutos =
  [...produtos].sort(
    (a, b) =>
      b.totalUnidades -
      a.totalUnidades
  );

const maisProduzido =
  rankingProdutos[0] || null;

const menosProduzido =
  rankingProdutos.length
    ? rankingProdutos[
        rankingProdutos.length - 1
      ]
    : null;

// =====================================================
// PRODUÇÃO POR DIA
// =====================================================

const diasMap = {};

for (const ordem of ordens) {

  const data =
    ordem.dataEntrada;

  if (!data) continue;

  if (!diasMap[data]) {

    diasMap[data] = {

      data,

      totalOrdens: 0,

      totalUnidades: 0,

      valorTotal: 0
    };
  }

  diasMap[data].totalOrdens++;

  diasMap[data].totalUnidades +=
    ordem.quantidadeProduzida;

  diasMap[data].valorTotal +=
    ordem.valorTotal;
}

const producaoPorDia =
  Object.values(diasMap)
    .sort(
      (a, b) =>
        a.data.localeCompare(b.data)
    );

// =====================================================
// TOTAIS CALCULADOS
// =====================================================

const totalUnidades =
  ordens.reduce(
    (total, ordem) =>
      total +
      ordem.quantidadeProduzida,
    0
  );

const valorTotal =
  ordens.reduce(
    (total, ordem) =>
      total +
      ordem.valorTotal,
    0
  );

// =====================================================
// LOCALIZA TOTAL GERAL INFORMADO PELO ERP
// =====================================================

let totalUnidadesERP = null;
let valorTotalERP = null;

for (const valores of linhas) {

  const texto =
    valores.join(' ');

  if (
    !texto
      .toUpperCase()
      .includes('TOTAL GERAL')
  ) {
    continue;
  }

  // Ex:
  // Total Geral: 10.000,0000 50.000,0000

  const numerosBR =
    texto.match(
      /[\d.]+,\d{2,4}/g
    );

  if (
    numerosBR &&
    numerosBR.length >= 2
  ) {

    totalUnidadesERP =
      numero(numerosBR[0]);

    valorTotalERP =
      numero(numerosBR[1]);

    break;
  }

  // Caso o n8n já transforme
  // as células em números
  const numeros =
    valores
      .map(v => numero(v))
      .filter(v => v > 0);

  if (numeros.length >= 2) {

    totalUnidadesERP =
      numeros[numeros.length - 2];

    valorTotalERP =
      numeros[numeros.length - 1];
  }
}

// =====================================================
// VALIDAÇÃO
// =====================================================

const erros = [];
const alertas = [];

if (!ehRelatorioProducao) {

  erros.push(
    'O arquivo enviado não foi identificado como Relatório de Entrada de Produção.'
  );
}

if (ordens.length === 0) {

  erros.push(
    'Nenhuma ordem de produção válida foi encontrada no arquivo.'
  );
}

if (!mesFormulario) {

  erros.push(
    `Mês informado no formulário é inválido: ${form.MES}`
  );
}

if (
  !/^\d{4}$/.test(
    anoFormularioTexto
  )
) {

  erros.push(
    `Ano informado no formulário é inválido: ${form.ANO}`
  );
}

// =====================================================
// VALIDA MÊS / ANO DAS ORDENS
// =====================================================

if (
  mesFormulario &&
  /^\d{4}$/.test(
    anoFormularioTexto
  )
) {

  const competenciasErradas =
    new Set();

  for (const ordem of ordens) {

    if (!ordem.dataEntrada) {
      continue;
    }

    const data =
      normalizarData(
        ordem.dataEntrada
      );

    if (!data) continue;

    if (
      data.mes !== mesFormulario ||
      data.ano !== anoFormulario
    ) {

      competenciasErradas.add(
        `${String(data.mes).padStart(2, '0')}/${data.ano}`
      );
    }
  }

  if (
    competenciasErradas.size > 0
  ) {

    erros.push(
      `A competência informada (${mesFormularioTexto}/${anoFormulario}) não corresponde às datas encontradas no relatório.`
    );
  }
}

// =====================================================
// CONFERE TOTAL DO ERP
// =====================================================

if (
  totalUnidadesERP !== null
) {

  const diferencaUnidades =
    Math.abs(
      totalUnidades -
      totalUnidadesERP
    );

  if (diferencaUnidades > 0.01) {

    alertas.push(
      `O total de unidades calculado pelo parser (${totalUnidades}) não corresponde ao total informado pelo ERP (${totalUnidadesERP}).`
    );
  }
}

if (
  valorTotalERP !== null
) {

  const diferencaValor =
    Math.abs(
      valorTotal -
      valorTotalERP
    );

  if (diferencaValor > 0.05) {

    alertas.push(
      `O valor total calculado pelo parser (${valorTotal.toFixed(2)}) não corresponde ao total informado pelo ERP (${valorTotalERP.toFixed(2)}).`
    );
  }
}

if (
  ehRelatorioProducao &&
  (
    totalUnidadesERP === null ||
    valorTotalERP === null
  )
) {

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
// SAÍDA PADRONIZADA
// =====================================================

return [{
  json: {

    parserOk,
    status,

    modulo:
      'PRODUCAO',

    competencia: {

      mes:
        mesFormularioTexto,

      numeroMes:
        mesFormulario,

      ano:
        anoFormulario,

      primeiraProducao:
        producaoPorDia.length
          ? producaoPorDia[0].data
          : null,

      ultimaProducao:
        producaoPorDia.length
          ? producaoPorDia[
              producaoPorDia.length - 1
            ].data
          : null
    },

    validacao: {

      totalLinhasLidas:
        linhas.length,

      totalOrdensEncontradas:
        ordens.length,

      totalUnidadesERP,

      totalUnidadesCalculado:
        totalUnidades,

      valorTotalERP,

      valorTotalCalculado:
        valorTotal,

      diferencaUnidades:
        totalUnidadesERP !== null
          ? Math.abs(
              totalUnidades -
              totalUnidadesERP
            )
          : null,

      diferencaValor:
        valorTotalERP !== null
          ? Math.abs(
              valorTotal -
              valorTotalERP
            )
          : null,

      alertas,
      erros
    },

    resumo: {

      totalOrdens:
        ordens.length,

      totalProdutos:
        produtos.length,

      totalDiasProducao:
        producaoPorDia.length,

      totalUnidades,

      valorTotal,

      mediaPorOrdem:
        ordens.length
          ? totalUnidades /
            ordens.length
          : 0,

      maisProduzido,

      menosProduzido
    },

    ordens,

    produtos,

    producaoPorDia,

    rankingProdutos
  }
}];