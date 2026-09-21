# Central de Automação de Relatórios ERP com n8n

Projeto real de automação criado para transformar relatórios exportados de um ERP em arquivos estruturados, validados e prontos para análise.

A solução começou como uma automação focada em relatórios de produção e evoluiu para uma **Central de Relatórios modular**, atualmente com três módulos independentes:

- **Produção**
- **Vendas**
- **Compras**

O fluxo foi desenvolvido com **n8n**, **JavaScript**, **HTML/CSS/SVG**, **Docker**, **Gotenberg**, **XLS/XLSX** e **JSON**.

> **Privacidade:** esta versão pública foi sanitizada. Nomes de empresa, endereços, contatos, IPs internos, identificadores de instância, credenciais, produtos, clientes, fornecedores e valores operacionais reais não estão incluídos.

## Problema

Os relatórios exportados pelo ERP continham informações importantes, mas exigiam trabalho manual para organizar os dados, validar totais, identificar inconsistências e gerar arquivos mais fáceis de utilizar.

O objetivo foi reduzir a experiência do usuário para algo próximo de:

```text
Upload → Validação → Processamento → Geração → Download
```

## Visão do workflow

<img width="1592" height="627" alt="Workflow N8N" src="https://github.com/user-attachments/assets/19019b8f-6ae4-4c00-9f23-94f4c0445096" />


## Arquitetura

```text
Formulário
  ↓
Extração do XLS
  ↓
Switch de Tipo de Relatório
  ├── Parser de Produção
  ├── Parser de Vendas
  └── Parser de Compras
         ↓
    Camada de Validação
      ├── OK
      ├── ALERTA
      └── ERRO → Log de Erro
         ↓
     Switch de Saída
      ├── BRUTO
      ├── EXECUTIVO
      └── AMBOS
         ↓
   PDF / XLSX / ZIP
```

Cada módulo possui seu próprio parser em JavaScript. Essa separação evita concentrar toda a lógica em um único parser e facilita manutenção, testes e inclusão de novos módulos no futuro.

## Modelo de validação

Os parsers seguem um padrão comum de resposta:

```json
{
  "parserOk": true,
  "status": "OK",
  "modulo": "PRODUCAO",
  "validacao": {
    "alertas": [],
    "erros": []
  }
}
```

Existem três estados principais:

- **OK** — processamento normal.
- **ALERTA** — o relatório continua sendo gerado, mas uma inconsistência é informada.
- **ERRO** — o processamento normal é interrompido e um arquivo de log é criado.

As validações podem verificar compatibilidade do relatório, competência selecionada, ausência de registros válidos e diferenças entre os totais calculados pelo parser e os totais informados pelo ERP.

## Relatórios Bruto e Executivo

O relatório **Bruto** preserva o detalhamento operacional, mas reorganiza registros repetidos em uma estrutura mais legível.

O relatório **Executivo** é voltado para indicadores, rankings, resumos e gráficos. Dependendo do módulo, pode apresentar informações como:

- total produzido;
- ordens de produção;
- dias ativos;
- produtos mais e menos produzidos;
- faturamento;
- unidades vendidas;
- quantidade de clientes;
- ticket médio;
- total de compras;
- fornecedores;
- concentração por fornecedor;
- rankings e KPIs.

Os gráficos são gerados diretamente com **HTML/CSS/SVG**, evitando dependências externas durante a geração do PDF.

## Geração de PDF

O HTML gerado pela automação é enviado para o **Gotenberg**, executado em Docker:

```text
JavaScript
    ↓
   HTML
    ↓
Gotenberg
    ↓
   PDF
```

Na versão pública, o endpoint utilizado como referência é:

```text
http://gotenberg:3000/forms/chromium/convert/html
```

Exemplo de execução local:

```bash
docker run -d \
  --name gotenberg \
  --restart unless-stopped \
  -p 3000:3000 \
  gotenberg/gotenberg:8
```

## PDF + XLSX

No fluxo do relatório Bruto, a automação pode gerar simultaneamente:

- **PDF**, para visualização;
- **XLSX**, para análise e manipulação dos dados.

Os dois arquivos são reunidos e compactados em um único ZIP:

```text
Relatorio_BRUTO_Producao_Setembro_2026.zip
├── Relatorio_BRUTO_Producao_Setembro_2026.pdf
└── Relatorio_BRUTO_Producao_Setembro_2026.xlsx
```

Isso evita adicionar opções desnecessárias ao formulário e mantém a experiência do usuário simples.

## Estrutura do repositório

```text
.
├── workflow/
│   └── report-automation-hub-public.json
├── src/
│   ├── parser-production.js
│   ├── parser-sales.js
│   ├── parser-purchases.js
│   ├── generate-raw-report.js
│   ├── generate-executive-report.js
│   └── error-log.js
├── docs/
│   └── ARCHITECTURE.md
├── LICENSE
└── README.md
```

## Importando o workflow

O arquivo `workflow/report-automation-hub-public.json` contém uma versão sanitizada do workflow do n8n.

Depois de importar, é necessário adaptar o ambiente:

1. configurar o endpoint do Gotenberg;
2. confirmar o formato do XLS exportado pelo ERP;
3. adaptar as regras dos parsers ao formato dos relatórios utilizados;
4. manter credenciais, IPs e informações internas fora de versões públicas.

Este repositório representa um **case de arquitetura e automação**, não um parser universal para qualquer ERP.

## Evolução do projeto

A primeira versão dessa solução foi desenvolvida com **Google Apps Script**.

Ela atendia ao objetivo inicial, mas o projeto passou a exigir múltiplos tipos de relatório, diferentes rotas de processamento, validações, tratamento de erros, geração de PDF e múltiplos formatos de saída.

A migração para o n8n permitiu organizar a orquestração de forma visual e modular, mantendo JavaScript nos pontos em que código oferecia maior controle.

## Relação com Cloud e DevOps

**AWS não foi utilizada diretamente nesta implementação.**

Mesmo assim, a arquitetura utiliza conceitos que podem ser transferidos para ambientes de Cloud e DevOps, como:

- orquestração de workflows;
- processamento orientado a eventos;
- etapas modulares;
- contratos de entrada e saída;
- validação antes do processamento;
- tratamento estruturado de erros;
- serviços containerizados;
- separação entre processamento e apresentação;
- possibilidades futuras de observabilidade e monitoramento.

## Tecnologias

- n8n
- JavaScript
- HTML5 / CSS3 / SVG
- Docker
- Gotenberg
- XLS / XLSX
- JSON
- Workflow Orchestration
- Data Validation
- Error Handling

## Licença

MIT License — consulte [LICENSE](LICENSE).
