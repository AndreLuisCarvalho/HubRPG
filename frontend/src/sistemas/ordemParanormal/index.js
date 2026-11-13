import * as modelo from './modelo';
import * as regras from './regras';
import { lazy } from 'react';

// A ficha (e tudo que ela usa: grimório, inventário, efeitos) só baixa quando alguém abre uma
const FichaOrdemParanormal = lazy(() => import('./FichaOrdemParanormal/FichaOrdemParanormal'));
import { trilhasDaClasse } from './trilhas';

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
  // Trilhas de uma classe, para telas genéricas (modal de nova ficha)
  trilhas: (classe) => trilhasDaClasse(classe).map((t) => ({
    id: t.id, nome: t.nome, descricao: t.descricao,
    habilidades: t.habilidades.map(({ nex, nome }) => ({ nex, nome })),
  })),
  Ficha: FichaOrdemParanormal,

  // Livro do sistema (consulta do mestre): só baixa ao abrir a página do livro
  livro: () => import('./livro').then((m) => m.secoesDoLivro()),

  // Paleta "dossiê da Ordem": grafite fosco (sem brilho nem degradê), pasta de arquivo (ocre),
  // papel e carimbo vermelho. Vale para toda a página da campanha.
  paleta: {
    '--cor': '#c4974a',          // ocre de pasta de arquivo
    '--sobre-cor': '#16130d',    // texto em cima do ocre
    '--carimbo': '#b3362c',      // vermelho de carimbo "CONFIDENCIAL"
    '--fundo': '#16181b',        // grafite: liso, sem degradê
    '--superficie': '#1d1f23',
    '--borda': '#33363b',
    '--texto': '#e6e3dc',        // papel
    '--texto-suave': '#9a978f',
  },
};