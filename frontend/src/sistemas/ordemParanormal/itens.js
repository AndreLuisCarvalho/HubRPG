// Equipamento do Ordem Paranormal (capítulo 3).
// Os números são das tabelas; as descrições são resumos nossos.

// Patentes (Tabela 3.1): limites = quantos itens de categoria I, II, III e IV a patente libera
export const PATENTES = [
  { nome: 'Recruta', pp: 0, credito: 'Baixo', limites: [2, 0, 0, 0] },
  { nome: 'Operador', pp: 20, credito: 'Médio', limites: [3, 1, 0, 0] },
  { nome: 'Agente especial', pp: 50, credito: 'Médio', limites: [3, 2, 1, 0] },
  { nome: 'Oficial de operações', pp: 100, credito: 'Alto', limites: [3, 3, 2, 1] },
  { nome: 'Agente de elite', pp: 200, credito: 'Ilimitado', limites: [3, 3, 3, 2] },
];

// Grupos do catálogo, na ordem das abas
export const TIPOS_DE_ITEM = {
  arma: 'Armas',
  municao: 'Munições',
  protecao: 'Proteções',
  acessorio: 'Acessórios',
  explosivo: 'Explosivos',
  operacional: 'Operacionais',
  paranormal: 'Paranormais',
  outro: 'Outros',
};

export const TIPOS_DE_DANO = { C: 'Corte', I: 'Impacto', P: 'Perfuração', B: 'Balístico', F: 'Fogo' };

/* ---------- Armas (Tabela 3.3) ---------- */
// prof: simples, taticas ou pesadas · empunhadura: leve, umaMao ou duasMaos · alcance null = corpo a corpo
const arma = (nome, prof, empunhadura, categoria, dano, critico, alcance, tipoDano, espacos, descricao) => ({
  nome, tipo: 'arma', categoria, espacos, descricao,
  arma: { prof, empunhadura, dano, critico, alcance, tipoDano },
});

const ARMAS = {
  // Simples
  faca: arma('Faca', 'simples', 'leve', 0, '1d4', '19', 'Curto', 'C', 1, 'Ágil. Pode ser arremessada.'),
  martelo: arma('Martelo', 'simples', 'leve', 0, '1d6', 'x2', null, 'I', 1, 'Ferramenta comum usada como arma.'),
  punhal: arma('Punhal', 'simples', 'leve', 0, '1d4', 'x3', null, 'P', 1, 'Ágil. Comum em rituais de cultistas.'),
  bastao: arma('Bastão', 'simples', 'umaMao', 0, '1d6/1d8', 'x2', null, 'I', 1, '1d6 com uma mão, 1d8 com as duas.'),
  machete: arma('Machete', 'simples', 'umaMao', 0, '1d6', '19', null, 'C', 1, 'Lâmina longa usada para abrir trilhas.'),
  lanca: arma('Lança', 'simples', 'umaMao', 0, '1d6', 'x2', 'Curto', 'P', 1, 'Pode ser arremessada.'),
  cajado: arma('Cajado', 'simples', 'duasMaos', 0, '1d6/1d6', 'x2', null, 'I', 2, 'Ágil. Bastão longo de duas pontas.'),
  arco: arma('Arco', 'simples', 'duasMaos', 0, '1d6', 'x3', 'Médio', 'P', 2, 'Usa flechas.'),
  besta: arma('Besta', 'simples', 'duasMaos', 0, '1d8', '19', 'Médio', 'P', 2, 'Recarregar: ação de movimento. Usa flechas.'),
  pistola: arma('Pistola', 'simples', 'leve', 1, '1d12', '18', 'Curto', 'B', 1, 'Usa balas curtas.'),
  revolver: arma('Revólver', 'simples', 'leve', 1, '2d6', '19/x3', 'Curto', 'B', 1, 'Usa balas curtas.'),
  fuzilDeCaca: arma('Fuzil de caça', 'simples', 'duasMaos', 1, '2d8', '19/x3', 'Médio', 'B', 2, 'Usa balas longas.'),
  // Táticas
  machadinha: arma('Machadinha', 'taticas', 'leve', 0, '1d6', 'x3', 'Curto', 'C', 1, 'Pode ser arremessada.'),
  nunchaku: arma('Nunchaku', 'taticas', 'leve', 0, '1d8', 'x2', null, 'I', 1, 'Ágil.'),
  corrente: arma('Corrente', 'taticas', 'umaMao', 0, '1d8', 'x2', null, 'I', 1, '+2 para desarmar e derrubar.'),
  espada: arma('Espada', 'taticas', 'umaMao', 1, '1d8/1d10', '19', null, 'C', 1, '1d8 com uma mão, 1d10 com as duas.'),
  florete: arma('Florete', 'taticas', 'umaMao', 1, '1d6', '18', null, 'C', 1, 'Ágil.'),
  machado: arma('Machado', 'taticas', 'umaMao', 1, '1d8', 'x3', null, 'C', 1, 'Ferramenta de lenhador e bombeiro.'),
  maca: arma('Maça', 'taticas', 'umaMao', 1, '2d4', 'x2', null, 'I', 1, 'Bastão com cabeça metálica.'),
  acha: arma('Acha', 'taticas', 'duasMaos', 1, '1d12', 'x3', null, 'C', 2, 'Machado grande e pesado.'),
  gadanho: arma('Gadanho', 'taticas', 'duasMaos', 1, '2d4', 'x4', null, 'C', 2, 'Foice grande de duas mãos.'),
  katana: arma('Katana', 'taticas', 'duasMaos', 1, '1d10', '19', null, 'C', 2, 'Ágil. Veterano em Luta usa com uma mão.'),
  marreta: arma('Marreta', 'taticas', 'duasMaos', 1, '3d4', 'x2', null, 'I', 2, 'Feita para demolir paredes.'),
  montante: arma('Montante', 'taticas', 'duasMaos', 1, '2d6', '19', null, 'C', 2, 'Espada enorme de 1,5m.'),
  motosserra: arma('Motosserra', 'taticas', 'duasMaos', 1, '3d6', 'x2', null, 'C', 2, 'Cada 6 no dano rola mais um dado. −1 dado no ataque.'),
  arcoComposto: arma('Arco composto', 'taticas', 'duasMaos', 1, '1d10', 'x3', 'Médio', 'P', 2, 'Soma Força no dano. Usa flechas.'),
  balestra: arma('Balestra', 'taticas', 'duasMaos', 1, '1d12', '19', 'Médio', 'P', 2, 'Recarregar: ação de movimento. Usa flechas.'),
  submetralhadora: arma('Submetralhadora', 'taticas', 'umaMao', 1, '2d6', '19/x3', 'Curto', 'B', 1, 'Automática. Usa balas curtas.'),
  espingarda: arma('Espingarda', 'taticas', 'duasMaos', 1, '4d6', 'x3', 'Curto', 'B', 2, 'Usa cartuchos.'),
  fuzilDeAssalto: arma('Fuzil de assalto', 'taticas', 'duasMaos', 2, '2d10', '19/x3', 'Médio', 'B', 2, 'Automática. Usa balas longas.'),
  fuzilDePrecisao: arma('Fuzil de precisão', 'taticas', 'duasMaos', 3, '2d10', '19/x3', 'Longo', 'B', 2, 'Veterano em Pontaria que mirar: +5 na margem. Usa balas longas.'),
  // Pesadas
  bazuca: arma('Bazuca', 'pesadas', 'duasMaos', 3, '10d8', 'x2', 'Médio', 'I', 2, 'Raio de 3m em volta do alvo. Recarregar: ação de movimento.'),
  lancaChamas: arma('Lança-chamas', 'pesadas', 'duasMaos', 3, '6d6', 'x2', 'Curto', 'F', 2, 'Linha de 1,5m; quem é atingido fica em chamas.'),
  metralhadora: arma('Metralhadora', 'pesadas', 'duasMaos', 2, '2d12', '19/x3', 'Médio', 'B', 2, 'Automática. Exige Força 4 ou apoiar no tripé, senão −5 no ataque.'),
};

/* ---------- Outros itens ---------- */
const item = (tipo, nome, categoria, espacos, descricao) => ({ nome, tipo, categoria, espacos, descricao });
const protecao = (nome, categoria, espacos, defesa, descricao) => ({
  ...item('protecao', nome, categoria, espacos, descricao), protecao: { defesa },
});

export const ITENS = {
  ...ARMAS,

  // Munições (Tabela 3.4)
  balasCurtas: item('municao', 'Balas curtas', 0, 1, 'Um pacote dura duas cenas.'),
  balasLongas: item('municao', 'Balas longas', 1, 1, 'Um pacote dura uma cena.'),
  cartuchos: item('municao', 'Cartuchos', 1, 1, 'Um pacote dura uma cena.'),
  combustivel: item('municao', 'Combustível', 1, 1, 'Um tanque dura uma cena.'),
  flechas: item('municao', 'Flechas', 0, 1, 'Duram a missão inteira.'),
  foguete: item('municao', 'Foguete', 1, 1, 'Um único disparo.'),

  // Proteções (Tabela 3.6)
  protecaoLeve: protecao('Proteção leve', 1, 2, 5, 'Jaqueta de couro pesada ou colete de kevlar.'),
  protecaoPesada: protecao('Proteção pesada', 2, 5, 10, 'RD 2 a balístico, corte, impacto e perfuração; −5 em Acrobacia, Crime e Furtividade.'),
  escudo: protecao('Escudo', 1, 2, 2, 'Empunhado numa mão; soma com outra proteção.'),

  // Acessórios
  kitDePericia: item('acessorio', 'Kit de perícia', 0, 1, 'Ferramentas de uma perícia que exige kit. Sem ele, −5 no teste.'),
  utensilio: item('acessorio', 'Utensílio', 1, 1, '+2 numa perícia (menos Luta e Pontaria). Precisa ser empunhado.'),
  vestimenta: item('acessorio', 'Vestimenta', 1, 1, '+2 numa perícia (menos Luta e Pontaria). Máximo de duas.'),

  // Explosivos
  granadaDeAtordoamento: item('explosivo', 'Granada de atordoamento', 0, 1, 'Raio 6m: atordoado 1 rodada (Fortitude DT Agi reduz para ofuscado e surdo).'),
  granadaDeFragmentacao: item('explosivo', 'Granada de fragmentação', 1, 1, 'Raio 6m: 8d6 de perfuração (Reflexos DT Agi reduz à metade).'),
  granadaDeFumaca: item('explosivo', 'Granada de fumaça', 0, 1, 'Raio 6m: cegos e com camuflagem total por 2 rodadas.'),
  granadaIncendiaria: item('explosivo', 'Granada incendiária', 1, 1, 'Raio 6m: 6d6 de fogo e em chamas (Reflexos DT Agi reduz à metade).'),
  minaAntipessoal: item('explosivo', 'Mina antipessoal', 1, 1, 'Cone 6m: 12d6 de perfuração (Reflexos DT Int reduz à metade).'),

  // Operacionais
  algemas: item('operacional', 'Algemas', 0, 1, 'Prende alguém indefeso ou agarrado. Escapar: Acrobacia DT 30.'),
  arpeu: item('operacional', 'Arpéu', 0, 1, 'Gancho com corda. Prender: Pontaria DT 15. +5 em Atletismo para subir.'),
  bandoleira: item('operacional', 'Bandoleira', 1, 1, '1x por rodada, saca ou guarda um item como ação livre.'),
  binoculos: item('operacional', 'Binóculos', 0, 1, '+5 em Percepção para observar coisas distantes.'),
  bloqueadorDeSinal: item('operacional', 'Bloqueador de sinal', 1, 1, 'Impede celulares e rádios em alcance médio.'),
  cicatrizante: item('operacional', 'Cicatrizante', 1, 1, 'Ação padrão: cura 2d8+2 PV em você ou num ser adjacente.'),
  corda: item('operacional', 'Corda', 0, 1, '10 metros. +5 em Atletismo para descer.'),
  equipamentoDeSobrevivencia: item('operacional', 'Equipamento de sobrevivência', 0, 2, '+5 em Sobrevivência para acampar e se orientar.'),
  lanternaTatica: item('operacional', 'Lanterna tática', 1, 1, 'Ação de movimento: ofusca um ser em alcance curto por 1 rodada.'),
  mascaraDeGas: item('operacional', 'Máscara de gás', 0, 1, '+10 em Fortitude contra efeitos de respiração.'),
  mochilaMilitar: item('operacional', 'Mochila militar', 1, 0, 'Não ocupa espaço e aumenta a capacidade de carga em 2.'),
  oculosDeVisaoTermica: item('operacional', 'Óculos de visão térmica', 1, 1, 'Eliminam a penalidade por camuflagem.'),
  peDeCabra: item('operacional', 'Pé de cabra', 0, 1, '+5 em Força para arrombar. Em combate, conta como bastão.'),
  pistolaDeDardos: item('operacional', 'Pistola de dardos', 1, 1, '2 cargas. Alvo inconsciente até o fim da cena (Fortitude DT Agi reduz).'),
  pistolaSinalizadora: item('operacional', 'Pistola sinalizadora', 0, 1, '2 cargas. Como arma: curto, 2d6 de fogo.'),
  soqueira: item('operacional', 'Soqueira', 0, 1, '+1 no dano desarmado.'),
  sprayDePimenta: item('operacional', 'Spray de pimenta', 1, 1, '2 usos. Ser adjacente fica cego por 1d4 rodadas (Fortitude DT Agi evita).'),
  taser: item('operacional', 'Taser', 1, 1, '2 usos. Ser adjacente: 1d6 de eletricidade e atordoado 1 rodada (Fortitude DT Agi evita).'),
  trajeHazmat: item('operacional', 'Traje hazmat', 1, 2, '+5 contra efeitos ambientais e RD 10 a químico.'),

  // Paranormais
  amarras: item('paranormal', 'Amarras', 2, 1, 'Cordas de um elemento: prendem criaturas vulneráveis a ele.'),
  cameraDeAura: item('paranormal', 'Câmera de aura paranormal', 2, 1, 'Ação padrão + 1 PE: a foto revela auras paranormais.'),
  componentes: item('paranormal', 'Componentes ritualísticos', 0, 1, 'Necessários para conjurar rituais do elemento.'),
  emissorDePulsos: item('paranormal', 'Emissor de pulsos paranormais', 2, 1, 'Ação completa + 1 PE: atrai criaturas de um elemento e afasta as do oposto.'),
  escutaDeRuidos: item('paranormal', 'Escuta de ruídos paranormais', 2, 1, 'Ação completa + 2 PE: grava ruídos; ouvir dá +5 em Ocultismo.'),
  medidorDeMembrana: item('paranormal', 'Medidor de estabilidade da membrana', 2, 1, 'Agente treinado em Ocultismo avalia a Membrana de uma área.'),
  scanner: item('paranormal', 'Scanner de manifestação paranormal', 2, 1, 'Ação padrão, 1 PE por rodada: aponta manifestações de um elemento.'),
};