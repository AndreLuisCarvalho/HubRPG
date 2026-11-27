/*
 * Condições do livro para a arena, com um resumo curto escrito por nós (a regra completa está no livro).
 * Cada participante guarda: condicoes: [{ uid, id, desde, rodadas, origem }] (ver "venceu").
 */
export const CONDICOES = [
  { id: 'abalado', nome: 'Abalado', medo: true, resumo: '−1d20 em testes de perícia. Ficar abalado de novo vira apavorado.' },
  { id: 'apavorado', nome: 'Apavorado', medo: true, resumo: '−2d20 em testes de perícia e não pode se aproximar da fonte do medo.' },
  { id: 'agarrado', nome: 'Agarrado', resumo: 'Desprevenido e imóvel, com penalidade nos ataques e só armas leves.' },
  { id: 'asfixiado', nome: 'Asfixiado', resumo: 'Não respira: aguenta algumas rodadas (pelo Vigor) e depois desmaia.' },
  { id: 'atordoado', nome: 'Atordoado', resumo: 'Desprevenido e não pode fazer ações.' },
  { id: 'caido', nome: 'Caído', resumo: '−2d20 nos ataques corpo a corpo. Defesa −5 contra corpo a corpo e +5 contra ataques à distância.' },
  { id: 'cego', nome: 'Cego', resumo: 'Desprevenido e lento; tudo tem camuflagem total para ele.' },
  { id: 'confuso', nome: 'Confuso', medo: true, resumo: 'Age ao acaso: no início do turno, rola para ver o que faz.' },
  { id: 'debilitado', nome: 'Debilitado', resumo: '−2d20 em Agilidade, Força e Vigor. De novo, fica inconsciente.' },
  { id: 'desprevenido', nome: 'Desprevenido', resumo: 'Defesa −5 e penalidade em Reflexos: não consegue reagir ao perigo.' },
  { id: 'enjoado', nome: 'Enjoado', resumo: 'Só faz uma ação padrão ou de movimento por rodada.' },
  { id: 'enredado', nome: 'Enredado', resumo: 'Lento, vulnerável e com penalidade nos ataques.' },
  { id: 'envenenado', nome: 'Envenenado', resumo: 'O efeito depende do veneno (em geral, dano a cada rodada).' },
  { id: 'esmorecido', nome: 'Esmorecido', medo: true, resumo: '−2d20 em Intelecto e Presença.' },
  { id: 'exausto', nome: 'Exausto', resumo: 'Debilitado, lento e vulnerável.' },
  { id: 'fascinado', nome: 'Fascinado', medo: true, resumo: 'Só observa o que o fascina; uma ameaça ou ação hostil quebra o efeito.' },
  { id: 'fatigado', nome: 'Fatigado', resumo: 'Fraco e vulnerável. De novo, fica exausto.' },
  { id: 'fraco', nome: 'Fraco', resumo: '−1d20 em Agilidade, Força e Vigor. De novo, fica debilitado.' },
  { id: 'frustrado', nome: 'Frustrado', medo: true, resumo: '−1d20 em Intelecto e Presença. De novo, fica esmorecido.' },
  { id: 'imovel', nome: 'Imóvel', resumo: 'Deslocamento zero.' },
  { id: 'inconsciente', nome: 'Inconsciente', resumo: 'Indefeso e sem ações.' },
  { id: 'indefeso', nome: 'Indefeso', resumo: 'Desprevenido, com Defesa bem menor; falha em Reflexos e pode sofrer golpe de misericórdia.' },
  { id: 'lento', nome: 'Lento', resumo: 'Deslocamento pela metade; não pode correr nem investir.' },
  { id: 'ofuscado', nome: 'Ofuscado', resumo: 'Penalidade nos ataques e em Percepção.' },
  { id: 'paralisado', nome: 'Paralisado', resumo: 'Imóvel e indefeso; só ações puramente mentais.' },
  { id: 'pasmo', nome: 'Pasmo', medo: true, resumo: 'Não pode fazer ações.' },
  { id: 'sangrando', nome: 'Sangrando', resumo: 'No início do turno, teste de Vigor: se falhar perde PV e continua sangrando; se passar, para.' },
  { id: 'surdo', nome: 'Surdo', resumo: 'Não ouve: falha em Percepção para ouvir e tem penalidade na Iniciativa.' },
  { id: 'surpreendido', nome: 'Surpreendido', resumo: 'Desprevenido e não age na primeira rodada.' },
  { id: 'vulneravel', nome: 'Vulnerável', resumo: 'Defesa reduzida.' },
];

export const condicaoPorId = (id) => CONDICOES.find((c) => c.id === id);

/* Grupo de cada condição (o ícone dela) e a cor do grupo */
const GRUPO = {
  abalado: 'medo', apavorado: 'medo', confuso: 'mente', esmorecido: 'medo', fascinado: 'mente', frustrado: 'medo', pasmo: 'mente',
  agarrado: 'preso', enredado: 'preso', imovel: 'preso', paralisado: 'preso', lento: 'lento',
  cego: 'sentidos', ofuscado: 'sentidos', surdo: 'surdo',
  desprevenido: 'defesa', vulneravel: 'defesa', indefeso: 'defesa', surpreendido: 'surpresa',
  debilitado: 'fraqueza', exausto: 'fraqueza', fatigado: 'fraqueza', fraco: 'fraqueza', enjoado: 'enjoo',
  atordoado: 'atordoado', inconsciente: 'sono',
  caido: 'caido',
  sangrando: 'sangue', envenenado: 'veneno', asfixiado: 'ar',
};
const COR_DO_GRUPO = {
  medo: '#b48cff', mente: '#b48cff',
  preso: '#e09a2b', lento: '#e09a2b', caido: '#e09a2b',
  sentidos: '#7fb2e6', surdo: '#7fb2e6',
  defesa: '#f0d27a', surpresa: '#f0d27a',
  fraqueza: '#c9a06a', enjoo: '#9fcf6a',
  atordoado: '#ffd75e', sono: '#9aa0ad',
  sangue: '#ff5a4a', veneno: '#7fd36a', ar: '#7fd0e6',
};
export const grupoDaCondicao = (id) => GRUPO[id] ?? 'defesa';
export const corDaCondicao = (id) => COR_DO_GRUPO[grupoDaCondicao(id)];

/** Rodadas que faltam (null = até o fim da cena); a última rodada conta 1 */
export function rodadasRestantes(c, rodada) {
  if (c.rodadas == null) return null;
  return Math.max(1, (c.desde ?? rodada) + c.rodadas - rodada);
}

/** "Caído · faltam 2 rodadas" — com o resumo do livro */
export function textoDaCondicao(c, rodada) {
  const info = condicaoPorId(c.id);
  const resta = rodadasRestantes(c, rodada);
  const tempo = resta == null ? 'até o fim da cena' : `falta${resta > 1 ? 'm' : ''} ${resta} rodada${resta > 1 ? 's' : ''}`;
  return `${info?.nome ?? c.id} · ${tempo}${info?.resumo ? `\n${info.resumo}` : ''}`;
}

export const DURACOES = [
  { id: '1', rotulo: '1 rodada', rodadas: 1 },
  { id: '2', rotulo: '2 rodadas', rodadas: 2 },
  { id: '3', rotulo: '3 rodadas', rodadas: 3 },
  { id: 'cena', rotulo: 'Até o fim da cena', rodadas: null },
];

/*
 * "N rodadas" = até o início do turno de quem causou, N rodadas depois (como no livro).
 * Cada condição guarda { uid, id, desde (rodada), rodadas (null = cena), origem (id de quem estava na vez) }.
 * Se quem causou saiu do combate, vence na virada da rodada.
 */
export function venceu(c, { vez, rodada, presentes }) {
  if (c.rodadas == null) return false;
  const fim = c.desde + c.rodadas;
  if (c.origem && presentes.has(c.origem)) return vez === c.origem && rodada >= fim;
  return rodada > fim;
}
