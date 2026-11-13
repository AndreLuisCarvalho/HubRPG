// Como o sistema CALCULA. Funções puras: recebem dados, devolvem resultado.
import {
  CLASSES, CONTAGENS, CUSTO_POR_CIRCULO, ESCUDO, GRAUS, NEX, NOMES_PROFICIENCIA, ORIGENS, PERICIAS,
  PROTECOES, RECURSOS, RITUAIS,
} from './modelo';
import { TRILHAS } from './trilhas';

export function fichaInicial({ classe = 'combatente', jogador = '', origem = '', trilha = '' } = {}) {
  return {
    classe,
    nex: 5,
    origem,
    jogador,
    trilha: TRILHAS[trilha]?.classe === classe ? trilha : '',
    atributos: { agi: 1, for: 1, int: 1, pre: 1, vig: 1 },
    pericias: periciasDaOrigem({}, '', origem),   // já nasce com as perícias da origem
    periciasOutros: {},
    kits: {},
    atuais: {},
    temporarios: {},
    contagens: {},
    defesa: { equipamento: 0, outros: 0 },
    deslocamento: 9,
    ataques: [],
    rituais: [],
    protecao: '',
    resistencias: '',
    proficiencias: '',
    descricao: '',
  };
}

// NEX 5% = 0 níveis extras, 10% = 1, ..., 99% = 19
const niveisExtras = (nex) => Math.max(NEX.indexOf(nex), 0);

/* ---------- Trilha ---------- */
// Só vale trilha da classe atual e a partir do NEX 10% (fichas antigas podem ter texto livre)
export function dadosDaTrilha(dados) {
  const trilha = TRILHAS[dados.trilha];
  return trilha && trilha.classe === dados.classe ? trilha : null;
}

// Habilidades da trilha, marcando quais o NEX atual já liberou
export function habilidadesDaTrilha(dados) {
  const nex = dados.nex ?? 5;
  return (dadosDaTrilha(dados)?.habilidades ?? []).map((hab) => ({ ...hab, liberada: nex >= hab.nex }));
}

// Soma dos efeitos numéricos das habilidades já liberadas
export function efeitosDaTrilha(dados) {
  const total = { pvPorNex: 0, pericias: {}, cargaComInt: false };
  habilidadesDaTrilha(dados).filter((hab) => hab.liberada && hab.efeitos).forEach(({ efeitos: e }) => {
    total.pvPorNex += e.pvPorNex ?? 0;
    total.cargaComInt ||= Boolean(e.cargaComInt);
    Object.entries(e.pericias ?? {}).forEach(([id, v]) => { total.pericias[id] = (total.pericias[id] ?? 0) + v; });
  });
  return total;
}

/* ---------- Origem ---------- */
export const dadosDaOrigem = (dados) => ORIGENS[dados.origem] ?? null;

// Fichas antigas guardavam a origem como texto livre: nesse caso mostra o texto
export const nomeDaOrigem = (dados) => dadosDaOrigem(dados)?.nome ?? dados.origem ?? '';

// Números que a origem soma na ficha (Calejado, Cicatrizes, Dedicação, Patrulha…)
export function bonusDaOrigem(dados) {
  const e = dadosDaOrigem(dados)?.efeitos ?? {};
  const nex = dados.nex ?? 5;
  const niveis = niveisExtras(nex) + 1;                                            // quantos "5% de NEX" já tem
  const nexImpares = NEX.filter((n) => n <= nex && n > 5 && n % 10 === 5).length;  // 15%, 25%…

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

/* ---------- Recursos ---------- */
export function calcularMaximos(dados) {
  const classe = CLASSES[dados.classe] ?? CLASSES.combatente;
  const { vig = 0, pre = 0 } = dados.atributos ?? {};
  const extras = niveisExtras(dados.nex);
  const origem = bonusDaOrigem(dados);
  const sanInicial = origem.sanInicialMetade ? Math.floor(classe.san.inicial / 2) : classe.san.inicial;

  // Trilha (ex.: Casca Grossa): +PV para cada 5% de NEX
  const pvTrilha = efeitosDaTrilha(dados).pvPorNex * (extras + 1);

  return {
    pv: classe.pv.inicial + vig + extras * (classe.pv.porNex + vig) + origem.pv + pvTrilha,
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
// "temporario" = pontos temporários (podem passar do máximo e são gastos primeiro)
export function recursos(dados) {
  const maximos = calcularMaximos(dados);
  const atuais = calcularAtuais(dados);
  return RECURSOS.map((r) => ({
    ...r,
    atual: atuais[r.id],
    maximo: maximos[r.id],
    temporario: Math.max(0, dados.temporarios?.[r.id] ?? 0),
  }));
}

/* ---------- Mudanças nos recursos (devolvem só o pedaço de "dados" que mudou) ---------- */

// Perder: gasta primeiro os pontos temporários, depois o valor atual
export function perderRecurso(dados, id, quantidade) {
  const temporario = Math.max(0, dados.temporarios?.[id] ?? 0);
  const doTemporario = Math.min(temporario, quantidade);
  const atuais = calcularAtuais(dados);

  return {
    temporarios: { ...dados.temporarios, [id]: temporario - doTemporario },
    atuais: { ...atuais, [id]: Math.max(0, atuais[id] - (quantidade - doTemporario)) },
  };
}

// Recuperar ou digitar: o valor normal nunca passa do máximo
export function definirAtual(dados, id, valor) {
  const maximo = calcularMaximos(dados)[id];
  const atuais = calcularAtuais(dados);
  return { atuais: { ...atuais, [id]: Math.min(Math.max(valor, 0), maximo) } };
}

export const definirTemporario = (dados, id, valor) => ({
  temporarios: { ...dados.temporarios, [id]: Math.max(0, valor) },
});

// Contagem de morrendo/enlouquecendo ligada a um recurso (ou null se ele não tem)
export function contagemDoRecurso(dados, recursoId) {
  const regra = CONTAGENS[recursoId];
  if (!regra) return null;
  return { ...regra, valor: Math.min(dados.contagens?.[regra.id] ?? 0, regra.limite) };
}

export const definirContagem = (dados, contagemId, valor) => ({
  contagens: { ...dados.contagens, [contagemId]: Math.max(0, valor) },
});

// Limite de PE por turno = NEX/5, e 20 no NEX 99% (é o 20º nível). Universitário soma +1.
export const limitePePorTurno = (dados) =>
  niveisExtras(dados.nex ?? 5) + 1 + bonusDaOrigem(dados).limitePe;

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
  const trilha = efeitosDaTrilha(dados).pericias[id] ?? 0;   // ex.: Gatuno, Iniciativa Aprimorada
  return treino + outros + trilha;
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
  const carga = pericia.carga ? penalidadeDeCarga(dados) : 0;   // proteção pesada: −5
  const bonus = bonusPericia(dados, periciaId) - (semKit ? PENALIDADE_SEM_KIT : 0) - carga;
  const base = dadosDoAtributo(dados, pericia.atributo);
  if (!bonus) return base;
  return bonus > 0 ? `${base}+${bonus}` : `${base}${bonus}`;
}

/* ---------- Proteção e proficiências (livro p. 54 e 62) ---------- */
// Proteção vestida: 'leve', 'pesada' ou '' (nenhuma).
// Fichas antigas tinham só o texto em "protecao": tenta reconhecer "leve"/"pesada" nele.
export function protecaoVestida(dados) {
  if (dados.armadura !== undefined) return PROTECOES[dados.armadura] ? dados.armadura : '';
  const texto = (dados.protecao ?? '').toLowerCase();
  if (texto.includes('pesada')) return 'pesada';
  if (texto.includes('leve')) return 'leve';
  return '';
}

export const usaEscudo = (dados) => Boolean(dados.escudo);

// Proficiências da classe + as marcadas a mais (poderes como "Proteção Pesada")
export function proficiencias(dados) {
  const daClasse = CLASSES[dados.classe]?.proficiencias ?? { armas: [], protecoes: [] };
  const extras = dados.proficienciasExtras ?? [];
  return [...new Set([...daClasse.armas, ...daClasse.protecoes, ...extras])];
}

export const nomesDasProficiencias = (dados) =>
  proficiencias(dados).map((id) => NOMES_PROFICIENCIA[id]).filter(Boolean);

// Sem proficiência na proteção (escudo conta como pesada): −2d20 em testes de Força e Agilidade
export function semProficienciaNaProtecao(dados) {
  const sabe = proficiencias(dados);
  const vestida = protecaoVestida(dados);
  return Boolean((vestida && !sabe.includes(vestida)) || (usaEscudo(dados) && !sabe.includes('pesada')));
}

// Defesa que vem da proteção + escudo
export const defesaDaProtecao = (dados) =>
  (PROTECOES[protecaoVestida(dados)]?.defesa ?? 0) + (usaEscudo(dados) ? ESCUDO.defesa : 0);

// RD da proteção pesada (balístico, corte, impacto e perfuração)
export const rdDaProtecao = (dados) => PROTECOES[protecaoVestida(dados)]?.rd ?? 0;

// Penalidade nas perícias afetadas por carga (Acrobacia, Crime, Furtividade)
export const penalidadeDeCarga = (dados) => PROTECOES[protecaoVestida(dados)]?.penalidadeCarga ?? 0;

/* ---------- Defesa ---------- */
// 10 + AGI + proteção/escudo + outros (+ "equipamento" de fichas antigas, digitado à mão)
export function calcularDefesa(dados) {
  const { equipamento = 0, outros = 0 } = dados.defesa ?? {};
  return 10 + (dados.atributos?.agi ?? 0) + defesaDaProtecao(dados)
    + Math.max(0, equipamento) + Math.max(0, outros) + bonusDaOrigem(dados).defesa;
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
// Livro p. 88: PV 0 = morrendo · SAN 0 = enlouquecendo (3 turnos/rodadas = morto/insano)
//              PV abaixo da metade = machucado · SAN abaixo da metade = perturbado
export function estado(dados) {
  const lista = recursos(dados);
  const pv = lista.find((r) => r.id === 'pv');
  const san = lista.find((r) => r.id === 'san');
  const abaixoDaMetade = (r) => r.atual < r.maximo / 2;
  const chegouNoFim = (id) => {
    const c = contagemDoRecurso(dados, id);
    return c && c.valor >= c.limite;
  };

  if (chegouNoFim('pv')) return { id: 'morto', rotulo: 'Morto' };
  if (chegouNoFim('san')) return { id: 'insano', rotulo: 'Insano' };
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


/* ---------- Rituais ---------- */
// Cada ritual conhecido fica salvo como { id, elemento, deClasse }.
// deClasse: aprendido pela classe (ex.: Ocultista) — não conta no limite.
// forma: 'basico' | 'discente' | 'verdadeiro'
 
// DT para resistir aos seus rituais (livro p. 121): 10 + limite de PE + Presença
export const dtDeRituais = (dados) => 10 + limitePePorTurno(dados) + (dados.atributos?.pre ?? 0);
 
// Custo total: o do círculo + o extra da forma escolhida
export const custoDoRitual = (ritual, forma = 'basico') =>
  (CUSTO_POR_CIRCULO[ritual.circulo] ?? 0) + (forma === 'basico' ? 0 : ritual[forma]?.pe ?? 0);
 
// Pelo poder Aprender Ritual, o limite é o Intelecto (livro p. 119)
export const limiteDeRituais = (dados) => dados.atributos?.int ?? 0;
export const contarAprendidos = (dados) => (dados.rituais ?? []).filter((r) => !r.deClasse).length;
export const conheceRitual = (dados, id) => (dados.rituais ?? []).some((r) => r.id === id);
 
// Rituais que o agente conhece, juntando o que está salvo com os dados da lista
export function rituaisConhecidos(dados) {
  return (dados.rituais ?? [])
    .map((salvo) => ({ ...salvo, ritual: RITUAIS.find((r) => r.id === salvo.id) }))
    .filter((r) => r.ritual);
}
 
// Mudanças (devolvem só o pedaço de "dados" que mudou, igual às de recursos)
export function aprenderRitual(dados, ritual) {
  if (conheceRitual(dados, ritual.id)) return {};
  const novo = { id: ritual.id, elemento: ritual.elementos[0], deClasse: false };
  return { rituais: [...(dados.rituais ?? []), novo] };
}
 
export const esquecerRitual = (dados, id) => ({
  rituais: (dados.rituais ?? []).filter((r) => r.id !== id),
});
 
export const alterarRitual = (dados, id, mudancas) => ({
  rituais: (dados.rituais ?? []).map((r) => (r.id === id ? { ...r, ...mudancas } : r)),
});
 
// A forma cabe no limite de PE por turno? (livro p. 121: nunca se gasta mais que o limite)
export const formaPermitida = (dados, ritual, forma) => custoDoRitual(ritual, forma) <= limitePePorTurno(dados);
 
// Só conjura se couber no limite por turno e no PE que sobrou (com temporários)
export function podeConjurar(dados, ritual, forma = 'basico') {
  const pe = recursos(dados).find((r) => r.id === 'pe');
  return formaPermitida(dados, ritual, forma) && custoDoRitual(ritual, forma) <= pe.atual + pe.temporario;
}
 
export const conjurarRitual = (dados, ritual, forma = 'basico') =>
  perderRecurso(dados, 'pe', custoDoRitual(ritual, forma));
 
// O custo do paranormal (livro p. 121): aviso mostrado antes de conjurar
const PERDA_PERMANENTE_MEDO = { basico: 1, discente: 2, verdadeiro: 3 };
 
export function custoParanormal(ritual, elemento, forma = 'basico') {
  const custo = custoDoRitual(ritual, forma);
  if (elemento === 'med') return `Medo: perde ${custo} SAN e ${PERDA_PERMANENTE_MEDO[forma]} SAN permanente`;
  return `Ocultismo DT ${20 + custo} · se falhar, perde ${custo} SAN`;
}
 