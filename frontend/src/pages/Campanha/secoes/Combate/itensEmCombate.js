/*
 * O que cada item do livro faz quando é usado na arena (fora as armas, que viram ataques).
 *   rolar:    fórmula rolada (cura ou dano)          tipoDano: tipo do dano (resistências do alvo)
 *   efeito:   'cura' | 'dano' | 'condicao'           alvos:    'um' | 'varios' (área)
 *   resiste:  { pericia, dt: atributo de quem usa, efeito: 'metade' | 'anula' }  (o alvo rola)
 *   condicao: { id, rodadas } aplicada em quem falhar (ou em todos, sem teste)
 *   usos:     quantas vezes dá para usar (o item sai do inventário no último); padrão 1
 * Itens sem entrada aqui (ou do catálogo da campanha) só ficam registrados, com dano/cura à mão.
 */
import { ITENS } from '../../../../sistemas/ordemParanormal/itens';
import { limitePePorTurno } from '../../../../sistemas/ordemParanormal/regras';

export const EFEITOS_DE_ITEM = {
  cicatrizante: { efeito: 'cura', rolar: '2d8+2', alvos: 'um' },
  granadaDeFragmentacao: {
    efeito: 'dano', rolar: '8d6', tipoDano: 'perfuracao', alvos: 'varios',
    resiste: { pericia: 'reflexos', dt: 'agi', efeito: 'metade' },
  },
  granadaIncendiaria: {
    efeito: 'dano', rolar: '6d6', tipoDano: 'fogo', alvos: 'varios',
    resiste: { pericia: 'reflexos', dt: 'agi', efeito: 'metade' },
  },
  minaAntipessoal: {
    efeito: 'dano', rolar: '12d6', tipoDano: 'perfuracao', alvos: 'varios',
    resiste: { pericia: 'reflexos', dt: 'int', efeito: 'metade' },
  },
  granadaDeAtordoamento: {
    efeito: 'condicao', alvos: 'varios', condicao: { id: 'atordoado', rodadas: 1 },
    resiste: { pericia: 'fortitude', dt: 'agi', efeito: 'anula' },
  },
  granadaDeFumaca: { efeito: 'condicao', alvos: 'varios', condicao: { id: 'cego', rodadas: 2 } },
  taser: {
    efeito: 'dano', rolar: '1d6', tipoDano: 'eletricidade', alvos: 'um', usos: 2,
    condicao: { id: 'atordoado', rodadas: 1 },
    resiste: { pericia: 'fortitude', dt: 'agi', efeito: 'anula' },
  },
  sprayDePimenta: {
    efeito: 'condicao', alvos: 'um', usos: 2, condicao: { id: 'cego', rodadas: 2 },
    resiste: { pericia: 'fortitude', dt: 'agi', efeito: 'anula' },
  },
  pistolaDeDardos: {
    efeito: 'condicao', alvos: 'um', usos: 2, condicao: { id: 'inconsciente', rodadas: null },
    resiste: { pericia: 'fortitude', dt: 'agi', efeito: 'anula' },
  },
  pistolaSinalizadora: { efeito: 'dano', rolar: '2d6', tipoDano: 'fogo', alvos: 'um', usos: 2 },
  lanternaTatica: { efeito: 'condicao', alvos: 'um', condicao: { id: 'ofuscado', rodadas: 1 }, usos: Infinity },
};

const NOMES_ATRIBUTO = { agi: 'Agi', int: 'Int', for: 'For', pre: 'Pre', vig: 'Vig' };

/** O que o item faz na arena (null = só registra) */
export const efeitoDoItem = (item) => EFEITOS_DE_ITEM[item?.id] ?? null;

/** É arma? (vai para a carta Atacar, não para Usar item) */
export const ehArma = (item) => Boolean(item?.arma ?? ITENS[item?.id]?.arma);

/** Itens que dá para usar (o inventário sem as armas) */
export const itensUsaveis = (dados) => (dados?.inventario ?? []).filter((i) => !ehArma(i));

/** DT do item (livro p. 78): 10 + limite de PE + o atributo indicado de quem usa */
export function dtDoItem(dadosDoAtor, atributo) {
  return 10 + limitePePorTurno(dadosDoAtor) + (dadosDoAtor.atributos?.[atributo] ?? 0);
}

export const rotuloDaDt = (atributo) => `DT ${NOMES_ATRIBUTO[atributo] ?? atributo}`;

/** Quantos usos sobram (o item guarda "usos" depois do primeiro) */
export function usosRestantes(item) {
  const efeito = efeitoDoItem(item);
  return item.usos ?? efeito?.usos ?? 1;
}

/** Ícone da carta do item, pelo tipo */
export function iconeDoItem(item) {
  const efeito = efeitoDoItem(item);
  if (efeito?.efeito === 'cura') return '✚';
  if (efeito?.efeito === 'dano') return '✸';
  if (efeito?.efeito === 'condicao') return '◎';
  return { protecao: '⛨', municao: '⁂', paranormal: '✦', explosivo: '✸' }[item.tipo] ?? '◇';
}
