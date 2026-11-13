// Trilhas de classe (livro p. 26–27, 30–31 e 34–35). O agente escolhe uma no NEX 10%
// e ganha as habilidades dela no NEX 10%, 40%, 65% e 99%.
// Textos resumidos com as nossas palavras; o livro tem a versão completa.
//
// efeitos (opcional): só o que muda números na ficha, aplicado em regras.js / inventario.js
//   pvPorNex:   +PV para cada 5% de NEX
//   pericias:   { id: bônus } somado à perícia
//   cargaComInt: soma o Intelecto à Força para a carga

export const NEX_DAS_HABILIDADES = [10, 40, 65, 99];

const h = (nex, nome, texto, efeitos) => ({ nex, nome, texto, ...(efeitos && { efeitos }) });

export const TRILHAS = {
  /* ---------- Combatente ---------- */
  aniquilador: {
    classe: 'combatente', nome: 'Aniquilador',
    descricao: 'Mestre de uma arma favorita, que trata melhor que os colegas.',
    habilidades: [
      h(10, 'A Favorita', 'Escolha uma arma favorita (ex.: katana, fuzil). A categoria dela cai em I.'),
      h(40, 'Técnica Secreta', 'A categoria da favorita cai em II. Ao atacar com ela, gaste 2 PE para um efeito: Amplo (atinge mais um alvo adjacente) ou Destruidor (+1 no multiplicador de crítico). Cada efeito extra custa +2 PE.'),
      h(65, 'Técnica Sublime', 'Novos efeitos para a Técnica Secreta: Letal (+2 na margem de ameaça, pode escolher duas vezes) e Perfurante (ignora até 5 de resistência a dano).'),
      h(99, 'Máquina de Matar', 'A categoria da favorita cai em III, ela ganha +2 na margem de ameaça e o dano sobe um dado do mesmo tipo.'),
    ],
  },
  comandanteDeCampo: {
    classe: 'combatente', nome: 'Comandante de Campo',
    descricao: 'Coordena o grupo em combate e tira o melhor de cada aliado.',
    habilidades: [
      h(10, 'Inspirar Confiança', 'Reação e 2 PE: um aliado em alcance curto rola de novo um teste que acabou de fazer.'),
      h(40, 'Estrategista', 'Ação padrão e 1 PE por aliado (até seu Intelecto) em alcance curto: no próximo turno eles ganham uma ação de movimento extra.'),
      h(65, 'Brecha na Guarda', '1x por rodada, quando um aliado causa dano a um inimigo em alcance curto: reação e 2 PE para você ou outro aliado atacar esse inimigo. Inspirar Confiança e Estrategista passam a alcance médio.'),
      h(99, 'Oficial Comandante', 'Ação padrão e 5 PE: cada aliado que você vê em alcance médio ganha uma ação padrão extra no próximo turno.'),
    ],
  },
  guerreiro: {
    classe: 'combatente', nome: 'Guerreiro',
    descricao: 'Transformou o próprio corpo numa arma de corpo a corpo.',
    habilidades: [
      h(10, 'Técnica Letal', '+2 na margem de ameaça de todos os seus ataques corpo a corpo.'),
      h(40, 'Revidar', 'Ao bloquear um ataque, reação e 2 PE para atacar corpo a corpo quem te atacou.'),
      h(65, 'Força Opressora', 'Ao acertar corpo a corpo, 1 PE para derrubar ou empurrar o alvo como ação livre (empurrar ganha +5 a cada 10 de dano). Se derrubar, 1 PE para um ataque extra no alvo caído.'),
      h(99, 'Potência Máxima', 'No Ataque Especial com armas corpo a corpo, todos os bônus numéricos dobram.'),
    ],
  },
  operacoesEspeciais: {
    classe: 'combatente', nome: 'Operações Especiais',
    descricao: 'Ações calculadas: sempre um passo à frente no campo de batalha.',
    habilidades: [
      h(10, 'Iniciativa Aprimorada', '+5 em Iniciativa e uma ação de movimento extra na primeira rodada.', { pericias: { iniciativa: 5 } }),
      h(40, 'Ataque Extra', '1x por rodada, ao atacar, gaste 2 PE para fazer um ataque adicional.'),
      h(65, 'Surto de Adrenalina', '1x por rodada, 5 PE para uma ação padrão ou de movimento extra.'),
      h(99, 'Sempre Alerta', 'Uma ação padrão extra no início de cada cena de combate.'),
    ],
  },
  tropaDeChoque: {
    classe: 'combatente', nome: 'Tropa de Choque',
    descricao: 'Duro na queda: se coloca entre os aliados e o perigo.',
    habilidades: [
      h(10, 'Casca Grossa', '+1 PV para cada 5% de NEX. Ao bloquear, soma o Vigor na resistência ao dano.', { pvPorNex: 1 }),
      h(40, 'Cai Dentro', 'Quando um inimigo em alcance curto ataca um aliado: reação e 1 PE para ele fazer Vontade (DT Vig). Se falhar, precisa atacar você. Quem passa fica imune até o fim da cena.'),
      h(65, 'Duro de Matar', 'Ao sofrer dano não paranormal, reação e 2 PE para reduzir à metade. No NEX 85%, vale também para dano paranormal.'),
      h(99, 'Inquebrável', 'Machucado: +5 na Defesa e resistência a dano 5. Morrendo: não fica indefeso e ainda pode agir (segue as regras de morte).'),
    ],
  },

  /* ---------- Especialista ---------- */
  atiradorDeElite: {
    classe: 'especialista', nome: 'Atirador de Elite',
    descricao: 'Um tiro, uma morte: neutraliza ameaças de longe.',
    habilidades: [
      h(10, 'Mira de Elite', 'Proficiência com armas de fogo de balas longas; soma o Intelecto no dano delas.'),
      h(40, 'Disparo Letal', 'Ao mirar, 1 PE para +2 na margem de ameaça do próximo ataque até o fim do seu próximo turno.'),
      h(65, 'Disparo Impactante', 'Com arma de fogo de calibre grosso, 2 PE para derrubar, desarmar, empurrar ou quebrar com um ataque à distância.'),
      h(99, 'Atirar para Matar', 'Acerto crítico com arma de fogo causa o dano máximo, sem rolar.'),
    ],
  },
  infiltrador: {
    classe: 'especialista', nome: 'Infiltrador',
    descricao: 'Neutraliza alvos desprevenidos sem causar alarde.',
    habilidades: [
      h(10, 'Ataque Furtivo', '1x por rodada, contra alvo desprevenido (corpo a corpo ou alcance curto) ou flanqueado: 1 PE para +1d6 de dano. Sobe para +2d6 (NEX 40%), +3d6 (65%) e +4d6 (99%).'),
      h(40, 'Gatuno', '+5 em Atletismo e Crime, e anda com deslocamento normal enquanto se esconde.', { pericias: { atletismo: 5, crime: 5 } }),
      h(65, 'Assassinar', 'Ação de movimento e 3 PE para analisar um alvo em alcance curto: o próximo Ataque Furtivo nele dobra os dados extras e pode deixá-lo inconsciente ou morrendo (Fortitude DT Agi evita).'),
      h(99, 'Sombra Fugaz', 'Ao fazer Furtividade depois de atacar ou de outra ação chamativa, 3 PE para ignorar a penalidade de −3d20.'),
    ],
  },
  medicoDeCampo: {
    classe: 'especialista', nome: 'Médico de Campo',
    descricao: 'Primeiros socorros no meio do caos. Exige Medicina treinada e um kit de medicina.',
    habilidades: [
      h(10, 'Paramédico', 'Ação padrão e 2 PE para curar 2d10 PV em você ou num aliado adjacente. +1d10 no NEX 40%, 65% e 99% (+1 PE por dado extra).'),
      h(40, 'Equipe de Trauma', 'Ação padrão e 2 PE para remover uma condição negativa (exceto morrendo) de um aliado adjacente.'),
      h(65, 'Resgate', '1x por rodada, chega a um aliado machucado ou morrendo em alcance curto como ação livre. Ao curar ou tratar alguém, os dois ganham +5 na Defesa até seu próximo turno. Carregar alguém ocupa metade dos espaços.'),
      h(99, 'Reanimação', '1x por cena, ação completa e 10 PE para trazer de volta quem morreu nesta cena (exceto por dano massivo).'),
    ],
  },
  negociador: {
    classe: 'especialista', nome: 'Negociador',
    descricao: 'Resolve pela lábia o que nem as armas resolvem.',
    habilidades: [
      h(10, 'Eloquência', 'Ação completa e 1 PE por alvo em alcance curto: Diplomacia, Enganação ou Intimidação contra a Vontade deles. Se vencer, ficam fascinados enquanto você se concentra.'),
      h(40, 'Discurso Motivador', 'Ação padrão e 4 PE: você e os aliados em alcance curto ganham +1d20 em perícias até o fim da cena. No NEX 65%, 8 PE para +2d20.'),
      h(65, 'Eu Conheço um Cara', '1x por missão, aciona sua rede de contatos para um favor (equipamento, abrigo, resgate…), a critério do mestre.'),
      h(99, 'Truque de Mestre', '5 PE para imitar uma habilidade que viu um aliado usar nesta cena, ignorando pré-requisitos (paga os custos normais).'),
    ],
  },
  tecnico: {
    classe: 'especialista', nome: 'Técnico',
    descricao: 'Mantém, conserta e improvisa equipamento.',
    habilidades: [
      h(10, 'Inventário Otimizado', 'Soma o Intelecto à Força para calcular a carga.', { cargaComInt: true }),
      h(40, 'Remendão', 'Ação completa e 1 PE para tirar a condição quebrado de um equipamento adjacente até o fim da cena. Equipamento geral tem a categoria reduzida em I para você.'),
      h(65, 'Improvisar', 'Ação completa e 2 PE (+2 por categoria) para improvisar um equipamento geral, que quebra no fim da cena.'),
      h(99, 'Preparado para Tudo', 'Ação de movimento e 3 PE por categoria para "lembrar" que trouxe um item (exceto armas).'),
    ],
  },

  /* ---------- Ocultista ---------- */
  conduite: {
    classe: 'ocultista', nome: 'Conduíte',
    descricao: 'Domina o básico da conjuração: alcance, velocidade e interferência.',
    habilidades: [
      h(10, 'Ampliar Ritual', '+2 PE para aumentar o alcance do ritual em um passo ou dobrar a área.'),
      h(40, 'Acelerar Ritual', '1x por rodada, +4 PE para conjurar um ritual como ação livre.'),
      h(65, 'Anular Ritual', 'Alvo de um ritual: gaste o mesmo PE que ele custou e vença um teste oposto de Ocultismo para anulá-lo.'),
      h(99, 'Canalizar o Medo', 'Aprende o ritual Canalizar o Medo.'),
    ],
  },
  flagelador: {
    classe: 'ocultista', nome: 'Flagelador',
    descricao: 'Transforma dor em poder para os rituais.',
    habilidades: [
      h(10, 'Poder do Flagelo', 'Pode pagar rituais com PV: 2 PV por PE. Esses PV só voltam com descanso.'),
      h(40, 'Abraçar a Dor', 'Ao sofrer dano não paranormal, reação e 2 PE para reduzi-lo à metade.'),
      h(65, 'Absorver Agonia', 'Ao levar inimigos a 0 PV com um ritual, ganha PE temporários iguais ao círculo do ritual.'),
      h(99, 'Medo Tangível', 'Aprende o ritual Medo Tangível.'),
    ],
  },
  graduado: {
    classe: 'ocultista', nome: 'Graduado',
    descricao: 'Estuda para conhecer mais rituais e torná-los difíceis de resistir.',
    habilidades: [
      h(10, 'Saber Ampliado', 'Aprende um ritual de 1º círculo; a cada novo círculo, mais um daquele círculo. Não contam no limite.'),
      h(40, 'Grimório Ritualístico', 'Um grimório guarda rituais de 1º e 2º círculos (quantidade = Intelecto), fora do limite. Para usar, empunhe e gaste uma ação completa folheando. Ocupa 1 espaço.'),
      h(65, 'Rituais Eficientes', 'A DT para resistir aos seus rituais aumenta em +5.'),
      h(99, 'Conhecendo o Medo', 'Aprende o ritual Conhecendo o Medo.'),
    ],
  },
  intuitivo: {
    classe: 'ocultista', nome: 'Intuitivo',
    descricao: 'Mente preparada para resistir ao Outro Lado.',
    habilidades: [
      h(10, 'Mente Sã', 'Resistência paranormal +5 (+5 em testes de resistência contra efeitos paranormais).'),
      h(40, 'Presença Poderosa', 'Soma a Presença ao limite de PE por turno, só para conjurar rituais (não para DT).'),
      h(65, 'Inabalável', 'Resistência a dano mental e paranormal 10. Se passar na Vontade contra um efeito paranormal que reduz à metade, não sofre dano.'),
      h(99, 'Presença do Medo', 'Aprende o ritual Presença do Medo.'),
    ],
  },
  laminaParanormal: {
    classe: 'ocultista', nome: 'Lâmina Paranormal',
    descricao: 'Mistura luta e conjuração: o paranormal como arma.',
    habilidades: [
      h(10, 'Lâmina Maldita', 'Aprende Amaldiçoar Arma (se já conhece, custa −1 PE). Ataca com Ocultismo no lugar de Luta ou Pontaria com a arma amaldiçoada.'),
      h(40, 'Gladiador Paranormal', 'Ao acertar corpo a corpo, ganha 2 PE temporários (máximo igual ao seu limite de PE por cena). Somem no fim da cena.'),
      h(65, 'Conjuração Marcial', '1x por rodada, ao conjurar um ritual com ação padrão, 2 PE para um ataque corpo a corpo como ação livre.'),
      h(99, 'Lâmina do Medo', 'Aprende o ritual Lâmina do Medo.'),
    ],
  },
};

// Trilhas de uma classe, em ordem alfabética
export const trilhasDaClasse = (classe) =>
  Object.entries(TRILHAS)
    .filter(([, t]) => t.classe === classe)
    .sort(([, a], [, b]) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map(([id, t]) => ({ id, ...t }));
