const item = $input.first();
const dados = item.json;

// Dados originais escolhidos no formulário
const form = $('Envio de Relatório ERP').first().json;

// Nome do arquivo enviado
const formNode = $('Envio de Relatório ERP').first();

const nomeArquivo =
  formNode.binary?.RELATORIO_ERP?.fileName ||
  'Arquivo não identificado';

// -----------------------------------------------------
// INFORMAÇÕES DO PARSER
// -----------------------------------------------------

const modulo =
  dados.modulo ||
  form.TIPO_MODULO ||
  'NÃO IDENTIFICADO';

const status =
  dados.status ||
  'ERRO';

const erros =
  dados.validacao?.erros ||
  dados.erros ||
  [];

const alertas =
  dados.validacao?.alertas ||
  dados.alertas ||
  [];

const totalLinhas =
  dados.validacao?.totalLinhasLidas ??
  'Não informado';

const registrosEncontrados =
  dados.validacao?.totalLancamentosEncontrados ??
  dados.validacao?.totalRegistrosEncontrados ??
  0;

// -----------------------------------------------------
// DATA/HORA
// -----------------------------------------------------

const agora = new Date();

const dataHora = agora.toLocaleString('pt-BR', {
  timeZone: 'America/Sao_Paulo'
});

// -----------------------------------------------------
// MONTA LOG
// -----------------------------------------------------

let log = '';

log += 'PUBLIC DEMO\n';
log += 'CENTRAL DE RELATÓRIOS - LOG DE ERRO\n';
log += '============================================================\n\n';

log += `Data/Hora: ${dataHora}\n`;
log += `Módulo selecionado: ${modulo}\n`;
log += `Mês informado: ${form.MES || 'Não informado'}\n`;
log += `Ano informado: ${form.ANO || 'Não informado'}\n`;
log += `Arquivo enviado: ${nomeArquivo}\n`;
log += `Status: ${status}\n\n`;

log += '------------------------------------------------------------\n';
log += 'VALIDAÇÃO DO PARSER\n';
log += '------------------------------------------------------------\n';

log += `Linhas analisadas: ${totalLinhas}\n`;
log += `Registros encontrados: ${registrosEncontrados}\n\n`;

if (erros.length > 0) {

  log += 'ERROS ENCONTRADOS:\n';

  erros.forEach((erro, index) => {
    log += `${index + 1}. ${erro}\n`;
  });

} else {

  log += 'ERRO:\n';
  log += 'O processamento foi interrompido, porém o parser não retornou uma descrição detalhada.\n';
}

if (alertas.length > 0) {

  log += '\n------------------------------------------------------------\n';
  log += 'ALERTAS ADICIONAIS\n';
  log += '------------------------------------------------------------\n';

  alertas.forEach((alerta, index) => {
    log += `${index + 1}. ${alerta}\n`;
  });
}

log += '\n============================================================\n';
log += 'O relatório não foi gerado.\n';
log += 'Verifique o arquivo enviado e tente novamente.\n';
log += '============================================================\n';

return [{
  json: {
    status: 'ERRO',
    modulo,
    nomeArquivo,
    log
  }
}];