/* ============================================================
   BitLab · app.js
   Cablea la interfaz (tabs, chips, formularios) con la lógica
   de converters.js y logic.js.
   ============================================================ */

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

applyMode(currentMode);

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
