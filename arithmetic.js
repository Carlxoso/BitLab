/* ============================================================
   BitLab · arithmetic.js
   Suma, resta y multiplicación de binarios, con el detalle
   columna por columna (acarreo / préstamo) tal como se resuelve
   a mano. Expone helpers que también usa complement.js.
   ============================================================ */

const MAX_BITS_ADDSUB = 24;
const MAX_BITS_MUL = 12;

function isBinaryString(str) {
  return /^[01]+$/.test(str.trim());
}

function requireBinary(str, label) {
  const clean = str.trim();
  if (!isBinaryString(clean)) {
    throw new Error(`${label} debe contener solo 0 y 1 (recibí "${str}").`);
  }
  return clean;
}

function padLeft(str, len, ch = "0") {
  return str.length >= len ? str : ch.repeat(len - str.length) + str;
}

function padToSameLength(a, b) {
  const len = Math.max(a.length, b.length);
  return { a: padLeft(a, len), b: padLeft(b, len), len };
}

function invertBits(str) {
  return str.split("").map(c => (c === "0" ? "1" : "0")).join("");
}

/* ---------- Render: grilla vertical tipo "cuenta a mano" ----------
   rows: [{ label, cells: string[] (uno por columna, ya alineado a la
   derecha, puede haber celdas vacías ""), cellClass?: string[] }]
   Todas las filas deben tener el mismo largo de cells (= width). */
function renderOpGrid(rows, width, opts = {}) {
  const colWidth = 32;
  let html = `<div class="op-grid" style="grid-template-columns: ${opts.labelWidth || 92}px repeat(${width}, ${colWidth}px);">`;
  rows.forEach(row => {
    html += `<div class="op-row">`;
    html += `<div class="op-label${row.line ? " op-line-cell" : ""}">${row.label || ""}</div>`;
    for (let i = 0; i < width; i++) {
      const val = row.cells[i] ?? "";
      const cls = row.cellClass && row.cellClass[i] ? row.cellClass[i] : "";
      html += `<div class="op-cell ${row.small ? "op-cell-small" : ""} ${row.line ? "op-line-cell" : ""} ${cls}">${val}</div>`;
    }
    html += `</div>`;
  });
  html += `</div>`;
  return html;
}

/* ================= SUMA ================= */
function addBinaryWithSteps(aRaw, bRaw) {
  const a0 = requireBinary(aRaw, "El primer número");
  const b0 = requireBinary(bRaw, "El segundo número");
  if (a0.length > MAX_BITS_ADDSUB || b0.length > MAX_BITS_ADDSUB) {
    throw new Error(`Para mantener la tabla legible, usá números de hasta ${MAX_BITS_ADDSUB} bits.`);
  }
  const { a, b, len } = padToSameLength(a0, b0);

  const carries = new Array(len + 1).fill(0);
  const sumBits = new Array(len).fill("0");
  const steps = [];

  for (let i = len - 1; i >= 0; i--) {
    const bitA = Number(a[i]);
    const bitB = Number(b[i]);
    const carryIn = carries[i + 1];
    const total = bitA + bitB + carryIn;
    const sumBit = total % 2;
    const carryOut = total >= 2 ? 1 : 0;
    sumBits[i] = String(sumBit);
    carries[i] = carryOut;
    const pos = len - i;
    steps.push(`Columna ${pos} (desde la derecha): ${bitA} + ${bitB} + acarreo ${carryIn} = ${total} → escribo <b>${sumBit}</b>, acarreo ${carryOut ? "1" : "0"}${carryOut ? " hacia la izquierda" : ""}.`);
  }

  const finalCarry = carries[0];
  const result = (finalCarry ? "1" : "") + sumBits.join("");
  const width = len + (finalCarry ? 1 : 0);
  const offset = finalCarry ? 1 : 0;

  // Fila de acarreo: sobre la columna j se muestra el acarreo que ENTRÓ
  // a esa columna (generado por la columna inmediatamente a su derecha).
  const carryRow = new Array(width).fill("");
  for (let j = 0; j < len; j++) {
    const carryIn = carries[j + 1];
    if (carryIn) carryRow[j + offset] = "1";
  }

  const rows = [
    { label: "acarreo", cells: carryRow, small: true, cellClass: carryRow.map(v => v ? "carry-cell" : "") },
    { label: "", cells: padLeft(a, width).split("") },
    { label: "+", cells: padLeft(b, width).split("") },
    { label: "", cells: [], line: true },
    { label: "=", cells: padLeft(result, width).split("") },
  ];

  const html = `
    <div class="arith-block">
      ${renderOpGrid(rows, width)}
      <ol class="arith-steps">${steps.map(s => `<li>${s}</li>`).join("")}</ol>
      ${finalCarry ? `<p class="hint">Sobró un acarreo final, por eso el resultado tiene un bit más que los operandos.</p>` : ""}
    </div>`;

  return { value: result, html };
}

/* ================= RESTA (préstamo) ================= */
function subtractBinaryWithSteps(aRaw, bRaw) {
  const a0 = requireBinary(aRaw, "El primer número");
  const b0 = requireBinary(bRaw, "El segundo número");
  if (a0.length > MAX_BITS_ADDSUB || b0.length > MAX_BITS_ADDSUB) {
    throw new Error(`Para mantener la tabla legible, usá números de hasta ${MAX_BITS_ADDSUB} bits.`);
  }

  const decA = parseInt(a0, 2);
  const decB = parseInt(b0, 2);
  const negative = decA < decB;
  const bigRaw = negative ? b0 : a0;
  const smallRaw = negative ? a0 : b0;
  const { a: big, b: small, len } = padToSameLength(bigRaw, smallRaw);

  if (decA === decB) {
    const width = len;
    const html = `<div class="arith-block">
        ${renderOpGrid([
          { label: "", cells: big.split("") },
          { label: "-", cells: small.split("") },
          { label: "", cells: [], line: true },
          { label: "=", cells: padLeft("0", width).split("") },
        ], width)}
        <p class="hint">Ambos números valen lo mismo, así que el resultado es 0.</p>
      </div>`;
    return { value: "0", html };
  }

  const borrows = new Array(len + 1).fill(0);
  const diffBits = new Array(len).fill("0");
  const steps = [];

  for (let i = len - 1; i >= 0; i--) {
    let bitA = Number(big[i]);
    const bitB = Number(small[i]);
    const borrowIn = borrows[i + 1];
    let minuend = bitA - borrowIn;
    const pos = len - i;
    let borrowOut = 0;
    let diff;
    if (minuend < bitB) {
      diff = (minuend + 2) - bitB;
      borrowOut = 1;
      steps.push(`Columna ${pos}: ${bitA}${borrowIn ? ` - préstamo 1 = ${minuend}` : ""} es menor que ${bitB}, así que le pido prestado a la columna de la izquierda → ${minuend + 2} - ${bitB} = <b>${diff}</b>, y dejo un préstamo hacia la izquierda.`);
    } else {
      diff = minuend - bitB;
      steps.push(`Columna ${pos}: ${bitA}${borrowIn ? ` - préstamo 1 = ${minuend}` : ""} - ${bitB} = <b>${diff}</b>, sin necesidad de pedir prestado.`);
    }
    diffBits[i] = String(diff);
    borrows[i] = borrowOut;
  }

  // Se mantiene el mismo ancho de bits que los operandos (no se recorta el
  // cero a la izquierda), tal como corresponde en un ejercicio de N bits fijos.
  const result = diffBits.join("");
  const width = len;
  const borrowRow = new Array(width).fill("");
  for (let i = 0; i < len; i++) if (borrows[i]) borrowRow[i] = "1";

  const rows = [
    { label: "préstamo", cells: borrowRow, small: true, cellClass: borrowRow.map(v => v ? "borrow-cell" : "") },
    { label: "", cells: big.split("") },
    { label: "-", cells: small.split("") },
    { label: "", cells: [], line: true },
    { label: "=", cells: padLeft(diffBits.join(""), width).split("") },
  ];

  const finalValue = (negative ? "-" : "") + result;
  const html = `
    <div class="arith-block">
      ${negative ? `<p class="hint">El primer número es menor que el segundo, así que se resta al revés (mayor − menor) y el resultado queda negativo.</p>` : ""}
      ${renderOpGrid(rows, width)}
      <ol class="arith-steps">${steps.map(s => `<li>${s}</li>`).join("")}</ol>
    </div>`;

  return { value: finalValue, html };
}

/* ================= MULTIPLICACIÓN ================= */
function multiplyBinaryWithSteps(aRaw, bRaw) {
  const a = requireBinary(aRaw, "El primer número");
  const b = requireBinary(bRaw, "El segundo número");
  if (a.length > MAX_BITS_MUL || b.length > MAX_BITS_MUL) {
    throw new Error(`Para mantener la tabla legible, usá números de hasta ${MAX_BITS_MUL} bits en la multiplicación.`);
  }

  const finalWidth = a.length + b.length;
  const partials = [];
  const steps = [];

  for (let shift = 0; shift < b.length; shift++) {
    const bit = b[b.length - 1 - shift];
    const posFromRight = shift + 1;
    if (bit === "1") {
      const partial = padLeft(a + "0".repeat(shift), finalWidth);
      partials.push(partial);
      steps.push(`Bit ${posFromRight} de B (desde la derecha) es 1 → se copia A desplazado ${shift} lugar${shift === 1 ? "" : "es"} a la izquierda.`);
    } else {
      steps.push(`Bit ${posFromRight} de B (desde la derecha) es 0 → el producto parcial es todo ceros, no aporta a la suma.`);
    }
  }

  // Sumar todos los productos parciales acumulando de a uno
  let total = padLeft("0", finalWidth);
  const partialRows = partials.map(p => ({ label: "", cells: p.split("") }));

  if (partials.length === 0) {
    total = padLeft("0", finalWidth);
  } else {
    total = partials[0];
    for (let i = 1; i < partials.length; i++) {
      const added = addBinaryWithSteps(total, partials[i]);
      total = padLeft(added.value, finalWidth);
    }
  }

  const rows = [
    { label: "", cells: padLeft(a, finalWidth).split("") },
    { label: "×", cells: padLeft(b, finalWidth).split("") },
    { label: "", cells: [], line: true },
    ...partialRows,
    ...(partials.length > 1 ? [{ label: "", cells: [], line: true }] : []),
    { label: "=", cells: padLeft(total, finalWidth).split("") },
  ];

  const result = total.replace(/^0+(?=\d)/, "") || "0";
  const html = `
    <div class="arith-block">
      ${renderOpGrid(rows, finalWidth)}
      <ol class="arith-steps">${steps.map(s => `<li>${s}</li>`).join("")}</ol>
      ${partials.length > 1 ? `<p class="hint">Los productos parciales se suman todos entre sí (con su acarreo correspondiente) para llegar al resultado final.</p>` : ""}
    </div>`;

  return { value: result, html };
}

const ARITHMETIC_MODES = {
  suma: { label: "Suma", op: "+", run: (a, b) => addBinaryWithSteps(a, b) },
  resta: { label: "Resta", op: "-", run: (a, b) => subtractBinaryWithSteps(a, b) },
  mult: { label: "Multiplicación", op: "×", run: (a, b) => multiplyBinaryWithSteps(a, b) },
};
