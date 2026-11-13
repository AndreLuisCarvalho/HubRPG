// Regras do inventário. Funções puras, no mesmo estilo do regras.js.
import { ITENS, PATENTES, TIPOS_DE_DANO } from './itens';
import { efeitosDaTrilha } from './regras';

const ROMANOS = ['0', 'I', 'II', 'III', 'IV'];
export const romano = (n) => ROMANOS[n] ?? String(n);

const itensDe = (dados) => dados.inventario ?? [];

/* ---------- Patente ---------- */
export function patenteAtual(dados) {
  const pp = dados.prestigio ?? 0;
  return PATENTES.filter((p) => pp >= p.pp).at(-1);
}

/* ---------- Texto curto embaixo do nome ---------- */
export function resumoDoItem(item) {
  if (item.arma) {
    const { dano, critico, alcance, tipoDano } = item.arma;
    return [dano, critico, alcance ?? 'Corpo a corpo', TIPOS_DE_DANO[tipoDano]].join(' · ');
  }
  if (item.protecao) return `Defesa +${item.protecao.defesa}`;
  return item.descricao ?? '';
}

/* ---------- Carga ---------- */
// 5 espaços por ponto de Força; com Força 0, só 2.
// Técnico (Inventário Otimizado): soma o Intelecto à Força.
export function capacidadeDeCarga(dados) {
  const intelecto = efeitosDaTrilha(dados).cargaComInt ? (dados.atributos?.int ?? 0) : 0;
  const forca = (dados.atributos?.for ?? 0) + intelecto;
  return forca > 0 ? forca * 5 : 2;
}

export const espacosUsados = (dados) => itensDe(dados).reduce((total, item) => total + (item.espacos ?? 0), 0);
export const cargaMaxima = (dados) => capacidadeDeCarga(dados) * 2;
export const estaSobrecarregado = (dados) => espacosUsados(dados) > capacidadeDeCarga(dados);

/* ---------- Limite por categoria ---------- */
// [usados de I, II, III, IV]
export function itensPorCategoria(dados) {
  const usados = [0, 0, 0, 0];
  for (const item of itensDe(dados)) {
    if (item.categoria >= 1) usados[Math.min(item.categoria, 4) - 1] += 1;
  }
  return usados;
}

/* ---------- Alterar (devolvem { inventario } para o onAlterarDados) ---------- */
const novoUid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Item criado pelo jogador
export function adicionarItem(dados, { nome, categoria = 0, espacos = 1 }) {
  const novo = {
    uid: novoUid(), id: null, tipo: 'outro', nome: nome.trim(), categoria: Number(categoria), espacos: Number(espacos),
  };
  return { inventario: [...itensDe(dados), novo] };
}

// Item do livro: guarda uma cópia, para o jogador poder alterar a dele sem mexer no livro
export function adicionarDoLivro(dados, id) {
  const novo = { uid: novoUid(), id, ...structuredClone(ITENS[id]) };
  return { inventario: [...itensDe(dados), novo] };
}

export const removerItem = (dados, uid) => ({ inventario: itensDe(dados).filter((i) => i.uid !== uid) });