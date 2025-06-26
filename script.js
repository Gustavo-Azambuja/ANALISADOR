const grammar = {
  S: [['a', 'A', 'D'], ['b', 'B', 'c']],
  A: [['c', 'B', 'd'], ['b', 'D', 'a']],
  B: [['b', 'C', 'd'], ['ε']],
  C: [['c', 'D', 'd']],
  D: [['d', 'B'], ['a', 'C', 'b']]
};

const terminals = ['a', 'b', 'c', 'd', '$'];
const nonTerminals = ['S', 'A', 'B', 'C', 'D'];

const FIRST = {};
nonTerminals.forEach(nt => FIRST[nt] = new Set());

let tableReady = false;

function computeFirst() {
  let changed;
  do {
    changed = false;
    for (const [nt, productions] of Object.entries(grammar)) {
      for (const prod of productions) {
        for (const symbol of prod) {
          if (terminals.includes(symbol)) {
            if (!FIRST[nt].has(symbol)) {
              FIRST[nt].add(symbol);
              changed = true;
            }
            break;
          } else if (symbol === 'ε') {
            if (!FIRST[nt].has('ε')) {
              FIRST[nt].add('ε');
              changed = true;
            }
            break;
          } else {
            const sizeBefore = FIRST[nt].size;
            for (let f of FIRST[symbol]) {
              if (f !== 'ε') FIRST[nt].add(f);
            }
            if (!FIRST[symbol].has('ε')) break;
            if (sizeBefore !== FIRST[nt].size) changed = true;
          }
        }
      }
    }
  } while (changed);
}

const FOLLOW = {};
nonTerminals.forEach(nt => FOLLOW[nt] = new Set());
FOLLOW['S'].add('$');

function computeFollow() {
  let changed;
  do {
    changed = false;
    for (const [nt, productions] of Object.entries(grammar)) {
      for (const prod of productions) {
        for (let i = 0; i < prod.length; i++) {
          const B = prod[i];
          if (nonTerminals.includes(B)) {
            let firstBeta = new Set();
            let nullable = true;
            for (let j = i + 1; j < prod.length && nullable; j++) {
              const symbol = prod[j];
              if (terminals.includes(symbol)) {
                firstBeta.add(symbol);
                nullable = false;
              } else {
                FIRST[symbol].forEach(f => {
                  if (f !== 'ε') firstBeta.add(f);
                });
                if (!FIRST[symbol].has('ε')) nullable = false;
              }
            }
            const sizeBefore = FOLLOW[B].size;
            firstBeta.forEach(f => FOLLOW[B].add(f));
            if (nullable) FOLLOW[nt].forEach(f => FOLLOW[B].add(f));
            if (FOLLOW[B].size !== sizeBefore) changed = true;
          }
        }
      }
    }
  } while (changed);
}

const parsingTable = {};
nonTerminals.forEach(nt => parsingTable[nt] = {});

function buildParsingTable() {
  for (const [nt, productions] of Object.entries(grammar)) {
    for (const prod of productions) {
      const firstSet = firstOfString(prod);
      firstSet.forEach(symbol => {
        if (symbol !== 'ε') parsingTable[nt][symbol] = prod;
      });
      if (firstSet.has('ε')) {
        FOLLOW[nt].forEach(symbol => {
          parsingTable[nt][symbol] = prod;
        });
      }
    }
  }
  tableReady = true;
}

function firstOfString(symbols) {
  const result = new Set();
  for (const symbol of symbols) {
    if (terminals.includes(symbol)) {
      result.add(symbol);
      return result;
    } else if (symbol === 'ε') {
      result.add('ε');
      return result;
    } else {
      for (const f of FIRST[symbol]) {
        if (f !== 'ε') result.add(f);
      }
      if (!FIRST[symbol].has('ε')) return result;
    }
  }
  result.add('ε');
  return result;
}

function parseSentence(input) {
  if (!tableReady) return 'Tabela não pronta.';

  const stack = ['$', 'S'];
  const buffer = [...input.split(''), '$'];
  const trace = [];

  let i = 0;
  while (stack.length > 0) {
    const top = stack.pop();
    const current = buffer[0];
    trace.push({ stack: [...stack], input: [...buffer], top, current });

    if (terminals.includes(top) || top === '$') {
      if (top === current) buffer.shift();
      else return { result: 'Rejeitado', trace, iterations: i + 1 };
    } else if (parsingTable[top][current]) {
      const production = parsingTable[top][current];
      for (let j = production.length - 1; j >= 0; j--) {
        if (production[j] !== 'ε') stack.push(production[j]);
      }
    } else {
      return { result: 'Rejeitado', trace, iterations: i + 1 };
    }
    i++;
  }

  return { result: 'Aceito', trace, iterations: i };
}

function generateSentence(maxLength = 15) {
  let result = [];
  function expand(symbol) {
    if (terminals.includes(symbol)) return [symbol];
    const productions = grammar[symbol];
    const chosen = productions[Math.floor(Math.random() * productions.length)];
    return chosen.flatMap(s => s === 'ε' ? [] : expand(s));
  }
  do {
    result = expand('S');
  } while (result.length < 5);

  return result.join('').slice(0, maxLength);
}

function atualizarDadosAuxiliares() {
  let firstStr = "";
  for (const [nt, values] of Object.entries(FIRST)) {
    firstStr += `${nt} = ${[...values].join(", ")}\n`;
  }
  document.getElementById("first").textContent = firstStr;

  let followStr = "";
  for (const [nt, values] of Object.entries(FOLLOW)) {
    followStr += `${nt} = ${[...values].join(", ")}\n`;
  }
  document.getElementById("follow").textContent = followStr;

  const tabelaDiv = document.getElementById("tabela");
  let html = `<table><tr><th></th>`;
  terminals.forEach(term => {
    html += `<th>${term}</th>`;
  });
  html += `</tr>`;
  nonTerminals.forEach(nt => {
    html += `<tr><th>${nt}</th>`;
    terminals.forEach(term => {
      if (parsingTable[nt][term]) {
        html += `<td>${nt} → ${parsingTable[nt][term].join(' ')}</td>`;
      } else {
        html += `<td class="empty"></td>`;
      }
    });
    html += `</tr>`;
  });
  html += `</table>`;
  tabelaDiv.innerHTML = html;
}

computeFirst();
computeFollow();
buildParsingTable();
atualizarDadosAuxiliares();

// novos botões:
let passoTrace = [];
let passoIndex = 0;

function analisarCompleto() {
  const sentenca = document.getElementById("input").value;
  const resultado = parseSentence(sentenca);

  document.getElementById("resultado").textContent = resultado.result;
  document.getElementById("iteracoes").textContent = `Interações: ${resultado.iterations}`;

  const pilhaBody = document.getElementById("pilhaBody");
  pilhaBody.innerHTML = "";

  resultado.trace.forEach((t, i) => {
    const row = document.createElement("tr");

    const passoCell = document.createElement("td");
    passoCell.textContent = i + 1;

    const pilhaCell = document.createElement("td");
    pilhaCell.textContent = [...t.stack, t.top].join(" ");

    const entradaCell = document.createElement("td");
    entradaCell.textContent = t.input.join(" ");

    const acaoCell = document.createElement("td");
    if (t.top === t.current && terminals.includes(t.top)) {
      acaoCell.textContent = `Ler → ${t.current}`;
    } else if (parsingTable[t.top] && parsingTable[t.top][t.current]) {
      acaoCell.textContent = `${t.top} → ${parsingTable[t.top][t.current].join(' ')}`;
    } else {
      acaoCell.textContent = "Erro";
    }

    row.appendChild(passoCell);
    row.appendChild(pilhaCell);
    row.appendChild(entradaCell);
    row.appendChild(acaoCell);

    pilhaBody.appendChild(row);
  });

  document.getElementById("proximoBtn").style.display = "none";
}

function iniciarPassoAPasso() {
  const sentenca = document.getElementById("input").value;
  const resultado = parseSentence(sentenca);

  passoTrace = resultado.trace;
  passoIndex = 0;

  document.getElementById("resultado").textContent = resultado.result;
  document.getElementById("iteracoes").textContent = `Interações: ${resultado.iterations}`;
  document.getElementById("pilhaBody").innerHTML = "";

  if (passoTrace.length > 0) {
    document.getElementById("proximoBtn").style.display = "inline-block";
  } else {
    document.getElementById("proximoBtn").style.display = "none";
  }
}

function proximoPasso() {
  if (passoIndex < passoTrace.length) {
    const t = passoTrace[passoIndex];
    const row = document.createElement("tr");

    const passoCell = document.createElement("td");
    passoCell.textContent = passoIndex + 1;

    const pilhaCell = document.createElement("td");
    pilhaCell.textContent = [...t.stack, t.top].join(" ");

    const entradaCell = document.createElement("td");
    entradaCell.textContent = t.input.join(" ");

    const acaoCell = document.createElement("td");
    if (t.top === t.current && terminals.includes(t.top)) {
      acaoCell.textContent = `Ler → ${t.current}`;
    } else if (parsingTable[t.top] && parsingTable[t.top][t.current]) {
      acaoCell.textContent = `${t.top} → ${parsingTable[t.top][t.current].join(' ')}`;
    } else {
      acaoCell.textContent = "Erro";
    }

    row.appendChild(passoCell);
    row.appendChild(pilhaCell);
    row.appendChild(entradaCell);
    row.appendChild(acaoCell);

    document.getElementById("pilhaBody").appendChild(row);
    passoIndex++;
  }

  if (passoIndex >= passoTrace.length) {
    document.getElementById("proximoBtn").style.display = "none";
  }
}

function gerar() {
  const sentenca = generateSentence();
  document.getElementById("input").value = sentenca;
  analisarCompleto();
}
