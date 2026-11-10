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
export const CLASSES = {
  combatente:   { nome: 'Combatente',   pv: { inicial: 20, porNex: 4 }, pe: { inicial: 2, porNex: 2 }, san: { inicial: 12, porNex: 3 } },
  especialista: { nome: 'Especialista', pv: { inicial: 16, porNex: 3 }, pe: { inicial: 3, porNex: 3 }, san: { inicial: 16, porNex: 4 } },
  ocultista:    { nome: 'Ocultista',    pv: { inicial: 12, porNex: 2 }, pe: { inicial: 4, porNex: 4 }, san: { inicial: 20, porNex: 5 } },
};

// 5%, 10%, ..., 95%, 99%
export const NEX = [...Array.from({ length: 19 }, (_, i) => (i + 1) * 5), 99];

export const GRAUS = {
  destreinado: { nome: 'Destreinado', bonus: 0 },
  treinado:    { nome: 'Treinado',    bonus: 5 },
  veterano:    { nome: 'Veterano',    bonus: 10 },
  expert:      { nome: 'Expert',      bonus: 15 },
};

export const PERICIAS = [
  { id: 'acrobacia', nome: 'Acrobacia', atributo: 'agi', carga: true },
  { id: 'adestramento', nome: 'Adestramento', atributo: 'pre', somenteTreinada: true },
  { id: 'artes', nome: 'Artes', atributo: 'pre', somenteTreinada: true },
  { id: 'atletismo', nome: 'Atletismo', atributo: 'for' },
  { id: 'atualidades', nome: 'Atualidades', atributo: 'int' },
  { id: 'ciencias', nome: 'Ciências', atributo: 'int', somenteTreinada: true },
  { id: 'crime', nome: 'Crime', atributo: 'agi', somenteTreinada: true, carga: true },
  { id: 'diplomacia', nome: 'Diplomacia', atributo: 'pre' },
  { id: 'enganacao', nome: 'Enganação', atributo: 'pre' },
  { id: 'fortitude', nome: 'Fortitude', atributo: 'vig' },
  { id: 'furtividade', nome: 'Furtividade', atributo: 'agi', carga: true },
  { id: 'iniciativa', nome: 'Iniciativa', atributo: 'agi' },
  { id: 'intimidacao', nome: 'Intimidação', atributo: 'pre' },
  { id: 'intuicao', nome: 'Intuição', atributo: 'pre' },
  { id: 'investigacao', nome: 'Investigação', atributo: 'int' },
  { id: 'luta', nome: 'Luta', atributo: 'for' },
  { id: 'medicina', nome: 'Medicina', atributo: 'int' },
  { id: 'ocultismo', nome: 'Ocultismo', atributo: 'int', somenteTreinada: true },
  { id: 'percepcao', nome: 'Percepção', atributo: 'pre' },
  { id: 'pilotagem', nome: 'Pilotagem', atributo: 'agi', somenteTreinada: true },
  { id: 'pontaria', nome: 'Pontaria', atributo: 'agi' },
  { id: 'profissao', nome: 'Profissão', atributo: 'int', somenteTreinada: true },
  { id: 'reflexos', nome: 'Reflexos', atributo: 'agi' },
  { id: 'religiao', nome: 'Religião', atributo: 'pre', somenteTreinada: true },
  { id: 'sobrevivencia', nome: 'Sobrevivência', atributo: 'int' },
  { id: 'tatica', nome: 'Tática', atributo: 'int', somenteTreinada: true },
  { id: 'tecnologia', nome: 'Tecnologia', atributo: 'int', somenteTreinada: true },
  { id: 'vontade', nome: 'Vontade', atributo: 'pre' },
];

export const RECURSOS = [
  { id: 'pv', nome: 'Vida', sigla: 'PV', cor: '#d42a3c', elemento: 'sangue' },
  { id: 'san', nome: 'Sanidade', sigla: 'SAN', cor: '#a24bff', elemento: 'energia' },
  { id: 'pe', nome: 'Esforço', sigla: 'PE', cor: '#f0b429', elemento: 'conhecimento' },
];