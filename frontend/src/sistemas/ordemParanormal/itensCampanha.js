/*
 * Itens da campanha (aba Itens): o catálogo do mestre, com as cartas dos itens que o grupo ganha.
 * O item fica no catálogo e, ao ser entregue, uma cópia vai para o inventário do agente
 * (e um ataque, se o item causa dano). O catálogo lembra o dono para poder trocar ou recolher.
 *
 * dados: { tipo, categoria, espacos, descricao, danos, critico, alcance, imagem,
 *          paranormal: { elemento, amaldicoado, custo }, sessaoId, notaMestre, origem, dono }
 */
import { danosDe, textoDosDanos } from './danos';
import { ITENS, TIPOS_DE_ITEM } from './itens';

export { TIPOS_DE_ITEM };

export const ITEM_NOVO = {
  nome: '',
  dados: {
    tipo: 'outro', categoria: 0, espacos: 1, descricao: '', danos: [], critico: '', alcance: '',
    imagem: '', paranormal: { elemento: '', amaldicoado: false, custo: '' }, sessaoId: null, notaMestre: '',
  },
};

// Letra do tipo de dano do livro → tipo do editor de dano
const DANO_DO_LIVRO = { C: 'corte', I: 'impacto', P: 'perfuracao', B: 'balistico', F: 'fogo' };

/** Cópia editável de um item do livro, no formato do catálogo */
export function itemDoLivro(id) {
  const livro = ITENS[id];
  const arma = livro.arma;
  return {
    nome: livro.nome,
    dados: {
      ...ITEM_NOVO.dados,
      tipo: livro.tipo,
      categoria: livro.categoria ?? 0,
      espacos: livro.espacos ?? 1,
      descricao: livro.descricao ?? '',
      // "1d8/1d10" (uma ou duas mãos): fica a primeira; o texto continua na descrição
      danos: arma ? [{ uid: 'l0', formula: arma.dano.split('/')[0], tipo: DANO_DO_LIVRO[arma.tipoDano] ?? '' }] : [],
      critico: arma?.critico ?? '',
      alcance: arma ? (arma.alcance ?? 'Corpo a corpo') : '',
      defesa: livro.protecao?.defesa ?? null,
      origem: id,
    },
  };
}

/** Linha de tipo da carta: "Arma · Corte", "Paranormal · Sangue" */
const NO_SINGULAR = {
  arma: 'Arma', municao: 'Munição', protecao: 'Proteção', acessorio: 'Acessório', explosivo: 'Explosivo',
  operacional: 'Operacional', paranormal: 'Paranormal', outro: 'Item',
};
export const nomeDoTipo = (tipo) => NO_SINGULAR[tipo] ?? 'Item';

export const temDano = (item) => danosDe(item.dados).some((d) => d.formula);

/** "1d8 corte · 19 · Curto" — para o inventário da ficha e a carta */
export function resumoDeCombate(dados) {
  return [textoDosDanos(danosDe(dados)), dados.critico && `crít. ${dados.critico}`, dados.alcance]
    .filter(Boolean).join(' · ');
}

const novoUid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/* ---------- Entregar / recolher (devolvem as mudanças da ficha) ---------- */

/** Tira da ficha o que o item deixou lá (pelo uid do inventário e o id do ataque) */
export function semOItem(fichaDados, dono) {
  return {
    inventario: (fichaDados.inventario ?? []).filter((i) => i.uid !== dono.uid),
    ataques: (fichaDados.ataques ?? []).filter((a) => a.id !== dono.ataqueId),
  };
}

/** Põe o item na ficha: cópia no inventário + ataque (se causa dano). Devolve { mudancas, dono }. */
export function comOItem(fichaDados, item, ficha) {
  const { dados } = item;
  const uid = novoUid();
  const combate = resumoDeCombate(dados);
  const noInventario = {
    uid,
    id: dados.origem ?? null,
    catalogoId: item.id,
    tipo: dados.tipo,
    nome: item.nome,
    categoria: Number(dados.categoria) || 0,
    espacos: Number(dados.espacos) || 0,
    // O inventário mostra a descrição embaixo do nome: o combate vem primeiro
    descricao: [combate, dados.descricao].filter(Boolean).join(' — '),
    ...(dados.defesa ? { protecao: { defesa: dados.defesa } } : {}),
  };

  const danos = danosDe(dados).filter((d) => d.formula);
  const ataque = danos.length ? {
    id: crypto.randomUUID(),
    nome: item.nome,
    // Arma de longe usa Pontaria; o resto, Luta (dá para trocar na ficha)
    teste: dados.alcance && !/corpo/i.test(dados.alcance) ? 'Pontaria' : 'Luta',
    danos,
    dano: textoDosDanos(danos),
    especial: [dados.critico, dados.alcance].filter(Boolean).join(' · '),
  } : null;

  return {
    mudancas: {
      inventario: [...(fichaDados.inventario ?? []), noInventario],
      ...(ataque ? { ataques: [...(fichaDados.ataques ?? []), ataque] } : {}),
    },
    dono: { fichaId: ficha.id, nome: ficha.nome, uid, ataqueId: ataque?.id ?? null },
  };
}
