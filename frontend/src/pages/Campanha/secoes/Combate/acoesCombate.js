/*
 * Ações da arena (fase 2): de onde vêm os ataques, as perícias e as resistências de cada participante,
 * e como o dano rolado vira PV/SAN perdidos depois de resistências, vulnerabilidades e imunidades.
 * Funções puras; o bestiário e a lista de rituais são grandes e chegam por import() (carregarLivros).
 */
import { lerCritico, lerFormula } from '../../../../components/Dados/formula';
import { danosDe, nomeDoTipo, partesParaRolar, tipoDaPalavra } from '../../../../sistemas/ordemParanormal/danos';
import { PERICIAS } from '../../../../sistemas/ordemParanormal/modelo';
import {
  bonusPericia, calcularBloqueio, calcularEsquiva, custoDoRitual, dadosDoTeste, dtDeRituais, ehMonstro, ehNpcSimples,
  ehTreinada, limitePePorTurno, rdDaProtecao,
} from '../../../../sistemas/ordemParanormal/regras';
import { formulaDoTeste, lerListaDeTestes } from '../../../../sistemas/ordemParanormal/rolagens';

/* ---------- Livros (bestiário e rituais), baixados uma vez ---------- */
let livros = null;
export function carregarLivros() {
  livros ??= Promise.all([
    import('../../../../sistemas/ordemParanormal/monstros'),
    import('../../../../sistemas/ordemParanormal/rituais'),
  ]).then(([m, r]) => ({
    monstros: Object.fromEntries(m.MONSTROS.map((x) => [x.id, x])),
    rituais: Object.fromEntries(r.RITUAIS.map((x) => [x.id, x])),
  }));
  return livros;
}

/**
 * O "corpo" de regras de um participante:
 * { tipo: 'agente' | 'monstro' | 'npc', dados } — monstro vale para ficha de monstro e cópia do livro.
 */
export function baseDe(p, fichas, livro) {
  if (p.catalogo) return { tipo: 'monstro', dados: livro?.monstros[p.catalogo] ?? null };
  const ficha = fichas[p.fichaId];
  if (!ficha) return { tipo: 'nenhum', dados: null };
  if (ehMonstro(ficha.dados)) return { tipo: 'monstro', dados: ficha.dados };
  if (ehNpcSimples(ficha.dados)) return { tipo: 'npc', dados: ficha.dados };
  return { tipo: 'agente', dados: ficha.dados };
}

/* ---------- Ataques ---------- */
const corpoACorpo = (alcance) => {
  if (!alcance) return null;
  if (/corpo/i.test(alcance)) return true;
  if (/dist|curto|m[eé]dio|longo|arremesso/i.test(alcance)) return false;
  return null;
};

/**
 * [{ id, nome, alcance, formula, partes, critico, corpo, testePadrao }]
 * Ataque sem teste preenchido (ou ilegível) não some: usa Luta (Pontaria, se for à distância) para
 * agentes e 1d20 para os outros, e avisa em "testePadrao". Só some a linha totalmente vazia.
 */
export function ataquesDe(base) {
  const { tipo, dados } = base;
  if (!dados) return [];
  const lista = tipo === 'npc' ? dados.npc?.ataques ?? [] : dados.ataques ?? [];
  return lista.flatMap((a, i) => {
    const partes = partesParaRolar(danosDe(a, dados.elemento));
    if (!a.nome && !partes.length && !a.teste) return [];
    const alcance = a.alcance ?? '';
    const corpo = corpoACorpo(alcance || a.especial);
    let formula = formulaDoTeste(a.teste, tipo === 'agente' ? dados : null);
    let testePadrao = null;
    if (!formula) {
      if (tipo === 'agente') {
        const pericia = corpo === false ? 'pontaria' : 'luta';
        formula = dadosDoTeste(dados, pericia);
        testePadrao = pericia === 'luta' ? 'Luta' : 'Pontaria';
      } else {
        formula = '1d20';
        testePadrao = '1d20';
      }
    }
    return [{
      id: a.id ?? a.uid ?? `a${i}`,
      nome: a.nome || 'Ataque',
      alcance,
      formula,
      partes,
      critico: lerCritico(a.critico ?? a.especial),
      corpo,
      testePadrao,
    }];
  });
}

/** Soma um ajuste (+2, −5) a uma fórmula de teste */
export function comAjuste(formula, ajuste) {
  if (!ajuste) return formula;
  return `${formula}${ajuste > 0 ? '+' : '−'}${Math.abs(ajuste)}`;
}

/* ---------- Reações do alvo (só agentes treinados) ---------- */
export function reacoesDe(base) {
  if (base.tipo !== 'agente') return { esquiva: null, bloqueio: null };
  const { dados } = base;
  return {
    esquiva: ehTreinada(dados, 'reflexos') ? { bonus: bonusPericia(dados, 'reflexos'), defesa: calcularEsquiva(dados) } : null,
    bloqueio: calcularBloqueio(dados) != null ? { rd: calcularBloqueio(dados) } : null,
  };
}

/* ---------- Resistências, vulnerabilidades e imunidades ---------- */
// "Balístico, impacto e perfuração 5; Sangue 10" → { balistico: 5, impacto: 5, perfuracao: 5, sangue: 10 }
// "Dano 50" (ou "RD 5") vale para tudo: chave "todos"
function lerResistencias(texto) {
  const mapa = {};
  for (const trecho of String(texto ?? '').split(/[;\n]/)) {
    const achado = trecho.trim().match(/^(.*?)\s*(\d+)\s*$/);
    if (!achado) continue;
    const valor = Number(achado[2]);
    const nomes = achado[1].split(/,|\se\s/).map((n) => n.trim()).filter(Boolean);
    for (const nome of nomes) {
      const tipo = /^(dano|rd|todos?)$/i.test(nome) ? 'todos' : tipoDaPalavra(nome);
      if (tipo) mapa[tipo] = Math.max(mapa[tipo] ?? 0, valor);
    }
  }
  return mapa;
}

// "Morte", "Sangue e mental", "Condições; dano" → Set de tipos ("todos" quando diz "dano")
function lerTipos(texto) {
  const tipos = new Set();
  for (const nome of String(texto ?? '').split(/[,;\n]|\se\s/)) {
    const limpo = nome.trim();
    if (/^(todo\s+)?dano$/i.test(limpo)) tipos.add('todos');
    const tipo = tipoDaPalavra(limpo);
    if (tipo) tipos.add(tipo);
  }
  return tipos;
}

export function defesasContraDano(base) {
  const { tipo, dados } = base;
  if (!dados || tipo === 'npc') return { rd: {}, vulneravel: new Set(), imune: new Set() };
  const rd = lerResistencias(dados.resistencias);
  if (tipo === 'agente') {
    // Proteção pesada: RD contra balístico, corte, impacto e perfuração
    const protecao = rdDaProtecao(dados);
    for (const t of ['balistico', 'corte', 'impacto', 'perfuracao']) {
      if (protecao) rd[t] = (rd[t] ?? 0) + protecao;
    }
  }
  return { rd, vulneravel: lerTipos(dados.vulnerabilidades), imune: lerTipos(dados.imunidades) };
}

/**
 * Dano rolado (partes da mesa: { rotulo, total }) contra as defesas do alvo.
 * metade: passou na resistência de um ritual "reduz à metade". rdExtra: Bloqueio (vale para o golpe todo).
 * Dano mental vai para a SAN (quem não tem SAN perde PV).
 * Devolve { linhas: [{ rotulo, bruto, final, notas }], pv, san, rdExtra }
 */
export function calcularDano(partes, defesas, { metade = false, rdExtra = 0, temSan = false } = {}) {
  const linhas = partes.map((p) => {
    const tipo = tipoDaPalavra(p.rotulo);
    const notas = [];
    let valor = p.total;
    if (metade) { valor = Math.floor(valor / 2); notas.push('metade'); }
    if ((tipo && defesas.imune.has(tipo)) || defesas.imune.has('todos')) {
      return { rotulo: p.rotulo || 'dano', tipo, bruto: p.total, final: 0, notas: [...notas, 'imune'] };
    }
    if (tipo && defesas.vulneravel.has(tipo)) { valor *= 2; notas.push('vulnerável ×2'); }
    const rd = Math.max(tipo ? defesas.rd[tipo] ?? 0 : 0, defesas.rd.todos ?? 0);
    if (rd) { valor = Math.max(0, valor - rd); notas.push(`RD ${rd}`); }
    return { rotulo: p.rotulo || 'dano', tipo, bruto: p.total, final: valor, notas };
  });

  const vaiParaSan = (l) => l.tipo === 'mental' && temSan;
  let pv = linhas.filter((l) => !vaiParaSan(l)).reduce((s, l) => s + l.final, 0);
  const san = linhas.filter(vaiParaSan).reduce((s, l) => s + l.final, 0);
  const bloqueado = Math.min(rdExtra, pv);
  pv -= bloqueado;
  return { linhas, pv, san, bloqueado };
}

/* ---------- Testes (perícias e resistências) ---------- */
const RESISTENCIAS = [
  { id: 'fortitude', nome: 'Fortitude' },
  { id: 'reflexos', nome: 'Reflexos' },
  { id: 'vontade', nome: 'Vontade' },
];

/** Fórmula de Fortitude/Reflexos/Vontade de qualquer participante */
export function formulaDeResistencia(base, id) {
  const { tipo, dados } = base;
  if (!dados) return '1d20';
  if (tipo === 'agente') return dadosDoTeste(dados, id);
  if (tipo === 'monstro') return lerFormula(dados[id]) ? dados[id] : '1d20';
  const bonus = dados.npc?.pericias?.find((p) => p.id === id)?.bonus ?? 0;
  return bonus ? `1d20+${bonus}` : '1d20';
}

/** Perícias que dá para rolar: [{ id, nome, formula }] */
export function periciasDe(base) {
  const { tipo, dados } = base;
  if (!dados) return [];
  if (tipo === 'agente') return PERICIAS.map((p) => ({ id: p.id, nome: p.nome, formula: dadosDoTeste(dados, p.id) }));
  if (tipo === 'monstro') {
    const fixas = [
      ...RESISTENCIAS.map((r) => ({ ...r, formula: formulaDeResistencia(base, r.id) })),
      { id: 'percepcao', nome: 'Percepção', formula: dados.sentidos?.percepcao || '1d20' },
      { id: 'iniciativa', nome: 'Iniciativa', formula: dados.sentidos?.iniciativa || '1d20' },
    ];
    const extras = lerListaDeTestes(dados.pericias).map((t, i) => ({ id: `extra${i}`, nome: t.nome, formula: t.formula }));
    return [...fixas, ...extras];
  }
  const destaque = (dados.npc?.pericias ?? []).map((p) => ({
    id: p.id,
    nome: PERICIAS.find((x) => x.id === p.id)?.nome ?? p.id,
    formula: p.bonus ? `1d20+${p.bonus}` : '1d20',
  }));
  const faltam = RESISTENCIAS.filter((r) => !destaque.some((d) => d.id === r.id))
    .map((r) => ({ ...r, formula: formulaDeResistencia(base, r.id) }));
  return [...destaque, ...faltam];
}

/* ---------- Rituais ---------- */
const FORMAS = [
  { id: 'basico', nome: 'Básico' },
  { id: 'discente', nome: 'Discente' },
  { id: 'verdadeiro', nome: 'Verdadeiro' },
];

/** Rituais que o agente conhece, com o que a arena precisa */
export function rituaisDe(base, livro) {
  if (base.tipo !== 'agente' || !livro) return [];
  const { dados } = base;
  return (dados.rituais ?? []).flatMap((conhecido) => {
    const ritual = livro.rituais[conhecido.id];
    if (!ritual) return [];
    const formas = FORMAS.filter((f) => f.id === 'basico' || ritual[f.id]).map((f) => ({
      ...f,
      custo: custoDoRitual(ritual, f.id),
      permitida: custoDoRitual(ritual, f.id) <= limitePePorTurno(dados),
      texto: f.id === 'basico' ? ritual.efeito : ritual[f.id].texto,
      dano: danoDaForma(ritual, f.id),
    }));
    return [{ ...ritual, elemento: conhecido.elemento ?? ritual.elementos[0], formas, dt: dtDeRituais(dados) }];
  });
}

// "3d6 de eletricidade" (básico) ou o primeiro dano escrito no texto da forma ("+2d6", "3d8 de dano de Conhecimento")
function danoDaForma(ritual, forma) {
  if (forma === 'basico') return ritual.dano && !/^\+/.test(ritual.dano.trim()) ? ritual.dano : '';
  const achado = ritual[forma]?.texto?.match(/(\d+d\d+(?:\s*\+\s*\d+)?)(?:\s+de)?(?:\s+dano)?(?:\s+de)?\s+([A-Za-zÀ-ú]+)/);
  return achado ? `${achado[1]} ${achado[2]}` : '';
}

/** "Vontade anula" → { pericia: 'vontade', efeito: 'anula' }; "Reflexos reduz à metade" → metade; senão "parcial" */
export function lerResistenciaDoRitual(texto) {
  if (!texto) return null;
  const t = texto.toLowerCase();
  const pericia = ['fortitude', 'reflexos', 'vontade'].find((p) => t.includes(p));
  if (!pericia) return null;
  let efeito = 'parcial';
  if (t.includes('metade')) efeito = 'metade';
  else if (t.includes('anula') || t.includes('evita')) efeito = 'anula';
  else if (t.includes('desacredita')) efeito = 'anula';
  return { pericia, efeito, texto };
}

/* ---------- O que dá para fazer na arena ---------- */
/** O que cada carta pede de alvo: um só (clicando no campo troca) ou vários (clicando liga/desliga) */
export function miraDaCarta(carta) {
  if (!carta) return null;
  if (carta.aba === 'atacar') return 'um';
  if (carta.aba === 'ritual') return 'varios';
  if (carta.aba === 'outros' && carta.escolha !== 'livre') return 'um';
  return null;
}

/**
 * A mão de quem age: uma carta por ataque e por ritual da ficha, mais Teste, Item, Ação livre e
 * (só o mestre) Condição. Cada carta abre a ação já escolhida no painel.
 * [{ id, aba, escolha, tipo, nome, detalhe, icone, tom, elemento }]
 */
export function cartasDaMao(ator, fichas, livro, mestre) {
  const base = baseDe(ator, fichas, livro);
  const ataques = ataquesDe(base);
  const cartas = ataques.map((a) => ({
    id: `atacar:${a.id}`,
    aba: 'atacar',
    escolha: a.id,
    tipo: 'Ataque',
    nome: a.nome,
    detalhe: a.partes.map((p) => `${p.formula} ${p.rotulo}`).join(' + ') || 'sem dano',
    icone: '⚔',
    tom: 'ataque',
  }));
  if (!ataques.length) {
    cartas.push({ id: 'atacar', aba: 'atacar', tipo: 'Ataque', nome: 'Atacar', detalhe: 'sem ataques na ficha', icone: '⚔', tom: 'ataque' });
  }
  for (const r of rituaisDe(base, livro)) {
    cartas.push({
      id: `ritual:${r.id}`,
      aba: 'ritual',
      escolha: r.id,
      tipo: `Ritual · ${r.circulo}º`,
      nome: r.nome,
      detalhe: `${r.formas[0]?.custo ?? '—'} PE${r.formas[0]?.dano ? ` · ${r.formas[0].dano}` : ''}`,
      icone: '✦',
      tom: 'ritual',
      elemento: r.elemento,
    });
  }
  cartas.push({ id: 'teste', aba: 'teste', tipo: 'Teste', nome: 'Perícia', detalhe: 'rolar um teste', icone: '⚄', tom: 'teste' });
  if (base.tipo === 'agente') {
    const n = base.dados?.inventario?.length ?? 0;
    cartas.push({
      id: 'outros:item', aba: 'outros', escolha: 'item', tipo: 'Item', nome: 'Usar item',
      detalhe: n ? `${n} no inventário` : 'inventário vazio', icone: '✚', tom: 'item',
    });
  }
  cartas.push({ id: 'outros:livre', aba: 'outros', escolha: 'livre', tipo: 'Livre', nome: 'Ação livre', detalhe: 'descrever o que faz', icone: '✎', tom: 'livre' });
  if (mestre) {
    cartas.push({ id: 'outros:condicao', aba: 'outros', escolha: 'condicao', tipo: 'Condição', nome: 'Condição', detalhe: 'aplicar em alguém', icone: '◈', tom: 'condicao' });
  }
  return cartas;
}

export { nomeDoTipo };
