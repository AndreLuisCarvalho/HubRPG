/*
 * Roteiro de uma missão (só o mestre): o passo a passo de uma investigação da Ordem.
 * missao.dados = {
 *   resumo, sessoes: [ids],
 *   gancho:     { texto (para ler na mesa), objetivo, notas },
 *   cenas:      [{ id, nome, descricao, mapaId, fichas: [ids] }],
 *   revelacoes: [{ id, texto }]                         o que os agentes precisam descobrir
 *   pistas:     [{ id, texto, cenaId, pericia, dt, revelacaoId }],
 *   npcs:       [{ id, fichaId, sabe, esconde, reacao }],
 *   confronto:  { nome, tatica, fichas: [ids], livro: [{ id, qtd }], combateId },
 *   climax:     { texto, sucesso, fracasso, recompensas },
 * }
 */
export const novoId = () => Math.random().toString(36).slice(2, 10);

export const PISTAS_POR_REVELACAO = 3;   // a "regra das 3 pistas": a mesa não trava se uma passar batido

export const ETAPAS = [
  { id: 'gancho', rotulo: 'Gancho', dica: 'Como a Ordem chama os agentes: o briefing, o lugar e o que precisa ser feito.' },
  { id: 'cenas', rotulo: 'Cenas', dica: 'Os lugares onde a investigação acontece. Cada cena pode ter um mapa e quem os agentes encontram lá.' },
  { id: 'pistas', rotulo: 'Pistas', dica: 'Primeiro o que os agentes precisam descobrir (revelações); depois as pistas que levam até cada uma.' },
  { id: 'npcs', rotulo: 'NPCs', dica: 'Quem sabe alguma coisa: o que conta, o que esconde e como reage aos agentes.' },
  { id: 'confronto', rotulo: 'Confronto', dica: 'A ameaça e a luta. Monte o combate daqui e ele fica pronto na tela Combate.' },
  { id: 'climax', rotulo: 'Clímax', dica: 'O fim da missão: o que acontece no clímax, as consequências e as recompensas.' },
];

export function dadosCompletos(dados = {}) {
  return {
    resumo: '',
    sessoes: [],
    cenas: [],
    revelacoes: [],
    pistas: [],
    npcs: [],
    ...dados,
    gancho: { texto: '', objetivo: '', notas: '', ...dados.gancho },
    confronto: { nome: '', tatica: '', fichas: [], livro: [], combateId: null, ...dados.confronto },
    climax: { texto: '', sucesso: '', fracasso: '', recompensas: '', ...dados.climax },
  };
}

/** Cada etapa está feita? (o ✓ no passo a passo) */
export function etapasFeitas(d) {
  return {
    gancho: Boolean(d.gancho.texto.trim() || d.gancho.objetivo.trim()),
    cenas: d.cenas.some((c) => c.nome.trim()),
    pistas: d.pistas.some((p) => p.texto.trim()),
    npcs: d.npcs.length > 0,
    confronto: d.confronto.fichas.length + d.confronto.livro.length > 0,
    climax: Boolean(d.climax.texto.trim()),
  };
}

/** Quantas pistas levam a cada revelação */
export function pistasPorRevelacao(d) {
  const conta = Object.fromEntries(d.revelacoes.map((r) => [r.id, 0]));
  for (const p of d.pistas) if (p.revelacaoId in conta) conta[p.revelacaoId] += 1;
  return conta;
}

/**
 * O que falta para a missão estar "pronta para jogar": [{ etapa, texto, grave }]
 * (grave = trava a mesa; o resto é sugestão)
 */
export function pendencias(d) {
  const lista = [];
  const add = (etapa, texto, grave = false) => lista.push({ etapa, texto, grave });
  if (!d.gancho.texto.trim()) add('gancho', 'Escreva o texto do briefing para ler na mesa.', true);
  if (!d.gancho.objetivo.trim()) add('gancho', 'Defina o objetivo da missão.');
  if (!d.cenas.length) add('cenas', 'Crie pelo menos uma cena.', true);
  d.cenas.filter((c) => !c.descricao.trim()).forEach((c) => add('cenas', `Descreva a cena "${c.nome || 'sem nome'}".`));
  if (!d.revelacoes.length) add('pistas', 'Diga o que os agentes precisam descobrir (revelações).', true);
  const conta = pistasPorRevelacao(d);
  d.revelacoes.forEach((r) => {
    if (conta[r.id] < PISTAS_POR_REVELACAO) {
      add('pistas', `"${r.texto || 'Revelação sem texto'}" tem ${conta[r.id]} de ${PISTAS_POR_REVELACAO} pistas (regra das 3 pistas).`, conta[r.id] === 0);
    }
  });
  d.pistas.filter((p) => !p.revelacaoId).forEach((p) => add('pistas', `A pista "${p.texto || 'sem texto'}" não leva a nenhuma revelação.`));
  d.pistas.filter((p) => p.pericia && !p.dt).forEach((p) => add('pistas', `Falta a DT da pista "${p.texto || 'sem texto'}".`));
  if (!d.npcs.length) add('npcs', 'Nenhum NPC na missão (alguém precisa saber de algo).');
  if (d.confronto.fichas.length + d.confronto.livro.length === 0) add('confronto', 'Escolha a ameaça do confronto.');
  else if (!d.confronto.combateId) add('confronto', 'Monte o combate para ele ficar pronto na tela Combate.');
  if (!d.climax.texto.trim()) add('climax', 'Escreva o clímax.', true);
  if (!d.climax.recompensas.trim()) add('climax', 'Defina as recompensas (NEX, itens, Prestígio).');
  return lista;
}
