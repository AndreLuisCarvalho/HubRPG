import * as modelo from './modelo';
import * as regras from './regras';
import FichaOrdemParanormal from './FichaOrdemParanormal/FichaOrdemParanormal';

// O "pacote" do sistema. Todo sistema expõe: id, nome, Ficha, fichaInicial,
// recursos, resumo e, opcionalmente, classes, estado e destaques
export default {
  id: 'ordem-paranormal',
  nome: 'Ordem Paranormal',
  modelo,
  ...regras,
  classes: Object.entries(modelo.CLASSES).map(([id, c]) => ({
    id,
    nome: c.nome,
    descricao: c.descricao,
    icone: c.icone,
  })),
  Ficha: FichaOrdemParanormal,
};