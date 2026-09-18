/* ============================================================
   BitLab · postulates.js
   Simplificación de funciones booleanas aplicando los postulados
   básicos (identidad, nulo, idempotencia, complemento, doble
   negación), mostrando cada reducción como un paso.
   ============================================================ */

/* ---------- Tokenización ---------- */
function normalizePost(raw) {
  let s = raw;
  s = s.replace(/¬/g, "!");
  s = s.replace(/·/g, "*").replace(/\./g, "*");
  return s;
}

function tokenizePost(raw) {
  const s = normalizePost(raw);
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === "(" || ch === ")") { tokens.push({ type: ch }); i++; continue; }
    if (ch === "*") { tokens.push({ type: "AND" }); i++; continue; }
    if (ch === "+") { tokens.push({ type: "OR" }); i++; continue; }
    if (ch === "!") { tokens.push({ type: "NOT" }); i++; continue; }
    if (ch === "'") { tokens.push({ type: "APOS" }); i++; continue; }
    if (ch === "0" || ch === "1") { tokens.push({ type: "CONST", value: ch }); i++; continue; }
    if (/[A-Za-z]/.test(ch)) {
      let j = i + 1;
      while (j < s.length && /[0-9]/.test(s[j])) j++;
      tokens.push({ type: "VAR", name: s.slice(i, j).toUpperCase() });
      i = j;
      continue;
    }
    throw new Error(`Carácter no reconocido: "${ch}"`);
  }
  return tokens;
}

/* ---------- Parser (recursive descent) ----------
   Precedencia: NOT (prefijo ! y postfijo ') > AND (·) > OR (+) */
function parsePost(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (type) => {
    if (!peek() || peek().type !== type) throw new Error(`Se esperaba "${type}" en la expresión.`);
    return tokens[pos++];
  };

  function parseOr() {
    let node = parseAnd();
    while (peek() && peek().type === "OR") { eat("OR"); node = { type: "OR", left: node, right: parseAnd() }; }
    return node;
  }
  function parseAnd() {
    let node = parseNot();
    while (peek() && peek().type === "AND") { eat("AND"); node = { type: "AND", left: node, right: parseNot() }; }
    return node;
  }
  function parseNot() {
    if (peek() && peek().type === "NOT") { eat("NOT"); return applyPostfix({ type: "NOT", operand: parseNot() }); }
    return applyPostfix(parseAtom());
  }
  function applyPostfix(node) {
    while (peek() && peek().type === "APOS") { eat("APOS"); node = { type: "NOT", operand: node }; }
    return node;
  }
  function parseAtom() {
    if (!peek()) throw new Error("La expresión terminó antes de tiempo.");
    if (peek().type === "(") { eat("("); const node = parseOr(); eat(")"); return applyPostfix(node); }
    if (peek().type === "VAR") { const t = eat("VAR"); return { type: "VAR", name: t.name }; }
    if (peek().type === "CONST") { const t = eat("CONST"); return { type: "CONST", value: t.value }; }
    throw new Error(`Token inesperado: "${peek().type}"`);
  }

  const tree = parseOr();
  if (pos !== tokens.length) throw new Error("Sobran símbolos al final de la expresión (revisá los paréntesis).");
  return tree;
}

/* ---------- Impresión bonita (sin paréntesis redundantes) ---------- */
function exprToStringPost(node) {
  switch (node.type) {
    case "VAR": return node.name;
    case "CONST": return node.value;
    case "NOT": return `${notOperandStr(node.operand)}'`;
    case "AND": return `${sideStr(node.left, "AND")} · ${sideStr(node.right, "AND")}`;
    case "OR": return `${sideStr(node.left, "OR")} + ${sideStr(node.right, "OR")}`;
  }
}
function notOperandStr(node) {
  if (node.type === "VAR" || node.type === "CONST" || node.type === "NOT") return exprToStringPost(node);
  return `(${exprToStringPost(node)})`;
}
function sideStr(node, parentType) {
  if (node.type === "VAR" || node.type === "CONST" || node.type === "NOT" || node.type === parentType) {
    return exprToStringPost(node);
  }
  if (parentType === "AND" && node.type === "OR") return `(${exprToStringPost(node)})`;
  return exprToStringPost(node);
}

/* ---------- Reglas: postulados básicos ---------- */
function isComplementPair(L, R) {
  if (L.type === "NOT" && exprToStringPost(L.operand) === exprToStringPost(R)) return true;
  if (R.type === "NOT" && exprToStringPost(R.operand) === exprToStringPost(L)) return true;
  return false;
}

/* Aplana una cadena homogénea de AND (o de OR) en su lista de factores,
   para poder detectar duplicados/complementos aunque no estén "pegados"
   (ej: a·b·c·a → [a,b,c,a], sin importar cómo se agruparon los paréntesis). */
function flattenChain(node, opType, out) {
  if (node.type === opType) {
    flattenChain(node.left, opType, out);
    flattenChain(node.right, opType, out);
  } else {
    out.push(node);
  }
  return out;
}
function rebuildChain(list, opType) {
  return list.slice(1).reduce((acc, cur) => ({ type: opType, left: acc, right: cur }), list[0]);
}
function joinFactors(factors, opType) {
  return factors.map(exprToStringPost).join(opType === "AND" ? " · " : " + ");
}

function simplifyNode(node, steps) {
  if (node.type === "VAR" || node.type === "CONST") return node;

  if (node.type === "NOT") {
    const operand = simplifyNode(node.operand, steps);
    if (operand.type === "CONST") {
      const val = operand.value === "0" ? "1" : "0";
      steps.push(`${exprToStringPost(operand)}' = ${val} &nbsp;<i>(Complemento)</i>`);
      return { type: "CONST", value: val };
    }
    if (operand.type === "NOT") {
      const inner = exprToStringPost(operand.operand);
      steps.push(`(${inner}')' = ${inner} &nbsp;<i>(Doble negación)</i>`);
      return operand.operand;
    }
    return { type: "NOT", operand };
  }

  const opType = node.type; // "AND" | "OR"
  const symbol = opType === "AND" ? "·" : "+";
  const absorbing = opType === "AND" ? "0" : "1"; // X·0=0 / X+1=1
  const identity = opType === "AND" ? "1" : "0";  // X·1=X / X+0=X

  // 1) aplanar la cadena y simplificar cada factor primero (de adentro hacia afuera)
  const rawFactors = flattenChain(node, opType, []);
  let factors = rawFactors.map(f => simplifyNode(f, steps));

  // 2) si hay una constante absorbente en cualquier posición, colapsa todo (Nulo)
  if (factors.some(f => f.type === "CONST" && f.value === absorbing)) {
    if (!(factors.length === 1 && factors[0].type === "CONST")) {
      steps.push(`${joinFactors(factors, opType)} = ${absorbing} &nbsp;<i>(Nulo: X${symbol}${absorbing} = ${absorbing})</i>`);
    }
    return { type: "CONST", value: absorbing };
  }

  // 3) quitar los elementos neutros (Identidad)
  const withoutIdentity = factors.filter(f => !(f.type === "CONST" && f.value === identity));
  if (withoutIdentity.length !== factors.length) {
    const after = withoutIdentity.length ? joinFactors(withoutIdentity, opType) : identity;
    steps.push(`${joinFactors(factors, opType)} = ${after} &nbsp;<i>(Identidad)</i>`);
  }
  factors = withoutIdentity.length ? withoutIdentity : [{ type: "CONST", value: identity }];

  // 4) quitar duplicados, sin importar dónde estén (Idempotencia)
  const seen = new Set();
  const dedup = [];
  factors.forEach(f => {
    const key = exprToStringPost(f);
    if (!seen.has(key)) { seen.add(key); dedup.push(f); }
  });
  if (dedup.length !== factors.length) {
    steps.push(`${joinFactors(factors, opType)} = ${joinFactors(dedup, opType)} &nbsp;<i>(Idempotencia: X${symbol}X = X)</i>`);
  }
  factors = dedup;

  // 5) si hay un par complementario en cualquier posición, colapsa todo (Complemento)
  for (let i = 0; i < factors.length; i++) {
    for (let j = 0; j < factors.length; j++) {
      if (i !== j && isComplementPair(factors[i], factors[j])) {
        steps.push(`${exprToStringPost(factors[i])}${symbol}${exprToStringPost(factors[j])} = ${absorbing} &nbsp;<i>(Complemento)</i>`);
        return { type: "CONST", value: absorbing };
      }
    }
  }

  if (factors.length === 1) return factors[0];
  return rebuildChain(factors, opType);
}

/* ---------- API principal ---------- */
function simplifyWithPostulates(raw) {
  if (!raw.trim()) throw new Error("Escribí una función booleana primero.");
  const tokens = tokenizePost(raw);
  const tree = parsePost(tokens);
  const original = exprToStringPost(tree);

  const steps = [];
  const result = simplifyNode(tree, steps);
  const finalStr = exprToStringPost(result);

  let html = `<div class="arith-block">`;
  html += `<p class="hint">Función original: <b>F = ${original}</b></p>`;
  if (steps.length === 0) {
    html += `<p class="hint" style="margin-top:12px">Ya está en su forma más simple: no se pudo aplicar ningún postulado básico.</p>`;
  } else {
    html += `<ol class="arith-steps" style="margin-top:14px">${steps.map(s => `<li>${s}</li>`).join("")}</ol>`;
  }
  html += `</div>`;

  return { value: `F = ${finalStr}`, html };
}
