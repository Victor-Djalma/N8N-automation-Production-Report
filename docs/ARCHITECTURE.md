# Architecture

This project uses an n8n workflow to transform an ERP production export into validated PDF reports.

## Processing stages

1. **Form submission** — receives month, year, report type and `.xls` file.
2. **Extract from File** — converts the XLS rows into n8n items.
3. **Parser System** — groups product headers, production orders and consumed materials.
4. **Validate Report** — checks period, totals and document sequence.
5. **Validation Router** — routes `OK`, `ALERTA` and `ERRO` states.
6. **Report Router** — selects `BRUTO`, `EXECUTIVO` or `AMBOS`.
7. **Raw report path** — HTML template → `index.html` → Gotenberg → PDF.
8. **Executive path** — aggregation/KPIs → HTML template → `index.html` → Gotenberg → PDF.
9. **Error path** — builds a UTF-8 TXT diagnostic log and stops processing.

## Public architecture screenshot

![n8n architecture](architecture-public.webp)

The internal HTTP endpoint displayed by the Gotenberg nodes was redacted before publication. The public code also excludes company identifiers, real production data, private IPs, credentials and internal file names.

## Security notes

- Keep n8n credentials in the credentials store, not directly in workflow JSON.
- Prefer environment variables for service endpoints.
- Never commit `.env`, real XLS/PDF exports or operational logs.
- Use synthetic datasets in demonstrations and portfolio screenshots.
