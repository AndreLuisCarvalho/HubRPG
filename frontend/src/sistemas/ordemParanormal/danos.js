/*
 * Dano em partes: [{ uid, formula: '10', tipo: 'corte' }, { uid, formula: '1d4', tipo: 'morte' }].
 * Cada parte rola e soma separada na mesa ("10 corte · 3 Morte"); as de elemento caem com a skin dele.
 * Fichas antigas só têm o texto ("2d6+5 balístico"): lerDanos transforma o texto em partes.
 */
import { lerFormula } from '../../components/Dados/formula';

export const TIPOS_DANO = [
  { id: 'corte', nome: 'corte' },
  { id: 'impacto', nome: 'impacto' },
  { id: 'perfuracao', nome: 'perfuração' },
  { id: 'balistico', nome: 'balístico' },
  { id: 'fogo', nome: 'fogo' },
  { id: 'frio', nome: 'frio' },
  { id: 'eletricidade', nome: 'eletricidade' },
  { id: 'quimico', nome: 'químico' },
  { id: 'mental', nome: 'mental' },
  { id: 'sangue', nome: 'Sangue', skin: 'sangue' },
  { id: 'morte', nome: 'Morte', skin: 'morte' },
  { id: 'conhecimento', nome: 'Conhecimento', skin: 'conhecimento' },
  { id: 'energia', nome: 'Energia', skin: 'energia' },
  { id: 'medo', nome: 'Medo', skin: 'medo' },
];
const tipoPorId = (id) => TIPOS_DANO.find((t) => t.id === id);

// Palavras do texto livre → tipo ("cortante", "de morte", "ácido"…)
const PALAVRAS = {
  corte: 'corte', cortante: 'corte', impacto: 'impacto', perfuracao: 'perfuracao', perfurante: 'perfuracao',
  balistico: 'balistico', fogo: 'fogo', frio: 'frio', eletricidade: 'eletricidade', eletrico: 'eletricidade',
  quimico: 'quimico', acido: 'quimico', mental: 'mental', sangue: 'sangue', morte: 'morte',
  conhecimento: 'conhecimento', energia: 'energia', medo: 'medo',
};
// Elementos do modelo (san, mor…) → tipo de dano, para "dano do elemento" dos rituais
const DO_ELEMENTO = { san: 'sangue', mor: 'morte', con: 'conhecimento', ene: 'energia', med: 'medo' };

const normalizar = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const novoUid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** "10 cortante + 1d4 de morte" → [{ formula: '10', tipo: 'corte' }, { formula: '1d4', tipo: 'morte' }] */
export function lerDanos(texto, elemento = null) {
  return String(texto ?? '')
    .split(/\s+\+\s+|\s+e\s+/)
    .map((parte) => parte.trim().replace(/^\+\s*/, ''))
    .flatMap((parte, i) => {
      // Só os termos da fórmula (sem engolir o "d" de "de morte")
      const formula = (parte.match(/^(?:\d*d\d+|\d+)(?:\s*[+\-−]\s*(?:\d*d\d+|\d+))*/i)?.[0] ?? '').trim();
      if (!formula || !lerFormula(formula)) return [];
      const palavras = normalizar(parte.slice(formula.length)).split(/[^a-z]+/);
      let tipo = palavras.map((p) => PALAVRAS[p]).find(Boolean) ?? '';
      if (!tipo && palavras.includes('elemento')) tipo = DO_ELEMENTO[elemento] ?? '';
      return [{ uid: `t${i}`, formula, tipo }];
    });
}

/** As partes de um ataque/ação: as salvas ou, nas fichas antigas, lidas do texto "dano" */
export const danosDe = (item, elemento) => (item?.danos?.length ? item.danos : lerDanos(item?.dano, elemento));

/** "10 corte + 1d4 Morte" */
export const textoDosDanos = (danos) => danos
  .filter((d) => d.formula)
  .map((d) => [d.formula, tipoPorId(d.tipo)?.nome].filter(Boolean).join(' '))
  .join(' + ');

/** Partes no formato da mesa de dados */
export const partesParaRolar = (danos) => danos
  .filter((d) => lerFormula(d.formula))
  .map((d) => ({ formula: d.formula, rotulo: tipoPorId(d.tipo)?.nome ?? '', skin: tipoPorId(d.tipo)?.skin }));

/** Uma parte vazia nova (só ao clicar em "+ parte", nunca durante a renderização) */
export const novaParte = () => ({ uid: novoUid(), formula: '', tipo: '' });
