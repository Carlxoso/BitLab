/* ============================================================
   BitLab · complement.js
   Complemento a 1, complemento a 2, y resta binaria usando
   ambos métodos (con acarreo circular / acarreo final descartado).
   Reutiliza padLeft, padToSameLength, invertBits, requireBinary
   y addBinaryWithSteps de arithmetic.js.
   ============================================================ */

/* ================= COMPLEMENTO A 1 ================= */
function onesComplementWithSteps(raw) {
  const bin = requireBinary(raw, "El número");
  if (bin.length > MAX_BITS_ADDSUB) {
    throw new Error(`Usá números de hasta ${MAX_BITS_ADDSUB} bits.`);
  }
  const result = invertBits(bin);

  const rows = [
    { label: "original", cells: bin.split("") },
    { label: "", cells: [], line: true },
    { label: "C1", cells: result.split("") },
  ];

  const html = `
    <div class="arith-block">
      ${renderOpGrid(rows, bin.length)}
      <ol class="arith-steps">
        <li>Se invierte cada bit del número: donde había <b>0</b> queda <b>1</b>, y donde había <b>1</b> queda <b>0</b>.</li>
        <li>Ese es directamente el complemento a 1: <b>${result}</b>.</li>
      </ol>
    </div>`;

  return { value: result, html };
}

/* ================= COMPLEMENTO A 2 ================= */
function twosComplementWithSteps(raw) {
  const bin = requireBinary(raw, "El número");
  if (bin.length > MAX_BITS_ADDSUB) {
    throw new Error(`Usá números de hasta ${MAX_BITS_ADDSUB} bits.`);
  }
  const c1 = invertBits(bin);
  const one = padLeft("1", bin.length);
  const added = addBinaryWithSteps(c1, one);
  // El complemento a 2 se calcula con ancho fijo: si sobra un acarreo
  // más allá del ancho original, se descarta.
  const result = padLeft(added.value, bin.length + 1).slice(-bin.length);
  const discardedCarry = added.value.length > bin.length;

  const html = `
    <div class="arith-block">
      <p class="hint">Paso 1 · complemento a 1</p>
      ${renderOpGrid([
        { label: "original", cells: bin.split("") },
        { label: "", cells: [], line: true },
        { label: "C1", cells: c1.split("") },
      ], bin.length)}
      <p class="hint" style="margin-top:18px">Paso 2 · sumar 1 al complemento a 1</p>
      ${added.html}
      ${discardedCarry ? `<p class="hint">El acarreo que sobra al sumar 1 se descarta: el complemento a 2 mantiene el mismo ancho que el número original.</p>` : ""}
      <p class="hint">Complemento a 2 final: <b>${result}</b></p>
    </div>`;

  return { value: result, html };
}

/* ================= RESTA CON COMPLEMENTO A 1 / A 2 ================= */
function subtractWithComplement(aRaw, bRaw, mode) {
  const a0 = requireBinary(aRaw, "El primer número (minuendo)");
  const b0 = requireBinary(bRaw, "El segundo número (sustraendo)");
  if (a0.length > MAX_BITS_ADDSUB || b0.length > MAX_BITS_ADDSUB) {
    throw new Error(`Usá números de hasta ${MAX_BITS_ADDSUB} bits.`);
  }
  const { a, b, len } = padToSameLength(a0, b0);

  let complementOfB, complementLabel, complementSteps;
  if (mode === "c1") {
    complementOfB = invertBits(b);
    complementLabel = "C1";
    complementSteps = `<ol class="arith-steps"><li>Se calcula el complemento a 1 de B invirtiendo cada bit: <b>${b}</b> → <b>${complementOfB}</b>.</li></ol>`;
  } else {
    const c1 = invertBits(b);
    const plusOne = addBinaryWithSteps(c1, padLeft("1", len));
    complementOfB = padLeft(plusOne.value, len + 1).slice(-len);
    complementLabel = "C2";
    complementSteps = `<ol class="arith-steps">
        <li>Se invierten los bits de B: <b>${b}</b> → <b>${c1}</b> (complemento a 1).</li>
        <li>Se le suma 1: <b>${c1}</b> + 1 = <b>${complementOfB}</b> (complemento a 2, descartando el acarreo que sobre).</li>
      </ol>`;
  }

  // A + complemento(B), permitiendo un bit extra para detectar el acarreo final
  const sumStep = addBinaryWithSteps(a, complementOfB);
  const rawSum = padLeft(sumStep.value, len + 1);
  const carryOut = rawSum.length > len ? rawSum[0] : "0";
  const nBitSum = rawSum.slice(-len);

  let finalValue, verdict;
  if (mode === "c1") {
    if (carryOut === "1") {
      // acarreo circular: se sesuma ese 1 al resultado de n bits
      const circular = addBinaryWithSteps(nBitSum, padLeft("1", len));
      finalValue = padLeft(circular.value, len + 1).slice(-len);
      verdict = `
        <p class="hint">Hubo acarreo final (1), así que se aplica <b>acarreo circular</b>: ese 1 se suma de vuelta al resultado de ${len} bits.</p>
        ${circular.html}
        <p class="hint">Resultado positivo: <b>${finalValue}</b></p>`;
    } else {
      const magnitude = invertBits(nBitSum);
      finalValue = "-" + magnitude;
      verdict = `
        <p class="hint">No hubo acarreo final, así que el resultado es negativo. Se calcula el complemento a 1 del resultado obtenido para conocer su magnitud: <b>${nBitSum}</b> → <b>${magnitude}</b>.</p>
        <p class="hint">Resultado: <b>${finalValue}</b></p>`;
    }
  } else {
    if (carryOut === "1") {
      finalValue = nBitSum;
      verdict = `<p class="hint">Hubo acarreo final (1): en complemento a 2 ese acarreo simplemente <b>se descarta</b>. Resultado positivo: <b>${finalValue}</b></p>`;
    } else {
      const c1ofSum = invertBits(nBitSum);
      const magnitude = padLeft(addBinaryWithSteps(c1ofSum, padLeft("1", len)).value, len + 1).slice(-len);
      finalValue = "-" + magnitude;
      verdict = `
        <p class="hint">No hubo acarreo final, así que el resultado es negativo. Se calcula el complemento a 2 del resultado obtenido para conocer su magnitud: <b>${nBitSum}</b> → <b>${magnitude}</b>.</p>
        <p class="hint">Resultado: <b>${finalValue}</b></p>`;
    }
  }

  const html = `
    <div class="arith-block">
      <p class="hint">A = ${a} &nbsp;·&nbsp; B = ${b} &nbsp;(ambos ajustados a ${len} bits)</p>
      <p class="hint" style="margin-top:14px">Paso 1 · ${complementLabel} de B</p>
      ${complementSteps}
      <p class="hint" style="margin-top:18px">Paso 2 · sumar A + ${complementLabel}(B)</p>
      ${sumStep.html}
      <div style="margin-top:16px">${verdict}</div>
    </div>`;

  return { value: finalValue, html };
}

/* ================= COMPARAR LOS 3 MÉTODOS ================= */
function signedBinaryValue(binStr) {
  if (binStr.startsWith("-")) return -parseInt(binStr.slice(1), 2);
  return parseInt(binStr, 2);
}

function compareSubtractionMethods(aRaw, bRaw) {
  const a0 = requireBinary(aRaw, "El primer número (minuendo)");
  const b0 = requireBinary(bRaw, "El segundo número (sustraendo)");
  if (a0.length > MAX_BITS_ADDSUB || b0.length > MAX_BITS_ADDSUB) {
    throw new Error(`Usá números de hasta ${MAX_BITS_ADDSUB} bits.`);
  }
  const { a, b, len } = padToSameLength(a0, b0);

  const direct = subtractBinaryWithSteps(a, b);
  const c1 = subtractWithComplement(a, b, "c1");
  const c2 = subtractWithComplement(a, b, "c2");

  const values = [signedBinaryValue(direct.value), signedBinaryValue(c1.value), signedBinaryValue(c2.value)];
  const allMatch = values.every(v => v === values[0]);

  const verdictHtml = allMatch
    ? `<div class="result-banner" style="margin-top:20px">
         <span class="result-label">✓ Los 3 métodos coinciden</span>
         <span class="result-value">${direct.value}</span>
       </div>`
    : `<div class="result-banner" style="margin-top:20px; border-color:var(--danger); border-left-color:var(--danger)">
         <span class="result-label" style="color:var(--danger)">⚠ Los resultados no coinciden, revisá los datos</span>
         <span class="result-value" style="color:var(--danger)">directa: ${direct.value} · C1: ${c1.value} · C2: ${c2.value}</span>
       </div>`;

  const html = `
    <p class="hint">A = ${a} &nbsp;·&nbsp; B = ${b} &nbsp;(ambos ajustados a ${len} bits)</p>

    <h3 class="arith-subtitle">1 · Resta directa (con préstamo)</h3>
    ${direct.html}

    <h3 class="arith-subtitle">2 · Resta convertida en suma con complemento a 1</h3>
    ${c1.html}

    <h3 class="arith-subtitle">3 · Resta convertida en suma con complemento a 2</h3>
    ${c2.html}

    ${verdictHtml}
  `;

  return { value: allMatch ? direct.value : "ver detalle", html };
}

const COMPLEMENT_MODES = {
  c1: {
    label: "Complemento a 1",
    inputs: 1,
    resultLabel: "Complemento a 1",
    run: (a) => onesComplementWithSteps(a),
  },
  c2: {
    label: "Complemento a 2",
    inputs: 1,
    resultLabel: "Complemento a 2",
    run: (a) => twosComplementWithSteps(a),
  },
  resta_c1: {
    label: "Resta con complemento a 1",
    inputs: 2,
    resultLabel: "A − B",
    run: (a, b) => subtractWithComplement(a, b, "c1"),
  },
  resta_c2: {
    label: "Resta con complemento a 2",
    inputs: 2,
    resultLabel: "A − B",
    run: (a, b) => subtractWithComplement(a, b, "c2"),
  },
  comparar: {
    label: "Comparar los 3 métodos",
    inputs: 2,
    resultLabel: "Resultado (directa / C1 / C2)",
    run: (a, b) => compareSubtractionMethods(a, b),
  },
};
