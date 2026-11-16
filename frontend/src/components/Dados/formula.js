/*
 * Fórmulas de dados no jeito do livro de Ordem Paranormal:
 *  - teste: "3d20+5" rola 3 d20 e fica com o MAIOR; "2d20↓" (atributo 0) fica com o menor
 *  - dano:  "2d6+3" soma tudo; no crítico os DADOS se multiplicam, o bônus fixo não
 * Ignora o que vem depois da fórmula ("2d8+5 corte") e aceita só um bônus ("+5" vira 1d20+5 num teste).
 */

const INICIO = /^[\s\d+\-−↓dD]*/;
const TERMO = /([+-]?)\s*(?:(\d*)\s*d\s*(\d+)|(\d+))/gi;
const MAX_DADOS = 40;   // trava de segurança para fórmulas absurdas

/** "3d20+5" → { grupos: [{ qtd: 3, lados: 20 }], bonus: 5, pior: false }; sem número nenhum → null */
export function lerFormula(texto) {
  const trecho = String(texto ?? '').match(INICIO)[0].replace(/−/g, '-');
  const grupos = [];
  let bonus = 0;
  let achou = false;
  for (const [, sinal, qtd, lados, numero] of trecho.matchAll(TERMO)) {
    achou = true;
    const negativo = sinal === '-';
    if (lados) grupos.push({ qtd: qtd === '' ? 1 : Number(qtd), lados: Number(lados), negativo });
    else bonus += negativo ? -Number(numero) : Number(numero);
  }
  return achou ? { grupos, bonus, pior: trecho.includes('↓') } : null;
}

export function escreverFormula({ grupos, bonus, pior }, mult = 1) {
  let texto = grupos
    .map((g, i) => `${g.negativo ? '−' : i ? '+' : ''}${g.qtd * mult}d${g.lados}`)
    .join('');
  if (pior) texto += '↓';
  if (bonus) texto += bonus > 0 ? `+${bonus}` : `−${-bonus}`;
  return texto || '0';
}

/** Margem de ameaça e multiplicador escritos à mão: "19/x3", "Crítico 18", "x4" (padrão 20 / x2) */
export function lerCritico(texto = '') {
  const t = String(texto);
  const margem = t.match(/cr[ií]tico\s*:?\s*(1\d|20)\b/i) ?? t.match(/\b(1\d|20)\s*\/\s*[x×]/i);
  const mult = t.match(/[x×]\s*(\d)\b/i);
  return { margem: margem ? Number(margem[1]) : 20, mult: mult ? Number(mult[1]) : 2 };
}

/* ---------------- Rolagem ---------------- */

function sortear(lados) {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return (n[0] % lados) + 1;
}

// Como cada dado entra na mesa: quantas voltas dá e de onde vem
const aoAcaso = (min, max) => min + Math.random() * (max - min);
const sinal = () => (Math.random() < 0.5 ? -1 : 1);
function comLancamento(dados) {
  return dados.map((dado, i) => ({
    ...dado,
    rx: sinal() * aoAcaso(540, 900),
    ry: sinal() * aoAcaso(360, 720),
    rz: sinal() * aoAcaso(90, 360),
    dx: aoAcaso(-260, 260),
    atraso: i * 70,
  }));
}

const repetir = (qtd, lados, extra = {}) =>
  Array.from({ length: Math.min(qtd, MAX_DADOS) }, () => ({ lados, valor: sortear(lados), ...extra }));

// O grupo de d20 que decide o teste (sem d20 na fórmula, "+5" por exemplo, vale 1d20)
const grupoPrincipal = (formula) => formula.grupos.find((g) => g.lados === 20 && !g.negativo) ?? { qtd: 1, lados: 20 };

/** Quantos d20 o teste rola: 0d20 (atributo zero) vira 2d20 ficando com o menor */
export function qtdDeD20(formula) {
  const { qtd } = grupoPrincipal(formula);
  return Math.min(qtd === 0 ? 2 : qtd, MAX_DADOS);
}

/** Teste: vários d20, fica o maior (ou o menor com ↓ / 0d20). Outros dados da fórmula somam. */
export function rolarTeste(formula) {
  const principal = grupoPrincipal(formula);
  const pior = formula.pior || principal.qtd === 0;
  const d20 = repetir(qtdDeD20(formula), 20).map((d) => d.valor);
  const natural = pior ? Math.min(...d20) : Math.max(...d20);
  const escolhido = d20.indexOf(natural);

  const extras = formula.grupos
    .filter((g) => g !== principal)
    .flatMap((g) => repetir(g.qtd, g.lados, { negativo: g.negativo, usado: true }));
  const bonus = formula.bonus + extras.reduce((s, d) => s + (d.negativo ? -d.valor : d.valor), 0);

  return {
    tipo: 'teste',
    natural,
    pior,
    qtd: d20.length,
    bonus,
    total: natural + bonus,
    dados: comLancamento([...d20.map((valor, i) => ({ lados: 20, valor, usado: i === escolhido })), ...extras]),
  };
}

/** Dano: soma tudo. No crítico (mult > 1) só os dados se multiplicam. */
export function rolarDano(formula, mult = 1) {
  const dados = formula.grupos.flatMap((g) => repetir(g.qtd * mult, g.lados, { negativo: g.negativo, usado: true }));
  const soma = dados.reduce((s, d) => s + (d.negativo ? -d.valor : d.valor), 0);
  return {
    tipo: 'dano',
    mult,
    bonus: formula.bonus,
    total: Math.max(0, soma + formula.bonus),
    dados: comLancamento(dados),
  };
}
