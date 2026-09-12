/* ============================================================
   BitLab · converters.js
   Lógica pura de conversión entre bases numéricas.
   Cada función devuelve { value, html } donde html ya trae
   el proceso detallado listo para insertar en el DOM.
   Agregar una base nueva = agregar una entrada acá + un chip
   en index.html, sin tocar el resto del código.
   ============================================================ */

const DIGITS = "0123456789ABCDEF";

function digitValue(ch) {
  return DIGITS.indexOf(ch.toUpperCase());
}

function isValidInBase(str, base) {
  if (!str.length) return false;
  for (const ch of str.toUpperCase()) {
    const v = digitValue(ch);
    if (v === -1 || v >= base) return false;
  }
  return true;
}

function baseName(base) {
  return { 2: "binario", 8: "octal", 10: "decimal", 16: "hexadecimal" }[base] || `base ${base}`;
}

/* ---------- 1. Expansión posicional: (binario|hex|octal) -> decimal ---------- */
function toDecimalWithSteps(str, base) {
  const clean = str.trim().toUpperCase();
  if (!isValidInBase(clean, base)) {
    throw new Error(`"${str}" no es un número válido en ${baseName(base)}.`);
  }
  const digits = clean.split("");
  const n = digits.length;
  let total = 0;
  const cols = digits.map((d, i) => {
    const power = n - 1 - i;
    const val = digitValue(d);
    const prod = val * Math.pow(base, power);
    total += prod;
    return { digit: d, power, val, prod };
  });

  let html = `<div class="expansion">`;
  html += `<div class="expansion-row">`;
  cols.forEach(c => {
    html += `
      <div class="digit-col">
        <span class="digit">${c.digit}</span>
        <span class="power">${base}<sup>${c.power}</sup></span>
        <span class="prod">${c.val}×${Math.pow(base, c.power)} = ${c.prod}</span>
      </div>`;
  });
  html += `</div>`;
  html += `<div class="expansion-sum">${cols.map(c => c.prod).join(" + ")} = <b>${total}</b> en decimal</div>`;
  html += `</div>`;

  return { value: total, html };
}

/* ---------- 2. Divisiones sucesivas en escalerita: decimal -> (binario|hex|octal) ---------- */
function fromDecimalWithSteps(decimalInput, base) {
  const n = Number(decimalInput);
  if (!Number.isInteger(n) || n < 0 || String(decimalInput).trim() === "") {
    throw new Error(`"${decimalInput}" debe ser un número entero decimal no negativo.`);
  }

  if (n === 0) {
    const html = `<div class="staircase">
        <div class="stair-step"><span class="dividend">0</span>
        <span class="eq">→ el número ya es 0, el resultado es</span> <span class="remainder">0</span></div>
      </div>`;
    return { value: "0", html };
  }

  const steps = [];
  let current = n;
  while (current > 0) {
    const quotient = Math.floor(current / base);
    const remainder = current % base;
    steps.push({ dividend: current, quotient, remainder });
    current = quotient;
  }

  // El resultado se lee de abajo hacia arriba (último resto -> primer resto)
  const resultDigits = steps.map(s => DIGITS[s.remainder]).reverse().join("");

  let html = `<div class="staircase">`;
  steps.forEach((s, i) => {
    html += `
      <div class="stair-step${i > 0 ? " indent" : ""}" style="margin-left:${i * 22}px">
        <span class="dividend">${s.dividend}</span>
        <span class="bracket"><span class="divisor">${base}</span></span>
        <span class="eq">=</span>
        <span class="quotient">${s.quotient}</span>
        <span class="eq">resto</span>
        <span class="remainder">${DIGITS[s.remainder]}</span>
      </div>`;
  });
  html += `<div class="staircase-readout">Se leen los restos de abajo hacia arriba: `;
  html += steps.slice().reverse().map(s => `<span class="readout-chip">${DIGITS[s.remainder]}</span>`).join("");
  html += ` → <b>${resultDigits}</b> en ${baseName(base)}</div>`;
  html += `</div>`;

  return { value: resultDigits, html };
}

/* ---------- 3. Conversión puente: binario <-> hexadecimal <-> octal (vía decimal) ---------- */
function bridgeConversion(str, fromBase, toBase) {
  const clean = str.trim().toUpperCase();
  if (!isValidInBase(clean, fromBase)) {
    throw new Error(`"${str}" no es un número válido en ${baseName(fromBase)}.`);
  }
  const step1 = toDecimalWithSteps(clean, fromBase);
  const step2 = fromDecimalWithSteps(step1.value, toBase);

  let html = `<div class="bridge-note">
      Para convertir entre <b>${baseName(fromBase)}</b> y <b>${baseName(toBase)}</b> se usa el
      decimal como paso intermedio: primero se pasa el número a decimal, y ese resultado
      se vuelve a dividir sucesivamente hasta llegar a ${baseName(toBase)}.
      <div class="bridge-chain">
        <span class="node">${clean} (${baseName(fromBase)})</span>
        <span class="arrow">→</span>
        <span class="node">${step1.value} (decimal)</span>
        <span class="arrow">→</span>
        <span class="node">${step2.value} (${baseName(toBase)})</span>
      </div>
    </div>`;
  html += `<div class="conv-process-sub"><p class="hint" style="margin-top:18px">Paso 1 · ${baseName(fromBase)} → decimal</p>${step1.html}</div>`;
  html += `<div class="conv-process-sub" style="margin-top:18px"><p class="hint">Paso 2 · decimal → ${baseName(toBase)}</p>${step2.html}</div>`;

  return { value: step2.value, html };
}

/* ---------- Registro central de modos de conversión ---------- */
const CONVERSION_MODES = {
  bin2dec: {
    label: "Binario → Decimal",
    inputLabel: "Valor en binario",
    placeholder: "Ej: 101101",
    resultLabel: "Equivalente decimal",
    run: (input) => toDecimalWithSteps(input, 2),
  },
  dec2bin: {
    label: "Decimal → Binario",
    inputLabel: "Valor en decimal",
    placeholder: "Ej: 45",
    resultLabel: "Equivalente binario",
    run: (input) => fromDecimalWithSteps(input, 2),
  },
  dec2hex: {
    label: "Decimal → Hexadecimal",
    inputLabel: "Valor en decimal",
    placeholder: "Ej: 2515",
    resultLabel: "Equivalente hexadecimal",
    run: (input) => fromDecimalWithSteps(input, 16),
  },
  hex2dec: {
    label: "Hexadecimal → Decimal",
    inputLabel: "Valor en hexadecimal",
    placeholder: "Ej: 9C3",
    resultLabel: "Equivalente decimal",
    run: (input) => toDecimalWithSteps(input, 16),
  },
  dec2oct: {
    label: "Decimal → Octal",
    inputLabel: "Valor en decimal",
    placeholder: "Ej: 342",
    resultLabel: "Equivalente octal",
    run: (input) => fromDecimalWithSteps(input, 8),
  },
  oct2dec: {
    label: "Octal → Decimal",
    inputLabel: "Valor en octal",
    placeholder: "Ej: 526",
    resultLabel: "Equivalente decimal",
    run: (input) => toDecimalWithSteps(input, 8),
  },
  bin2hex: {
    label: "Binario → Hexadecimal",
    inputLabel: "Valor en binario",
    placeholder: "Ej: 111010110",
    resultLabel: "Equivalente hexadecimal",
    run: (input) => bridgeConversion(input, 2, 16),
  },
  hex2bin: {
    label: "Hexadecimal → Binario",
    inputLabel: "Valor en hexadecimal",
    placeholder: "Ej: 3F2",
    resultLabel: "Equivalente binario",
    run: (input) => bridgeConversion(input, 16, 2),
  },
  bin2oct: {
    label: "Binario → Octal",
    inputLabel: "Valor en binario",
    placeholder: "Ej: 110101",
    resultLabel: "Equivalente octal",
    run: (input) => bridgeConversion(input, 2, 8),
  },
  oct2bin: {
    label: "Octal → Binario",
    inputLabel: "Valor en octal",
    placeholder: "Ej: 754",
    resultLabel: "Equivalente binario",
    run: (input) => bridgeConversion(input, 8, 2),
  },
};
