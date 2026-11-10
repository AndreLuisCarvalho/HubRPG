// Tudo que EXISTE no sistema. Para ajustar uma regra, é aqui.

export const ATRIBUTOS = [
  { id: 'agi', nome: 'Agilidade', sigla: 'AGI' },
  { id: 'for', nome: 'Força', sigla: 'FOR' },
  { id: 'int', nome: 'Intelecto', sigla: 'INT' },
  { id: 'pre', nome: 'Presença', sigla: 'PRE' },
  { id: 'vig', nome: 'Vigor', sigla: 'VIG' },
];

export const ATRIBUTO_MIN = 0;
export const ATRIBUTO_MAX = 5;

// "porNex" = quanto ganha a cada NEX depois do primeiro (5%)
// "icone" = desenho SVG (atributo "d" de um <path>) usado na criação de ficha
export const CLASSES = {
  combatente: {
    nome: 'Combatente',
    descricao: 'Linha de frente',
    icone: 'M5 19 19 5M14 5h5v5M5 14l5 5M3 21l3-3',
    pv: { inicial: 20, porNex: 4 }, pe: { inicial: 2, porNex: 2 }, san: { inicial: 12, porNex: 3 },
  },
  especialista: {
    nome: 'Especialista',
    descricao: 'Perícias e versatilidade',
    icone: 'M11 5a6 6 0 1 0 0 12a6 6 0 1 0 0-12M20 20l-4.5-4.5',
    pv: { inicial: 16, porNex: 3 }, pe: { inicial: 3, porNex: 3 }, san: { inicial: 16, porNex: 4 },
  },
  ocultista: {
    nome: 'Ocultista',
    descricao: 'Rituais do Outro Lado',
    icone: 'M12 3 20 18H4ZM12 10.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5',
    pv: { inicial: 12, porNex: 2 }, pe: { inicial: 4, porNex: 4 }, san: { inicial: 20, porNex: 5 },
  },
};

// 5%, 10%, ..., 95%, 99%
export const NEX = [...Array.from({ length: 19 }, (_, i) => (i + 1) * 5), 99];

export const GRAUS = {
  destreinado: { nome: 'Destreinado', bonus: 0 },
  treinado:    { nome: 'Treinado',    bonus: 5 },
  veterano:    { nome: 'Veterano',    bonus: 10 },
  expert:      { nome: 'Expert',      bonus: 15 },
};

// kit: sem o kit adequado, o teste sofre −5
export const PERICIAS = [
  { id: 'acrobacia', nome: 'Acrobacia', atributo: 'agi', carga: true },
  { id: 'adestramento', nome: 'Adestramento', atributo: 'pre', somenteTreinada: true },
  { id: 'artes', nome: 'Artes', atributo: 'pre', somenteTreinada: true },
  { id: 'atletismo', nome: 'Atletismo', atributo: 'for' },
  { id: 'atualidades', nome: 'Atualidades', atributo: 'int' },
  { id: 'ciencias', nome: 'Ciências', atributo: 'int', somenteTreinada: true },
  { id: 'crime', nome: 'Crime', atributo: 'agi', somenteTreinada: true, carga: true, kit: true },
  { id: 'diplomacia', nome: 'Diplomacia', atributo: 'pre' },
  { id: 'enganacao', nome: 'Enganação', atributo: 'pre', kit: true },
  { id: 'fortitude', nome: 'Fortitude', atributo: 'vig' },
  { id: 'furtividade', nome: 'Furtividade', atributo: 'agi', carga: true },
  { id: 'iniciativa', nome: 'Iniciativa', atributo: 'agi' },
  { id: 'intimidacao', nome: 'Intimidação', atributo: 'pre' },
  { id: 'intuicao', nome: 'Intuição', atributo: 'pre' },
  { id: 'investigacao', nome: 'Investigação', atributo: 'int' },
  { id: 'luta', nome: 'Luta', atributo: 'for' },
  { id: 'medicina', nome: 'Medicina', atributo: 'int', kit: true },
  { id: 'ocultismo', nome: 'Ocultismo', atributo: 'int', somenteTreinada: true },
  { id: 'percepcao', nome: 'Percepção', atributo: 'pre' },
  { id: 'pilotagem', nome: 'Pilotagem', atributo: 'agi', somenteTreinada: true },
  { id: 'pontaria', nome: 'Pontaria', atributo: 'agi' },
  { id: 'profissao', nome: 'Profissão', atributo: 'int', somenteTreinada: true },
  { id: 'reflexos', nome: 'Reflexos', atributo: 'agi' },
  { id: 'religiao', nome: 'Religião', atributo: 'pre', somenteTreinada: true },
  { id: 'sobrevivencia', nome: 'Sobrevivência', atributo: 'int' },
  { id: 'tatica', nome: 'Tática', atributo: 'int', somenteTreinada: true },
  { id: 'tecnologia', nome: 'Tecnologia', atributo: 'int', somenteTreinada: true, kit: true },
  { id: 'vontade', nome: 'Vontade', atributo: 'pre' },
];

/* ---------- Origens (livro p. 16–21) ----------
   pericias: as duas perícias que a origem treina
   poder:    o poder exclusivo da origem
   efeitos:  só o que muda números na ficha (calculado em regras.js)
     pvPorNex / sanPorNex   +1 a cada 5% de NEX
     peInicial              PE extra no início
     pePorNexImpar          PE extra a cada NEX ímpar (15%, 25%…)
     limitePe               aumenta o limite de PE por turno
     defesa                 bônus na Defesa
     sanInicialMetade       começa com metade da SAN inicial da classe */
export const ORIGENS = {
  academico: {
    nome: 'Acadêmico', pericias: ['ciencias', 'investigacao'],
    poder: { nome: 'Saber é Poder', descricao: 'Quando faz um teste usando Intelecto, pode gastar 2 PE para receber +5 nesse teste.' },
  },
  agenteDeSaude: {
    nome: 'Agente de Saúde', pericias: ['intuicao', 'medicina'],
    poder: { nome: 'Técnica Medicinal', descricao: 'Sempre que cura um personagem, adiciona seu Intelecto no total de PV curados.' },
  },
  amnesico: {
    nome: 'Amnésico', pericias: [],
    poder: { nome: 'Vislumbres do Passado', descricao: 'Perícias: duas à escolha do mestre. Uma vez por sessão, pode fazer um teste de Intelecto (DT 10) para reconhecer pessoas ou lugares familiares. Se passar, recebe 1d4 PE temporários e, a critério do mestre, uma informação útil.' },
  },
  artista: {
    nome: 'Artista', pericias: ['artes', 'enganacao'],
    poder: { nome: 'Magnum Opus', descricao: 'Uma vez por missão, determina que um personagem numa cena de interação o reconhece. Recebe +5 em testes de Presença e de perícias de Presença contra ele.' },
  },
  atleta: {
    nome: 'Atleta', pericias: ['acrobacia', 'atletismo'],
    poder: { nome: '110%', descricao: 'Em testes de perícia de Força ou Agilidade (exceto Luta e Pontaria), pode gastar 2 PE para receber +5.' },
  },
  chef: {
    nome: 'Chef', pericias: ['fortitude', 'profissao'],
    poder: { nome: 'Ingrediente Secreto', descricao: 'Profissão (cozinheiro). Em interlúdio, pode cozinhar um prato especial: você e quem se alimentar recebem o benefício de dois pratos.' },
  },
  criminoso: {
    nome: 'Criminoso', pericias: ['crime', 'furtividade'],
    poder: { nome: 'O Crime Compensa', descricao: 'No fim de uma missão, escolha um item encontrado nela. Na próxima missão, pode incluí-lo no inventário sem contar no limite de itens por patente.' },
  },
  cultistaArrependido: {
    nome: 'Cultista Arrependido', pericias: ['ocultismo', 'religiao'],
    poder: { nome: 'Traços do Outro Lado', descricao: 'Possui um poder paranormal à sua escolha, porém começa o jogo com metade da Sanidade normal da classe.' },
    efeitos: { sanInicialMetade: true },
  },
  desgarrado: {
    nome: 'Desgarrado', pericias: ['fortitude', 'sobrevivencia'],
    poder: { nome: 'Calejado', descricao: 'Recebe +1 PV para cada 5% de NEX.' },
    efeitos: { pvPorNex: 1 },
  },
  engenheiro: {
    nome: 'Engenheiro', pericias: ['profissao', 'tecnologia'],
    poder: { nome: 'Ferramenta Favorita', descricao: 'Um item à sua escolha (exceto armas) conta como uma categoria abaixo.' },
  },
  executivo: {
    nome: 'Executivo', pericias: ['diplomacia', 'profissao'],
    poder: { nome: 'Processo Otimizado', descricao: 'Em testes estendidos ou para revisar documentos, pode gastar 2 PE para receber +5.' },
  },
  investigador: {
    nome: 'Investigador', pericias: ['investigacao', 'percepcao'],
    poder: { nome: 'Faro para Pistas', descricao: 'Uma vez por cena, ao procurar pistas, pode gastar 1 PE para receber +5 no teste.' },
  },
  lutador: {
    nome: 'Lutador', pericias: ['luta', 'reflexos'],
    poder: { nome: 'Mão Pesada', descricao: 'Recebe +2 em rolagens de dano com ataques corpo a corpo.' },
  },
  magnata: {
    nome: 'Magnata', pericias: ['diplomacia', 'pilotagem'],
    poder: { nome: 'Patrocinador da Ordem', descricao: 'Seu limite de crédito é sempre considerado um acima do atual.' },
  },
  mercenario: {
    nome: 'Mercenário', pericias: ['iniciativa', 'intimidacao'],
    poder: { nome: 'Posição de Combate', descricao: 'No primeiro turno de cada cena de ação, pode gastar 2 PE para receber uma ação de movimento adicional.' },
  },
  militar: {
    nome: 'Militar', pericias: ['pontaria', 'tatica'],
    poder: { nome: 'Para Bellum', descricao: 'Recebe +2 em rolagens de dano com armas de fogo.' },
  },
  operario: {
    nome: 'Operário', pericias: ['fortitude', 'profissao'],
    poder: { nome: 'Ferramenta de Trabalho', descricao: 'Escolha uma arma simples ou tática usável como ferramenta. Sabe usá-la e recebe +1 em testes de ataque, rolagens de dano e margem de ameaça com ela.' },
  },
  policial: {
    nome: 'Policial', pericias: ['percepcao', 'pontaria'],
    poder: { nome: 'Patrulha', descricao: 'Recebe +2 em Defesa.' },
    efeitos: { defesa: 2 },
  },
  religioso: {
    nome: 'Religioso', pericias: ['religiao', 'vontade'],
    poder: { nome: 'Acalentar', descricao: 'Recebe +5 em testes de Religião para acalmar. Quem você acalma recupera 1d6 + sua Presença de Sanidade.' },
  },
  servidorPublico: {
    nome: 'Servidor Público', pericias: ['intuicao', 'vontade'],
    poder: { nome: 'Espírito Cívico', descricao: 'Ao fazer um teste para ajudar, pode gastar 1 PE para aumentar o bônus concedido em +2.' },
  },
  teoricoDaConspiracao: {
    nome: 'Teórico da Conspiração', pericias: ['investigacao', 'ocultismo'],
    poder: { nome: 'Eu Já Sabia', descricao: 'Recebe resistência a dano mental igual ao seu Intelecto.' },
  },
  ti: {
    nome: 'T.I.', pericias: ['investigacao', 'tecnologia'],
    poder: { nome: 'Motor de Busca', descricao: 'Com acesso à internet e a critério do mestre, pode gastar 2 PE para substituir um teste de perícia por um de Tecnologia.' },
  },
  trabalhadorRural: {
    nome: 'Trabalhador Rural', pericias: ['adestramento', 'sobrevivencia'],
    poder: { nome: 'Desbravador', descricao: 'Em testes de Adestramento ou Sobrevivência, pode gastar 2 PE para receber +5. Não sofre penalidade de deslocamento por terreno difícil.' },
  },
  trambiqueiro: {
    nome: 'Trambiqueiro', pericias: ['crime', 'enganacao'],
    poder: { nome: 'Impostor', descricao: 'Uma vez por cena, pode gastar 2 PE para substituir um teste de perícia por um de Enganação.' },
  },
  universitario: {
    nome: 'Universitário', pericias: ['atualidades', 'investigacao'],
    poder: { nome: 'Dedicação', descricao: 'Recebe +1 PE e +1 PE a cada NEX ímpar (15%, 25%…). Seu limite de PE por turno aumenta em 1.' },
    efeitos: { peInicial: 1, pePorNexImpar: 1, limitePe: 1 },
  },
  vitima: {
    nome: 'Vítima', pericias: ['reflexos', 'vontade'],
    poder: { nome: 'Cicatrizes Psicológicas', descricao: 'Recebe +1 de Sanidade para cada 5% de NEX.' },
    efeitos: { sanPorNex: 1 },
  },
};

export const RECURSOS = [
  { id: 'pv', nome: 'Vida', sigla: 'PV', cor: '#d42a3c', elemento: 'sangue' },
  { id: 'san', nome: 'Sanidade', sigla: 'SAN', cor: '#a24bff', elemento: 'energia' },
  { id: 'pe', nome: 'Esforço', sigla: 'PE', cor: '#f0b429', elemento: 'conhecimento' },
];