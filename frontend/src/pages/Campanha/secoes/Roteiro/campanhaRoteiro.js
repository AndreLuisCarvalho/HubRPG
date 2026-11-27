/*
 * O quadro geral da campanha (Roteiro → "A campanha"), só do mestre:
 *   premissa:  { texto, tons: [] }
 *   verdade:   { texto, segredos: [{ id, texto, missaoId }] }      missaoId = a missão que revela
 *   ameaca:    { fichaId, nome, quer, poder }
 *   relogio:   { passos: [{ id, texto }], atual }                  atual = quantos passos já aconteceram
 *   faccoes:   [{ id, nome, cor, objetivo, relacao, liderId, membros: [fichaIds] }]
 *   relacoes:  [{ id, de, para, tipo, texto }]                     entre facções (o organograma)
 *   arco:      [missaoIds]                                         a ordem das missões (linha do tempo)
 *   desfechos: [{ id, tipo, texto }]
 */
export const TONS = ['Terror', 'Mistério', 'Ação', 'Drama', 'Investigação', 'Sobrevivência', 'Conspiração'];

export const RELACOES_COM_AGENTES = [
  { id: 'aliada', rotulo: 'Aliada' },
  { id: 'neutra', rotulo: 'Neutra' },
  { id: 'hostil', rotulo: 'Hostil' },
];

export const TIPOS_DE_RELACAO = [
  { id: 'alianca', rotulo: 'Aliança' },
  { id: 'rivalidade', rotulo: 'Rivalidade' },
  { id: 'controle', rotulo: 'Controla' },
];

export const TIPOS_DE_DESFECHO = [
  { id: 'vitoria', rotulo: 'Vitória' },
  { id: 'amarga', rotulo: 'Vitória amarga' },
  { id: 'derrota', rotulo: 'Derrota' },
];

export const CORES_DE_FACCAO = ['#c8423a', '#d9a54a', '#3f9d63', '#4f8fd6', '#9b6bd6', '#8b8f99'];

export const ETAPAS_CAMPANHA = [
  { id: 'premissa', rotulo: 'Premissa', dica: 'A campanha em duas frases e o tom que ela tem na mesa.' },
  { id: 'verdade', rotulo: 'Verdade oculta', dica: 'O que realmente está acontecendo. Divida em segredos e diga qual missão revela cada um.' },
  { id: 'ameaca', rotulo: 'Ameaça', dica: 'Quem está por trás de tudo, o que quer e do que é capaz.' },
  { id: 'relogio', rotulo: 'Relógio', dica: 'Os passos do plano da ameaça. Avance o relógio quando os agentes demorarem ou falharem.' },
  { id: 'faccoes', rotulo: 'Facções', dica: 'Os grupos em jogo, quem manda em cada um e como se relacionam: vira o organograma.' },
  { id: 'arco', rotulo: 'Arco', dica: 'A ordem das missões: vira a linha do tempo, junto com o plano da ameaça e os segredos revelados.' },
  { id: 'desfechos', rotulo: 'Desfechos', dica: 'Como a campanha pode terminar.' },
];

export const novoId = () => Math.random().toString(36).slice(2, 10);

export function campanhaCompleta(d = {}) {
  return {
    faccoes: [],
    relacoes: [],
    arco: [],
    desfechos: [],
    ...d,
    premissa: { texto: '', tons: [], ...d.premissa },
    verdade: { texto: '', segredos: [], ...d.verdade },
    ameaca: { fichaId: null, nome: '', quer: '', poder: '', ...d.ameaca },
    relogio: { passos: [], atual: 0, ...d.relogio },
  };
}

export function etapasDaCampanhaFeitas(d) {
  return {
    premissa: Boolean(d.premissa.texto.trim()),
    verdade: Boolean(d.verdade.texto.trim()) || d.verdade.segredos.length > 0,
    ameaca: Boolean(d.ameaca.fichaId || d.ameaca.nome.trim()),
    relogio: d.relogio.passos.length > 0,
    faccoes: d.faccoes.length > 0,
    arco: d.arco.length > 0,
    desfechos: d.desfechos.some((x) => x.texto.trim()),
  };
}

/** O arco na ordem: as missões escolhidas primeiro; as que ainda não entraram ficam de fora */
export function missoesDoArco(d, missoes) {
  const por = Object.fromEntries(missoes.map((m) => [m.id, m]));
  return d.arco.map((id) => por[id]).filter(Boolean);
}
