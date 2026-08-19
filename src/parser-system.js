// n8n Code node — Run Once for All Items
// Public/sanitized version. Adapt column positions to your ERP export.

const rows = $input.all().map(item => item.json);
const output = [];
let currentProduct = null;

const text = (v) => String(v ?? '').trim();
const number = (v) => {
  if (typeof v === 'number') return v;
  const raw = text(v).replace(/\./g, '').replace(',', '.');
  return Number(raw) || 0;
};

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const colA = text(row.A ?? row[0]);
  const colB = text(row.B ?? row[1]);

  // Product header example: code in column A and "- PRODUCT NAME" in B.
  if (colA && colB.startsWith('-') && !colB.toUpperCase().includes('PRODUÇÃO')) {
    currentProduct = {
      codigoProduto: colA,
      produto: colB.replace(/^[-\s]+/, '').trim(),
    };
    continue;
  }

  // Production row example.
  if (colB.toUpperCase().includes('PRODUÇÃO') && currentProduct) {
    const ordem = {
      numeroSequencial: output.length + 1,
      tipoRegistro: 'ORDEM_PRODUCAO',
      linhaOrigem: i + 1,
      codigoProduto: currentProduct.codigoProduto,
      produto: currentProduct.produto,
      documento: text(row.C ?? row[2]),
      dataEntrada: text(row.D ?? row[3]),
      quantidadeProduzida: number(row.E ?? row[4]),
      unidade: text(row.F ?? row[5]) || 'UN',
      valorUnitario: number(row.G ?? row[6]),
      valorTotal: number(row.H ?? row[7]),
      materiaisUtilizados: [],
      quantidadeMateriais: 0,
    };

    // Consume following material rows until another product/production block begins.
    for (let j = i + 1; j < rows.length; j++) {
      const material = rows[j];
      const mA = text(material.A ?? material[0]);
      const mB = text(material.B ?? material[1]);

      if (!mA && !mB) continue;
      if (mB.toUpperCase().includes('PRODUÇÃO')) break;
      if (mA && mB.startsWith('-')) break;

      if (mA && mB) {
        ordem.materiaisUtilizados.push({
          codigo: mA,
          material: mB,
          quantidadeConsumida: number(material.C ?? material[2]),
          unidade: text(material.D ?? material[3]),
          valorUnitario: number(material.E ?? material[4]),
          valorTotal: number(material.F ?? material[5]),
        });
      }
    }

    ordem.quantidadeMateriais = ordem.materiaisUtilizados.length;
    output.push({ json: ordem });
  }
}

if (!output.length) {
  throw new Error('Nenhuma ordem de produção foi identificada no arquivo.');
}

return output;
