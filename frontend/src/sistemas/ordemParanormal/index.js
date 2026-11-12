import * as modelo from './modelo';
import * as regras from './regras';
import FichaOrdemParanormal from './FichaOrdemParanormal/FichaOrdemParanormal';

// O "pacote" do sistema. Todo sistema expõe: id, nome, Ficha, fichaInicial,
// recursos, resumo e, opcionalmente, classes, origens, estado e destaques
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
  // Lista simples para telas genéricas (ex.: modal de nova ficha), em ordem alfabética
  origens: Object.entries(modelo.ORIGENS)
    .map(([id, o]) => ({ id, nome: o.nome, poder: o.poder.nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  Ficha: FichaOrdemParanormal,

  // Paleta "dossiê da Ordem": carvão, pasta de arquivo (ocre), papel velho e carimbo vermelho.
  // Vale para toda a página da campanha e fica por cima da cor escolhida para ela.
  paleta: {
    '--cor': '#c4974a',          // ocre de pasta de arquivo
    '--sobre-cor': '#16130d',    // texto em cima do ocre
    '--carimbo': '#b3362c',      // vermelho de carimbo "CONFIDENCIAL"
    '--fundo': '#0b0a08',
    '--superficie': '#16140f',
    '--borda': '#2f2a21',
    '--texto': '#ece6d6',        // papel
    '--texto-suave': '#9c927f',
  },
};