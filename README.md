# N8N Automation — Production Report

Automação de relatórios de produção desenvolvida com **n8n**, **JavaScript**, **HTML/CSS**, **Docker** e **Gotenberg**.

O objetivo do projeto é transformar relatórios brutos exportados por um ERP em relatórios estruturados, validados e prontos para análise em PDF.

> **Privacidade:** esta versão pública utiliza dados sintéticos e identificadores anonimizados. Informações de empresa, endereços de rede, produtos, documentos, volumes, credenciais e demais dados internos foram removidos ou substituídos.

## Arquitetura

![Arquitetura do workflow](docs/architecture-public.webp)

### Fluxo

```text
Formulário
   ↓
Extração do XLS
   ↓
Parser JavaScript
   ↓
Validação
   ├── ERRO → LOG TXT → interrupção
   └── OK/ALERTA
          ↓
     Tipo de relatório
       ├── BRUTO → HTML → index.html → Gotenberg → PDF
       └── EXECUTIVO → consolidação → HTML/gráficos → index.html → Gotenberg → PDF
```

## Principais recursos

- Upload de relatório `.xls` pelo formulário do n8n
- Parsing de registros de produção e materiais
- Validação de competência, quantidade e valor
- Detecção de documentos ausentes na sequência
- Geração de log de erro em UTF-8
- Relatório técnico/bruto com ordens detalhadas
- Relatório executivo com indicadores, ranking e gráficos
- Conversão HTML → PDF através do Gotenberg em Docker
- Roteamento por regras para `BRUTO`, `EXECUTIVO` ou `AMBOS`

## Estrutura do repositório

```text
.
├── src/
│   ├── parser-system.js
│   ├── validate-report.js
│   └── prepare-executive-data.js
├── templates/
│   ├── raw-report.html
│   └── executive-report.html
├── workflow/
│   └── production-report-public.json
├── docs/
│   ├── ARCHITECTURE.md
│   └── architecture-public.webp
├── .gitignore
├── LICENSE
└── README.md
```

## Tecnologias

- n8n
- JavaScript
- HTML5 / CSS3
- Docker
- Gotenberg
- XLS / JSON

## Gotenberg

Exemplo local para laboratório:

```bash
docker run -d \
  --name gotenberg \
  --restart unless-stopped \
  -p 3000:3000 \
  -e API_TIMEOUT=120s \
  -e CHROMIUM_START_TIMEOUT=60s \
  -e CHROMIUM_AUTO_START=true \
  gotenberg/gotenberg:8
```

No workflow público, use uma variável de ambiente ou endpoint local configurável, por exemplo:

```text
http://gotenberg:3000/forms/chromium/convert/html
```

Nunca publique IPs internos, tokens ou credenciais dentro do JSON do workflow.

## Pipeline em JavaScript

Os códigos da pasta `src/` representam a lógica central utilizada nos nodes Code do n8n:

1. `parser-system.js` — transforma linhas do XLS em ordens estruturadas.
2. `validate-report.js` — valida competência, totais e sequência documental.
3. `prepare-executive-data.js` — consolida produtos, KPIs, ranking e dados de gráficos.

## Licença

MIT License — consulte [LICENSE](LICENSE).
