/*
 * Economia de ação do turno: dados.economia = { padrao: true (gasta), movimento: true (gasta) }.
 * Cada carta tem um custo: 'padrao' | 'movimento' | 'completa' (as duas) | 'livre' (nenhuma).
 * Regra da mesa: uma ação de um tipo pode ser paga com a do outro se a dela já foi gasta
 * (Padrão gasta → o Movimento paga o próximo ataque; e vice-versa). Completa precisa das duas.
 * O gasto acontece quando a ação de fato acontece (atacar, conjurar, rolar...), uma vez por carta jogada.
 */
export const ROTULO_DO_CUSTO = { padrao: 'Padrão', movimento: 'Movimento', completa: 'Completa', livre: 'Livre' };
export const SIGLA_DO_CUSTO = { padrao: 'P', movimento: 'M', completa: 'P+M', livre: 'L' };

/** "Padrão", "Completa", "Movimento", "Livre", "Reação" (execução do ritual ou ação livre) → custo */
export function custoDaExecucao(texto) {
  const t = String(texto ?? '').toLowerCase();
  if (t.includes('complet')) return 'completa';
  if (t.includes('moviment')) return 'movimento';
  if (t.includes('livre') || t.includes('rea')) return 'livre';
  return 'padrao';
}

const livres = (e) => ({ padrao: !e?.padrao, movimento: !e?.movimento });

/** Dá para pagar este custo com o que sobra no turno? */
export function podePagar(economia, custo) {
  if (!custo || custo === 'livre') return true;
  const { padrao, movimento } = livres(economia);
  if (custo === 'completa') return padrao && movimento;
  return padrao || movimento;
}

/** A economia depois de pagar o custo (a ação do próprio tipo primeiro, a outra no lugar) */
export function pagar(economia, custo) {
  const e = { ...economia };
  if (!custo || custo === 'livre') return e;
  const { padrao, movimento } = livres(economia);
  if (custo === 'completa') return { ...e, padrao: true, movimento: true };
  if (custo === 'padrao') return padrao ? { ...e, padrao: true } : { ...e, movimento: true };
  return movimento ? { ...e, movimento: true } : { ...e, padrao: true };
}

/** Acabaram as ações do turno (Padrão e Movimento gastas) */
export const semAcoes = (economia) => Boolean(economia?.padrao && economia?.movimento);
