// Livro do sistema de Ordem Paranormal: as regras do compêndio + o que a ficha já conhece
// (rituais, origens, classes/trilhas e equipamento). Carregado só ao abrir a página do livro.
import { COMPENDIO, ELEMENTOS_DO_LIVRO } from './compendio';
import { ESCUDO, ELEMENTOS, ORIGENS, PERICIAS, PROTECOES } from './modelo';
import { ITENS, TIPOS_DE_DANO, TIPOS_DE_ITEM } from './itens';
import { RITUAIS } from './rituais';
import { TRILHAS } from './trilhas';
import { romano } from './inventario';

const nomePericia = (id) => PERICIAS.find((p) => p.id === id)?.nome ?? id;
const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');

/*
 * Filtros: cada seção pode ter "filtros" [{ id, rotulo, opcoes: [{ valor, nome, cor? }] }].
 * Cada entrada diz em "tags" a que valores pertence ({ elemento: ['san'] }); quem não tem a tag passa.
 * "aplicar(escolhas)" (opcional) ajusta a entrada ao filtro: corta linhas de tabela ou habilidades.
 */
const opcoesElemento = Object.entries(ELEMENTOS).map(([valor, el]) => ({ valor, nome: el.nome, cor: el.cor }));
const CATEGORIAS = [0, 1, 2, 3, 4].map((c) => ({ valor: String(c), nome: romano(c) }));

// Rituais: um por entrada, com os dados principais na primeira linha
function secaoRituais() {
  const entradas = [...RITUAIS]
    .sort((a, b) => a.circulo - b.circulo || porNome(a, b))
    .map((r) => {
      const linha = [
        r.elementos.map((el) => ELEMENTOS[el].nome).join('/'),
        `${r.circulo}º círculo`, r.execucao, r.alcance, `${r.tipoAlvo}: ${r.alvo}`, r.duracao,
        r.resistencia && `Resistência: ${r.resistencia}`,
      ].filter(Boolean).join(' · ');
      const formas = [
        r.discente && `Discente (+${r.discente.pe} PE): ${r.discente.texto}`,
        r.verdadeiro && `Verdadeiro (+${r.verdadeiro.pe} PE): ${r.verdadeiro.texto}`,
      ].filter(Boolean);
      return {
        nome: r.nome, pagina: null, sobre: linha, texto: [r.efeito, ...formas].join('\n'),
        tags: { elemento: r.elementos, circulo: [String(r.circulo)] },
      };
    });
  const filtros = [
    { id: 'elemento', rotulo: 'Elemento', opcoes: opcoesElemento },
    { id: 'circulo', rotulo: 'Círculo', opcoes: [1, 2, 3, 4].map((c) => ({ valor: String(c), nome: `${c}º` })) },
  ];
  return { id: 'rituais', titulo: 'Rituais', descricao: `${RITUAIS.length} rituais, do 1º ao 4º círculo (cap. 5).`, filtros, entradas };
}

function secaoOrigens() {
  const entradas = Object.values(ORIGENS).sort(porNome).map((o) => ({
    nome: o.nome,
    pagina: null,
    sobre: `Perícias: ${o.pericias.map(nomePericia).join(' e ')}`,
    texto: `${o.poder.nome}. ${o.poder.descricao}`,
    tags: { pericia: o.pericias },
  }));
  // Só as perícias que alguma origem dá
  const usadas = new Set(Object.values(ORIGENS).flatMap((o) => o.pericias));
  const filtros = [{
    id: 'pericia', rotulo: 'Perícia treinada',
    opcoes: [...usadas].map((valor) => ({ valor, nome: nomePericia(valor) })).sort(porNome),
  }];
  return { id: 'origens', titulo: 'Origens', descricao: 'Perícias treinadas e o poder de cada origem.', filtros, entradas };
}

const PAGINAS_TRILHAS = { combatente: 26, especialista: 30, ocultista: 34 };
const NOMES_CLASSES = { combatente: 'Combatente', especialista: 'Especialista', ocultista: 'Ocultista' };

function secaoTrilhas() {
  const entradas = Object.values(TRILHAS)
    .sort((a, b) => a.classe.localeCompare(b.classe) || porNome(a, b))
    .map((tr) => {
      const texto = (habilidades) => habilidades.map((h) => `NEX ${h.nex}% · ${h.nome}: ${h.texto}`).join('\n');
      return {
        nome: tr.nome,
        pagina: PAGINAS_TRILHAS[tr.classe],
        sobre: `${NOMES_CLASSES[tr.classe]} · ${tr.descricao}`,
        texto: texto(tr.habilidades),
        tags: { classe: [tr.classe] },
        // "Até NEX X": mostra só o que a trilha já liberou nesse NEX
        aplicar: ({ nex }) => (nex ? { texto: texto(tr.habilidades.filter((h) => h.nex <= Number(nex))) } : {}),
      };
    });
  const niveis = [...new Set(Object.values(TRILHAS).flatMap((tr) => tr.habilidades.map((h) => h.nex)))].sort((a, b) => a - b);
  const filtros = [
    { id: 'classe', rotulo: 'Classe', opcoes: Object.entries(NOMES_CLASSES).map(([valor, nome]) => ({ valor, nome })) },
    { id: 'nex', rotulo: 'Até NEX', opcoes: niveis.map((n) => ({ valor: String(n), nome: `${n}%` })) },
  ];
  return { id: 'trilhas', titulo: 'Trilhas', descricao: 'As trilhas de cada classe e o que liberam em cada NEX.', filtros, entradas };
}

function secaoEquipamento() {
  const armas = Object.values(ITENS).filter((i) => i.arma).sort(porNome);
  const outros = Object.values(ITENS).filter((i) => !i.arma && i.tipo !== 'protecao');

  const protecoes = [...Object.values(PROTECOES), ESCUDO];
  // As tabelas também respeitam o filtro de categoria: ficam só as linhas daquela categoria
  const tabelaArmas = (lista) => ({
    colunas: ['Arma', 'Cat.', 'Dano', 'Crítico', 'Alcance', 'Tipo'],
    linhas: lista.map((a) => [a.nome, romano(a.categoria), a.arma.dano, a.arma.critico, a.arma.alcance ?? '—', TIPOS_DE_DANO[a.arma.tipoDano]]),
  });
  const tabelaProtecoes = (lista) => ({
    colunas: ['Proteção', 'Defesa', 'Categoria', 'Espaços'],
    linhas: lista.map((p) => [p.nome, `+${p.defesa}`, romano(p.categoria), p.espacos]),
  });
  const naCategoria = (lista, categoria) => (categoria ? lista.filter((i) => String(i.categoria) === categoria) : lista);
  const tabelaFiltrada = (lista, montar) => ({ categoria }) => {
    const sobra = naCategoria(lista, categoria);
    return sobra.length ? { tabela: montar(sobra) } : null;   // null: some da lista
  };

  const entradas = [
    {
      nome: 'Tabela de armas', pagina: 56, texto: 'Simples (todos), táticas (Combatente) e pesadas (só com poder). Sem proficiência: −2d20 no ataque.',
      tabela: tabelaArmas(armas), tags: { tipo: ['arma'] }, aplicar: tabelaFiltrada(armas, tabelaArmas),
    },
    {
      nome: 'Proteções', pagina: 62, texto: 'Proteção pesada: RD 2 a balístico, corte, impacto e perfuração e −5 em Acrobacia, Crime e Furtividade. Escudo soma com outra proteção.',
      tabela: tabelaProtecoes(protecoes), tags: { tipo: ['protecao'] }, aplicar: tabelaFiltrada(protecoes, tabelaProtecoes),
    },
    ...outros.sort(porNome).map((i) => ({
      nome: i.nome,
      pagina: null,
      sobre: `${TIPOS_DE_ITEM[i.tipo] ?? 'Item'} · categoria ${romano(i.categoria)} · ${i.espacos} espaço${i.espacos === 1 ? '' : 's'}`,
      texto: i.descricao ?? '',
      tags: { tipo: [i.tipo], categoria: [String(i.categoria)] },
    })),
  ];
  // Só os tipos que existem de fato na lista
  const tipos = new Set(entradas.flatMap((en) => en.tags.tipo));
  const filtros = [
    { id: 'tipo', rotulo: 'Tipo', opcoes: Object.entries(TIPOS_DE_ITEM).filter(([v]) => tipos.has(v)).map(([valor, nome]) => ({ valor, nome })) },
    { id: 'categoria', rotulo: 'Categoria', opcoes: CATEGORIAS },
  ];
  return { id: 'equipamento', titulo: 'Equipamento', descricao: 'Armas, proteções e itens gerais (cap. 3).', filtros, entradas };
}

// Elementos: cartões com a cor de cada um e quem oprime quem
function secaoElementos() {
  const oprimidoPor = (id) => Object.keys(ELEMENTOS).find((k) => ELEMENTOS[k].forte === id);
  const roda = ['con', 'ene', 'mor', 'san'];
  const entradas = [
    {
      nome: 'Quem oprime quem',
      pagina: 99,
      texto: 'Rituais e criaturas de um elemento levam vantagem contra o elemento que ele oprime. Isso não dá resistência: cada elemento só resiste a si mesmo. Por isso um ritual de Energia faz pouco contra uma criatura de Energia.',
      roda: roda.map((id) => ({ id, nome: ELEMENTOS[id].nome, cor: ELEMENTOS[id].cor })),
    },
    ...ELEMENTOS_DO_LIVRO.map((el) => {
      const { nome, cor, forte } = ELEMENTOS[el.id];
      const fraco = oprimidoPor(el.id);
      return {
        nome,
        pagina: el.pagina,
        elemento: {
          cor,
          lema: el.lema,
          oprime: forte && ELEMENTOS[forte].nome,
          oprimidoPor: fraco && ELEMENTOS[fraco].nome,
          campos: [
            ['Manifestação', el.manifestacao],
            ['Criaturas', el.criaturas],
            ['Rituais e poderes', el.rituais],
            ['Associado a', el.associado],
            ['Afinidade pode causar', el.afinidade],
          ],
        },
        texto: el.texto,
        // A busca também olha os campos do cartão
        busca: [el.manifestacao, el.criaturas, el.rituais, el.associado, el.afinidade].join(' '),
      };
    }),
  ];
  return { id: 'elementos', titulo: 'Elementos', descricao: 'As cinco entidades do Outro Lado (p. 98–109).', entradas };
}

// Ordem das seções na tela
export function secoesDoLivro() {
  const secao = Object.fromEntries(COMPENDIO.map((s) => [s.id, s]));
  return [
    secao.testes, secao.pericias, secao.combate, secao.ferimentos, secao.investigacao, secao.interludio,
    secao.outroLado, secaoElementos(),
    secao.regrasRituais, secaoRituais(),
    secao.personagem, secaoOrigens(), secaoTrilhas(), secaoEquipamento(),
    secao.ameacas, secao.habilidadesAmeacas,
  ];
}
