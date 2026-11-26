/*
 * Ações da arena (fase 2): de onde vêm os ataques, as perícias e as resistências de cada participante,
 * e como o dano rolado vira PV/SAN perdidos depois de resistências, vulnerabilidades e imunidades.
 * Funções puras; o bestiário e a lista de rituais são grandes e chegam por import() (carregarLivros).
 */
import { lerCritico, lerFormula } from '../../../../components/Dados/formula';
import { danosDe, nomeDoTipo, partesParaRolar, tipoDaPalavra } from '../../../../sistemas/ordemParanormal/danos';
import { ITENS } from '../../../../sistemas/ordemParanormal/itens';
import { armaPeloNome, ehCura, itensUsaveis } from './itensEmCombate';
import { GRAUS, PERICIAS } from '../../../../sistemas/ordemParanormal/modelo';
import {
  bonusPericia, calcularDefesa, custoDoRitual, dadosDoTeste, dtDeRituais, ehMonstro, ehNpcSimples,
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
  const cadastrados = tipo === 'npc' ? dados.npc?.ataques ?? [] : dados.ataques ?? [];
  // Agente: as armas do inventário também atacam (as que já não têm um ataque com o mesmo nome)
  const lista = tipo === 'agente' ? [...cadastrados, ...armasDoInventario(dados, cadastrados)] : cadastrados;
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
    const arma = a.arma ?? armaPeloNome(a.nome);
    return [{
      id: a.id ?? a.uid ?? `a${i}`,
      nome: a.nome || 'Ataque',
      arma,                                    // id da arma do livro (desenho da carta)
      ehArma: Boolean(arma || a.doInventario),  // vai para a aba Armas (senão, Ataques)
      alcance,
      formula,
      partes,
      critico: lerCritico(a.critico ?? a.especial),
      corpo,
      testePadrao,
    }];
  });
}

// Letra do tipo de dano do livro → tipo do dano
const DANO_DO_LIVRO = { C: 'corte', I: 'impacto', P: 'perfuracao', B: 'balistico', F: 'fogo' };

/**
 * Armas do inventário no formato de ataque da ficha. Vale a arma do livro (item.arma) e a do
 * catálogo da campanha que não deixou ataque na ficha. "1d8/1d10" (uma ou duas mãos): a primeira.
 * Arma corpo a corpo que pode ser arremessada (Faca, Lança) ataca com Luta.
 */
function armasDoInventario(dados, cadastrados) {
  const nomes = new Set(cadastrados.map((a) => (a.nome ?? '').trim().toLowerCase()));
  return (dados.inventario ?? []).flatMap((item) => {
    const arma = item.arma ?? ITENS[item.id]?.arma;
    if (!arma || nomes.has((item.nome ?? '').trim().toLowerCase())) return [];
    const arremesso = arma.alcance && /arremess/i.test(item.descricao ?? ITENS[item.id]?.descricao ?? '');
    let alcance = arma.alcance ?? 'Corpo a corpo';
    if (arremesso) alcance = `Corpo a corpo · arremesso ${arma.alcance.toLowerCase()}`;
    return [{
      id: `inv:${item.uid}`,
      nome: item.nome,
      arma: ITENS[item.id]?.arma ? item.id : armaPeloNome(item.nome),
      doInventario: true,
      teste: '',
      danos: [{ formula: String(arma.dano).split('/')[0], tipo: DANO_DO_LIVRO[arma.tipoDano] ?? '' }],
      critico: arma.critico,
      alcance,
    }];
  });
}

/** Soma um ajuste (+2, −5) a uma fórmula de teste */
export function comAjuste(formula, ajuste) {
  if (!ajuste) return formula;
  return `${formula}${ajuste > 0 ? '+' : '−'}${Math.abs(ajuste)}`;
}

/*
 * ---------- Reações do alvo (todo agente) ----------
 * Regra da mesa: todo agente pode Esquivar e Bloquear. Sem treino em Reflexos/Fortitude, conta
 * como treinado só aqui na reação (a ficha continua mostrando a perícia como está).
 */
const comoTreinado = (dados, id) => bonusPericia(dados, id) + (ehTreinada(dados, id) ? 0 : GRAUS.treinado.bonus);

export function reacoesDe(base) {
  if (base.tipo !== 'agente') return { esquiva: null, bloqueio: null };
  const { dados } = base;
  const esquiva = comoTreinado(dados, 'reflexos');
  return {
    esquiva: { bonus: esquiva, defesa: calcularDefesa(dados) + esquiva },
    bloqueio: { rd: comoTreinado(dados, 'fortitude') },
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

/** Os grupos da mão, na ordem das abas */
export const GRUPOS_DA_MAO = [
  { id: 'armas', rotulo: 'Armas' },
  { id: 'ataques', rotulo: 'Ataques' },
  { id: 'rituais', rotulo: 'Rituais' },
  { id: 'curas', rotulo: 'Curas' },
  { id: 'outros', rotulo: 'Outros' },
];

const ehRitualDeCura = (r) => /^\s*cura/i.test(r.dano ?? '');

/**
 * A mão de quem age, separada em grupos (abas): armas (ataques com arma, com o desenho dela),
 * ataques (os outros: garras, mordidas...), rituais, curas (itens de cura e rituais que curam) e
 * outros (Perícia, Usar item, Ação livre e, só o mestre, Condição). Cada carta abre a ação já
 * escolhida no painel. [{ id, grupo, aba, escolha, item?, tipo, nome, detalhe, icone, arma?, tom, elemento? }]
 */
export function cartasDaMao(ator, fichas, livro, mestre) {
  const base = baseDe(ator, fichas, livro);
  const ataques = ataquesDe(base);
  const cartas = ataques.map((a) => ({
    id: `atacar:${a.id}`,
    grupo: a.ehArma ? 'armas' : 'ataques',
    aba: 'atacar',
    escolha: a.id,
    tipo: a.ehArma ? 'Arma' : 'Ataque',
    nome: a.nome,
    detalhe: a.partes.map((p) => `${p.formula} ${p.rotulo}`).join(' + ') || 'sem dano',
    icone: '⚔',
    arma: a.arma,
    tom: 'ataque',
  }));
  if (!ataques.length) {
    cartas.push({ id: 'atacar', grupo: 'ataques', aba: 'atacar', tipo: 'Ataque', nome: 'Atacar', detalhe: 'sem ataques na ficha', icone: '⚔', tom: 'ataque' });
  }
  for (const r of rituaisDe(base, livro)) {
    const carta = {
      aba: 'ritual',
      escolha: r.id,
      tipo: `Ritual · ${r.circulo}º`,
      nome: r.nome,
      detalhe: `${r.formas[0]?.custo ?? '—'} PE${r.formas[0]?.dano ? ` · ${r.formas[0].dano}` : ''}`,
      icone: '✦',
      tom: 'ritual',
      elemento: r.elemento,
    };
    cartas.push({ ...carta, id: `ritual:${r.id}`, grupo: 'rituais' });
    if (ehRitualDeCura(r)) cartas.push({ ...carta, id: `cura:ritual:${r.id}`, grupo: 'curas' });
  }
  if (base.tipo === 'agente') {
    const usaveis = itensUsaveis(base.dados);   // as armas ficam nas cartas de ataque
    for (const item of usaveis.filter(ehCura)) {
      cartas.push({
        id: `cura:item:${item.uid}`, grupo: 'curas', aba: 'outros', escolha: 'item', item: item.uid,
        tipo: 'Item · cura', nome: item.nome, detalhe: 'usar em alguém', icone: '✚', tom: 'item',
      });
    }
  }
  cartas.push({ id: 'teste', grupo: 'outros', aba: 'teste', tipo: 'Teste', nome: 'Perícia', detalhe: 'rolar um teste', icone: '⚄', tom: 'teste' });
  if (base.tipo === 'agente') {
    const n = itensUsaveis(base.dados).length;
    cartas.push({
      id: 'outros:item', grupo: 'outros', aba: 'outros', escolha: 'item', tipo: 'Item', nome: 'Usar item',
      detalhe: n ? `${n} no inventário` : 'inventário vazio', icone: '✚', tom: 'item',
    });
  }
  cartas.push({ id: 'outros:livre', grupo: 'outros', aba: 'outros', escolha: 'livre', tipo: 'Livre', nome: 'Ação livre', detalhe: 'descrever o que faz', icone: '✎', tom: 'livre' });
  if (mestre) {
    cartas.push({ id: 'outros:condicao', grupo: 'outros', aba: 'outros', escolha: 'condicao', tipo: 'Condição', nome: 'Condição', detalhe: 'aplicar em alguém', icone: '◈', tom: 'condicao' });
  }
  return cartas;
}

export { nomeDoTipo };
