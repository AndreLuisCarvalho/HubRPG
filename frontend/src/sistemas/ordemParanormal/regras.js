// Como o sistema CALCULA. Funções puras: recebem dados, devolvem resultado.
import { CLASSES, GRAUS, NEX, ORIGENS, PERICIAS, RECURSOS } from './modelo';

export function fichaInicial({ classe = 'combatente', jogador = '', origem = '' } = {}) {
  return {
    classe,
    nex: 5,
    origem,
    jogador,
    trilha: '',
    atributos: { agi: 1, for: 1, int: 1, pre: 1, vig: 1 },
    pericias: periciasDaOrigem({}, '', origem),
    kits: {},
    periciasOutros: {},
    atuais: {},
    defesa: { equipamento: 0, outros: 0 },
    deslocamento: 9,
    ataques: [],
    protecao: '',
    resistencias: '',
    proficiencias: '',
    descricao: '',
  };
}

// NEX 5% = 0 níveis extras, 10% = 1, ..., 99% = 19
const niveisExtras = (nex) => Math.max(NEX.indexOf(nex), 0);

/* ---------- Origem ---------- */
export const dadosDaOrigem = (dados) => ORIGENS[dados.origem] ?? null;

// Fichas antigas guardavam a origem como texto livre: nesse caso mostra o texto
export const nomeDaOrigem = (dados) => dadosDaOrigem(dados)?.nome ?? dados.origem ?? '';

// Números que a origem soma na ficha (Calejado, Cicatrizes, Dedicação, Patrulha…)
export function bonusDaOrigem(dados) {
  const e = dadosDaOrigem(dados)?.efeitos ?? {};
  const nex = dados.nex ?? 5;
  const niveis = niveisExtras(nex) + 1;                                   // quantos "5% de NEX" já tem
  const nexImpares = NEX.filter((n) => n <= nex && n > 5 && n % 10 === 5).length; // 15%, 25%…

  return {
    pv: (e.pvPorNex ?? 0) * niveis,
    san: (e.sanPorNex ?? 0) * niveis,
    pe: (e.peInicial ?? 0) + (e.pePorNexImpar ?? 0) * nexImpares,
    limitePe: e.limitePe ?? 0,
    defesa: e.defesa ?? 0,
    sanInicialMetade: Boolean(e.sanInicialMetade),
  };
}

// Troca de origem: tira o treino que a origem antiga deu e treina as perícias da nova.
// Só mexe em perícias no grau "treinado": se você evoluiu para veterano/expert, fica.
export function periciasDaOrigem(pericias, origemAntiga, origemNova) {
  const novas = { ...pericias };
  const daNova = ORIGENS[origemNova]?.pericias ?? [];

  (ORIGENS[origemAntiga]?.pericias ?? []).forEach((id) => {
    if (novas[id] === 'treinado' && !daNova.includes(id)) delete novas[id];
  });
  daNova.forEach((id) => {
    if (!novas[id]) novas[id] = 'treinado';
  });
  return novas;
}

export function calcularMaximos(dados) {
  const classe = CLASSES[dados.classe] ?? CLASSES.combatente;
  const { vig = 0, pre = 0 } = dados.atributos ?? {};
  const extras = niveisExtras(dados.nex);
  const origem = bonusDaOrigem(dados);
  const sanInicial = origem.sanInicialMetade ? Math.floor(classe.san.inicial / 2) : classe.san.inicial;

  return {
    pv: classe.pv.inicial + vig + extras * (classe.pv.porNex + vig) + origem.pv,
    pe: classe.pe.inicial + pre + extras * (classe.pe.porNex + pre) + origem.pe,
    san: sanInicial + extras * classe.san.porNex + origem.san,
  };
}

// Valor atual de cada recurso; se nunca foi mexido, começa cheio
export function calcularAtuais(dados) {
  const maximos = calcularMaximos(dados);
  return Object.fromEntries(
    Object.entries(maximos).map(([id, max]) => [id, Math.min(dados.atuais?.[id] ?? max, max)])
  );
}

// Formato comum a todos os sistemas: lista de recursos prontos para desenhar
export function recursos(dados) {
  const maximos = calcularMaximos(dados);
  const atuais = calcularAtuais(dados);
  return RECURSOS.map((r) => ({ ...r, atual: atuais[r.id], maximo: maximos[r.id] }));
}

// Limite de PE por turno = NEX/5, e 20 no NEX 99% (é o 20º nível)
export const limitePePorTurno = (dados) => niveisExtras(dados.nex ?? 5) + 1 + bonusDaOrigem(dados).limitePe;

export function deslocamento(dados) {
  const metros = dados.deslocamento ?? 9;
  return { metros, quadrados: Math.floor(metros / 1.5) };
}

/* ---------- Perícias ---------- */
export const grauDaPericia = (dados, id) => dados.pericias?.[id] ?? 'destreinado';
export const ehTreinada = (dados, id) => grauDaPericia(dados, id) !== 'destreinado';

export function bonusPericia(dados, id) {
  const treino = GRAUS[grauDaPericia(dados, id)]?.bonus ?? 0;
  const outros = Math.max(0, dados.periciasOutros?.[id] ?? 0);
  return treino + outros;
}

// Atributo 0 rola 2d20 e fica com o menor (↓)
export function dadosDoAtributo(dados, atributoId) {
  const valor = dados.atributos?.[atributoId] ?? 0;
  return valor === 0 ? '2d20↓' : `${valor}d20`;
}

// Perícias que pedem kit (Crime, Enganação, Medicina, Tecnologia)
export const precisaDeKit = (id) => Boolean(PERICIAS.find((p) => p.id === id)?.kit);
export const temKit = (dados, id) => Boolean(dados.kits?.[id]);
export const PENALIDADE_SEM_KIT = 5;

// Ex.: "3d20+5" (vai ser usado pelo rolador de dados). Sem kit, desconta a penalidade.
export function dadosDoTeste(dados, periciaId) {
  const pericia = PERICIAS.find((p) => p.id === periciaId);
  const semKit = precisaDeKit(periciaId) && !temKit(dados, periciaId);
  const bonus = bonusPericia(dados, periciaId) - (semKit ? PENALIDADE_SEM_KIT : 0);
  const base = dadosDoAtributo(dados, pericia.atributo);
  if (!bonus) return base;
  return bonus > 0 ? `${base}+${bonus}` : `${base}${bonus}`;
}

/* ---------- Defesa ---------- */
export function calcularDefesa(dados) {
  const { equipamento = 0, outros = 0 } = dados.defesa ?? {};
  return 10 + (dados.atributos?.agi ?? 0) + Math.max(0, equipamento) + Math.max(0, outros)
    + bonusDaOrigem(dados).defesa;
}

// Reações de defesa (livro p. 88). Só existem com a perícia treinada; senão devolvem null.
// Esquiva: soma o bônus de Reflexos na Defesa contra um ataque.
export const calcularEsquiva = (dados) =>
  ehTreinada(dados, 'reflexos') ? calcularDefesa(dados) + bonusPericia(dados, 'reflexos') : null;

// Bloqueio: contra ataque corpo a corpo, recebe RD igual ao bônus de Fortitude.
export const calcularBloqueio = (dados) =>
  ehTreinada(dados, 'fortitude') ? bonusPericia(dados, 'fortitude') : null;

export function resumo(dados) {
  const classe = CLASSES[dados.classe];
  return `${classe?.nome ?? 'Sem classe'} · NEX ${dados.nex ?? 5}%`;
}

/* ---------- Para as listas de fichas ---------- */

// Estado do agente, do mais grave para o mais leve (ou null se está tudo bem).
// Livro p. 88: PV 0 = morrendo · SAN 0 = enlouquecendo
//              PV abaixo da metade = machucado · SAN abaixo da metade = perturbado
export function estado(dados) {
  const lista = recursos(dados);
  const pv = lista.find((r) => r.id === 'pv');
  const san = lista.find((r) => r.id === 'san');
  const abaixoDaMetade = (r) => r.atual < r.maximo / 2;

  if (pv.atual === 0) return { id: 'morrendo', rotulo: 'Morrendo' };
  if (san.atual === 0) return { id: 'enlouquecendo', rotulo: 'Enlouquecendo' };
  if (abaixoDaMetade(pv)) return { id: 'machucado', rotulo: 'Machucado' };
  if (abaixoDaMetade(san)) return { id: 'perturbado', rotulo: 'Perturbado' };
  return null;
}

// Três informações de destaque para o card
export function destaques(dados) {
  return [
    { rotulo: 'Defesa', valor: calcularDefesa(dados) },
    { rotulo: 'Origem', valor: nomeDaOrigem(dados) || '—' },
    { rotulo: 'NEX', valor: `${dados.nex ?? 5}%` },
  ];
}