/* ============================================================
   BitLab · app.js
   Cablea la interfaz (tabs, chips, formularios) con la lógica
   de converters.js y logic.js.
   ============================================================ */

/* ---------- Pantalla de carga ---------- */
(function () {
  const loader = document.getElementById("loading-screen");
  if (!loader) return;
  const minDuration = 2000; // ms mínimos que se muestra la pantalla de carga
  const start = performance.now();
  function hideLoader() {
    const elapsed = performance.now() - start;
    const wait = Math.max(0, minDuration - elapsed);
    setTimeout(() => loader.classList.add("hide"), wait);
  }
  if (document.readyState === "complete") hideLoader();
  else window.addEventListener("load", hideLoader);
})();

/* ---------- Tabs ---------- */
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    panels.forEach(p => p.classList.remove("active"));
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");
  });
});

/* ---------- Conversor de bases ---------- */
let currentMode = "bin2dec";
const chips = document.querySelectorAll(".chip");
const convInput = document.getElementById("conv-input");
const convLabel = document.getElementById("conv-label");
const convError = document.getElementById("conv-error");
const convResult = document.getElementById("conv-result");
const resultLabel = document.getElementById("result-label");
const resultValue = document.getElementById("result-value");
const convProcess = document.getElementById("conv-process");

function applyMode(mode) {
  currentMode = mode;
  chips.forEach(c => c.classList.toggle("active", c.dataset.mode === mode));
  const cfg = CONVERSION_MODES[mode];
  convLabel.textContent = cfg.inputLabel;
  convInput.placeholder = cfg.placeholder;
  convError.textContent = "";
  convResult.hidden = true;
  convInput.value = "";
  convInput.focus();
}

chips.forEach(chip => chip.addEventListener("click", () => applyMode(chip.dataset.mode)));

document.getElementById("conv-form").addEventListener("submit", (e) => {
  e.preventDefault();
  convError.textContent = "";
  const cfg = CONVERSION_MODES[currentMode];
  try {
    const { value, html } = cfg.run(convInput.value.trim());
    resultLabel.textContent = cfg.resultLabel;
    resultValue.textContent = value;
    convProcess.innerHTML = html;
    convResult.hidden = false;
  } catch (err) {
    convResult.hidden = true;
    convError.textContent = err.message;
  }
});

document.getElementById("conv-clear").addEventListener("click", () => {
  convInput.value = "";
  convError.textContent = "";
  convResult.hidden = true;
  convInput.focus();
});

applyMode(currentMode);

/* ---------- Aritmética binaria ---------- */
let currentArithMode = "suma";
const arithChips = document.querySelectorAll("#arith-chips .chip");
const arithA = document.getElementById("arith-a");
const arithB = document.getElementById("arith-b");
const arithOp = document.getElementById("arith-op");
const arithError = document.getElementById("arith-error");
const arithResult = document.getElementById("arith-result");
const arithResultLabel = document.getElementById("arith-result-label");
const arithResultValue = document.getElementById("arith-result-value");
const arithProcess = document.getElementById("arith-process");

function applyArithMode(mode) {
  currentArithMode = mode;
  arithChips.forEach(c => c.classList.toggle("active", c.dataset.mode === mode));
  arithOp.textContent = ARITHMETIC_MODES[mode].op;
  arithError.textContent = "";
  arithResult.hidden = true;
}
arithChips.forEach(chip => chip.addEventListener("click", () => applyArithMode(chip.dataset.mode)));

document.getElementById("arith-form").addEventListener("submit", (e) => {
  e.preventDefault();
  arithError.textContent = "";
  const cfg = ARITHMETIC_MODES[currentArithMode];
  try {
    const { value, html } = cfg.run(arithA.value.trim(), arithB.value.trim());
    arithResultLabel.textContent = `Resultado de la ${cfg.label.toLowerCase()}`;
    arithResultValue.textContent = value;
    arithProcess.innerHTML = html;
    arithResult.hidden = false;
  } catch (err) {
    arithResult.hidden = true;
    arithError.textContent = err.message;
  }
});
document.getElementById("arith-clear").addEventListener("click", () => {
  arithA.value = "";
  arithB.value = "";
  arithError.textContent = "";
  arithResult.hidden = true;
  arithA.focus();
});

applyArithMode(currentArithMode);

/* ---------- Complementos ---------- */
let currentCompMode = "c1";
const compChips = document.querySelectorAll("#comp-chips .chip");
const compA = document.getElementById("comp-a");
const compB = document.getElementById("comp-b");
const compOp = document.getElementById("comp-op");
const compLabelA = document.getElementById("comp-label-a");
const compError = document.getElementById("comp-error");
const compResult = document.getElementById("comp-result");
const compResultLabel = document.getElementById("comp-result-label");
const compResultValue = document.getElementById("comp-result-value");
const compProcess = document.getElementById("comp-process");

function applyCompMode(mode) {
  currentCompMode = mode;
  compChips.forEach(c => c.classList.toggle("active", c.dataset.mode === mode));
  const cfg = COMPLEMENT_MODES[mode];
  const twoInputs = cfg.inputs === 2;
  compB.hidden = !twoInputs;
  compOp.hidden = !twoInputs;
  compLabelA.textContent = twoInputs ? "Número A (minuendo, binario)" : "Número (binario)";
  compB.placeholder = "Número B (sustraendo, binario) — ej: 0110";
  compError.textContent = "";
  compResult.hidden = true;
}
compChips.forEach(chip => chip.addEventListener("click", () => applyCompMode(chip.dataset.mode)));

document.getElementById("comp-form").addEventListener("submit", (e) => {
  e.preventDefault();
  compError.textContent = "";
  const cfg = COMPLEMENT_MODES[currentCompMode];
  try {
    const args = cfg.inputs === 2 ? [compA.value.trim(), compB.value.trim()] : [compA.value.trim()];
    const { value, html } = cfg.run(...args);
    compResultLabel.textContent = cfg.resultLabel;
    compResultValue.textContent = value;
    compProcess.innerHTML = html;
    compResult.hidden = false;
  } catch (err) {
    compResult.hidden = true;
    compError.textContent = err.message;
  }
});
document.getElementById("comp-clear").addEventListener("click", () => {
  compA.value = "";
  compB.value = "";
  compError.textContent = "";
  compResult.hidden = true;
  compA.focus();
});

applyCompMode(currentCompMode);

/* ---------- Tabla de verdad ---------- */
const ttForm = document.getElementById("tt-form");
const ttInput = document.getElementById("tt-input");
const ttError = document.getElementById("tt-error");
const ttResult = document.getElementById("tt-result");
const ttSteps = document.getElementById("tt-steps");
const ttTable = document.getElementById("tt-table");

ttForm.addEventListener("submit", (e) => {
  e.preventDefault();
  ttError.textContent = "";
  try {
    const result = buildTruthTable(ttInput.value);
    renderTruthTable(result);
    ttResult.hidden = false;
  } catch (err) {
    ttResult.hidden = true;
    ttError.textContent = err.message;
  }
});

document.getElementById("tt-clear").addEventListener("click", () => {
  ttInput.value = "";
  ttError.textContent = "";
  ttResult.hidden = true;
  ttInput.focus();
});

function renderTruthTable(result) {
  const { variables, subexprs, rows, finalExpr } = result;

  // Pasos: explica en qué orden se resuelve la expresión
  ttSteps.innerHTML = "";
  const intro = document.createElement("div");
  intro.className = "tt-step-line";
  intro.innerHTML = `Variables detectadas: <b>${variables.join(", ")}</b> → ${1 << variables.length} filas posibles.`;
  ttSteps.appendChild(intro);

  subexprs.forEach((node, idx) => {
    const line = document.createElement("div");
    line.className = "tt-step-line";
    const isLast = idx === subexprs.length - 1;
    line.innerHTML = `Paso ${idx + 1}: se resuelve <b>${exprToString(node)}</b>${isLast ? " → esta es la expresión completa." : ""}`;
    ttSteps.appendChild(line);
  });

  // Tabla
  const subLabels = subexprs.map(exprToString);
  const finalIdx = subLabels.length - 1;

  let thead = "<thead><tr>";
  variables.forEach(v => thead += `<th class="var-col">${v}</th>`);
  subLabels.forEach((label, i) => {
    thead += `<th class="${i === finalIdx ? "final-col" : ""}">${label}</th>`;
  });
  thead += "</tr></thead>";

  let tbody = "<tbody>";
  rows.forEach(row => {
    tbody += "<tr>";
    variables.forEach(v => {
      const val = row.values[v];
      tbody += `<td class="${val ? "true" : "false"}">${val ? "V" : "F"}</td>`;
    });
    row.rowResults.forEach((val, i) => {
      const cls = i === finalIdx ? "final-col" : (val ? "true" : "false");
      tbody += `<td class="${cls}">${val ? "V" : "F"}</td>`;
    });
    tbody += "</tr>";
  });
  tbody += "</tbody>";

  ttTable.innerHTML = thead + tbody;
}
