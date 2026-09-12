/* ============================================================
   BitLab · logic.js
   Parser + evaluador de expresiones lógicas para generar
   tablas de verdad con cada subexpresión desglosada.
   ============================================================ */

/* ---------- 1. Normalización y tokenización ---------- */
function normalizeExpression(raw) {
  let s = raw;
  // operadores por palabra (case-insensitive), cuidando los límites de palabra
  s = s.replace(/\bNOT\b/gi, "!");
  s = s.replace(/\bAND\b/gi, "&");
  s = s.replace(/\bXOR\b/gi, "^");
  s = s.replace(/\bOR\b/gi, "|");
  s = s.replace(/\bIMPLICA\b/gi, "->");
  s = s.replace(/\b(SII|SSI)\b/gi, "<->");
  // símbolos unicode
  s = s.replace(/¬/g, "!").replace(/~/g, "!");
  s = s.replace(/∧/g, "&").replace(/\*/g, "&").replace(/·/g, "&");
  s = s.replace(/∨/g, "|").replace(/\+/g, "|");
  s = s.replace(/⊕/g, "^");
  s = s.replace(/↔/g, "<->").replace(/⇔/g, "<->").replace(/=>/g, "->").replace(/→/g, "->");
  return s;
}

function tokenize(raw) {
  const s = normalizeExpression(raw);
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === "(" || ch === ")") { tokens.push({ type: ch }); i++; continue; }
    if (s.startsWith("<->", i)) { tokens.push({ type: "IFF" }); i += 3; continue; }
    if (s.startsWith("->", i)) { tokens.push({ type: "IMPLIES" }); i += 2; continue; }
    if (ch === "!") { tokens.push({ type: "NOT" }); i++; continue; }
    if (ch === "&") { tokens.push({ type: "AND" }); i++; continue; }
    if (ch === "|") { tokens.push({ type: "OR" }); i++; continue; }
    if (ch === "^") { tokens.push({ type: "XOR" }); i++; continue; }
    if (/[A-Za-z]/.test(ch)) {
      // variable: una letra (soporta subíndices tipo A1, PQ como nombre completo de una letra)
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

/* ---------- 2. Parser (recursive descent) ----------
   Precedencia (de mayor a menor): NOT > AND > XOR > OR > IMPLIES > IFF
   Todos los binarios asocian a la izquierda, salvo IMPLIES/IFF que van bien como están. */
function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (type) => {
    if (!peek() || peek().type !== type) {
      throw new Error(`Se esperaba "${type}" en la expresión.`);
    }
    return tokens[pos++];
  };

  function parseIff() {
    let node = parseImplies();
    while (peek() && peek().type === "IFF") {
      eat("IFF");
      node = { type: "IFF", left: node, right: parseImplies() };
    }
    return node;
  }
  function parseImplies() {
    let node = parseOr();
    while (peek() && peek().type === "IMPLIES") {
      eat("IMPLIES");
      node = { type: "IMPLIES", left: node, right: parseOr() };
    }
    return node;
  }
  function parseOr() {
    let node = parseXor();
    while (peek() && peek().type === "OR") {
      eat("OR");
      node = { type: "OR", left: node, right: parseXor() };
    }
    return node;
  }
  function parseXor() {
    let node = parseAnd();
    while (peek() && peek().type === "XOR") {
      eat("XOR");
      node = { type: "XOR", left: node, right: parseAnd() };
    }
    return node;
  }
  function parseAnd() {
    let node = parseNot();
    while (peek() && peek().type === "AND") {
      eat("AND");
      node = { type: "AND", left: node, right: parseNot() };
    }
    return node;
  }
  function parseNot() {
    if (peek() && peek().type === "NOT") {
      eat("NOT");
      return { type: "NOT", operand: parseNot() };
    }
    return parseAtom();
  }
  function parseAtom() {
    if (!peek()) throw new Error("La expresión terminó antes de tiempo.");
    if (peek().type === "(") {
      eat("(");
      const node = parseIff();
      eat(")");
      return node;
    }
    if (peek().type === "VAR") {
      const t = eat("VAR");
      return { type: "VAR", name: t.name };
    }
    throw new Error(`Token inesperado: "${peek().type}"`);
  }

  const tree = parseIff();
  if (pos !== tokens.length) throw new Error("Sobran símbolos al final de la expresión (revisá los paréntesis).");
  return tree;
}

/* ---------- 3. Utilidades sobre el AST ---------- */
const OP_SYMBOL = { NOT: "¬", AND: "∧", OR: "∨", XOR: "⊕", IMPLIES: "→", IFF: "↔" };

function exprToString(node) {
  switch (node.type) {
    case "VAR": return node.name;
    case "NOT": return `¬${wrap(node.operand)}`;
    default: return `${wrap(node.left)} ${OP_SYMBOL[node.type]} ${wrap(node.right)}`;
  }
}
function wrap(node) {
  return node.type === "VAR" ? exprToString(node) : `(${exprToString(node)})`;
}

function collectVariables(node, set = new Set()) {
  if (node.type === "VAR") set.add(node.name);
  else if (node.type === "NOT") collectVariables(node.operand, set);
  else { collectVariables(node.left, set); collectVariables(node.right, set); }
  return set;
}

/* Postorder: subexpresiones en el orden en que deben resolverse (de adentro hacia afuera) */
function collectSubexpressions(node, out = []) {
  if (node.type === "VAR") return out;
  if (node.type === "NOT") collectSubexpressions(node.operand, out);
  else { collectSubexpressions(node.left, out); collectSubexpressions(node.right, out); }
  const str = exprToString(node);
  if (!out.some(n => exprToString(n) === str)) out.push(node);
  return out;
}

function evaluate(node, values) {
  switch (node.type) {
    case "VAR": return !!values[node.name];
    case "NOT": return !evaluate(node.operand, values);
    case "AND": return evaluate(node.left, values) && evaluate(node.right, values);
    case "OR": return evaluate(node.left, values) || evaluate(node.right, values);
    case "XOR": return evaluate(node.left, values) !== evaluate(node.right, values);
    case "IMPLIES": return !evaluate(node.left, values) || evaluate(node.right, values);
    case "IFF": return evaluate(node.left, values) === evaluate(node.right, values);
  }
}

/* ---------- 4. API principal ---------- */
function buildTruthTable(rawExpression) {
  if (!rawExpression.trim()) throw new Error("Escribí una expresión lógica primero.");
  const tokens = tokenize(rawExpression);
  const tree = parse(tokens);
  const variables = Array.from(collectVariables(tree)).sort();
  if (variables.length === 0) throw new Error("La expresión no tiene ninguna variable.");
  if (variables.length > 6) throw new Error("Máximo 6 variables para mantener la tabla legible.");

  const subexprs = collectSubexpressions(tree); // ya en orden de resolución
  const rows = [];
  const nRows = 1 << variables.length;
  for (let r = 0; r < nRows; r++) {
    const values = {};
    variables.forEach((v, idx) => {
      // primera variable cambia más lento (orden convencional V, F, V, F...)
      const bit = (r >> (variables.length - 1 - idx)) & 1;
      values[v] = bit === 1;
    });
    const rowResults = subexprs.map(node => evaluate(node, values));
    rows.push({ values, rowResults });
  }

  return {
    tree,
    variables,
    subexprs,
    rows,
    finalExpr: exprToString(tree),
  };
}
