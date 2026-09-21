# Architecture

## Processing flow

```text
Form
  │
  ▼
XLS Extraction
  │
  ▼
Report Type Router
  ├──────────────┬──────────────┐
  ▼              ▼              ▼
Production     Purchases       Sales
Parser         Parser          Parser
  └──────────────┴──────────────┘
                 │
                 ▼
          Validation Router
        OK / ALERT / ERROR
                 │
        ┌────────┴─────────┐
        ▼                  ▼
    Error Log          Output Router
                     RAW / EXEC / BOTH
                           │
                 ┌─────────┴──────────┐
                 ▼                    ▼
           RAW Generator      Executive Generator
                 │                    │
          ┌──────┴──────┐             │
          ▼             ▼             ▼
        XLSX           HTML          HTML
                        │             │
                        └──────┬──────┘
                               ▼
                         Gotenberg
                          (Docker)
                               │
                               ▼
                         PDF / ZIP
```

## Separation of responsibilities

### Parsing
Each ERP report type has an independent JavaScript parser.

### Validation
Parsers return a standardized status so orchestration does not depend on report-specific implementation details.

### Routing
n8n Switch nodes route by module, parser status, and requested output.

### Presentation
RAW and Executive generators transform structured JSON into HTML, tables, KPIs, and SVG/CSS visualizations.

### File generation
Gotenberg converts HTML to PDF. RAW reports can also be converted to XLSX.

### Delivery
PDF and XLSX branches can be merged and compressed into a single ZIP.

## Error handling

The workflow recognizes three states:

- `OK` — normal processing.
- `ALERTA` — processing continues with a visible warning.
- `ERRO` — generation stops and a text log is produced.

Examples of validation include:

- incompatible report/module selection
- invalid or inconsistent reporting period
- no valid records found
- difference between parser totals and ERP totals

## Why independent parsers?

Production, Sales, and Purchases have different source layouts and business rules.

Keeping them independent provides:

- lower coupling
- easier debugging
- safer changes
- clearer ownership of transformations
- simpler addition of future modules

## Gotenberg

PDF generation is delegated to a containerized Gotenberg service.

The public workflow uses the Docker service hostname:

```text
http://gotenberg:3000/forms/chromium/convert/html
```

No internal IP address is included in the public version.

## Public repository security

The published workflow removes or replaces:

- organization identity and private branding
- business contact information
- internal network addresses
- n8n instance identifiers
- webhook identifiers
- real product, supplier, and customer examples
- real operational values
- credentials and tokens

The repository is intended to expose the architecture and reusable automation logic without exposing internal company data.
