import ordemParanormal from './ordemParanormal';

const SISTEMAS = {
  [ordemParanormal.id]: ordemParanormal,
};

export const obterSistema = (id) => SISTEMAS[id] ?? null;
export const listaSistemas = Object.values(SISTEMAS);