# ERP Report Automation Hub with n8n

A real-world workflow automation project for transforming ERP exports into validated, structured reports.

This project started as a production-report automation and evolved into a modular **Report Automation Hub** with three independent modules:

- **Production**
- **Sales**
- **Purchases**

The workflow was built with **n8n**, **JavaScript**, **HTML/CSS/SVG**, **Docker**, **Gotenberg**, **XLS/XLSX**, and **JSON**.

> **Privacy:** this public version is sanitized. Company names, addresses, contact information, internal IP addresses, instance identifiers, credentials, real products, customers, suppliers, and operational values are not included.

## Problem

ERP exports are useful, but they are not always ready for analysis or presentation. The original process required manually reviewing XLS files, organizing repeated records, checking totals, and creating readable reports.

The goal was to reduce the user flow to:

```text
Upload → Validate → Process → Generate → Download
```

## Architecture

```text
Form
  ↓
XLS Extraction
  ↓
Report Type Switch
  ├── Production Parser
  ├── Sales Parser
  └── Purchases Parser
         ↓
    Validation Layer
      ├── OK
      ├── ALERT
      └── ERROR → Error Log
         ↓
     Output Switch
      ├── RAW
      ├── EXECUTIVE
      └── BOTH
         ↓
   PDF / XLSX / ZIP
```

Each report type has its own JavaScript parser. This avoids a monolithic parser and keeps report-specific rules isolated.

## Validation model

The parsers follow the same general contract:

```json
{
  "parserOk": true,
  "status": "OK",
  "module": "PRODUCTION",
  "validation": {
    "alerts": [],
    "errors": []
  }
}
```

- **OK** — continue normally.
- **ALERT** — continue, but expose the detected inconsistency.
- **ERROR** — stop normal generation and create an error log.

Checks include report compatibility, selected period, missing valid records, and differences between calculated values and ERP totals.

## RAW and Executive outputs

The **RAW** report preserves operational detail while reorganizing repetitive ERP records into a more readable structure.

The **Executive** report focuses on KPIs, rankings, summaries, and charts. Depending on the module, it can include production totals, sales indicators, customer counts, average ticket, supplier concentration, and other metrics.

Charts are generated directly with HTML/CSS/SVG, avoiding an external chart library during PDF generation.

## PDF generation

HTML is converted to PDF using **Gotenberg** running in Docker:

```text
JavaScript
    ↓
   HTML
    ↓
Gotenberg
    ↓
   PDF
```

The public workflow uses:

```text
http://gotenberg:3000/forms/chromium/convert/html
```

Example:

```bash
docker run -d \
  --name gotenberg \
  --restart unless-stopped \
  -p 3000:3000 \
  gotenberg/gotenberg:8
```

## PDF + XLSX

The RAW path can generate both PDF and XLSX and deliver them together:

```text
Report_RAW_Production_September_2026.zip
├── Report_RAW_Production_September_2026.pdf
└── Report_RAW_Production_September_2026.xlsx
```

The files are generated independently, merged, and compressed into one ZIP. This keeps the form simpler for the end user.

## Repository structure

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

## Importing the workflow

The file in `workflow/report-automation-hub-public.json` is a sanitized n8n export.

After importing it, review your environment before running it:

1. Configure the Gotenberg endpoint for your Docker/network environment.
2. Confirm the XLS layout exported by your ERP.
3. Adapt parser rules to your own report format.
4. Keep credentials and infrastructure-specific values outside public workflow exports.

This repository is an automation and architecture case study, not a universal ERP parser.

## Project evolution

The first version of this solution was built with **Google Apps Script**. It worked for the initial use case, but the project later needed more routing, multiple report types, validation, error handling, PDF generation, and different output formats.

Moving to n8n made the orchestration visual and modular while still allowing JavaScript where code was the better fit.

## Cloud and DevOps connection

**AWS was not used directly in this implementation.**

However, the project applies concepts that transfer well to Cloud and DevOps environments:

- workflow orchestration
- event-driven processing
- modular processing stages
- input/output contracts
- validation gates
- structured error handling
- containerized dependencies
- separation between data processing and presentation
- future observability and monitoring

## License

MIT License — see [LICENSE](LICENSE).
