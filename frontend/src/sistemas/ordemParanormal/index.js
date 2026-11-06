import * as modelo from './modelo';
import * as regras from './regras';
import FichaOrdemParanormal from './FichaOrdemParanormal/FichaOrdemParanormal';

// O "pacote" do sistema. Todo sistema expõe: id, nome, Ficha, fichaInicial, recursos, resumo
export default {
  id: 'ordem-paranormal',
  nome: 'Ordem Paranormal',
  modelo,
  ...regras,
  Ficha: FichaOrdemParanormal,
};